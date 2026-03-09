export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { syncSubscriptionFromStripe } from '@/lib/sync-subscription';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Sync with Stripe to get latest data
    await syncSubscriptionFromStripe(user.company.id);

    // Re-fetch company after sync
    const company = await prisma.company.findUnique({
      where: { id: user.company.id },
      select: {
        subscriptionStatus: true,
        stripePriceId: true,
        subscriptionCurrentPeriodEnd: true,
        isDemo: true,
        trialEndsAt: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 });
    }

    const trialActive = company.trialEndsAt && new Date(company.trialEndsAt) > new Date() && company.subscriptionStatus !== 'active';
    const effectiveStatus = trialActive ? 'trialing' : company.subscriptionStatus;

    return NextResponse.json({
      status: effectiveStatus,
      priceId: company.stripePriceId,
      currentPeriodEnd: company.subscriptionCurrentPeriodEnd,
      hasSubscription: effectiveStatus === 'active' || effectiveStatus === 'trialing',
      isDemo: company.isDemo,
      trialEndsAt: company.trialEndsAt,
    });
  } catch (error: any) {
    console.error('Subscription status error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
