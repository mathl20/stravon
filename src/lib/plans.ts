/**
 * Plan tier system for feature gating.
 *
 * Tier 0 = Starter  (19€/mois) — 1-2 utilisateurs
 * Tier 1 = Pro      (39€/mois) — 3-8 utilisateurs
 * Tier 2 = Business (79€/mois) — 9-20 utilisateurs
 *
 * Essai gratuit 14 jours = accès Pro
 */

export const PLAN_TIERS: Record<string, { tier: number; name: string }> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO || 'starter']: { tier: 0, name: 'Starter' },
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'pro']: { tier: 1, name: 'Pro' },
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS || 'business']: { tier: 2, name: 'Business' },
};

export function getPlanFromPriceId(priceId: string | null, subscriptionStatus?: string): { tier: number; name: string } {
  // Trial = Pro access
  if (subscriptionStatus === 'trialing') return { tier: 1, name: 'Pro' };
  if (!priceId) return { tier: 0, name: 'Starter' };
  return PLAN_TIERS[priceId] || { tier: 0, name: 'Starter' };
}

/** Max users per plan tier */
export const PLAN_USER_LIMITS: Record<number, number> = {
  0: 2,   // Starter
  1: 8,   // Pro
  2: 20,  // Business
};

export function getMaxUsersForTier(tier: number): number {
  return PLAN_USER_LIMITS[tier] ?? 2;
}

/**
 * Route → minimum tier required.
 * Routes not listed here are accessible to all plans (tier 0 / Starter).
 *
 * Starter: dashboard, clients, interventions, devis, factures, planning, prestations, settings, support
 * Pro: + assistant, feuilles-heures, team, parrainage, subscription
 * Business: + conges
 */
export const ROUTE_MIN_TIER: Record<string, number> = {
  // Pro features (tier 1)
  '/assistant': 1,
  '/feuilles-heures': 1,
  '/team': 1,
  '/parrainage': 1,
  '/subscription': 0, // Always accessible so users can upgrade
  // Business features (tier 2)
  '/conges': 2,
};

/** Readable plan name for a given minimum tier */
export const TIER_PLAN_NAME: Record<number, string> = {
  0: 'Starter',
  1: 'Pro',
  2: 'Business',
};

export function getRequiredTierForRoute(pathname: string): number {
  // Check exact match first
  if (ROUTE_MIN_TIER[pathname] !== undefined) return ROUTE_MIN_TIER[pathname];
  // Check prefix match (e.g. /assistant/xxx)
  for (const [route, tier] of Object.entries(ROUTE_MIN_TIER)) {
    if (pathname.startsWith(route + '/')) return tier;
  }
  return 0;
}
