export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

const VALID_PRICE_IDS = [
  process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO,
  process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS,
].filter(Boolean);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { priceId } = await request.json();
    if (!priceId || !VALID_PRICE_IDS.includes(priceId)) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 });
    }

    const company = user.company as any;

    // Prevent starting a trial if already has subscription or active trial
    if (company.subscriptionStatus === 'active') {
      return NextResponse.json({ error: 'Vous avez deja un abonnement actif' }, { status: 400 });
    }
    if (company.trialEndsAt && new Date(company.trialEndsAt) > new Date()) {
      return NextResponse.json({ error: 'Vous avez deja un essai en cours' }, { status: 400 });
    }

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await prisma.company.update({
      where: { id: company.id },
      data: {
        trialEndsAt,
        stripePriceId: priceId,
      },
    });

    return NextResponse.json({ message: 'Essai gratuit active', trialEndsAt: trialEndsAt.toISOString() });
  } catch (error: any) {
    console.error('Start trial error:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
