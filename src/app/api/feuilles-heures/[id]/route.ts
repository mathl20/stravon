import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { feuilleHeureSchema } from '@/lib/validations';
import { canViewAllTimesheets, getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    const { id } = await params;

    const feuille = await prisma.feuilleHeure.findFirst({
      where: {
        id,
        entrepriseId: user.companyId,
        ...(!canViewAllTimesheets(perms) && { utilisateurId: user.id }),
      },
      include: {
        utilisateur: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
      },
    });
    if (!feuille) return NextResponse.json({ error: 'Feuille non trouvée' }, { status: 404 });

    return NextResponse.json({ data: feuille });
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
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.feuilleHeure.findFirst({
      where: { id, entrepriseId: user.companyId },
    });
    if (!existing) return NextResponse.json({ error: 'Feuille non trouvée' }, { status: 404 });

    // EMPLOYE ne peut modifier que ses propres feuilles non validées
    if (!hasPermission(perms, PERMISSIONS.TIMESHEETS_MANAGE)) {
      if (existing.utilisateurId !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      if (existing.statut === 'VALIDEE') return NextResponse.json({ error: 'Feuille déjà validée' }, { status: 403 });
    }

    const parsed = feuilleHeureSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { date, heuresTravaillees, panierRepas, zone, grandDeplacement, interventionId } = parsed.data;

    // SECRETAIRE ne peut pas modifier le champ valide
    const data: Record<string, unknown> = {
      date: new Date(date),
      heuresTravaillees,
      panierRepas: panierRepas || false,
      zone: zone || null,
      grandDeplacement: grandDeplacement || false,
      interventionId: interventionId || null,
    };

    const feuille = await prisma.feuilleHeure.update({
      where: { id },
      data: data as any,
      include: {
        utilisateur: { select: { id: true, firstName: true, lastName: true } },
        intervention: { select: { id: true, reference: true, title: true } },
      },
    });

    return NextResponse.json({ data: feuille });
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
    const { id } = await params;

    const existing = await prisma.feuilleHeure.findFirst({
      where: { id, entrepriseId: user.companyId },
    });
    if (!existing) return NextResponse.json({ error: 'Feuille non trouvée' }, { status: 404 });

    // EMPLOYE ne peut supprimer que ses propres feuilles non validées
    if (!hasPermission(perms, PERMISSIONS.TIMESHEETS_MANAGE)) {
      if (existing.utilisateurId !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      if (existing.statut === 'VALIDEE') return NextResponse.json({ error: 'Feuille déjà validée' }, { status: 403 });
    }

    await prisma.feuilleHeure.delete({ where: { id } });
    return NextResponse.json({ message: 'Supprimée' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
