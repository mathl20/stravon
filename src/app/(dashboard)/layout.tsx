export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions } from '@/lib/permissions';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { isAdmin } from '@/lib/admin';
import { syncSubscriptionFromStripe } from '@/lib/sync-subscription';
import prisma from '@/lib/prisma';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/api/auth/logout');
  }

  const permissions = getEffectivePermissions(user);
  const isDemo = (user.company as any).isDemo === true;

  // Sync subscription with Stripe (best-effort, won't block on error)
  if (!isDemo && (user.company as any).stripeCustomerId) {
    await syncSubscriptionFromStripe(user.company.id);
  }

  // Re-fetch company after sync to get fresh data
  const company = await prisma.company.findUnique({
    where: { id: user.company.id },
    select: { name: true, subscriptionStatus: true, stripePriceId: true, isDemo: true },
  });

  const subscriptionStatus = company?.subscriptionStatus || 'inactive';
  const stripePriceId = company?.stripePriceId || null;

  return (
    <DashboardShell
      user={{ firstName: user.firstName, lastName: user.lastName, role: user.role, permissions }}
      company={{ name: company?.name || user.company.name }}
      isDemo={isDemo}
      subscriptionStatus={subscriptionStatus}
      isAdminUser={isAdmin(user.email)}
      stripePriceId={stripePriceId}
    >
      {children}
    </DashboardShell>
  );
}
