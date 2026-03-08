import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const relances = await prisma.relance.findMany({
      where: { companyId: user.companyId } as any,
      include: {
        facture: {
          include: { client: true },
        },
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ data: relances });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
