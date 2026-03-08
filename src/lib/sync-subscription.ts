import { getStripe } from './stripe';
import prisma from './prisma';

// In-memory cache: companyId -> last sync timestamp
const lastSyncMap = new Map<string, number>();
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Syncs the company's subscription data with Stripe.
 * Throttled to once per 5 minutes per company to avoid excessive API calls.
 */
export async function syncSubscriptionFromStripe(companyId: string): Promise<void> {
  const now = Date.now();
  const lastSync = lastSyncMap.get(companyId) || 0;
  if (now - lastSync < SYNC_INTERVAL_MS) return;
  lastSyncMap.set(companyId, now);
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      stripePriceId: true,
      subscriptionCurrentPeriodEnd: true,
    },
  });

  if (!company?.stripeCustomerId) return;

  const stripe = getStripe();

  try {
    if (company.stripeSubscriptionId) {
      // Sync from known subscription
      const sub = await stripe.subscriptions.retrieve(company.stripeSubscriptionId);
      const priceId = sub.items.data[0]?.price?.id || null;
      const periodEnd = (sub as any).current_period_end
        ? new Date((sub as any).current_period_end * 1000)
        : null;

      // Only update if something changed
      if (
        company.subscriptionStatus !== sub.status ||
        company.stripePriceId !== priceId ||
        company.subscriptionCurrentPeriodEnd?.getTime() !== periodEnd?.getTime()
      ) {
        await prisma.company.update({
          where: { id: companyId },
          data: {
            subscriptionStatus: sub.status,
            stripePriceId: priceId,
            subscriptionCurrentPeriodEnd: periodEnd,
          },
        });
      }
    } else {
      // No subscription ID stored — check if customer has any active subscriptions
      const subs = await stripe.subscriptions.list({
        customer: company.stripeCustomerId,
        status: 'active',
        limit: 1,
      });

      if (subs.data.length > 0) {
        const sub = subs.data[0];
        const priceId = sub.items.data[0]?.price?.id || null;
        const periodEnd = (sub as any).current_period_end
          ? new Date((sub as any).current_period_end * 1000)
          : null;

        await prisma.company.update({
          where: { id: companyId },
          data: {
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            subscriptionStatus: sub.status,
            subscriptionCurrentPeriodEnd: periodEnd,
          },
        });
      }
    }
  } catch (error) {
    // Don't throw — sync is best-effort
    console.error('Subscription sync error:', error);
  }
}
