// Unified parrainage tier system (shared by artisan parrains & ambassadors)

export type ParrainageTier = 'starter' | 'booster' | 'expert' | 'elite';

interface TierInfo {
  name: string;
  emoji: string;
  rate: number; // commission rate (e.g. 0.10 = 10%)
  min: number;
  max: number | null;
}

export const PARRAINAGE_TIERS: Record<ParrainageTier, TierInfo> = {
  starter: { name: 'Starter', emoji: '🌱', rate: 0.10, min: 0, max: 4 },
  booster: { name: 'Booster', emoji: '⚡', rate: 0.15, min: 5, max: 14 },
  expert: { name: 'Expert', emoji: '🔥', rate: 0.20, min: 15, max: 29 },
  elite: { name: 'Élite', emoji: '👑', rate: 0.25, min: 30, max: null },
};

export function getTierFromCount(activeCount: number): ParrainageTier {
  if (activeCount >= 30) return 'elite';
  if (activeCount >= 15) return 'expert';
  if (activeCount >= 5) return 'booster';
  return 'starter';
}

export function getCommissionRateForCount(activeCount: number): number {
  return PARRAINAGE_TIERS[getTierFromCount(activeCount)].rate;
}

export function getNextTierInfo(currentTier: ParrainageTier): { nextTier: ParrainageTier; remaining: number } | null {
  const order: ParrainageTier[] = ['starter', 'booster', 'expert', 'elite'];
  const idx = order.indexOf(currentTier);
  if (idx >= order.length - 1) return null;
  const next = order[idx + 1];
  return { nextTier: next, remaining: PARRAINAGE_TIERS[next].min };
}

export const MIN_PARRAINAGE_TRANSFER = 5; // Minimum 5€ for Stripe transfer
