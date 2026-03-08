import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    if (user.role !== 'PATRON') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const referrals = await prisma.referral.findMany({
      where: {
        referrerUser: { companyId: user.companyId },
      },
      include: {
        referrerUser: { select: { firstName: true, lastName: true, email: true } },
        referredUser: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReferrals = referrals.length;
    const pendingCount = referrals.filter(r => r.status === 'PENDING').length;
    const rewardedCount = referrals.filter(r => r.status === 'REWARDED').length;
    const totalFreeMonths = rewardedCount * 2; // 1 month each for referrer + referred

    return NextResponse.json({
      data: {
        totalReferrals,
        pendingCount,
        rewardedCount,
        totalFreeMonths,
        referrals: referrals.map(r => ({
          id: r.id,
          referrer: `${r.referrerUser.firstName} ${r.referrerUser.lastName}`,
          referrerEmail: r.referrerUser.email,
          referred: `${r.referredUser.firstName} ${r.referredUser.lastName}`,
          referredEmail: r.referredUser.email,
          status: r.status,
          createdAt: r.createdAt,
          rewardedAt: r.rewardedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Admin referral error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
