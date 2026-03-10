export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentAmbassador, getTierFromActiveCount, type AmbassadorTier } from '@/lib/ambassador-auth';

export async function GET() {
  try {
    const ambassador = await getCurrentAmbassador();
    if (!ambassador) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Current user's active referrals for tier check
    const myActiveCount = await prisma.company.count({
      where: { ambassadorReferredById: ambassador.id, subscriptionStatus: 'active' },
    });
    const myTier = (ambassador.customTier as AmbassadorTier) || getTierFromActiveCount(myActiveCount);
    const isEligible = myTier !== 'starter'; // Booster+ can participate

    // Get all ambassadors with referrals this month
    const ambassadors = await prisma.ambassador.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        customTier: true,
        referredCompanies: {
          where: { createdAt: { gte: startOfMonth } },
          select: { id: true },
        },
      },
    });

    // Build leaderboard with tier info — only show Booster+ ambassadors
    const entries = await Promise.all(
      ambassadors
        .filter(a => a.referredCompanies.length > 0)
        .map(async (a) => {
          const activeCount = await prisma.company.count({
            where: { ambassadorReferredById: a.id, subscriptionStatus: 'active' },
          });
          const tier = (a.customTier as AmbassadorTier) || getTierFromActiveCount(activeCount);
          return {
            id: a.id,
            name: `${a.firstName} ${a.lastName.charAt(0)}.`,
            referralsThisMonth: a.referredCompanies.length,
            tier,
            isMe: a.id === ambassador.id,
          };
        })
    );

    // Leaderboard: only Booster+ ambassadors
    const leaderboard = entries
      .filter(a => a.tier !== 'starter')
      .sort((a, b) => b.referralsThisMonth - a.referralsThisMonth)
      .slice(0, 10);

    // My rank among eligible
    const allEligible = entries
      .filter(a => a.tier !== 'starter')
      .sort((a, b) => b.referralsThisMonth - a.referralsThisMonth);
    const myRankIdx = allEligible.findIndex(a => a.id === ambassador.id);
    const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;

    // Gap to rank above
    let gapToAbove: number | null = null;
    if (myRank && myRank > 1) {
      const above = allEligible[myRankIdx - 1];
      const me = allEligible[myRankIdx];
      gapToAbove = above.referralsThisMonth - me.referralsThisMonth;
    }

    // My referrals this month
    const myReferralsThisMonth = entries.find(e => e.id === ambassador.id)?.referralsThisMonth || 0;

    // Reward history (past rewards for this ambassador)
    const myRewards = await prisma.monthlyReward.findMany({
      where: { ambassadorId: ambassador.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12,
    });

    // Remaining artisans to unlock leaderboard (for Bronze)
    const remainingToUnlock = isEligible ? 0 : 10 - myActiveCount;

    return NextResponse.json({
      data: {
        leaderboard,
        myRank,
        myReferralsThisMonth,
        gapToAbove,
        isEligible,
        myTier,
        remainingToUnlock,
        myRewards: myRewards.map(r => ({
          id: r.id,
          month: r.month,
          year: r.year,
          rank: r.rank,
          amount: r.amount,
          referralsCount: r.referralsCount,
        })),
        month: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      },
    });
  } catch (error) {
    console.error('Ambassador leaderboard error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
