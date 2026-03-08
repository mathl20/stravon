export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await ctx.params;
    const notif = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!notif) return NextResponse.json({ error: 'Notification non trouvée' }, { status: 404 });

    await prisma.notification.update({ where: { id }, data: { lu: true } });
    return NextResponse.json({ message: 'Notification lue' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}