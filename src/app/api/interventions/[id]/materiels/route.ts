export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.INTERVENTIONS_VIEW)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const { nom, quantite, prixUnitaire } = await request.json();
    if (!nom || !quantite) return NextResponse.json({ error: 'Nom et quantité requis' }, { status: 400 });

    const intervention = await prisma.intervention.findFirst({ where: { id, companyId: user.companyId } });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    const materiel = await prisma.materielUtilise.create({
      data: {
        nom,
        quantite: Number(quantite),
        prixUnitaire: Number(prixUnitaire) || 0,
        interventionId: id,
      },
    });

    return NextResponse.json({ data: materiel }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.INTERVENTIONS_VIEW)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const { materielId } = await request.json();

    const intervention = await prisma.intervention.findFirst({ where: { id, companyId: user.companyId } });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    await prisma.materielUtilise.deleteMany({ where: { id: materielId, interventionId: id } });
    return NextResponse.json({ message: 'Supprimé' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}