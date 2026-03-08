import { getStripe } from './stripe';
import prisma from './prisma';

/**
 * Syncs the company's subscription data with Stripe.
 * Call this when loading subscription-sensitive pages to ensure data is fresh,
 * especially useful when webhooks haven't fired (local dev, manual Stripe changes).
 */
export async function syncSubscriptionFromStripe(companyId: string): Promise<void> {
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
