import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const [devisCount, facturesCount, totalAmountResult] = await Promise.all([
    prisma.devis.count({ where: { companyId: user.companyId } }),
    prisma.facture.count({ where: { companyId: user.companyId } }),
    prisma.facture.aggregate({ where: { companyId: user.companyId }, _sum: { amountTTC: true } }),
  ]);

  // Estimate: 15 min saved per devis, 10 min per facture, 5 min per auto-relance
  const estimatedTimeSaved = devisCount * 15 + facturesCount * 10;

  return NextResponse.json({
    devisCount,
    facturesCount,
    totalAmount: totalAmountResult._sum.amountTTC || 0,
    estimatedTimeSaved,
  });
}
