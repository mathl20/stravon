export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { clientSchema } from '@/lib/validations';
import { canManageClients, getEffectivePermissions } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { id } = await params;

    const client = await prisma.client.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        interventions: {
          include: {
            items: true,
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            photos: { take: 4, orderBy: { createdAt: 'desc' } },
          } as any,
          orderBy: { date: 'desc' },
        },
        devis: {
          include: { items: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { date: 'desc' },
        },
        factures: {
          include: { items: true, intervention: { select: { id: true, reference: true } } },
          orderBy: { date: 'desc' },
        },
      },
    });
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    return NextResponse.json({ data: client });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    if (!canManageClients(perms)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const existing = await prisma.client.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });

    const client = await prisma.client.update({
      where: { id },
      data: { ...parsed.data, email: parsed.data.email || null, phone: parsed.data.phone || null, address: parsed.data.address || null, city: parsed.data.city || null, postalCode: parsed.data.postalCode || null, notes: parsed.data.notes || null },
    });
    return NextResponse.json({ data: client });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    if (!canManageClients(perms)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.client.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ message: 'Client supprimé' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}