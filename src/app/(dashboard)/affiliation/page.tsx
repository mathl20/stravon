'use client';

import { useState, useEffect } from 'react';
import { Link2, Users, TrendingUp, Wallet, Copy, Check, ExternalLink, Banknote, CreditCard, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button, PageLoader } from '@/components/ui';
import toast from 'react-hot-toast';
import { apiFetch, formatCurrency } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

interface AffiliateData {
  affiliateCode: string | null;
  balance: number;
  totalEarned: number;
  monthlyEarnings: number;
  activeReferrals: number;
  totalReferrals: number;
  connectOnboarded: boolean;
  hasConnectAccount: boolean;
  referrals: { id: string; name: string; status: string; createdAt: string }[];
  commissions: { id: string; amount: number; invoiceAmount: number; commissionRate: number; status: string; referredCompanyName: string; createdAt: string; stripeTransferId?: string }[];
}

export default function AffiliationPage() {
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    apiFetch<{ data: AffiliateData }>('/api/affiliate')
      .then((r) => setData(r.data))
      .catch(() => toast.error('Impossible de charger les données'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const connect = searchParams.get('connect');
    if (connect === 'success') {
      toast.success('Compte de paiement configuré avec succès !');
    } else if (connect === 'refresh') {
      toast('La configuration a expiré. Veuillez relancer.', { icon: '⏳' });
    }
  }, [searchParams]);

  const affiliateLink = data?.affiliateCode
    ? `${window.location.origin}?ref=${data.affiliateCode}`
    : '';

  const copyLink = async () => {
    if (!affiliateLink) return;
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const shareLink = async () => {
    if (!affiliateLink || !navigator.share) return;
    try {
      await navigator.share({
        title: 'Rejoignez Stravon',
        text: 'Gérez votre activité artisanale avec Stravon. Inscrivez-vous via mon lien :',
        url: affiliateLink,
      });
    } catch { /* cancelled */ }
  };

  const setupConnect = async () => {
    setConnectLoading(true);
    try {
      const res = await apiFetch<{ url: string }>('/api/stripe/connect', { method: 'POST' });
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la configuration');
      setConnectLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  // Compute next payout info
  const pendingCommissions = data?.commissions.filter(c => c.status === 'pending') || [];
  const pendingTotal = pendingCommissions.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Programme d&apos;affiliation</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Gagnez 15% de commission récurrente sur chaque abonnement souscrit via votre lien.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center mb-3">
            <Users className="w-4.5 h-4.5 text-brand-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{data?.activeReferrals || 0}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Filleuls actifs</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(data?.monthlyEarnings || 0)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Gains ce mois</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
            <Wallet className="w-4.5 h-4.5 text-violet-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(data?.totalEarned || 0)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Total gagné</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <Wallet className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(data?.balance || 0)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">En attente de virement</p>
        </div>
      </div>

      {/* Stripe Connect account status */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-zinc-900">Compte de paiement</h2>
        </div>

        {data?.connectOnboarded ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800">Compte configuré</p>
              <p className="text-xs text-zinc-400">
                Vos commissions sont automatiquement virées sur votre compte bancaire dès qu&apos;elles atteignent 5&nbsp;€.
              </p>
            </div>
          </div>
        ) : data?.hasConnectAccount ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-800">Configuration en cours</p>
                <p className="text-xs text-zinc-400">
                  Votre compte a été créé mais la configuration n&apos;est pas terminée. Finalisez-la pour recevoir vos virements.
                </p>
              </div>
            </div>
            <Button variant="brand" onClick={setupConnect} loading={connectLoading}>
              <CreditCard className="w-4 h-4" /> Finaliser la configuration
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">
              Configurez votre compte de paiement pour recevoir automatiquement vos commissions par virement bancaire.
              Stripe gère la conformité et la sécurité de vos données bancaires.
            </p>
            <Button variant="brand" onClick={setupConnect} loading={connectLoading}>
              <CreditCard className="w-4 h-4" /> Configurer mon compte de paiement
            </Button>
          </div>
        )}
      </div>

      {/* Next payout info */}
      {data?.connectOnboarded && pendingTotal > 0 && (
        <div className={`border rounded-2xl p-4 text-sm ${pendingTotal >= 5 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4" />
            <p className="font-semibold">{pendingTotal >= 5 ? 'Prochain virement' : 'Solde en attente'}</p>
          </div>
          <p className="text-xs">
            {pendingTotal >= 5
              ? `${formatCurrency(pendingTotal)} seront virés automatiquement lors du prochain cycle de paiement.`
              : `${formatCurrency(pendingTotal)} en attente. Le virement sera effectué dès que le solde atteint 5 €.`
            }
          </p>
        </div>
      )}

      {/* Affiliate link */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-zinc-900">Votre lien d&apos;affiliation</h2>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Partagez ce lien. Quand un artisan s&apos;inscrit et souscrit un abonnement, vous gagnez 15% de son abonnement chaque mois.
        </p>
        {data?.affiliateCode ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-700 font-mono truncate">
              {affiliateLink}
            </div>
            <Button variant="secondary" onClick={copyLink} className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié' : 'Copier'}
            </Button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <Button variant="brand" onClick={shareLink} className="shrink-0">
                <ExternalLink className="w-4 h-4" /> Partager
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Code d&apos;affiliation non disponible.</p>
        )}
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-100 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">Comment ça marche ?</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">1</div>
            <p className="font-medium text-zinc-700">Partagez votre lien</p>
            <p className="text-xs text-zinc-500">Envoyez-le à des artisans qui pourraient utiliser Stravon.</p>
          </div>
          <div className="space-y-1">
            <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">2</div>
            <p className="font-medium text-zinc-700">Ils s&apos;abonnent</p>
            <p className="text-xs text-zinc-500">Après leur essai gratuit, ils choisissent un plan payant.</p>
          </div>
          <div className="space-y-1">
            <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">3</div>
            <p className="font-medium text-zinc-700">Vous gagnez 15%</p>
            <p className="text-xs text-zinc-500">Commission automatique chaque mois, virée directement sur votre compte.</p>
          </div>
        </div>
      </div>

      {/* Comment recevoir vos gains */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Banknote className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-zinc-900">Comment recevoir vos gains</h2>
        </div>
        <div className="space-y-3 text-sm text-zinc-600">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
            <p><span className="font-medium text-zinc-800">Configurez votre compte de paiement</span> via le bouton ci-dessus. Stripe gère la conformité et sécurise vos données bancaires.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
            <p>Les commissions sont <span className="font-medium text-zinc-800">calculées automatiquement</span> à chaque paiement d&apos;abonnement de vos filleuls (15% récurrent).</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
            <p>Le virement est <span className="font-medium text-zinc-800">automatique</span> dès que votre solde atteint <span className="font-medium text-zinc-800">5&nbsp;€</span>. Aucune action requise de votre part.</p>
          </div>
        </div>
      </div>

      {/* Info: cumul parrainage + affiliation */}
      <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 text-sm">
        <p className="font-semibold text-amber-800 mb-1">Parrainage + Affiliation = cumulables</p>
        <p className="text-amber-700 text-xs">
          Le parrainage (page Parrainage) offre 1 mois gratuit pour vous et votre filleul.
          L&apos;affiliation donne des commissions récurrentes de 15%. Les deux sont cumulables pour chaque inscription.
        </p>
      </div>

      {/* Referrals table */}
      {data && data.referrals.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Filleuls ({data.totalReferrals})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs text-zinc-400">
                  <th className="text-left px-5 py-2.5 font-medium">Entreprise</th>
                  <th className="text-left px-5 py-2.5 font-medium">Statut</th>
                  <th className="text-left px-5 py-2.5 font-medium">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-zinc-700">{r.name}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        r.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.status === 'trialing'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {r.status === 'active' ? 'Abonné' : r.status === 'trialing' ? 'Essai' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">
                      {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commissions / payments history */}
      {data && data.commissions.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Historique des paiements</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs text-zinc-400">
                  <th className="text-left px-5 py-2.5 font-medium">Date</th>
                  <th className="text-left px-5 py-2.5 font-medium">Filleul</th>
                  <th className="text-right px-5 py-2.5 font-medium">Facture</th>
                  <th className="text-right px-5 py-2.5 font-medium">Commission (15%)</th>
                  <th className="text-left px-5 py-2.5 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.commissions.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-5 py-3 text-zinc-400">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3 font-medium text-zinc-700">{c.referredCompanyName}</td>
                    <td className="px-5 py-3 text-right text-zinc-500">{formatCurrency(c.invoiceAmount)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-600">+{formatCurrency(c.amount)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status === 'paid' ? 'Viré' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {data && data.referrals.length === 0 && (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-zinc-300" />
          </div>
          <p className="text-sm text-zinc-500 mb-1">Aucun filleul pour le moment</p>
          <p className="text-xs text-zinc-400">Partagez votre lien d&apos;affiliation pour commencer à gagner des commissions.</p>
        </div>
      )}
    </div>
  );
}
