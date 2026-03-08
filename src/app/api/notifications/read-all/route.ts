import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    await prisma.notification.updateMany({
      where: { userId: user.id, lu: false },
      data: { lu: true },
    });

    return NextResponse.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
