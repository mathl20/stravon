export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const stripe = getStripe();
    const company = user.company;

    let customerId = company.stripeCustomerId;
    if (!customerId) {
      // Create Stripe customer on the fly
      const customer = await stripe.customers.create({
        email: user.email,
        name: company.name,
        metadata: { companyId: company.id, userId: user.id },
      });
      customerId = customer.id;
      const prisma = (await import('@/lib/prisma')).default;
      await prisma.company.update({
        where: { id: company.id },
        data: { stripeCustomerId: customerId },
      });
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe portal error:', error);
    return NextResponse.json({ error: error.message || 'Erreur Stripe' }, { status: 500 });
  }
}
