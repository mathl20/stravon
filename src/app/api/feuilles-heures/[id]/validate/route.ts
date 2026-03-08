import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canValidateTimesheets, getEffectivePermissions } from '@/lib/permissions';
import { createNotification } from '@/lib/notifications';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    if (!canValidateTimesheets(perms)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.feuilleHeure.findFirst({
      where: { id, entrepriseId: user.companyId },
    });
    if (!existing) return NextResponse.json({ error: 'Feuille non trouvée' }, { status: 404 });

    const wasValidated = existing.statut === 'VALIDEE';
    const newStatut = wasValidated ? 'EN_ATTENTE' : 'VALIDEE';

    const feuille = await prisma.feuilleHeure.update({
      where: { id },
      data: {
        valide: !wasValidated,
        statut: newStatut,
        valideParId: wasValidated ? null : user.id,
        dateValidation: wasValidated ? null : new Date(),
        motifRefus: null,
      },
      include: {
        utilisateur: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
      },
    });

    // Notify the owner
    if (existing.utilisateurId !== user.id) {
      createNotification(
        'FEUILLE_HEURE',
        !wasValidated ? 'Votre feuille d\'heures a été validée' : 'Votre feuille d\'heures a été dé-validée',
        '/feuilles-heures',
        existing.utilisateurId,
        user.companyId,
      );
    }

    return NextResponse.json({ data: feuille });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
