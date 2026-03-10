export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTierFromActiveCount, type AmbassadorTier } from '@/lib/ambassador-auth';
import { sendEmail } from '@/lib/mailer';
import { ambassadorRewardTemplate } from '@/lib/email-templates';

const REWARD_AMOUNTS: Record<number, number> = { 1: 100, 2: 50, 3: 25 };

/**
 * CRON endpoint to process monthly leaderboard rewards.
 * Should be called on the 1st of each month (processes the previous month).
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization');
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Process the previous month
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-12
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const startOfPrevMonth = new Date(prevYear, prevMonth - 1, 1);
    const endOfPrevMonth = new Date(prevYear, prevMonth, 1);

    // Check if rewards already processed for this month
    const existing = await prisma.monthlyReward.findFirst({
      where: { month: prevMonth, year: prevYear },
    });
    if (existing) {
      return NextResponse.json({ message: 'Already processed', month: prevMonth, year: prevYear });
    }

    // Get all ambassadors with referrals created during the previous month
    const ambassadors = await prisma.ambassador.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        customTier: true,
        referredCompanies: {
          where: { createdAt: { gte: startOfPrevMonth, lt: endOfPrevMonth } },
          select: { id: true },
        },
      },
    });

    // Build leaderboard — only Argent+ ambassadors are eligible
    const eligible = await Promise.all(
      ambassadors
        .filter(a => a.referredCompanies.length > 0)
        .map(async (a) => {
          const activeCount = await prisma.company.count({
            where: { ambassadorReferredById: a.id, subscriptionStatus: 'active' },
          });
          const tier = (a.customTier as AmbassadorTier) || getTierFromActiveCount(activeCount);
          return {
            ...a,
            activeCount,
            tier,
            referralsCount: a.referredCompanies.length,
          };
        })
    );

    // Only Argent+ can win rewards
    const leaderboard = eligible
      .filter(a => a.tier !== 'bronze')
      .sort((a, b) => b.referralsCount - a.referralsCount);

    const winners = leaderboard.slice(0, 3);
    const monthName = startOfPrevMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const results: { ambassadorId: string; rank: number; amount: number; referralsCount: number }[] = [];

    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      const rank = i + 1;
      const amount = REWARD_AMOUNTS[rank];

      // Create reward record and credit balance
      await prisma.$transaction([
        prisma.monthlyReward.create({
          data: {
            ambassadorId: winner.id,
            month: prevMonth,
            year: prevYear,
            rank,
            amount,
            referralsCount: winner.referralsCount,
            credited: true,
            creditedAt: new Date(),
          },
        }),
        prisma.ambassador.update({
          where: { id: winner.id },
          data: { balance: { increment: amount } },
        }),
      ]);

      results.push({ ambassadorId: winner.id, rank, amount, referralsCount: winner.referralsCount });

      // Send congratulation email
      try {
        const emailContent = ambassadorRewardTemplate(winner.firstName, rank, amount, monthName, winner.referralsCount);
        await sendEmail({ to: winner.email, subject: emailContent.subject, html: emailContent.html });
      } catch (emailErr) {
        console.error(`Failed to send reward email to ${winner.email}:`, emailErr);
      }
    }

    console.log(`Monthly rewards processed for ${monthName}: ${results.length} winners`);

    return NextResponse.json({
      success: true,
      month: prevMonth,
      year: prevYear,
      monthName,
      winners: results,
    });
  } catch (error) {
    console.error('Monthly rewards CRON error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
