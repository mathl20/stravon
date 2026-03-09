export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { interventionSchema } from '@/lib/validations';
import { generateReference, calculateTTC } from '@/lib/utils';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const sp = new URL(request.url).searchParams;
    const status = sp.get('status');
    const search = sp.get('search') || '';

    const where: Record<string, unknown> = {
      companyId: user.companyId,
      ...(!hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE) && { createdById: user.id }),
      ...(status && { status: status as 'PENDING' | 'INVOICED' | 'PAID' }),
      ...(search && {
        OR: [
          { reference: { contains: search, mode: 'insensitive' as const } },
          { title: { contains: search, mode: 'insensitive' as const } },
          { client: { firstName: { contains: search, mode: 'insensitive' as const } } },
          { client: { lastName: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const interventions = await prisma.intervention.findMany({
      where: where as any,
      include: { client: true, createdBy: { select: { id: true, firstName: true, lastName: true } }, items: true } as any,
      orderBy: { date: 'desc' },
      take: 200,
    });

    const res = NextResponse.json({ data: interventions });
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
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await request.json();
    const parsed = interventionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { title, description, date, clientId, status, tvaRate = 20, notes, items } = parsed.data;

    // Verify client ownership
    const client = await prisma.client.findFirst({ where: { id: clientId, companyId: user.companyId } });
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });

    const amountHT = Math.round(items.reduce((s, it) => s + it.quantity * it.unitPrice, 0) * 100) / 100;
    const amountTTC = calculateTTC(amountHT, tvaRate);

    const intervention = await prisma.intervention.create({
      data: {
        reference: generateReference(),
        title,
        description: description || null,
        address: body.address || null,
        date: new Date(date),
        status: status || 'PENDING',
        amountHT,
        tvaRate,
        amountTTC,
        notes: notes || null,
        heuresEstimees: body.heuresEstimees != null ? Number(body.heuresEstimees) || null : null,
        clientId,
        createdById: user.id,
        companyId: user.companyId,
        items: {
          create: items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: Math.round(it.quantity * it.unitPrice * 100) / 100,
            type: (it as any).type || 'prestation',
            ...((it as any).prixAchat != null ? { prixAchat: (it as any).prixAchat } : {}),
            ...((it as any).coefMarge != null ? { coefMarge: (it as any).coefMarge } : {}),
          })),
        },
      } as any,
      include: { items: true, client: true, createdBy: { select: { id: true, firstName: true, lastName: true } } } as any,
    });

    return NextResponse.json({ data: intervention }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}