export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { devisSchema } from '@/lib/validations';
import { generateDevisReference, calculateTTC } from '@/lib/utils';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const sp = new URL(request.url).searchParams;
    const status = sp.get('status');
    const search = sp.get('search');

    const where: Record<string, unknown> = {
      companyId: user.companyId,
      ...(!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE) && { createdById: user.id }),
      ...(status && { status }),
    };

    if (search) {
      (where as any).OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const devis = await prisma.devis.findMany({
      where: where as any,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const res = NextResponse.json({ data: devis });
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

    const body = await request.json();
    const parsed = devisSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { title, description, date, dateExpiration, clientId, status, tvaRate: tva, notes, conditionsParticulieres, adresseChantier, villeChantier, cpChantier, conditionsPaiement, acomptePercent, delaiTravaux, items } = parsed.data;
    const tvaRate = tva ?? 20;

    const client = await prisma.client.findFirst({ where: { id: clientId, companyId: user.companyId } });
    if (!client) return NextResponse.json({ error: 'Client non trouve' }, { status: 404 });

    const amountHT = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const amountTTC = calculateTTC(amountHT, tvaRate);

    const devis = await prisma.devis.create({
      data: {
        reference: generateDevisReference(),
        title,
        description: description || null,
        date: new Date(date),
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
        status: (status as any) || 'BROUILLON',
        amountHT,
        tvaRate,
        amountTTC,
        notes: notes || null,
        conditionsParticulieres: conditionsParticulieres || null,
        adresseChantier: adresseChantier || null,
        villeChantier: villeChantier || null,
        cpChantier: cpChantier || null,
        conditionsPaiement: conditionsPaiement || null,
        acomptePercent: acomptePercent ?? null,
        delaiTravaux: delaiTravaux || null,
        clientId,
        createdById: user.id,
        companyId: user.companyId,
        items: {
          create: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: Math.round(i.quantity * i.unitPrice * 100) / 100,
            type: i.type || 'prestation',
          })),
        },
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        items: true,
      },
    });

    return NextResponse.json({ data: devis }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la creation' }, { status: 500 });
  }
}