export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const q = request.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) return NextResponse.json({ data: [] });

    // Search previous material items from this company's devis
    const items = await prisma.devisItem.findMany({
      where: {
        devis: { companyId: user.companyId },
        type: 'materiel',
        description: { contains: q, mode: 'insensitive' },
      },
      select: {
        description: true,
        unitPrice: true,
        prixAchat: true,
        coefMarge: true,
        fournisseur: true,
        referenceFournisseur: true,
      },
      orderBy: { devis: { date: 'desc' } },
      take: 50,
    });

    // Deduplicate by description (keep most recent)
    const seen = new Map<string, typeof items[0]>();
    for (const item of items) {
      const key = item.description.toLowerCase();
      if (!seen.has(key)) seen.set(key, item);
    }

    const suggestions = Array.from(seen.values()).slice(0, 10);

    return NextResponse.json({ data: suggestions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
