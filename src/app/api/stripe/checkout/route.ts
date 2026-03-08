export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { priceId } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: 'priceId requis' }, { status: 400 });
    }

    const stripe = getStripe();
    const company = user.company as any;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000';

    // Create or retrieve Stripe customer
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: company.name,
        metadata: {
          companyId: company.id,
          userId: user.id,
        },
      });
      customerId = customer.id;
      await prisma.company.update({
        where: { id: company.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // If there's an existing active subscription, update it instead of creating a new one
    if (company.stripeSubscriptionId) {
      try {
        const currentSub = await stripe.subscriptions.retrieve(company.stripeSubscriptionId);

        if (currentSub.status === 'active' || currentSub.status === 'trialing') {
          // Same price → nothing to do
          const currentPriceId = currentSub.items.data[0]?.price?.id;
          if (currentPriceId === priceId) {
            return NextResponse.json({ error: 'Vous etes deja sur ce plan' }, { status: 400 });
          }

          // Update the subscription to the new price (prorate by default)
          const updated = await stripe.subscriptions.update(company.stripeSubscriptionId, {
            items: [{
              id: currentSub.items.data[0].id,
              price: priceId,
            }],
            proration_behavior: 'create_prorations',
          });

          // Update DB immediately (webhook will also fire but this is faster for UX)
          await prisma.company.update({
            where: { id: company.id },
            data: {
              stripePriceId: priceId,
              subscriptionStatus: updated.status,
            },
          });

          return NextResponse.json({ success: true, updated: true });
        }
      } catch {
        // Subscription not found or expired, fall through to create new checkout
      }
    }

    // No active subscription → create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/subscription?success=true`,
      cancel_url: `${appUrl}/subscription?canceled=true`,
      metadata: {
        companyId: company.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: error.message || 'Erreur Stripe' }, { status: 500 });
  }
}
