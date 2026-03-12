'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn, apiFetch } from '@/lib/utils';
import { PermissionsProvider } from '@/lib/permissions-context';
import { PlanProvider } from '@/lib/plan-context';
import { getPlanFromPriceId } from '@/lib/plans';
import { PlanGate } from '@/components/plan-gate';
import { FlaskConical, ArrowRight, AlertTriangle, Clock, Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function DashboardShell({ children, user, company, isDemo = false, subscriptionStatus = 'inactive', isAdminUser = false, stripePriceId = null, trialEndsAt = null, emailVerified = true }: {
  children: React.ReactNode;
  user: { firstName: string; lastName: string; role: string; permissions: string[] };
  company: { name: string };
  isDemo?: boolean;
  subscriptionStatus?: string;
  isAdminUser?: boolean;
  stripePriceId?: string | null;
  trialEndsAt?: string | null;
  emailVerified?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isPaidSubscriber = isDemo || subscriptionStatus === 'active';
  const currentPlan = isDemo
    ? { tier: 2, name: 'Business', isPaidSubscriber: true }
    : { ...getPlanFromPriceId(stripePriceId, subscriptionStatus), isPaidSubscriber };

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const showTrialBanner = !isDemo && !!trialEndsAt && trialDaysLeft > 0;
  const showEmailBanner = !isDemo && !emailVerified && !emailBannerDismissed;
  const hasBanner = isDemo || showTrialBanner || showEmailBanner;

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      await apiFetch('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({}) });
      toast.success('Email de vérification renvoyé !');
    } catch {
      toast.error('Impossible de renvoyer l\'email. Réessayez plus tard.');
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <PermissionsProvider value={user.permissions}>
    <PlanProvider value={currentPlan}>
      <div className="min-h-screen" style={{ backgroundColor: '#09090f' }}>
        {/* Demo banner */}
        {isDemo && (
          <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-violet-600 to-brand-600 text-white">
            <div className="flex items-center justify-center gap-3 px-4 py-2">
              <FlaskConical className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium">
                Mode demonstration — Les donnees seront supprimees a la fermeture
              </p>
              <Link
                href="/register"
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white text-violet-700 rounded-full hover:bg-violet-50 transition-colors flex-shrink-0"
              >
                Creer un compte <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Trial banner */}
        {!isDemo && trialEndsAt && trialDaysLeft > 0 && (
          <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <div className="flex items-center justify-center gap-3 px-4 py-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium">
                Essai gratuit — il vous reste {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''}
              </p>
              <Link
                href="/subscription"
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white text-amber-700 rounded-full hover:bg-amber-50 transition-colors flex-shrink-0"
              >
                Voir les offres <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Email verification banner */}
        {showEmailBanner && !isDemo && !showTrialBanner && (
          <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
            <div className="flex items-center justify-center gap-3 px-4 py-2">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium">
                Email non vérifié — vérifiez votre boîte mail
              </p>
              <button
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white text-blue-700 rounded-full hover:bg-blue-50 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                {resendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Renvoyer l&apos;email
              </button>
              <button
                onClick={() => setEmailBannerDismissed(true)}
                className="text-white/70 hover:text-white text-xs font-medium ml-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <div className={cn('fixed inset-y-0 left-0 z-40', hasBanner && 'top-10')}>
            <Sidebar
              companyName={company.name}
              collapsed={collapsed}
              onToggle={() => setCollapsed(!collapsed)}
              permissions={user.permissions}
              isAdmin={isAdminUser}
            />
          </div>
        </div>

        {/* Mobile sidebar */}
        <div className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          hasBanner && 'top-10'
        )}>
          <Sidebar
            companyName={company.name}
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onLinkClick={() => setMobileOpen(false)}
            permissions={user.permissions}
            isMobile
            isAdmin={isAdminUser}
          />
        </div>

        {/* Main content */}
        <div className={cn(
          'transition-all duration-300',
          collapsed ? 'lg:ml-[68px]' : 'lg:ml-[272px]',
          hasBanner && 'pt-10'
        )}>
          <Header userName={`${user.firstName} ${user.lastName}`} onMenuToggle={() => setMobileOpen(!mobileOpen)} />
          <main className="p-4 sm:p-5 lg:p-8 max-w-7xl mx-auto">
            {/* Block access if no subscription (except subscription page, demo, and admin) */}
            {!isDemo && !isAdminUser && subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing' && pathname !== '/subscription' ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(251,191,36,0.12)' }}>
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#eae9f0' }}>Abonnement requis</h2>
                {user.role === 'PATRON' ? (
                  <>
                    <p className="text-sm mb-6 max-w-md" style={{ color: '#9d9bab' }}>
                      {trialEndsAt && trialDaysLeft <= 0
                        ? 'Votre essai gratuit est termine. Souscrivez a un abonnement pour continuer a utiliser STRAVON.'
                        : 'Pour acceder a STRAVON, vous devez souscrire a un abonnement.'}
                    </p>
                    <Link
                      href="/subscription"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
                    >
                      Voir les offres <ArrowRight className="w-4 h-4" />
                    </Link>
                  </>
                ) : (
                  <p className="text-sm max-w-md" style={{ color: '#9d9bab' }}>
                    Votre entreprise n&apos;a pas d&apos;abonnement actif. Contactez le responsable de votre entreprise pour activer l&apos;acces.
                  </p>
                )}
              </div>
            ) : pathname === '/subscription' ? (
              children
            ) : (
              <PlanGate>{children}</PlanGate>
            )}
          </main>
        </div>
      </div>
    </PlanProvider>
    </PermissionsProvider>
  );
}
