export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentAmbassador } from '@/lib/ambassador-auth';

export async function GET() {
  try {
    const ambassador = await getCurrentAmbassador();
    if (!ambassador) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all ambassadors with their referrals created this month
    const ambassadors = await prisma.ambassador.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        referredCompanies: {
          where: { createdAt: { gte: startOfMonth } },
          select: { id: true },
        },
      },
    });

    // Build leaderboard sorted by referrals this month
    const leaderboard = ambassadors
      .map(a => ({
        id: a.id,
        name: `${a.firstName} ${a.lastName.charAt(0)}.`,
        referralsThisMonth: a.referredCompanies.length,
        isMe: a.id === ambassador.id,
      }))
      .filter(a => a.referralsThisMonth > 0)
      .sort((a, b) => b.referralsThisMonth - a.referralsThisMonth)
      .slice(0, 10);

    // Find current user's rank if not in top 10
    const myRank = ambassadors
      .map(a => ({ id: a.id, count: a.referredCompanies.length }))
      .filter(a => a.count > 0)
      .sort((a, b) => b.count - a.count)
      .findIndex(a => a.id === ambassador.id);

    return NextResponse.json({
      data: {
        leaderboard,
        myRank: myRank >= 0 ? myRank + 1 : null,
        month: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      },
    });
  } catch (error) {
    console.error('Ambassador leaderboard error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
