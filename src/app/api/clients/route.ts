export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { clientSchema } from '@/lib/validations';
import { canManageClients, getEffectivePermissions } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const search = new URL(request.url).searchParams.get('search') || '';

    const where = {
      companyId: user.companyId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const clients = await prisma.client.findMany({
      where,
      include: { _count: { select: { interventions: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ data: clients });
  } catch (error) {
    console.error('Get clients error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    // TECHNICIAN ne peut pas créer de clients
    if (!canManageClients(perms)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = clientSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const client = await prisma.client.create({
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        postalCode: parsed.data.postalCode || null,
        notes: parsed.data.notes || null,
        companyId: user.companyId,
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    console.error('Create client error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}