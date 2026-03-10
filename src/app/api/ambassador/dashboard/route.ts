export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentAmbassador, getTierFromActiveCount, getCommissionRate, TIERS, type AmbassadorTier } from '@/lib/ambassador-auth';

export async function GET() {
  try {
    const ambassador = await getCurrentAmbassador();
    if (!ambassador) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Get referred companies
    const referredCompanies = await prisma.company.findMany({
      where: { ambassadorReferredById: ambassador.id },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        stripePriceId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeReferrals = referredCompanies.filter(c => c.subscriptionStatus === 'active').length;

    // Current tier
    const tier = (ambassador.customTier as AmbassadorTier) || getTierFromActiveCount(activeReferrals);
    const tierInfo = TIERS[tier];
    const commissionRate = getCommissionRate(ambassador, activeReferrals);

    // Next tier progress
    let nextTier: AmbassadorTier | null = null;
    let nextTierMin = 0;
    if (tier === 'starter') { nextTier = 'booster'; nextTierMin = 5; }
    else if (tier === 'booster') { nextTier = 'expert'; nextTierMin = 15; }
    else if (tier === 'expert') { nextTier = 'elite'; nextTierMin = 30; }

    // Commissions
    const commissions = await prisma.ambassadorCommission.findMany({
      where: { ambassadorId: ambassador.id },
      include: { referredCompany: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalEarned = commissions.reduce((s, c) => s + c.amount, 0);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyEarnings = commissions
      .filter(c => new Date(c.createdAt) >= startOfMonth)
      .reduce((s, c) => s + c.amount, 0);

    // Total rewards earned from leaderboard
    const totalRewardsEarned = await prisma.monthlyReward.aggregate({
      where: { ambassadorId: ambassador.id },
      _sum: { amount: true },
    });

    return NextResponse.json({
      data: {
        ambassadorId: ambassador.id,
        firstName: ambassador.firstName,
        lastName: ambassador.lastName,
        affiliateCode: ambassador.affiliateCode,
        balance: ambassador.balance,
        totalEarned: Math.round(totalEarned * 100) / 100,
        monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
        activeReferrals,
        totalReferrals: referredCompanies.length,
        tier,
        tierName: tierInfo.name,
        commissionRate,
        nextTier,
        nextTierName: nextTier ? TIERS[nextTier].name : null,
        nextTierMin,
        totalRewardsEarned: totalRewardsEarned._sum.amount || 0,
        isLeaderboardEligible: tier !== 'starter',
        connectOnboarded: ambassador.stripeConnectOnboarded,
        hasConnectAccount: !!ambassador.stripeConnectAccountId,
        referrals: referredCompanies.map(c => ({
          id: c.id,
          name: c.name,
          status: c.subscriptionStatus,
          createdAt: c.createdAt,
        })),
        commissions: commissions.map(c => ({
          id: c.id,
          amount: c.amount,
          invoiceAmount: c.invoiceAmount,
          commissionRate: c.commissionRate,
          status: c.status,
          referredCompanyName: c.referredCompany.name,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Ambassador dashboard error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
