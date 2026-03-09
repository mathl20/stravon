import { NextResponse } from 'next/server';
import { getCurrentUser } from './auth';
import { getPlanFromPriceId, getMaxUsersForTier } from './plans';

/**
 * Server-side plan check for API routes.
 * Returns the user if plan is sufficient, or a 403 response.
 */
export async function requirePlanTier(minTier: number) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Non authentifie' }, { status: 401 }), user: null };
  }

  const company = user.company as any;
  // Check free trial
  let effectiveStatus = company.subscriptionStatus;
  if (effectiveStatus !== 'active' && company.trialEndsAt && new Date(company.trialEndsAt) > new Date()) {
    effectiveStatus = 'trialing';
  }
  const plan = getPlanFromPriceId(company.stripePriceId, effectiveStatus);

  if (plan.tier < minTier) {
    const planNames: Record<number, string> = { 0: 'Starter', 1: 'Pro', 2: 'Business' };
    return {
      error: NextResponse.json(
        { error: `Cette fonctionnalite necessite le plan ${planNames[minTier] || 'superieur'}` },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user, plan };
}

/**
 * Check if company can add more users based on their plan.
 */
export async function checkUserLimit(companyId: string, currentTier: number): Promise<{ allowed: boolean; max: number; current: number }> {
  const prisma = (await import('./prisma')).default;
  const count = await prisma.user.count({ where: { companyId } });
  const max = getMaxUsersForTier(currentTier);
  return { allowed: count < max, max, current: count };
}
