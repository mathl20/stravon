'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowUpRight } from 'lucide-react';
import { usePlan } from '@/lib/plan-context';
import { getRequiredTierForRoute, TIER_PLAN_NAME } from '@/lib/plans';

const PAID_ONLY_ROUTES = ['/parrainage', '/affiliation'];

export function PlanGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tier: currentTier, isPaidSubscriber } = usePlan();
  const requiredTier = getRequiredTierForRoute(pathname);

  // Block trial users from paid-only routes
  const isPaidOnlyRoute = PAID_ONLY_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  if (isPaidOnlyRoute && !isPaidSubscriber) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">
          Abonnement requis
        </h2>
        <p className="text-sm text-zinc-500 mb-6 max-w-md">
          Souscrivez un abonnement pour acceder au programme d&apos;affiliation et commencer a gagner de l&apos;argent en recommandant Stravon.
        </p>
        <Link
          href="/subscription"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
        >
          Voir les offres <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (currentTier >= requiredTier) {
    return <>{children}</>;
  }

  const requiredPlan = TIER_PLAN_NAME[requiredTier] || 'Pro';

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-brand-600" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 mb-2">
        Fonctionnalite {requiredPlan}
      </h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-md">
        Cette fonctionnalite est disponible a partir du plan <span className="font-semibold text-zinc-700">{requiredPlan}</span>.
        Mettez a niveau votre abonnement pour y acceder.
      </p>
      <Link
        href="/subscription"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
      >
        Voir les offres <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
