import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { canViewAllTimesheets, getEffectivePermissions } from '@/lib/permissions';

export async function GET(_: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const where: Record<string, unknown> = {
      entrepriseId: user.companyId,
      ...(!canViewAllTimesheets(perms) && { utilisateurId: user.id }),
    };

    const feuilles = await prisma.feuilleHeure.findMany({
      where: where as any,
      include: {
        utilisateur: { select: { firstName: true, lastName: true } },
        intervention: { select: { reference: true, title: true } },
      },
      orderBy: { date: 'desc' },
    });

    const header = 'Date;Employé;Heures;Panier repas;Zone;Grand déplacement;Intervention;Statut';
    const statutLabels: Record<string, string> = { EN_ATTENTE: 'En attente', VALIDEE: 'Validée', REFUSEE: 'Refusée' };
    const rows = feuilles.map((f: any) => [
      formatDate(f.date),
      `"${f.utilisateur.firstName} ${f.utilisateur.lastName}"`,
      f.heuresTravaillees,
      f.panierRepas ? 'Oui' : 'Non',
      f.zone || '',
      f.grandDeplacement ? 'Oui' : 'Non',
      f.intervention ? f.intervention.reference : '',
      statutLabels[f.statut] || (f.valide ? 'Validée' : 'En attente'),
    ].join(';'));

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="feuilles-heures_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
