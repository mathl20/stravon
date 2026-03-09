export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    let company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        id: true,
        affiliateCode: true,
        affiliateBalance: true,
      },
    });

    if (!company) return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 });

    // Auto-generate affiliate code for existing companies that don't have one
    if (!company.affiliateCode) {
      const generateCode = () => `AFF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      let code = generateCode();
      for (let i = 0; i < 5; i++) {
        const exists = await prisma.company.findFirst({ where: { affiliateCode: code } });
        if (!exists) break;
        code = generateCode();
      }
      const updated = await prisma.company.update({
        where: { id: company.id },
        data: { affiliateCode: code },
        select: { id: true, affiliateCode: true, affiliateBalance: true },
      });
      company = updated;
    }

    // Get referred companies (filleuls)
    const referredCompanies = await prisma.company.findMany({
      where: { affiliateReferredById: user.companyId },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get commissions
    const commissions = await prisma.affiliateCommission.findMany({
      where: { affiliateCompanyId: user.companyId },
      include: {
        referredCompany: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Calculate stats
    const activeReferrals = referredCompanies.filter(c => c.subscriptionStatus === 'active').length;
    const totalEarned = commissions.reduce((s, c) => s + c.amount, 0);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyEarnings = commissions
      .filter(c => new Date(c.createdAt) >= startOfMonth)
      .reduce((s, c) => s + c.amount, 0);

    return NextResponse.json({
      data: {
        affiliateCode: company.affiliateCode,
        balance: company.affiliateBalance,
        totalEarned: Math.round(totalEarned * 100) / 100,
        monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
        activeReferrals,
        totalReferrals: referredCompanies.length,
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
    console.error('Affiliate API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
