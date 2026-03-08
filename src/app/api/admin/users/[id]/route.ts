export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import prisma from '@/lib/prisma';

// DELETE — delete a user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || !isAdmin(admin.email)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deleting yourself
    if (id === admin.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id }, include: { company: { include: { _count: { select: { users: true } } } } } });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // If last user in company, delete entire company (cascade will handle related data)
    if (user.company._count.users <= 1) {
      await prisma.company.delete({ where: { id: user.companyId } });
    } else {
      await prisma.user.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH — update user fields (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || !isAdmin(admin.email)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const allowedFields: Record<string, boolean> = {
      emailVerified: true,
      role: true,
    };

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields[key]) data[key] = value;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 });
    }

    const user = await prisma.user.update({ where: { id }, data });

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, emailVerified: user.emailVerified, role: user.role } });
  } catch (error: any) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
