export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { iban } = await request.json();
    const cleaned = iban ? String(iban).replace(/\s+/g, '').toUpperCase() : null;

    if (cleaned && (cleaned.length < 14 || cleaned.length > 34)) {
      return NextResponse.json({ error: 'IBAN invalide' }, { status: 400 });
    }

    await prisma.company.update({
      where: { id: user.companyId },
      data: { iban: cleaned },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
