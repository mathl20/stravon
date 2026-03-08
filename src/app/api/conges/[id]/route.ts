export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { createNotification } from '@/lib/notifications';

type Ctx = { params: Promise<{ id: string }> };

// DELETE - supprimer une demande en attente (par le demandeur)
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { id } = await params;

    const demande = await prisma.demandeConge.findFirst({
      where: { id, entrepriseId: user.companyId },
    });
    if (!demande) return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 });

    const perms = getEffectivePermissions(user);
    const canManage = hasPermission(perms, PERMISSIONS.TIMESHEETS_MANAGE);

    if (!canManage && demande.demandeurId !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (demande.statut !== 'EN_ATTENTE' && !canManage) {
      return NextResponse.json({ error: 'Impossible de supprimer une demande déjà traitée' }, { status: 400 });
    }

    // Si congé accepté, supprimer les entrées planning liées
    if (demande.statut === 'ACCEPTE') {
      await deletePlanningEntries(demande);
    }

    await prisma.demandeConge.delete({ where: { id } });
    return NextResponse.json({ message: 'Demande supprimée' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - accepter ou refuser une demande (manager uniquement)
export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    if (!hasPermission(perms, PERMISSIONS.TIMESHEETS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, reponse } = body as { action: 'accepter' | 'refuser'; reponse?: string };

    if (!action || !['accepter', 'refuser'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    const demande = await prisma.demandeConge.findFirst({
      where: { id, entrepriseId: user.companyId },
      include: { demandeur: { select: { firstName: true, lastName: true } } },
    });
    if (!demande) return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 });

    if (demande.statut !== 'EN_ATTENTE') {
      return NextResponse.json({ error: 'Cette demande a déjà été traitée' }, { status: 400 });
    }

    const newStatut = action === 'accepter' ? 'ACCEPTE' : 'REFUSE';

    const updated = await prisma.demandeConge.update({
      where: { id },
      data: {
        statut: newStatut,
        validateurId: user.id,
        dateReponse: new Date(),
        reponse: reponse?.trim() || null,
      },
      include: {
        demandeur: { select: { id: true, firstName: true, lastName: true } },
        validateur: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Notification à l'employé
    const typeLabels: Record<string, string> = {
      CONGE_PAYE: 'congé payé', MALADIE: 'arrêt maladie', RTT: 'RTT', SANS_SOLDE: 'congé sans solde',
    };
    const typeLabel = typeLabels[demande.type] || 'congé';

    createNotification(
      'CONGE',
      action === 'accepter'
        ? `Votre demande de ${typeLabel} a été acceptée`
        : `Votre demande de ${typeLabel} a été refusée${reponse ? ` — ${reponse}` : ''}`,
      '/conges',
      demande.demandeurId,
      user.companyId,
    );

    // Si accepté, créer les entrées dans le planning
    if (action === 'accepter') {
      await createPlanningEntries(updated);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Create planning entries for each day of leave
async function createPlanningEntries(demande: any) {
  const start = new Date(demande.dateDebut);
  const end = new Date(demande.dateFin);
  const typeLabels: Record<string, string> = {
    CONGE_PAYE: 'Congé payé', MALADIE: 'Maladie', RTT: 'RTT', SANS_SOLDE: 'Sans solde',
  };
  const label = typeLabels[demande.type] || 'Congé';

  const entries = [];
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    // Skip weekends
    if (day !== 0 && day !== 6) {
      const dateStr = current.toISOString().split('T')[0];
      entries.push({
        date: new Date(dateStr),
        heureDebut: new Date(`${dateStr}T08:00:00`),
        heureFin: new Date(`${dateStr}T17:00:00`),
        statut: `CONGE_${demande.type}`,
        utilisateurId: demande.demandeurId,
        entrepriseId: demande.entrepriseId,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  if (entries.length > 0) {
    await prisma.planning.createMany({ data: entries });
  }
}

// Delete planning entries for a cancelled leave
async function deletePlanningEntries(demande: any) {
  await prisma.planning.deleteMany({
    where: {
      utilisateurId: demande.demandeurId,
      entrepriseId: demande.entrepriseId,
      statut: `CONGE_${demande.type}`,
      date: { gte: demande.dateDebut, lte: demande.dateFin },
    },
  });
}