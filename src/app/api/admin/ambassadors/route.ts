export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import prisma from '@/lib/prisma';
import { getTierFromActiveCount, TIERS, type AmbassadorTier } from '@/lib/ambassador-auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const ambassadors = await prisma.ambassador.findMany({
      include: {
        referredCompanies: {
          select: { id: true, name: true, subscriptionStatus: true, createdAt: true },
        },
        commissions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Tier distribution
    const tierCounts: Record<string, number> = { bronze: 0, argent: 0, or: 0, diamant: 0 };

    const data = ambassadors.map((amb) => {
      const activeReferrals = amb.referredCompanies.filter(c => c.subscriptionStatus === 'active').length;
      const tier = (amb.customTier as AmbassadorTier) || getTierFromActiveCount(activeReferrals);
      tierCounts[tier]++;
      const totalEarned = amb.commissions.reduce((s, c) => s + c.amount, 0);
      const monthlyEarnings = amb.commissions
        .filter(c => new Date(c.createdAt) >= startOfMonth)
        .reduce((s, c) => s + c.amount, 0);
      const totalTransferred = amb.commissions
        .filter(c => c.status === 'paid' && c.stripeTransferId)
        .reduce((s, c) => s + c.amount, 0);

      let connectStatus: 'not_created' | 'pending' | 'active' = 'not_created';
      if (amb.stripeConnectOnboarded) connectStatus = 'active';
      else if (amb.stripeConnectAccountId) connectStatus = 'pending';

      return {
        id: amb.id,
        name: `${amb.firstName} ${amb.lastName}`,
        email: amb.email,
        phone: amb.phone,
        affiliateCode: amb.affiliateCode,
        tier,
        tierName: TIERS[tier].name,
        commissionRate: amb.customCommissionRate ?? TIERS[tier].rate,
        customTier: amb.customTier,
        customCommissionRate: amb.customCommissionRate,
        balance: amb.balance,
        totalEarned,
        monthlyEarnings,
        totalTransferred,
        activeReferrals,
        totalReferrals: amb.referredCompanies.length,
        connectStatus,
        stripeConnectAccountId: amb.stripeConnectAccountId,
        createdAt: amb.createdAt.toISOString(),
        referrals: amb.referredCompanies.map(c => ({
          id: c.id,
          name: c.name,
          status: c.subscriptionStatus === 'active' ? 'actif' : 'inactif',
          createdAt: c.createdAt.toISOString(),
        })),
      };
    });

    // Leaderboard this month (Argent+ only)
    const leaderboard = data
      .map(a => ({
        id: a.id,
        name: a.name,
        tier: a.tier,
        tierName: a.tierName,
        referralsThisMonth: a.referrals.filter(r => new Date(r.createdAt) >= startOfMonth).length,
      }))
      .filter(a => a.referralsThisMonth > 0 && a.tier !== 'starter')
      .sort((a, b) => b.referralsThisMonth - a.referralsThisMonth)
      .slice(0, 10);

    // Reward history — all months
    const allRewards = await prisma.monthlyReward.findMany({
      include: { ambassador: { select: { firstName: true, lastName: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { rank: 'asc' }],
    });

    // Group rewards by month
    const rewardsByMonth: Record<string, { month: number; year: number; winners: typeof allRewards }> = {};
    for (const r of allRewards) {
      const key = `${r.year}-${r.month}`;
      if (!rewardsByMonth[key]) rewardsByMonth[key] = { month: r.month, year: r.year, winners: [] };
      rewardsByMonth[key].winners.push(r);
    }
    const rewardHistory = Object.values(rewardsByMonth);

    // Total rewards paid
    const totalRewardsPaid = allRewards.reduce((s, r) => s + r.amount, 0);

    // Current month pending rewards estimate (top 3 of current leaderboard)
    const pendingRewardAmounts = [100, 50, 25];
    const pendingRewards = leaderboard.slice(0, 3).map((entry, i) => ({
      name: entry.name,
      rank: i + 1,
      amount: pendingRewardAmounts[i],
      referralsThisMonth: entry.referralsThisMonth,
    }));

    return NextResponse.json({
      data,
      leaderboard,
      tierCounts,
      rewardHistory: rewardHistory.map(rh => ({
        month: rh.month,
        year: rh.year,
        winners: rh.winners.map(w => ({
          id: w.id,
          name: `${w.ambassador.firstName} ${w.ambassador.lastName}`,
          rank: w.rank,
          amount: w.amount,
          referralsCount: w.referralsCount,
        })),
      })),
      totalRewardsPaid,
      pendingRewards,
    });
  } catch (error) {
    console.error('Admin ambassadors GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH — update ambassador tier/commission or mark as paid
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { ambassadorId, action, customTier, customCommissionRate } = await request.json();
    if (!ambassadorId) return NextResponse.json({ error: 'ambassadorId requis' }, { status: 400 });

    if (action === 'markPaid') {
      await prisma.$transaction([
        prisma.ambassadorCommission.updateMany({
          where: { ambassadorId, status: 'pending' },
          data: { status: 'paid', paidAt: new Date() },
        }),
        prisma.ambassador.update({
          where: { id: ambassadorId },
          data: { balance: 0 },
        }),
      ]);
      return NextResponse.json({ success: true });
    }

    if (action === 'updateTier') {
      const update: any = {};
      if (customTier !== undefined) update.customTier = customTier || null;
      if (customCommissionRate !== undefined) update.customCommissionRate = customCommissionRate != null ? Number(customCommissionRate) : null;

      await prisma.ambassador.update({
        where: { id: ambassadorId },
        data: update,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Admin ambassadors PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
