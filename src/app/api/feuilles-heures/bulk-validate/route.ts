import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canValidateTimesheets, getEffectivePermissions } from '@/lib/permissions';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    if (!canValidateTimesheets(perms)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { ids, action, motifRefus } = body as {
      ids: string[];
      action: 'validate' | 'refuse';
      motifRefus?: string;
    };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Aucune feuille sélectionnée' }, { status: 400 });
    }

    if (!action || !['validate', 'refuse'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    // Fetch all matching feuilles belonging to this company
    const feuilles = await prisma.feuilleHeure.findMany({
      where: { id: { in: ids }, entrepriseId: user.companyId },
      select: { id: true, utilisateurId: true, statut: true },
    });

    if (feuilles.length === 0) {
      return NextResponse.json({ error: 'Aucune feuille trouvée' }, { status: 404 });
    }

    const now = new Date();

    if (action === 'validate') {
      await prisma.feuilleHeure.updateMany({
        where: { id: { in: feuilles.map((f) => f.id) } },
        data: {
          valide: true,
          statut: 'VALIDEE',
          valideParId: user.id,
          dateValidation: now,
          motifRefus: null,
        },
      });

      // Notify each unique user whose feuille was validated
      const userIds = [...new Set(feuilles.filter((f) => f.utilisateurId !== user.id).map((f) => f.utilisateurId))];
      for (const uid of userIds) {
        const count = feuilles.filter((f) => f.utilisateurId === uid).length;
        createNotification(
          'FEUILLE_HEURE',
          `${count} feuille${count > 1 ? 's' : ''} d'heures validée${count > 1 ? 's' : ''}`,
          '/feuilles-heures',
          uid,
          user.companyId,
        );
      }
    } else {
      const motif = motifRefus && typeof motifRefus === 'string' ? motifRefus.trim() : null;

      await prisma.feuilleHeure.updateMany({
        where: { id: { in: feuilles.map((f) => f.id) } },
        data: {
          valide: false,
          statut: 'REFUSEE',
          valideParId: user.id,
          dateValidation: now,
          motifRefus: motif,
        },
      });

      const userIds = [...new Set(feuilles.filter((f) => f.utilisateurId !== user.id).map((f) => f.utilisateurId))];
      for (const uid of userIds) {
        const count = feuilles.filter((f) => f.utilisateurId === uid).length;
        createNotification(
          'FEUILLE_HEURE',
          `${count} feuille${count > 1 ? 's' : ''} d'heures refusée${count > 1 ? 's' : ''}${motif ? ` — ${motif}` : ''}`,
          '/feuilles-heures',
          uid,
          user.companyId,
        );
      }
    }

    return NextResponse.json({
      message: `${feuilles.length} feuille${feuilles.length > 1 ? 's' : ''} ${action === 'validate' ? 'validée' : 'refusée'}${feuilles.length > 1 ? 's' : ''}`,
      count: feuilles.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
