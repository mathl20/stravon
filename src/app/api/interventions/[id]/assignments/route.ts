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
    if (!hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

    // Verify intervention belongs to company
    const intervention = await prisma.intervention.findFirst({ where: { id, companyId: user.companyId } });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    // Verify user belongs to same company
    const member = await prisma.user.findFirst({ where: { id: userId, companyId: user.companyId } });
    if (!member) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

    const assignment = await prisma.interventionAssignment.create({
      data: { interventionId: id, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    });

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Cet utilisateur est déjà assigné' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const { userId } = await request.json();

    const intervention = await prisma.intervention.findFirst({ where: { id, companyId: user.companyId } });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    await prisma.interventionAssignment.deleteMany({
      where: { interventionId: id, userId },
    });

    return NextResponse.json({ message: 'Désassigné' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
