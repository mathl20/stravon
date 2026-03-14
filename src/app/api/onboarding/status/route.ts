import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: {
      onboardingCompleted: true,
      onboardingStep: true,
      onboardingCompanyInfo: true,
      onboardingFirstDevis: true,
      onboardingFirstFacture: true,
      onboardingRelances: true,
      onboardingFirstClient: true,
      name: true,
      siret: true,
      address: true,
      relancesActive: true,
      trialEndsAt: true,
      createdAt: true,
    },
  });

  if (!company) return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });

  // Auto-detect completed steps from real data
  const hasClient = await prisma.client.count({ where: { companyId: user.companyId } }) > 0;
  const hasDevis = await prisma.devis.count({ where: { companyId: user.companyId } }) > 0;
  const hasFacture = await prisma.facture.count({ where: { companyId: user.companyId } }) > 0;
  const hasCompanyInfo = !!(company.name && company.siret && company.address);

  // Update flags if actions were done outside onboarding
  const updates: Record<string, boolean> = {};
  if (hasClient && !company.onboardingFirstClient) updates.onboardingFirstClient = true;
  if (hasDevis && !company.onboardingFirstDevis) updates.onboardingFirstDevis = true;
  if (hasFacture && !company.onboardingFirstFacture) updates.onboardingFirstFacture = true;
  if (hasCompanyInfo && !company.onboardingCompanyInfo) updates.onboardingCompanyInfo = true;
  if (company.relancesActive && !company.onboardingRelances) updates.onboardingRelances = true;

  const allDone = (hasCompanyInfo || company.onboardingCompanyInfo)
    && (hasDevis || company.onboardingFirstDevis)
    && (hasFacture || company.onboardingFirstFacture)
    && (company.relancesActive || company.onboardingRelances)
    && (hasClient || company.onboardingFirstClient);

  if (allDone && !company.onboardingCompleted) updates.onboardingCompleted = true;

  if (Object.keys(updates).length > 0) {
    await prisma.company.update({ where: { id: user.companyId }, data: updates });
  }

  return NextResponse.json({
    step: company.onboardingStep,
    completed: allDone || company.onboardingCompleted,
    checklist: {
      companyInfo: hasCompanyInfo || company.onboardingCompanyInfo,
      firstDevis: hasDevis || company.onboardingFirstDevis,
      firstFacture: hasFacture || company.onboardingFirstFacture,
      relances: company.relancesActive || company.onboardingRelances,
      firstClient: hasClient || company.onboardingFirstClient,
    },
    trialEndsAt: company.trialEndsAt,
    createdAt: company.createdAt,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { step, dismiss } = body;

  const data: Record<string, unknown> = {};
  if (typeof step === 'number') data.onboardingStep = step;
  if (dismiss === true) data.onboardingCompleted = true;

  await prisma.company.update({ where: { id: user.companyId }, data });

  return NextResponse.json({ ok: true });
}
