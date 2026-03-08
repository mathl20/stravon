export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { factureSchema } from '@/lib/validations';
import { calculateTTC } from '@/lib/utils';
import { canManageFactures, getEffectivePermissions } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    // Lazy update overdue invoices
    await prisma.facture.updateMany({
      where: { companyId: user.companyId, status: 'EN_ATTENTE', dateEcheance: { lt: new Date() } },
      data: { status: 'EN_RETARD' },
    });

    const sp = new URL(request.url).searchParams;
    const status = sp.get('status');
    const search = sp.get('search');

    const where: Record<string, unknown> = {
      companyId: user.companyId,
      ...(status && { status }),
    };

    if (search) {
      (where as any).OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const factures = await prisma.facture.findMany({
      where: where as any,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const res = NextResponse.json({ data: factures });
    res.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    const body = await request.json();
    const parsed = factureSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { clientId, interventionId, devisId, date, dateEcheance, tvaRate: tva, conditionsPaiement, mentionsLegales, notes, items } = parsed.data;
    const tvaRate = tva ?? 20;

    const client = await prisma.client.findFirst({ where: { id: clientId, companyId: user.companyId } });
    if (!client) return NextResponse.json({ error: 'Client non trouve' }, { status: 404 });

    // Auto-calculate dateEcheance from company's delaiPaiementJours if not provided
    let echeance = dateEcheance ? new Date(dateEcheance) : null;
    if (!echeance) {
      const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { delaiPaiementJours: true } });
      const delai = company?.delaiPaiementJours ?? 30;
      echeance = new Date(date);
      echeance.setDate(echeance.getDate() + delai);
    }

    const amountHT = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const amountTTC = calculateTTC(amountHT, tvaRate);

    // Atomic transaction to prevent race conditions on numero
    const facture = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const prefix = `FAC-${year}-`;
      const lastFacture = await tx.facture.findFirst({
        where: { companyId: user.companyId, numero: { startsWith: prefix } },
        orderBy: { numero: 'desc' },
      });
      const lastNum = lastFacture ? parseInt(lastFacture.numero.split('-')[2]) : 0;
      const numero = `${prefix}${String(lastNum + 1).padStart(4, '0')}`;

      return tx.facture.create({
        data: {
          numero,
          date: new Date(date),
          dateEcheance: echeance,
          amountHT,
          tvaRate,
          amountTTC,
          conditionsPaiement: conditionsPaiement || null,
          mentionsLegales: mentionsLegales || null,
          notes: notes || null,
          interventionId: interventionId || null,
          devisId: devisId || null,
          clientId,
          companyId: user.companyId,
          createdById: user.id,
          items: {
            create: items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: Math.round(i.quantity * i.unitPrice * 100) / 100,
            })),
          },
        },
        include: { client: { select: { id: true, firstName: true, lastName: true } }, items: true },
      });
    });

    return NextResponse.json({ data: facture }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la creation' }, { status: 500 });
  }
}