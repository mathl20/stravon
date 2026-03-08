import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    const result = await prisma.company.deleteMany({
      where: {
        isDemo: true,
        demoExpiresAt: { lt: new Date() },
      },
    });

    return NextResponse.json({
      message: `${result.count} session(s) demo expiree(s) supprimee(s)`,
      count: result.count,
    });
  } catch (error) {
    console.error('Demo cleanup error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
