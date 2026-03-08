export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import prisma from '@/lib/prisma';

// PATCH — update company subscription status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { companyId, subscriptionStatus, stripePriceId } = await request.json();
    if (!companyId) {
      return NextResponse.json({ error: 'companyId requis' }, { status: 400 });
    }

    const data: any = {};

    if (subscriptionStatus) {
      const validStatuses = ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'inactive'];
      if (!validStatuses.includes(subscriptionStatus)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
      data.subscriptionStatus = subscriptionStatus;
    }

    // Allow setting plan (stripePriceId) — can be null to clear it
    if (stripePriceId !== undefined) {
      data.stripePriceId = stripePriceId;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data,
    });

    return NextResponse.json({ success: true, company: { id: company.id, name: company.name, subscriptionStatus: company.subscriptionStatus } });
  } catch (error: any) {
    console.error('Admin company update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
