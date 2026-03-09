export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

// GET — get Connect account status
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectOnboarded: true,
      },
    });

    if (!company) return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 });

    let accountStatus = 'not_created'; // not_created | pending | active | restricted
    let payoutsEnabled = false;
    let chargesEnabled = false;

    if (company.stripeConnectAccountId) {
      try {
        const stripe = getStripe();
        const account = await stripe.accounts.retrieve(company.stripeConnectAccountId);
        payoutsEnabled = account.payouts_enabled ?? false;
        chargesEnabled = account.charges_enabled ?? false;

        if (payoutsEnabled) {
          accountStatus = 'active';
        } else if (account.details_submitted) {
          accountStatus = 'restricted'; // submitted but not yet approved or has issues
        } else {
          accountStatus = 'pending'; // onboarding not completed
        }

        // Update onboarded status in DB if changed
        if (payoutsEnabled && !company.stripeConnectOnboarded) {
          await prisma.company.update({
            where: { id: user.companyId },
            data: { stripeConnectOnboarded: true },
          });
        }
      } catch {
        accountStatus = 'restricted';
      }
    }

    return NextResponse.json({
      data: {
        accountStatus,
        payoutsEnabled,
        chargesEnabled,
        hasAccount: !!company.stripeConnectAccountId,
      },
    });
  } catch (error) {
    console.error('Connect status error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST — create Connect account and return onboarding link
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const stripe = getStripe();
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        stripeConnectAccountId: true,
        subscriptionStatus: true,
      },
    });

    if (!company) return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 });

    if (company.subscriptionStatus !== 'active') {
      return NextResponse.json({ error: 'Abonnement payant requis' }, { status: 403 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000';

    let accountId = company.stripeConnectAccountId;

    // Create Connect Express account if not exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: company.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'company',
        metadata: {
          companyId: company.id,
        },
      });

      accountId = account.id;
      await prisma.company.update({
        where: { id: company.id },
        data: { stripeConnectAccountId: accountId },
      });
    }

    // Create Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/affiliation?connect=refresh`,
      return_url: `${appUrl}/affiliation?connect=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Connect onboarding error:', error);
    return NextResponse.json({ error: error.message || 'Erreur Stripe Connect' }, { status: 500 });
  }
}
