export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import prisma from '@/lib/prisma';

// GET — list all affiliate companies with their filleuls, earnings, balance, Connect status
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const affiliateCompanies = await prisma.company.findMany({
      where: { affiliateCode: { not: null } },
      select: {
        id: true,
        name: true,
        email: true,
        affiliateCode: true,
        affiliateBalance: true,
        iban: true,
        stripeConnectAccountId: true,
        stripeConnectOnboarded: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const affiliates = await Promise.all(
      affiliateCompanies.map(async (company) => {
        const referrals = await prisma.company.findMany({
          where: { affiliateReferredById: company.id },
          select: {
            id: true,
            name: true,
            email: true,
            subscriptionStatus: true,
            stripePriceId: true,
            createdAt: true,
          },
        });

        const commissions = await prisma.affiliateCommission.findMany({
          where: { affiliateCompanyId: company.id },
          orderBy: { createdAt: 'desc' },
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyEarnings = commissions
          .filter((c) => new Date(c.createdAt) >= startOfMonth)
          .reduce((sum, c) => sum + c.amount, 0);

        const totalEarned = commissions.reduce((sum, c) => sum + c.amount, 0);
        const totalTransferred = commissions
          .filter((c) => c.status === 'paid' && c.stripeTransferId)
          .reduce((sum, c) => sum + c.amount, 0);

        const activeReferrals = referrals.filter(
          (r) => r.subscriptionStatus === 'active'
        ).length;

        // Determine Connect status
        let connectStatus: 'not_created' | 'pending' | 'active' = 'not_created';
        if (company.stripeConnectOnboarded) {
          connectStatus = 'active';
        } else if (company.stripeConnectAccountId) {
          connectStatus = 'pending';
        }

        return {
          id: company.id,
          name: company.name,
          email: company.email,
          affiliateCode: company.affiliateCode,
          balance: company.affiliateBalance,
          iban: company.iban,
          connectStatus,
          stripeConnectAccountId: company.stripeConnectAccountId,
          monthlyEarnings,
          totalEarned,
          totalTransferred,
          activeReferrals,
          totalReferrals: referrals.length,
          referrals: referrals.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            plan: getPlanName(r.stripePriceId),
            status: r.subscriptionStatus === 'active' ? 'actif' : 'inactif',
            createdAt: r.createdAt.toISOString(),
          })),
          recentTransfers: commissions
            .filter((c) => c.status === 'paid' && c.stripeTransferId)
            .slice(0, 10)
            .map((c) => ({
              id: c.id,
              amount: c.amount,
              stripeTransferId: c.stripeTransferId,
              paidAt: c.paidAt?.toISOString() || null,
              createdAt: c.createdAt.toISOString(),
            })),
        };
      })
    );

    const filtered = affiliates.filter(
      (a) => a.totalReferrals > 0 || a.balance > 0
    );

    return NextResponse.json({ data: filtered });
  } catch (error) {
    console.error('Admin affiliations GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH — mark affiliate as paid (manual fallback for non-Connect affiliates)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { companyId } = await request.json();
    if (!companyId) {
      return NextResponse.json({ error: 'companyId requis' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { affiliateBalance: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.affiliateCommission.updateMany({
        where: { affiliateCompanyId: companyId, status: 'pending' },
        data: { status: 'paid', paidAt: new Date() },
      }),
      prisma.company.update({
        where: { id: companyId },
        data: { affiliateBalance: 0 },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin affiliations PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

function getPlanName(priceId: string | null): string {
  if (!priceId) return 'Aucun';
  const PLAN_NAMES: Record<string, string> = {
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO || '']: 'Starter',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || '']: 'Pro',
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS || '']: 'Business',
  };
  return PLAN_NAMES[priceId] || 'Inconnu';
}
