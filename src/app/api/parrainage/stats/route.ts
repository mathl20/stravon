export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getTierFromCount, PARRAINAGE_TIERS, getNextTierInfo } from '@/lib/parrainage';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    // Ensure user has a referral code
    let referralCode = user.referralCode;
    if (!referralCode) {
      const { generateReferralCode } = await import('@/lib/referral');
      referralCode = generateReferralCode();
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    }

    // Get referrals made by this user
    const referrals = await prisma.parrainageReferral.findMany({
      where: { parrainUserId: user.id },
      include: {
        filleulCompany: {
          select: { name: true, subscriptionStatus: true },
        },
        commissions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeCount = referrals.filter(r => r.status === 'active').length;
    const tier = getTierFromCount(activeCount);
    const tierInfo = PARRAINAGE_TIERS[tier];
    const nextTier = getNextTierInfo(tier);

    const totalEarned = referrals.reduce((sum, r) =>
      sum + r.commissions.reduce((s, c) => s + c.amount, 0), 0
    );

    const pendingBalance = (user as any).parrainageBalance || 0;

    // Monthly earnings (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyEarnings = referrals.reduce((sum, r) =>
      sum + r.commissions
        .filter(c => new Date(c.createdAt) >= monthStart)
        .reduce((s, c) => s + c.amount, 0), 0
    );

    // Commission history
    const allCommissions = referrals.flatMap(r =>
      r.commissions.map(c => ({
        id: c.id,
        amount: c.amount,
        percentage: c.percentage,
        status: c.status,
        periodMonth: c.periodMonth,
        paidAt: c.paidAt,
        createdAt: c.createdAt,
        companyName: r.filleulCompany.name,
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filleuls = referrals.map(r => ({
      companyName: r.filleulCompany.name,
      status: r.status,
      subscriptionStatus: r.filleulCompany.subscriptionStatus,
      createdAt: r.createdAt,
      totalCommission: r.commissions.reduce((s, c) => s + c.amount, 0),
    }));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stravon.fr';

    return NextResponse.json({
      data: {
        referralCode,
        referralLink: `${appUrl}?ref=${referralCode}`,
        tier,
        tierName: tierInfo.name,
        tierEmoji: tierInfo.emoji,
        commissionRate: tierInfo.rate,
        activeCount,
        totalEarned: Math.round(totalEarned * 100) / 100,
        monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
        pendingBalance: Math.round(pendingBalance * 100) / 100,
        nextTier: nextTier ? {
          name: PARRAINAGE_TIERS[nextTier.nextTier].name,
          emoji: PARRAINAGE_TIERS[nextTier.nextTier].emoji,
          remaining: nextTier.remaining - activeCount,
          rate: PARRAINAGE_TIERS[nextTier.nextTier].rate,
        } : null,
        connectOnboarded: (user as any).parrainStripeOnboarded || false,
        connectAccountId: (user as any).parrainStripeConnectId || null,
        filleuls,
        commissions: allCommissions.slice(0, 20),
      },
    });
  } catch (error) {
    console.error('Error fetching parrainage stats:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
