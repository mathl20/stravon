export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { createNotification } from '@/lib/notifications';

const TYPES_CONGE = ['CONGE_PAYE', 'MALADIE', 'RTT', 'SANS_SOLDE'];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const sp = new URL(request.url).searchParams;
    const statut = sp.get('statut');
    const canManage = hasPermission(perms, PERMISSIONS.TIMESHEETS_MANAGE);

    const where: Record<string, unknown> = {
      entrepriseId: user.companyId,
      // Employé ne voit que ses propres demandes
      ...(!canManage && { demandeurId: user.id }),
      ...(statut && { statut }),
    };

    const demandes = await prisma.demandeConge.findMany({
      where: where as any,
      include: {
        demandeur: { select: { id: true, firstName: true, lastName: true } },
        validateur: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ data: demandes });
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
    const { dateDebut, dateFin, type, commentaire } = body;

    if (!dateDebut || !dateFin) {
      return NextResponse.json({ error: 'Dates de début et fin requises' }, { status: 400 });
    }

    if (!type || !TYPES_CONGE.includes(type)) {
      return NextResponse.json({ error: 'Type de congé invalide' }, { status: 400 });
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    if (fin < debut) {
      return NextResponse.json({ error: 'La date de fin doit être après la date de début' }, { status: 400 });
    }

    const demande = await prisma.demandeConge.create({
      data: {
        dateDebut: debut,
        dateFin: fin,
        type,
        commentaire: commentaire?.trim() || null,
        demandeurId: user.id,
        entrepriseId: user.companyId,
      },
      include: {
        demandeur: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Notifier les managers (patron/secrétaire)
    const managers = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        role: { in: ['PATRON', 'SECRETAIRE'] },
        id: { not: user.id },
      },
      select: { id: true },
    });

    for (const mgr of managers) {
      createNotification(
        'CONGE',
        `${user.firstName} ${user.lastName} demande un congé`,
        '/conges',
        mgr.id,
        user.companyId,
      );
    }

    return NextResponse.json({ data: demande }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}