'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Crown, Rocket, Zap, Users, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button, PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import toast from 'react-hot-toast';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    description: '1-2 utilisateurs',
    price: '19',
    period: '/mois',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO || '',
    icon: Zap,
    features: [
      'Tableau de bord complet',
      'Clients illimites',
      'Devis & factures',
      'Interventions & planning',
      'Prestations personnalisees',
      'Relances automatiques',
      'Support par email',
    ],
    popular: false,
    color: 'zinc',
    tier: 0,
  },
  {
    key: 'pro',
    name: 'Pro',
    description: '3-8 utilisateurs',
    price: '39',
    period: '/mois',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || '',
    icon: Rocket,
    badge: 'Populaire',
    features: [
      'Tout le plan Starter',
      'Assistant IA',
      'Feuilles d\'heures',
      'Equipe (roles & permissions)',
      'Parrainage',
      'Signature QR Code',
      'Export de rapports',
      'Support prioritaire',
    ],
    popular: true,
    color: 'brand',
    tier: 1,
  },
  {
    key: 'business',
    name: 'Business',
    description: '9-20 utilisateurs',
    price: '79',
    period: '/mois',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS || '',
    icon: Crown,
    features: [
      'Tout le plan Pro',
      'Planning de conges',
      'Multi-equipes',
      'Statistiques avancees',
      'Export comptable',
      'Support dedie',
    ],
    popular: false,
    color: 'violet',
    tier: 2,
  },
];

export default function ChoosePlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trialLoading, setTrialLoading] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Check if user already has a plan — redirect to dashboard
  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.json())
      .then(data => {
        if (data.hasSubscription || data.status === 'trialing' || data.status === 'active') {
          router.replace('/dashboard');
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleStartTrial = async (priceId: string, planName: string) => {
    if (!priceId) {
      toast.error('Plan non configure. Contactez le support.');
      return;
    }
    setTrialLoading(priceId);
    try {
      await apiFetch('/api/onboarding/start-trial', {
        method: 'POST',
        body: JSON.stringify({ priceId }),
      });
      toast.success(`Essai gratuit ${planName} active !`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'activation de l\'essai');
      setTrialLoading(null);
    }
  };

  const handleCheckout = async (priceId: string) => {
    if (!priceId) {
      toast.error('Plan non configure. Contactez le support.');
      return;
    }
    setCheckoutLoading(priceId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, returnPath: '/dashboard' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du paiement');
      setCheckoutLoading(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-zinc-50/60 flex flex-col items-center justify-center p-6 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center">
          <Zap className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">STRAVON</span>
      </Link>

      {/* Header */}
      <div className="text-center mb-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200/50 text-brand-700 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Bienvenue sur STRAVON
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-3">
          Choisissez votre formule
        </h1>
        <p className="text-zinc-500 text-sm max-w-lg mx-auto">
          Testez gratuitement pendant 14 jours ou abonnez-vous directement. Sans engagement, annulez a tout moment.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-3 gap-6 items-start max-w-5xl w-full">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isPro = plan.popular;

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 ${
                isPro
                  ? 'border-brand-300 shadow-lg shadow-brand-600/10 ring-1 ring-brand-200'
                  : 'border-zinc-200 shadow-card hover:shadow-card-hover'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-brand-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-glow">
                    <Crown className="w-3 h-3" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="p-6">
                {/* Plan header */}
                <div className="mb-6">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                    isPro ? 'bg-brand-100'
                    : plan.color === 'violet' ? 'bg-violet-100' : 'bg-zinc-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isPro ? 'text-brand-600'
                      : plan.color === 'violet' ? 'text-violet-600' : 'text-zinc-600'
                    }`} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">{plan.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Users className="w-3 h-3 text-zinc-400" />
                    <p className="text-xs text-zinc-500">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-zinc-900 tracking-tight">{plan.price}&euro;</span>
                  <span className="text-zinc-400 text-sm">{plan.period}</span>
                </div>

                {/* CTAs */}
                <div className="space-y-2.5 mb-6">
                  <Button
                    onClick={() => handleStartTrial(plan.priceId, plan.name)}
                    loading={trialLoading === plan.priceId}
                    disabled={!!trialLoading || !!checkoutLoading}
                    variant={isPro ? 'brand' : 'secondary'}
                    className="w-full"
                  >
                    {trialLoading === plan.priceId ? (
                      'Activation...'
                    ) : (
                      <>Essai gratuit 14 jours</>
                    )}
                  </Button>
                  <button
                    onClick={() => handleCheckout(plan.priceId)}
                    disabled={!!trialLoading || !!checkoutLoading}
                    className="w-full py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {checkoutLoading === plan.priceId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>S&apos;abonner directement <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </div>

                {/* Features */}
                <div className="border-t border-zinc-100 pt-5">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Inclus</p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-600">
                        <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          isPro ? 'text-brand-600'
                          : plan.color === 'violet' ? 'text-violet-500' : 'text-zinc-400'
                        }`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom notes */}
      <div className="text-center mt-8 space-y-1.5">
        <p className="text-xs text-zinc-400">
          Paiement securise par Stripe. Annulez a tout moment. Aucune carte requise pour l&apos;essai gratuit.
        </p>
        <p className="text-xs text-zinc-400">
          Les programmes de parrainage et d&apos;affiliation sont reserves aux abonnes.
        </p>
      </div>
    </div>
  );
}
