import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle successful subscription payment
  if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
    try {
      const data = event.data.object as any;
      const customerEmail = data.customer_email || data.customer_details?.email;

      if (customerEmail) {
        await handleReferralReward(customerEmail);
      }
    } catch (error) {
      console.error('Error processing referral reward:', error);
    }
  }

  return NextResponse.json({ received: true });
}

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
  // Find the user who just paid
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  // Find a PENDING referral where this user is the referred (filleul)
  const referral = await prisma.referral.findFirst({
    where: {
      referredUserId: user.id,
      status: 'PENDING',
    },
  });

  if (!referral) return;

  // Check cap for both users (rolling 12-month window)
  const [referrerRewards, referredRewards] = await Promise.all([
    countRewardsLast12Months(referral.referrerUserId),
    countRewardsLast12Months(referral.referredUserId),
  ]);

  const referrerCanEarn = referrerRewards < MAX_FREE_MONTHS_PER_YEAR;
  const referredCanEarn = referredRewards < MAX_FREE_MONTHS_PER_YEAR;

  // Mark referral as REWARDED regardless (the referral itself is valid)
  const operations: any[] = [
    prisma.referral.update({
      where: { id: referral.id },
      data: { status: 'REWARDED', rewardedAt: new Date() },
    }),
  ];

  // Only increment free months if under cap
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
