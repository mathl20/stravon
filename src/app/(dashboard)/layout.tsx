import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions } from '@/lib/permissions';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { isAdmin } from '@/lib/admin';
import { syncSubscriptionFromStripe } from '@/lib/sync-subscription';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/api/auth/logout');
  }

  const permissions = getEffectivePermissions(user);
  const company = user.company as any;
  const isDemo = company.isDemo === true;

  // Sync subscription with Stripe (throttled, best-effort)
  if (!isDemo && company.stripeCustomerId) {
    await syncSubscriptionFromStripe(company.id);
  }

  let subscriptionStatus = company.subscriptionStatus || 'inactive';
  const stripePriceId = company.stripePriceId || null;

  // Check free trial: if no active subscription but trial is still valid
  const trialEndsAt = company.trialEndsAt ? new Date(company.trialEndsAt) : null;
  const isTrialActive = trialEndsAt && trialEndsAt > new Date() && subscriptionStatus !== 'active';
  if (isTrialActive) {
    subscriptionStatus = 'trialing';
  }

  // If user has never chosen a plan (no trial, no subscription), redirect to plan selection
  if (!isDemo && !isAdmin(user.email) && subscriptionStatus !== 'active' && !trialEndsAt && !stripePriceId) {
    redirect('/choose-plan');
  }

  return (
    <DashboardShell
      user={{ firstName: user.firstName, lastName: user.lastName, role: user.role, permissions }}
      company={{ name: company.name }}
      isDemo={isDemo}
      subscriptionStatus={subscriptionStatus}
      isAdminUser={isAdmin(user.email)}
      stripePriceId={stripePriceId}
      trialEndsAt={isTrialActive ? trialEndsAt.toISOString() : null}
      emailVerified={user.emailVerified}
    >
      {children}
    </DashboardShell>
  );
}
