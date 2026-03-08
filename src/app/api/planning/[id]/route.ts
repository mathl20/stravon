import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { planningSchema } from '@/lib/validations';
import { canManagePlanning, getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    const { id } = await params;

    const planning = await prisma.planning.findFirst({
      where: {
        id,
        entrepriseId: user.companyId,
        ...(!hasPermission(perms, PERMISSIONS.PLANNING_MANAGE) && { utilisateurId: user.id }),
      },
      include: {
        utilisateur: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
      },
    });
    if (!planning) return NextResponse.json({ error: 'Créneau non trouvé' }, { status: 404 });

    return NextResponse.json({ data: planning });
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

    if (!canManagePlanning(perms)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.planning.findFirst({
      where: { id, entrepriseId: user.companyId },
    });
    if (!existing) return NextResponse.json({ error: 'Créneau non trouvé' }, { status: 404 });

    const parsed = planningSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { date, heureDebut, heureFin, utilisateurId, interventionId, statut } = parsed.data;

    // Vérifier que l'utilisateur cible appartient à la même entreprise
    const targetUser = await prisma.user.findFirst({
      where: { id: utilisateurId, companyId: user.companyId },
    });
    if (!targetUser) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

    const planning = await prisma.planning.update({
      where: { id },
      data: {
        date: new Date(date),
        heureDebut: new Date(`${date}T${heureDebut}`),
        heureFin: new Date(`${date}T${heureFin}`),
        statut: statut || existing.statut,
        utilisateurId,
        interventionId: interventionId || null,
      },
      include: {
        utilisateur: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
      },
    });

    return NextResponse.json({ data: planning });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    if (!canManagePlanning(perms)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.planning.findFirst({
      where: { id, entrepriseId: user.companyId },
    });
    if (!existing) return NextResponse.json({ error: 'Créneau non trouvé' }, { status: 404 });

    await prisma.planning.delete({ where: { id } });
    return NextResponse.json({ message: 'Supprimé' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
