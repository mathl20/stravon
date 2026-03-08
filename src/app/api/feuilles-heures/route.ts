export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { feuilleHeureSchema } from '@/lib/validations';
import { canViewAllTimesheets, getEffectivePermissions } from '@/lib/permissions';
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
    const valide = sp.get('valide');

    const where: Record<string, unknown> = {
      entrepriseId: user.companyId,
      ...(!canViewAllTimesheets(perms) && { utilisateurId: user.id }),
      ...(utilisateurId && canViewAllTimesheets(perms) && { utilisateurId }),
      ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
      ...(dateTo && { date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), lte: new Date(dateTo) } }),
      ...(valide !== null && valide !== undefined && valide !== '' && { valide: valide === 'true' }),
    };

    const feuilles = await prisma.feuilleHeure.findMany({
      where: where as any,
      include: {
        utilisateur: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });

    return NextResponse.json({ data: feuilles });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await request.json();
    const parsed = feuilleHeureSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { date, heuresTravaillees, panierRepas, zone, grandDeplacement, interventionId } = parsed.data;
    const heureDebut = body.heureDebut || null;
    const heureFin = body.heureFin || null;

    // Auto-calculate hours from start/end if provided and heuresTravaillees not set
    let heuresCalc = heuresTravaillees;
    if (heureDebut && heureFin && !heuresTravaillees) {
      const [hd, md] = heureDebut.split(':').map(Number);
      const [hf, mf] = heureFin.split(':').map(Number);
      heuresCalc = Math.max(0, (hf * 60 + mf - hd * 60 - md) / 60);
    }

    // Vérifier que l'intervention appartient à la même entreprise
    if (interventionId) {
      const intervention = await prisma.intervention.findFirst({
        where: { id: interventionId, companyId: user.companyId },
      });
      if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });
    }

    const feuille = await prisma.feuilleHeure.create({
      data: {
        date: new Date(date),
        heureDebut,
        heureFin,
        heuresTravaillees: heuresCalc,
        panierRepas: panierRepas || false,
        zone: zone || null,
        grandDeplacement: grandDeplacement || false,
        utilisateurId: user.id,
        interventionId: interventionId || null,
        entrepriseId: user.companyId,
      },
      include: {
        utilisateur: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
      },
    });

    // Notify managers (PATRON, SECRETAIRE) about new timesheet
    if (user.role === 'EMPLOYE') {
      const managers = await prisma.user.findMany({
        where: { companyId: user.companyId, role: { in: ['PATRON', 'SECRETAIRE'] } },
      });
      for (const manager of managers) {
        await createNotification(
          'FEUILLE_HEURE',
          `${user.firstName} ${user.lastName} a envoy\u00e9 une feuille d'heures du ${new Date(date).toLocaleDateString('fr-FR')}`,
          `/feuilles-heures`,
          manager.id,
          user.companyId
        );
      }
    }

    return NextResponse.json({ data: feuille }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}