export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { planningSchema } from '@/lib/validations';
import { canManagePlanning, getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { createNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const sp = new URL(request.url).searchParams;
    const dateFrom = sp.get('date_from');
    const dateTo = sp.get('date_to');
    const utilisateurId = sp.get('utilisateurId');

    const where: Record<string, unknown> = {
      entrepriseId: user.companyId,
      // EMPLOYE voit seulement son propre planning
      ...(!hasPermission(perms, PERMISSIONS.PLANNING_MANAGE) && { utilisateurId: user.id }),
      ...(utilisateurId && hasPermission(perms, PERMISSIONS.PLANNING_MANAGE) && { utilisateurId }),
      ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
      ...(dateTo && { date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), lte: new Date(dateTo) } }),
    };

    const plannings = await prisma.planning.findMany({
      where: where as any,
      include: {
        utilisateur: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
      },
      orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }],
      take: 200,
    });

    return NextResponse.json({ data: plannings });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    if (!canManagePlanning(perms)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = planningSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { date, heureDebut, heureFin, utilisateurId, interventionId, statut } = parsed.data;

    // Vérifier que l'utilisateur et l'intervention appartiennent à la même entreprise
    const [targetUser, intervention] = await Promise.all([
      prisma.user.findFirst({
        where: { id: utilisateurId, companyId: user.companyId },
      }),
      interventionId
        ? prisma.intervention.findFirst({
            where: { id: interventionId, companyId: user.companyId },
          })
        : null,
    ]);
    if (!targetUser) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    if (interventionId && !intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    const planning = await prisma.planning.create({
      data: {
        date: new Date(date),
        heureDebut: new Date(`${date}T${heureDebut}`),
        heureFin: new Date(`${date}T${heureFin}`),
        statut: statut || 'PREVU',
        utilisateurId,
        interventionId: interventionId || null,
        entrepriseId: user.companyId,
      },
      include: {
        utilisateur: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
      },
    });

    // Notifier l'utilisateur assigné (si ce n'est pas celui qui crée)
    if (utilisateurId !== user.id) {
      const dateStr = new Date(date).toLocaleDateString('fr-FR');
      createNotification(
        'PLANNING',
        `Nouveau créneau planifié le ${dateStr}`,
        '/planning',
        utilisateurId,
        user.companyId,
      );
    }

    return NextResponse.json({ data: planning }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}