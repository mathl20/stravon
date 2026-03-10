export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canManageFactures, getEffectivePermissions } from '@/lib/permissions';
import { calculateTTC, formatDate } from '@/lib/utils';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    const { id } = await ctx.params;

    const devis = await prisma.devis.findFirst({
      where: { id, companyId: user.companyId },
      include: { items: true, client: true },
    });
    if (!devis) return NextResponse.json({ error: 'Devis non trouve' }, { status: 404 });

    if (devis.status !== 'ACCEPTE') {
      return NextResponse.json(
        { error: `Ce devis ne peut pas etre transforme en facture (statut actuel : ${devis.status})` },
        { status: 400 },
      );
    }

    // Check no facture already exists for this devis (unique constraint backup)
    const existingFacture = await prisma.facture.findUnique({ where: { devisId: id } });
    if (existingFacture) {
      return NextResponse.json(
        { error: `Une facture a deja ete generee pour ce devis : ${existingFacture.numero}` },
        { status: 409 },
      );
    }

    // Check devis has items
    if (devis.items.length === 0) {
      return NextResponse.json({ error: 'Ce devis ne contient aucune ligne' }, { status: 400 });
    }

    // Check client still exists
    if (!devis.client) {
      return NextResponse.json({ error: 'Le client de ce devis n\'existe plus' }, { status: 400 });
    }

    // Find linked intervention if any
    const intervention = await prisma.intervention.findFirst({
      where: { devisId: id, companyId: user.companyId },
      select: { id: true },
    });

    // Get company settings for payment delay
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { delaiPaiementJours: true },
    });

    // Recalculate totals from items
    const amountHT = devis.items.reduce((sum, i) => sum + i.total, 0);
    const amountTTC = calculateTTC(amountHT, devis.tvaRate);

    const now = new Date();
    const delai = company?.delaiPaiementJours ?? 30;
    const dateEcheance = new Date(now);
    dateEcheance.setDate(dateEcheance.getDate() + delai);

    const mentionDevis = `Relative au devis ${devis.reference} du ${formatDate(devis.date)}`;

    const result = await prisma.$transaction(async (tx) => {
      // Generate sequential facture number
      const year = now.getFullYear();
      const prefix = `FAC-${year}-`;
      const lastFacture = await tx.facture.findFirst({
        where: { companyId: user.companyId, numero: { startsWith: prefix } },
        orderBy: { numero: 'desc' },
      });
      const lastNum = lastFacture ? parseInt(lastFacture.numero.split('-')[2]) : 0;
      const numero = `${prefix}${String(lastNum + 1).padStart(4, '0')}`;

      // Create facture with copied items
      const facture = await tx.facture.create({
        data: {
          numero,
          date: now,
          dateEcheance,
          amountHT,
          tvaRate: devis.tvaRate,
          amountTTC,
          conditionsPaiement: devis.conditionsPaiement || null,
          notes: devis.notes || null,
          mentionDevis,
          devisId: devis.id,
          interventionId: intervention?.id || null,
          clientId: devis.clientId,
          companyId: user.companyId,
          createdById: user.id,
          items: {
            create: devis.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              type: item.type || 'prestation',
              ...(item.prixAchat != null ? { prixAchat: item.prixAchat } : {}),
              ...(item.coefMarge != null ? { coefMarge: item.coefMarge } : {}),
              ...(item.fournisseur ? { fournisseur: item.fournisseur } : {}),
              ...(item.referenceFournisseur ? { referenceFournisseur: item.referenceFournisseur } : {}),
            })),
          },
        },
        include: {
          items: true,
          client: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Update devis status to FACTURE
      await tx.devis.update({ where: { id }, data: { status: 'FACTURE' } });

      // Update intervention status to INVOICED if linked
      if (intervention) {
        await tx.intervention.update({
          where: { id: intervention.id },
          data: { status: 'INVOICED' },
        });
      }

      return facture;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('Error generating facture from devis:', error);
    return NextResponse.json({ error: 'Erreur lors de la generation de la facture' }, { status: 500 });
  }
}
