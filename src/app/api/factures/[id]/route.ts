export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { factureSchema } from '@/lib/validations';
import { calculateTTC } from '@/lib/utils';
import { canManageFactures, getEffectivePermissions } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    const { id } = await ctx.params;
    const facture = await prisma.facture.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        items: true,
        client: true,
        company: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
        devis: { select: { id: true, reference: true, title: true, date: true } },
      },
    });
    if (!facture) return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 });

    return NextResponse.json({ data: facture });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Statuses where the invoice is locked (no content modification allowed)
const LOCKED_STATUSES = ['PAYEE', 'EN_RETARD', 'ANNULEE'];

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    const { id } = await ctx.params;
    const existing = await prisma.facture.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 });

    const body = await request.json();

    // Status-only update: only allow specific transitions
    if (body.status && Object.keys(body).length === 1) {
      const allowed: Record<string, string[]> = {
        'EN_ATTENTE': ['ANNULEE'],
        'EN_RETARD': ['ANNULEE'],
      };
      const allowedNext = allowed[existing.status] || [];
      if (!allowedNext.includes(body.status)) {
        return NextResponse.json({
          error: `Transition de statut non autorisee: ${existing.status} vers ${body.status}`,
        }, { status: 400 });
      }
      const updated = await prisma.facture.update({ where: { id }, data: { status: body.status } });
      return NextResponse.json({ data: updated });
    }

    // Block modification of locked invoices
    if (LOCKED_STATUSES.includes(existing.status)) {
      return NextResponse.json({
        error: 'Cette facture ne peut plus etre modifiee. Creez un avoir ou une nouvelle facture.',
      }, { status: 403 });
    }

    const parsed = factureSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { clientId, interventionId, devisId, date, dateEcheance, tvaRate: tva, conditionsPaiement, mentionsLegales, notes, items } = parsed.data;
    const tvaRate = tva ?? 20;
    const amountHT = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const amountTTC = calculateTTC(amountHT, tvaRate);

    await prisma.factureItem.deleteMany({ where: { factureId: id } });

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        date: new Date(date),
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
        amountHT,
        tvaRate,
        amountTTC,
        conditionsPaiement: conditionsPaiement || null,
        mentionsLegales: mentionsLegales || null,
        notes: notes || null,
        interventionId: interventionId || null,
        devisId: devisId || null,
        clientId,
        items: {
          create: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: Math.round(i.quantity * i.unitPrice * 100) / 100,
          })),
        },
      },
      include: { items: true, client: { select: { id: true, firstName: true, lastName: true } } },
    });

    return NextResponse.json({ data: facture });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    const { id } = await ctx.params;
    const facture = await prisma.facture.findFirst({ where: { id, companyId: user.companyId } });
    if (!facture) return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 });

    // Only allow deletion of EN_ATTENTE invoices (legal requirement: no deletion of sent/paid invoices)
    if (facture.status !== 'EN_ATTENTE') {
      return NextResponse.json({
        error: 'Seules les factures en attente peuvent etre supprimees. Pour annuler une facture envoyee, utilisez le statut "Annulee" ou creez un avoir.',
      }, { status: 403 });
    }

    await prisma.facture.delete({ where: { id } });
    return NextResponse.json({ message: 'Facture supprimee' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}