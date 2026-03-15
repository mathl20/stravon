export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET — return current guide step
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { guideStep: true },
    });

    return NextResponse.json({ guideStep: userData?.guideStep ?? null });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

// POST — update guide step or skip
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await request.json();

    if (body.action === 'skip' || body.action === 'complete') {
      await prisma.user.update({
        where: { id: user.id },
        data: { guideStep: null },
      });
      return NextResponse.json({ guideStep: null });
    }

    if (body.action === 'restart') {
      await prisma.user.update({
        where: { id: user.id },
        data: { guideStep: 0 },
      });
      return NextResponse.json({ guideStep: 0 });
    }

    if (typeof body.step === 'number') {
      await prisma.user.update({
        where: { id: user.id },
        data: { guideStep: body.step },
      });
      return NextResponse.json({ guideStep: body.step });
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
