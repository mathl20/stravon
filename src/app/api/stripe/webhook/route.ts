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
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleConnectAccountUpdated(account);
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

// ── Affiliate commission + auto-transfer via Stripe Connect ─────────

const AFFILIATE_RATE = 0.15; // 15%
const MIN_TRANSFER_AMOUNT = 5; // Minimum 5€ to trigger a transfer

async function handleAffiliateCommission(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const amountPaid = (invoice.amount_paid || 0) / 100; // Convert from cents to euros
  if (amountPaid <= 0) return;

  // Find the company that paid this invoice
  const company = await prisma.company.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, affiliateReferredById: true, subscriptionStatus: true },
  });

  if (!company || !company.affiliateReferredById) return;

  // Only create commission if the referred company has an active subscription
  if (company.subscriptionStatus !== 'active') return;

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

  // Attempt automatic transfer via Stripe Connect
  await attemptConnectTransfer(company.affiliateReferredById);
}

/**
 * Attempt to transfer the pending balance to the affiliate's Connect account.
 * Only transfers if balance >= MIN_TRANSFER_AMOUNT and account is onboarded.
 */
async function attemptConnectTransfer(affiliateCompanyId: string) {
  try {
    const affiliate = await prisma.company.findUnique({
      where: { id: affiliateCompanyId },
      select: {
        id: true,
        affiliateBalance: true,
        stripeConnectAccountId: true,
        stripeConnectOnboarded: true,
      },
    });

    if (!affiliate || !affiliate.stripeConnectAccountId || !affiliate.stripeConnectOnboarded) {
      return; // No Connect account or not yet onboarded
    }

    if (affiliate.affiliateBalance < MIN_TRANSFER_AMOUNT) {
      console.log(
        `Affiliate ${affiliateCompanyId}: balance ${affiliate.affiliateBalance}€ below minimum ${MIN_TRANSFER_AMOUNT}€, skipping transfer`
      );
      return;
    }

    const stripe = getStripe();
    const transferAmountCents = Math.round(affiliate.affiliateBalance * 100);

    // Create Stripe Transfer to Connected account
    const transfer = await stripe.transfers.create({
      amount: transferAmountCents,
      currency: 'eur',
      destination: affiliate.stripeConnectAccountId,
      description: `Commission affiliation Stravon`,
      metadata: {
        companyId: affiliateCompanyId,
      },
    });

    // Mark all pending commissions as transferred and reset balance
    await prisma.$transaction([
      prisma.affiliateCommission.updateMany({
        where: { affiliateCompanyId, status: 'pending' },
        data: {
          status: 'paid',
          paidAt: new Date(),
          stripeTransferId: transfer.id,
        },
      }),
      prisma.company.update({
        where: { id: affiliateCompanyId },
        data: { affiliateBalance: 0 },
      }),
    ]);

    console.log(
      `Stripe Connect transfer: ${affiliate.affiliateBalance}€ to ${affiliate.stripeConnectAccountId} ` +
      `(transfer ${transfer.id})`
    );
  } catch (error) {
    console.error(`Failed to transfer to affiliate ${affiliateCompanyId}:`, error);
    // Don't throw — commission is recorded, transfer can be retried
  }
}

// ── Stripe Connect account updated ──────────────────────

async function handleConnectAccountUpdated(account: Stripe.Account) {
  if (!account.id) return;

  const company = await prisma.company.findFirst({
    where: { stripeConnectAccountId: account.id },
    select: { id: true, stripeConnectOnboarded: true, affiliateBalance: true },
  });

  if (!company) return;

  const payoutsEnabled = account.payouts_enabled ?? false;

  // Update onboarded status
  if (payoutsEnabled && !company.stripeConnectOnboarded) {
    await prisma.company.update({
      where: { id: company.id },
      data: { stripeConnectOnboarded: true },
    });
    console.log(`Connect account ${account.id} is now active for company ${company.id}`);

    // If there's a pending balance, attempt transfer now
    if (company.affiliateBalance >= MIN_TRANSFER_AMOUNT) {
      await attemptConnectTransfer(company.id);
    }
  }
}
