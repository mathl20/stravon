export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

// PUT - Update a prestation
export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.prestation.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) return NextResponse.json({ error: 'Prestation non trouvée' }, { status: 404 });

    const body = await request.json();
    const prestation = await prisma.prestation.update({
      where: { id },
      data: {
        ...(body.label != null && { label: String(body.label).trim() }),
        ...(body.description !== undefined && { description: body.description ? String(body.description).trim() : null }),
        ...(body.category != null && { category: String(body.category).trim() }),
        ...(body.hours != null && { hours: Number(body.hours) }),
        ...(body.prixMateriel != null && { prixMateriel: Number(body.prixMateriel) }),
      },
    });

    return NextResponse.json({ data: prestation });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Delete a prestation
export async function DELETE(_: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.prestation.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) return NextResponse.json({ error: 'Prestation non trouvée' }, { status: 404 });

    await prisma.prestation.delete({ where: { id } });

    return NextResponse.json({ message: 'Prestation supprimée' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}