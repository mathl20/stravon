export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS, ALL_PERMISSIONS, DEFAULT_PERMISSIONS } from '@/lib/permissions';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.TEAM_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const member = await prisma.user.findFirst({
      where: { id: params.id, companyId: user.companyId },
      select: { id: true, role: true, permissions: true },
    });

    if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });

    return NextResponse.json({
      data: {
        permissions: member.permissions,
        effectivePermissions: member.permissions.length > 0 ? member.permissions : (DEFAULT_PERMISSIONS[member.role] || []),
        isCustom: member.permissions.length > 0,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.TEAM_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (params.id === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier vos propres permissions' }, { status: 400 });
    }

    const member = await prisma.user.findFirst({
      where: { id: params.id, companyId: user.companyId },
      select: { id: true, role: true },
    });

    if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });

    if (member.role === 'PATRON') {
      return NextResponse.json({ error: 'Impossible de modifier les permissions d\'un patron' }, { status: 400 });
    }

    const body = await req.json();
    const { permissions: newPerms } = body;

    if (!Array.isArray(newPerms)) {
      return NextResponse.json({ error: 'Le champ permissions doit être un tableau' }, { status: 400 });
    }

    const invalid = newPerms.filter((p: string) => !ALL_PERMISSIONS.includes(p as any));
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Permissions invalides : ${invalid.join(', ')}` }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { permissions: newPerms },
    });

    return NextResponse.json({ data: { permissions: newPerms } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.TEAM_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (params.id === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier vos propres permissions' }, { status: 400 });
    }

    const member = await prisma.user.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });

    await prisma.user.update({
      where: { id: params.id },
      data: { permissions: [] },
    });

    return NextResponse.json({ data: { message: 'Permissions réinitialisées aux valeurs par défaut' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}