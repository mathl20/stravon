export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase();
    if (!code) return NextResponse.json({ valid: false, error: 'Code requis' });

    // Check if company already has a parrain (can't change once set)
    const existingReferral = await prisma.parrainageReferral.findUnique({
      where: { filleulCompanyId: user.companyId },
    });
    if (existingReferral) {
      return NextResponse.json({ valid: false, error: 'Votre entreprise a deja un parrain attribue.' });
    }

    // Self-referral check: own code
    if (user.referralCode?.toUpperCase() === code) {
      return NextResponse.json({ valid: false, error: 'Vous ne pouvez pas utiliser votre propre code.' });
    }

    // Look up the code in User referralCodes
    const parrainUser = await prisma.user.findFirst({
      where: { referralCode: { equals: code, mode: 'insensitive' } },
      select: { id: true, firstName: true, lastName: true, companyId: true },
    });

    if (parrainUser) {
      // Same company check
      if (parrainUser.companyId === user.companyId) {
        return NextResponse.json({ valid: false, error: 'Vous ne pouvez pas utiliser le code d\'un membre de votre entreprise.' });
      }

      // Cross-referral check: check if the current user's company already parrains the parrain's company
      const crossRef = await prisma.parrainageReferral.findFirst({
        where: {
          parrainUserId: { in: await prisma.user.findMany({ where: { companyId: user.companyId }, select: { id: true } }).then(u => u.map(x => x.id)) },
          filleulCompanyId: parrainUser.companyId,
        },
      });
      if (crossRef) {
        return NextResponse.json({ valid: false, error: 'Parrainage croise interdit.' });
      }

      return NextResponse.json({
        valid: true,
        parrainName: `${parrainUser.firstName} ${parrainUser.lastName.charAt(0)}.`,
        type: 'user',
      });
    }

    // Look up in Ambassador codes
    const ambassador = await prisma.ambassador.findFirst({
      where: { affiliateCode: { equals: code, mode: 'insensitive' } },
      select: { id: true, firstName: true, lastName: true },
    });

    if (ambassador) {
      return NextResponse.json({
        valid: true,
        parrainName: `${ambassador.firstName} ${ambassador.lastName.charAt(0)}.`,
        type: 'ambassador',
      });
    }

    return NextResponse.json({ valid: false, error: 'Code invalide. Verifiez le code et reessayez.' });
  } catch (error) {
    console.error('Error verifying affiliation code:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
