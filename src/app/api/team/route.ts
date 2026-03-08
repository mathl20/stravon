export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { inviteUserSchema } from '@/lib/validations';
import { canManageTeam, canViewAllTimesheets, getEffectivePermissions } from '@/lib/permissions';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    // PATRON et SECRETAIRE peuvent voir l'équipe (team page, planning, etc.)
    if (!canManageTeam(perms) && !canViewAllTimesheets(perms)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const members = await prisma.user.findMany({
      where: { companyId: user.companyId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const perms = user ? getEffectivePermissions(user) : null;
    if (!user || !perms || !canManageTeam(perms)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = inviteUserSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { firstName, lastName, email, password, role } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);

    const member = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash: hash,
        role,
        companyId: user.companyId,
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}