export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentAmbassador } from '@/lib/ambassador-auth';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

// POST — create Connect account and return onboarding link
export async function POST() {
  try {
    const ambassador = await getCurrentAmbassador();
    if (!ambassador) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000';

    let accountId = ambassador.stripeConnectAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: ambassador.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          ambassadorId: ambassador.id,
          type: 'ambassador',
        },
      });

      accountId = account.id;
      await prisma.ambassador.update({
        where: { id: ambassador.id },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/ambassadeur/dashboard?connect=refresh`,
      return_url: `${appUrl}/ambassadeur/dashboard?connect=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Ambassador Connect error:', error);
    return NextResponse.json({ error: error.message || 'Erreur Stripe Connect' }, { status: 500 });
  }
}
