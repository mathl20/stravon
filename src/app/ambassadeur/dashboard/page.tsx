'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, Wallet, Copy, Check, ExternalLink, CreditCard, CheckCircle2, Trophy, Award, Star, Crown, Gem, ArrowUp, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, formatCurrency } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

interface DashboardData {
  firstName: string;
  lastName: string;
  affiliateCode: string;
  balance: number;
  totalEarned: number;
  monthlyEarnings: number;
  activeReferrals: number;
  totalReferrals: number;
  tier: string;
  tierName: string;
  commissionRate: number;
  nextTier: string | null;
  nextTierName: string | null;
  nextTierMin: number;
  connectOnboarded: boolean;
  hasConnectAccount: boolean;
  referrals: { id: string; name: string; status: string; createdAt: string }[];
  commissions: { id: string; amount: number; invoiceAmount: number; commissionRate: number; status: string; referredCompanyName: string; createdAt: string }[];
}

interface LeaderboardEntry {
  id: string;
  name: string;
  referralsThisMonth: number;
  isMe: boolean;
}

const tierIcons: Record<string, any> = {
  bronze: Award, argent: Star, or: Crown, diamant: Gem,
};
const tierColors: Record<string, string> = {
  bronze: 'text-amber-700 bg-amber-100',
  argent: 'text-zinc-500 bg-zinc-100',
  or: 'text-yellow-600 bg-yellow-100',
  diamant: 'text-violet-600 bg-violet-100',
};

export default function AmbassadeurDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardMonth, setLeaderboardMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: DashboardData }>('/api/ambassador/dashboard').then(r => setData(r.data)),
      apiFetch<{ data: { leaderboard: LeaderboardEntry[]; month: string } }>('/api/ambassador/leaderboard')
        .then(r => { setLeaderboard(r.data.leaderboard); setLeaderboardMonth(r.data.month); }),
    ])
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const c = searchParams.get('connect');
    if (c === 'success') toast.success('Compte de paiement configuré !');
    if (c === 'refresh') toast('Configuration expirée, relancez.', { icon: '⏳' });
  }, [searchParams]);

  const affiliateLink = data ? `${window.location.origin}?ref=${data.affiliateCode}` : '';

  const copyLink = async () => {
    if (!affiliateLink) return;
    await navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const setupConnect = async () => {
    setConnectLoading(true);
    try {
      const res = await apiFetch<{ url: string }>('/api/ambassador/connect', { method: 'POST' });
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
      setConnectLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const TierIcon = tierIcons[data.tier] || Award;
  const tierColor = tierColors[data.tier] || tierColors.bronze;
  const progressPercent = data.nextTier
    ? Math.min(100, Math.round((data.activeReferrals / data.nextTierMin) * 100))
    : 100;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome + tier */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Bonjour {data.firstName}</h1>
          <p className="text-sm text-zinc-500">Votre dashboard ambassadeur</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${tierColor}`}>
          <TierIcon className="w-5 h-5" />
          <div>
            <p className="text-xs font-bold">{data.tierName}</p>
            <p className="text-[10px]">{(data.commissionRate * 100).toFixed(0)}% de commission</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <Users className="w-5 h-5 text-brand-600 mb-2" />
          <p className="text-2xl font-bold text-zinc-900">{data.activeReferrals}</p>
          <p className="text-xs text-zinc-400">Artisans actifs</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(data.monthlyEarnings)}</p>
          <p className="text-xs text-zinc-400">Gains ce mois</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <Wallet className="w-5 h-5 text-violet-600 mb-2" />
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(data.totalEarned)}</p>
          <p className="text-xs text-zinc-400">Total gagné</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <Wallet className="w-5 h-5 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(data.balance)}</p>
          <p className="text-xs text-zinc-400">En attente</p>
        </div>
      </div>

      {/* Tier progress */}
      {data.nextTier && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowUp className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-zinc-900">Progression vers {data.nextTierName}</h2>
            </div>
            <span className="text-xs text-zinc-400">{data.activeReferrals}/{data.nextTierMin} artisans actifs</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2.5">
            <div className="bg-brand-600 h-2.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Connect */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-zinc-900">Compte de paiement</h2>
        </div>
        {data.connectOnboarded ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-zinc-800">Configuré</p>
              <p className="text-xs text-zinc-400">Virements automatiques dès 5 € de commission.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">Configurez votre compte pour recevoir vos commissions automatiquement.</p>
            <button
              onClick={setupConnect} disabled={connectLoading}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              {connectLoading ? 'Redirection...' : data.hasConnectAccount ? 'Finaliser la configuration' : 'Configurer mon compte de paiement'}
            </button>
          </div>
        )}
      </div>

      {/* Affiliate link */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">Votre lien de parrainage</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-700 font-mono truncate">
            {affiliateLink}
          </div>
          <button onClick={copyLink} className="shrink-0 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Leaderboard */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-zinc-900">Leaderboard — {leaderboardMonth}</h2>
          </div>
          {leaderboard.length > 0 ? (
            <div className="divide-y divide-zinc-50">
              {leaderboard.map((entry, i) => (
                <div key={entry.id} className={`px-5 py-3 flex items-center justify-between ${entry.isMe ? 'bg-brand-50/50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-zinc-100 text-zinc-600' :
                      i === 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-zinc-50 text-zinc-400'
                    }`}>{i + 1}</span>
                    <span className={`text-sm ${entry.isMe ? 'font-bold text-brand-700' : 'text-zinc-700'}`}>
                      {entry.name} {entry.isMe && '(vous)'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">{entry.referralsThisMonth}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-zinc-400">Aucun parrainage ce mois-ci</div>
          )}
          <div className="px-5 py-2 bg-zinc-50 text-[10px] text-zinc-400">
            Top 3 : 100€ / 50€ / 25€ de bonus
          </div>
        </div>

        {/* Referrals */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Artisans ({data.totalReferrals})</h2>
          </div>
          {data.referrals.length > 0 ? (
            <div className="divide-y divide-zinc-50">
              {data.referrals.slice(0, 10).map((r) => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-zinc-700">{r.name}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    r.status === 'trialing' ? 'bg-amber-100 text-amber-700' :
                    'bg-zinc-100 text-zinc-500'
                  }`}>
                    {r.status === 'active' ? 'Actif' : r.status === 'trialing' ? 'Essai' : 'Inactif'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-zinc-400">Aucun artisan parrainé</div>
          )}
        </div>
      </div>

      {/* Commissions history */}
      {data.commissions.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Historique des paiements</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs text-zinc-400">
                  <th className="text-left px-5 py-2.5 font-medium">Date</th>
                  <th className="text-left px-5 py-2.5 font-medium">Artisan</th>
                  <th className="text-right px-5 py-2.5 font-medium">Facture</th>
                  <th className="text-right px-5 py-2.5 font-medium">Commission</th>
                  <th className="text-left px-5 py-2.5 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.commissions.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-5 py-3 text-zinc-400">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3 font-medium text-zinc-700">{c.referredCompanyName}</td>
                    <td className="px-5 py-3 text-right text-zinc-500">{formatCurrency(c.invoiceAmount)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-600">+{formatCurrency(c.amount)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{c.status === 'paid' ? 'Viré' : 'En attente'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
