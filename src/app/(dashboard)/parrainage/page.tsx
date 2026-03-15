'use client';

import { useEffect, useState } from 'react';
import { Gift, Users, Copy, Check, TrendingUp, DollarSign, ExternalLink, ChevronRight, Wallet, Clock } from 'lucide-react';
import { Card, PageLoader, Button } from '@/components/ui';
import { apiFetch, formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ParrainageData {
  referralCode: string;
  referralLink: string;
  tier: string;
  tierName: string;
  tierEmoji: string;
  commissionRate: number;
  activeCount: number;
  totalEarned: number;
  monthlyEarnings: number;
  pendingBalance: number;
  nextTier: {
    name: string;
    emoji: string;
    remaining: number;
    rate: number;
  } | null;
  connectOnboarded: boolean;
  connectAccountId: string | null;
  filleuls: {
    companyName: string;
    status: string;
    subscriptionStatus: string;
    createdAt: string;
    totalCommission: number;
  }[];
  commissions: {
    id: string;
    amount: number;
    percentage: number;
    status: string;
    periodMonth: string;
    paidAt: string | null;
    createdAt: string;
    companyName: string;
  }[];
}

const TIERS = [
  { key: 'starter', name: 'Starter', emoji: '🌱', rate: 10, min: 0 },
  { key: 'booster', name: 'Booster', emoji: '⚡', rate: 15, min: 5 },
  { key: 'expert', name: 'Expert', emoji: '🔥', rate: 20, min: 15 },
  { key: 'elite', name: 'Élite', emoji: '👑', rate: 25, min: 30 },
];

export default function ParrainagePage() {
  const [data, setData] = useState<ParrainageData | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ data: ParrainageData }>('/api/parrainage/stats')
      .then(r => setData(r.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(type === 'code' ? 'Code copie !' : 'Lien copie !');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConnectSetup = async () => {
    setConnectLoading(true);
    try {
      const res = await apiFetch<{ url: string }>('/api/parrainage/connect', { method: 'POST' });
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
      setConnectLoading(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!data) return null;

  const currentTierIdx = TIERS.findIndex(t => t.key === data.tier);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Parrainage</h1>
        <p className="text-sm text-zinc-500 mt-1">Partagez votre code et touchez une commission sur chaque paiement</p>
      </div>

      {/* Tier banner */}
      <div className="bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-3xl">{data.tierEmoji}</div>
            <div>
              <p className="text-lg font-bold text-zinc-900">Palier {data.tierName}</p>
              <p className="text-sm text-brand-700">
                Commission de <strong>{Math.round(data.commissionRate * 100)}%</strong> sur chaque paiement de vos filleuls
              </p>
            </div>
          </div>
          {data.nextTier && (
            <div className="bg-white/70 rounded-xl px-4 py-2.5 border border-brand-100">
              <p className="text-xs text-zinc-400 font-medium">Prochain palier</p>
              <p className="text-sm font-semibold text-zinc-800">
                {data.nextTier.emoji} {data.nextTier.name} ({Math.round(data.nextTier.rate * 100)}%)
              </p>
              <p className="text-xs text-brand-600 mt-0.5">
                Encore {data.nextTier.remaining} filleul{data.nextTier.remaining > 1 ? 's' : ''} actif{data.nextTier.remaining > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Tier progression */}
        <div className="mt-5 flex items-center gap-1">
          {TIERS.map((t, i) => (
            <div key={t.key} className="flex-1">
              <div className={`h-2 rounded-full transition-colors ${i <= currentTierIdx ? 'bg-brand-500' : 'bg-brand-100'}`} />
              <p className={`text-[10px] mt-1 font-medium ${i <= currentTierIdx ? 'text-brand-700' : 'text-zinc-400'}`}>
                {t.emoji} {t.rate}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400 font-medium">Filleuls actifs</p>
              <p className="text-xl font-bold text-zinc-900">{data.activeCount}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400 font-medium">Ce mois</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(data.monthlyEarnings)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 text-violet-600" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400 font-medium">Total gagné</p>
              <p className="text-xl font-bold text-violet-600">{formatCurrency(data.totalEarned)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Wallet className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400 font-medium">Solde en attente</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(data.pendingBalance)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Code & link section */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Gift className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Votre code parrain</h3>
            <p className="text-xs text-zinc-400">Le filleul le saisit au moment de payer son abonnement</p>
          </div>
        </div>

        <div className="bg-zinc-50 rounded-xl p-4 text-center mb-4">
          <p className="text-3xl font-bold tracking-widest text-zinc-900 font-mono">{data.referralCode}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => copyToClipboard(data.referralCode, 'code')}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
          >
            {copied === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied === 'code' ? 'Copie !' : 'Copier le code'}
          </button>
          <button
            onClick={() => copyToClipboard(data.referralLink, 'link')}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
          >
            {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied === 'link' ? 'Copie !' : 'Copier le lien'}
          </button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={() => {
                navigator.share({
                  title: 'Rejoignez STRAVON',
                  text: `Utilisez mon code ${data.referralCode} au moment de payer votre abonnement STRAVON pour me soutenir !`,
                  url: data.referralLink,
                }).catch(() => {});
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
            >
              Partager
            </button>
          )}
        </div>
      </Card>

      {/* Stripe Connect */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.connectOnboarded ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <Wallet className={`w-5 h-5 ${data.connectOnboarded ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Compte de paiement</h3>
              <p className="text-xs text-zinc-400">
                {data.connectOnboarded
                  ? 'Votre compte Stripe est configuré. Les commissions sont versées automatiquement.'
                  : 'Configurez votre compte Stripe pour recevoir vos commissions.'}
              </p>
            </div>
          </div>
          {!data.connectOnboarded && (
            <Button variant="brand" onClick={handleConnectSetup} loading={connectLoading} className="shrink-0">
              <ExternalLink className="w-4 h-4" /> Configurer
            </Button>
          )}
          {data.connectOnboarded && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
              <Check className="w-3.5 h-3.5" /> Actif
            </span>
          )}
        </div>
      </Card>

      {/* Filleuls */}
      <Card>
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">Vos filleuls</h3>
        {data.filleuls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Entreprise</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Date</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Statut</th>
                  <th className="text-right text-xs font-medium text-zinc-400 pb-3">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {data.filleuls.map((f, i) => (
                  <tr key={i}>
                    <td className="py-3 font-medium text-zinc-800">{f.companyName}</td>
                    <td className="py-3 text-zinc-500">{formatDate(f.createdAt)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                        f.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {f.status === 'active' ? 'Actif' : 'Resilie'}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium text-emerald-600">{formatCurrency(f.totalCommission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-700">Aucun filleul pour le moment</p>
            <p className="text-xs text-zinc-400 mt-1">Partagez votre code pour commencer à gagner des commissions</p>
          </div>
        )}
      </Card>

      {/* Commission history */}
      {data.commissions.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-zinc-900 mb-4">Historique des commissions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Date</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Filleul</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Taux</th>
                  <th className="text-right text-xs font-medium text-zinc-400 pb-3">Montant</th>
                  <th className="text-right text-xs font-medium text-zinc-400 pb-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {data.commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 text-zinc-500">{formatDate(c.createdAt)}</td>
                    <td className="py-3 font-medium text-zinc-800">{c.companyName}</td>
                    <td className="py-3 text-zinc-500">{Math.round(c.percentage * 100)}%</td>
                    <td className="py-3 text-right font-medium text-emerald-600">{formatCurrency(c.amount)}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status === 'paid' ? (
                          <><Check className="w-3 h-3" /> Verse</>
                        ) : (
                          <><Clock className="w-3 h-3" /> En attente</>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">Comment ca marche ?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-brand-600">1</div>
            <div>
              <p className="text-sm font-medium text-zinc-800">Partagez votre code</p>
              <p className="text-xs text-zinc-400 mt-0.5">L&apos;artisan le saisit au moment de payer son abonnement</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-brand-600">2</div>
            <div>
              <p className="text-sm font-medium text-zinc-800">Commission récurrente</p>
              <p className="text-xs text-zinc-400 mt-0.5">Vous touchez {Math.round(data.commissionRate * 100)}% sur chaque paiement mensuel</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-brand-600">3</div>
            <div>
              <p className="text-sm font-medium text-zinc-800">Versement automatique</p>
              <p className="text-xs text-zinc-400 mt-0.5">Les commissions sont versées automatiquement via Stripe</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
