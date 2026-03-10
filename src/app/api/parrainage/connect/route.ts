export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stravon.fr';

    let connectAccountId = (user as any).parrainStripeConnectId;

    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { userId: user.id, type: 'parrainage' },
      });
      connectAccountId = account.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { parrainStripeConnectId: connectAccountId },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: `${appUrl}/parrainage?connect=refresh`,
      return_url: `${appUrl}/parrainage?connect=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Error creating parrainage connect:', error);
    return NextResponse.json({ error: error.message || 'Erreur Stripe Connect' }, { status: 500 });
  }
}
