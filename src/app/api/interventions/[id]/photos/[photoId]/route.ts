export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const { id, photoId } = await ctx.params;
    const intervention = await prisma.intervention.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    if (!hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE) && intervention.createdById !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const photo = await prisma.interventionPhoto.findFirst({
      where: { id: photoId, interventionId: id },
    });
    if (!photo) return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });

    await prisma.interventionPhoto.delete({ where: { id: photoId } });
    return NextResponse.json({ message: 'Photo supprimée' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}