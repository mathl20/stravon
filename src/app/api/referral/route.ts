export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateReferralCode } from '@/lib/referral';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Only paid subscribers can access referral program
    const company = user.company as any;
    if (company.subscriptionStatus !== 'active') {
      return NextResponse.json({ error: 'Abonnement payant requis pour accéder au programme de parrainage.' }, { status: 403 });
    }

    // Ensure user has a referral code
    let referralCode = (user as any).referralCode as string | null;
    if (!referralCode) {
      // Generate and save one
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateReferralCode();
        const existing = await prisma.user.findFirst({ where: { referralCode: code } });
        if (!existing) {
          await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
          referralCode = code;
          break;
        }
      }
    }

    const referrals = await prisma.referral.findMany({
      where: { referrerUserId: user.id },
      include: { referredUser: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const freeMonthsEarned = (user as any).freeMonthsEarned as number || 0;
    const rewardedCount = referrals.filter(r => r.status === 'REWARDED').length;
    const pendingCount = referrals.filter(r => r.status === 'PENDING').length;

    // Count rewards earned in last 12 months (rolling window)
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const monthsEarnedLast12Months = await prisma.referral.count({
      where: {
        status: 'REWARDED',
        rewardedAt: { gte: twelveMonthsAgo },
        OR: [
          { referrerUserId: user.id },
          { referredUserId: user.id },
        ],
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

    return NextResponse.json({
      data: {
        referralCode,
        referralLink: `${baseUrl}/register?ref=${referralCode}`,
        totalReferred: referrals.length,
        rewardedCount,
        pendingCount,
        freeMonthsEarned,
        monthsEarnedLast12Months,
        maxMonthsPerYear: 3,
        referrals: referrals.map((r) => ({
          name: `${r.referredUser.firstName} ${r.referredUser.lastName.charAt(0)}.`,
          date: r.createdAt.toISOString().split('T')[0],
          status: r.status,
        })),
      },
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}