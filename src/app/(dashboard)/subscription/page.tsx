'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, PageLoader } from '@/components/ui';
import { Check, Crown, Rocket, ArrowRight, ExternalLink, Sparkles, Zap, ArrowUpRight, Settings, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface SubscriptionInfo {
  status: string;
  priceId: string | null;
  currentPeriodEnd: string | null;
  hasSubscription: boolean;
  isDemo: boolean;
}

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
      'Parametres (logo, couleurs, mentions)',
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
      'Modeles de devis & interventions',
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

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.json())
      .then(setSubscription)
      .catch(() => toast.error('Impossible de charger l\'abonnement'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast.error('Paiement annule');
    }
    if (searchParams.get('success') === 'true') {
      toast.success('Abonnement active avec succes !');
    }
  }, [searchParams]);

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
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.updated) {
        toast.success('Plan mis a jour avec succes !');
        const subRes = await fetch('/api/subscription');
        if (subRes.ok) setSubscription(await subRes.json());
        setCheckoutLoading(null);
        window.location.reload();
      } else {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du paiement');
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
      setPortalLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  const hasActive = subscription?.hasSubscription;
  const activePlan = PLANS.find(p => p.priceId === subscription?.priceId);
  const activeTier = activePlan?.tier ?? -1;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200/50 text-brand-700 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          {hasActive ? 'Votre abonnement' : 'Tarification simple et transparente'}
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-3">
          {hasActive ? 'Gerez votre abonnement' : 'Choisissez le plan adapte a votre activite'}
        </h1>
        <p className="text-zinc-500 text-sm max-w-lg mx-auto">
          {hasActive
            ? 'Changez de plan ou gerez votre facturation en quelques clics.'
            : 'Essai gratuit de 14 jours avec acces au plan Pro. Sans engagement, annulez a tout moment.'}
        </p>
      </div>

      {/* Active subscription banner */}
      {hasActive && (
        <div className="max-w-2xl mx-auto mb-10">
          <Card className="p-5 relative overflow-hidden border-emerald-200/60 bg-gradient-to-r from-emerald-50/50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-zinc-900">
                      Plan {activePlan?.name || (subscription?.status === 'trialing' ? 'Pro (essai)' : 'Actif')}
                    </p>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                      {subscription?.status === 'trialing' ? 'Essai gratuit' : 'Actif'}
                    </span>
                  </div>
                  {subscription?.currentPeriodEnd && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {subscription.status === 'trialing' ? 'Fin de l\'essai' : 'Renouvellement'} le {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              <Button onClick={handlePortal} loading={portalLoading} variant="secondary" className="shrink-0">
                <Settings className="w-4 h-4 mr-2" />
                Facturation
                <ExternalLink className="w-3 h-3 ml-1.5 opacity-50" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isPro = plan.popular;
          const isCurrent = activePlan?.key === plan.key;
          const isUpgrade = hasActive && plan.tier > activeTier;
          const isDowngrade = hasActive && plan.tier < activeTier;

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 ${
                isCurrent
                  ? 'border-emerald-300 shadow-lg shadow-emerald-600/10 ring-1 ring-emerald-200'
                  : isPro
                  ? 'border-brand-300 shadow-lg shadow-brand-600/10 ring-1 ring-brand-200'
                  : 'border-zinc-200 shadow-card hover:shadow-card-hover'
              }`}
            >
              {/* Badge */}
              {(isCurrent || plan.badge) && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  {isCurrent ? (
                    <span className="bg-emerald-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                      <Check className="w-3 h-3" />
                      Plan actuel
                    </span>
                  ) : plan.badge ? (
                    <span className="bg-brand-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-glow">
                      <Crown className="w-3 h-3" />
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
              )}

              <div className="p-6">
                {/* Plan header */}
                <div className="mb-6">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                    isCurrent ? 'bg-emerald-100'
                    : isPro ? 'bg-brand-100'
                    : plan.color === 'violet' ? 'bg-violet-100' : 'bg-zinc-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isCurrent ? 'text-emerald-600'
                      : isPro ? 'text-brand-600'
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

                {/* CTA */}
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default mb-6 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Votre plan actuel
                  </button>
                ) : isUpgrade ? (
                  <Button
                    onClick={() => handleCheckout(plan.priceId)}
                    loading={checkoutLoading === plan.priceId}
                    variant="brand"
                    className="w-full mb-6"
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Passer au {plan.name}
                  </Button>
                ) : isDowngrade ? (
                  <Button
                    onClick={() => handleCheckout(plan.priceId)}
                    loading={checkoutLoading === plan.priceId}
                    variant="secondary"
                    className="w-full mb-6"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Changer pour {plan.name}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCheckout(plan.priceId)}
                    loading={checkoutLoading === plan.priceId}
                    variant={isPro ? 'brand' : 'secondary'}
                    className="w-full mb-6"
                  >
                    {isPro ? <Rocket className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                    {hasActive ? 'Choisir' : 'Commencer'}
                  </Button>
                )}

                {/* Features */}
                <div className="border-t border-zinc-100 pt-5">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Inclus</p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-600">
                        <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          isCurrent ? 'text-emerald-500'
                          : isPro ? 'text-brand-600'
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

      {/* Bottom note */}
      <p className="text-center text-xs text-zinc-400 mt-8">
        Essai gratuit 14 jours (plan Pro). Paiement securise par Stripe. Annulez a tout moment.
      </p>
    </div>
  );
}
