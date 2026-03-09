export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerEmail = invoice.customer_email;
        if (customerEmail) {
          await handleReferralReward(customerEmail);
        }
        // Track affiliate commissions
        await handleAffiliateCommission(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.error(`Payment failed for customer ${invoice.customer}`, invoice.id);
        break;
      }
    }
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
  }

  return NextResponse.json({ received: true });
}

// ── Subscription handlers ──────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId;
  if (!companyId) return;

  if (session.subscription) {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await prisma.company.update({
      where: { id: companyId },
      data: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price?.id,
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      },
    });
  }

  // Handle referral reward
  const customerEmail = session.customer_email || session.customer_details?.email;
  if (customerEmail) {
    await handleReferralReward(customerEmail);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await prisma.company.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price?.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await prisma.company.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
    },
  });
}

// ── Referral reward ────────────────────────────────────────

const MAX_FREE_MONTHS_PER_YEAR = 3;

async function countRewardsLast12Months(userId: string): Promise<number> {
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const count = await prisma.referral.count({
    where: {
      status: 'REWARDED',
      rewardedAt: { gte: twelveMonthsAgo },
      OR: [
        { referrerUserId: userId },
        { referredUserId: userId },
      ],
    },
  });
  return count;
}

async function handleReferralReward(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const referral = await prisma.referral.findFirst({
    where: {
      referredUserId: user.id,
      status: 'PENDING',
    },
  });

  if (!referral) return;

  const [referrerRewards, referredRewards] = await Promise.all([
    countRewardsLast12Months(referral.referrerUserId),
    countRewardsLast12Months(referral.referredUserId),
  ]);

  const referrerCanEarn = referrerRewards < MAX_FREE_MONTHS_PER_YEAR;
  const referredCanEarn = referredRewards < MAX_FREE_MONTHS_PER_YEAR;

  const operations: any[] = [
    prisma.referral.update({
      where: { id: referral.id },
      data: { status: 'REWARDED', rewardedAt: new Date() },
    }),
  ];

  if (referrerCanEarn) {
    operations.push(
      prisma.user.update({
        where: { id: referral.referrerUserId },
        data: { freeMonthsEarned: { increment: 1 } },
      })
    );
  }
  if (referredCanEarn) {
    operations.push(
      prisma.user.update({
        where: { id: referral.referredUserId },
        data: { freeMonthsEarned: { increment: 1 } },
      })
    );
  }

  await prisma.$transaction(operations);

  console.log(
    `Referral rewarded: referrer=${referral.referrerUserId}(${referrerCanEarn ? '+1' : 'cap reached'}), ` +
    `referred=${referral.referredUserId}(${referredCanEarn ? '+1' : 'cap reached'})`
  );
}

// ── Affiliate commission ─────────────────────────────────

const AFFILIATE_RATE = 0.15; // 15%

async function handleAffiliateCommission(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const amountPaid = (invoice.amount_paid || 0) / 100; // Convert from cents to euros
  if (amountPaid <= 0) return;

  // Find the company that paid this invoice
  const company = await prisma.company.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, affiliateReferredById: true },
  });

  if (!company || !company.affiliateReferredById) return;

  // Check if commission already exists for this invoice
  const existingCommission = await prisma.affiliateCommission.findFirst({
    where: { stripeInvoiceId: invoice.id },
  });
  if (existingCommission) return;

  const commissionAmount = Math.round(amountPaid * AFFILIATE_RATE * 100) / 100;

  // Create commission and update affiliate balance
  await prisma.$transaction([
    prisma.affiliateCommission.create({
      data: {
        affiliateCompanyId: company.affiliateReferredById,
        referredCompanyId: company.id,
        stripeInvoiceId: invoice.id,
        amount: commissionAmount,
        commissionRate: AFFILIATE_RATE,
        invoiceAmount: amountPaid,
        status: 'pending',
      },
    }),
    prisma.company.update({
      where: { id: company.affiliateReferredById },
      data: { affiliateBalance: { increment: commissionAmount } },
    }),
  ]);

  console.log(
    `Affiliate commission: ${commissionAmount}€ for company ${company.affiliateReferredById} ` +
    `from invoice ${invoice.id} (${amountPaid}€)`
  );
}
