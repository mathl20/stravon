'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, Wallet, Copy, Check, CreditCard, CheckCircle2, Trophy, Award, Star, Crown, Gem, ArrowUp, Lock, Gift } from 'lucide-react';
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
  totalRewardsEarned: number;
  isLeaderboardEligible: boolean;
  connectOnboarded: boolean;
  hasConnectAccount: boolean;
  referrals: { id: string; name: string; status: string; createdAt: string }[];
  commissions: { id: string; amount: number; invoiceAmount: number; commissionRate: number; status: string; referredCompanyName: string; createdAt: string }[];
}

interface LeaderboardEntry {
  id: string;
  name: string;
  referralsThisMonth: number;
  tier: string;
  isMe: boolean;
}

interface RewardEntry {
  id: string;
  month: number;
  year: number;
  rank: number;
  amount: number;
  referralsCount: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  myRank: number | null;
  myReferralsThisMonth: number;
  gapToAbove: number | null;
  isEligible: boolean;
  myTier: string;
  remainingToUnlock: number;
  myRewards: RewardEntry[];
  month: string;
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

const MONTH_NAMES = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function AmbassadeurDashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [lb, setLb] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: DashboardData }>('/api/ambassador/dashboard').then(r => setData(r.data)),
      apiFetch<{ data: LeaderboardData }>('/api/ambassador/leaderboard').then(r => setLb(r.data)),
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
  if (!data || !lb) return null;

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
          {/* Starter unlock message */}
          {data.tier === 'starter' && (
            <p className="text-xs text-amber-600 mt-2 font-medium">
              Plus que {lb.remainingToUnlock} artisan{lb.remainingToUnlock > 1 ? 's' : ''} pour débloquer le classement mensuel et les récompenses !
            </p>
          )}
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
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">Votre lien d&apos;affiliation</h2>
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

      {/* Leaderboard section */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-zinc-900">Classement du mois — {lb.month}</h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold">
            <span className="text-yellow-600">🥇 100€</span>
            <span className="text-zinc-400">🥈 50€</span>
            <span className="text-amber-600">🥉 25€</span>
          </div>
        </div>

        {lb.isEligible ? (
          <>
            {/* My position summary */}
            {lb.myRank && (
              <div className="px-5 py-3 bg-brand-50/50 border-b border-brand-100/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-brand-700">
                      Votre position : {lb.myRank === 1 ? '🥇' : lb.myRank === 2 ? '🥈' : lb.myRank === 3 ? '🥉' : `#${lb.myRank}`}
                    </span>
                    <span className="text-xs text-brand-500">{lb.myReferralsThisMonth} artisan{lb.myReferralsThisMonth > 1 ? 's' : ''} ce mois</span>
                  </div>
                  {lb.gapToAbove !== null && lb.gapToAbove > 0 && (
                    <span className="text-xs text-zinc-500">
                      {lb.gapToAbove} artisan{lb.gapToAbove > 1 ? 's' : ''} pour monter
                    </span>
                  )}
                </div>
                {lb.myRank <= 3 && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    Vous êtes en position de remporter {lb.myRank === 1 ? '100€' : lb.myRank === 2 ? '50€' : '25€'} de bonus !
                  </p>
                )}
              </div>
            )}

            {lb.leaderboard.length > 0 ? (
              <div className="divide-y divide-zinc-50">
                {lb.leaderboard.map((entry, i) => (
                  <div key={entry.id} className={`px-5 py-3 flex items-center justify-between ${entry.isMe ? 'bg-brand-50/50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-zinc-100 text-zinc-600' :
                        i === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-zinc-50 text-zinc-400'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                      <div>
                        <span className={`text-sm ${entry.isMe ? 'font-bold text-brand-700' : 'text-zinc-700'}`}>
                          {entry.name} {entry.isMe && '(vous)'}
                        </span>
                        <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tierColors[entry.tier] || tierColors.bronze}`}>
                          {entry.tier.charAt(0).toUpperCase() + entry.tier.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-zinc-900">{entry.referralsThisMonth} artisan{entry.referralsThisMonth > 1 ? 's' : ''}</span>
                      {i < 3 && <span className="text-xs font-bold text-yellow-600">+{i === 0 ? '100' : i === 1 ? '50' : '25'}€</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-zinc-400">Aucune affiliation ce mois-ci parmi les ambassadeurs éligibles</div>
            )}
          </>
        ) : (
          /* Locked state for Bronze */
          <div className="px-5 py-10 text-center">
            <Lock className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">Classement verrouillé</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              Atteignez le palier Argent (10 artisans actifs) pour participer au classement et gagner des récompenses mensuelles.
            </p>
            <div className="max-w-xs mx-auto">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span>Progression</span>
                <span>{data.activeReferrals}/10 artisans</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2">
                <div className="bg-brand-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (data.activeReferrals / 10) * 100)}%` }} />
              </div>
              <p className="text-xs text-brand-600 font-medium mt-2">
                Plus que {lb.remainingToUnlock} artisan{lb.remainingToUnlock > 1 ? 's' : ''} !
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Reward history */}
      {lb.myRewards.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-zinc-900">Historique des récompenses</h2>
            <span className="ml-auto text-xs text-emerald-600 font-semibold">Total : {formatCurrency(data.totalRewardsEarned)}</span>
          </div>
          <div className="divide-y divide-zinc-50">
            {lb.myRewards.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-base">{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-700">{MONTH_NAMES[r.month]} {r.year}</p>
                    <p className="text-xs text-zinc-400">{r.referralsCount} artisan{r.referralsCount > 1 ? 's' : ''} affilié{r.referralsCount > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-600">+{formatCurrency(r.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
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
            <div className="px-5 py-8 text-center text-sm text-zinc-400">Aucun artisan affilié</div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Récompenses mensuelles</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">🥇</span>
              <div>
                <p className="text-sm font-semibold text-zinc-700">1er — 100€ de bonus</p>
                <p className="text-xs text-zinc-400">Le plus d&apos;artisans affiliés dans le mois</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🥈</span>
              <div>
                <p className="text-sm font-semibold text-zinc-700">2ème — 50€ de bonus</p>
                <p className="text-xs text-zinc-400">Deuxième au classement mensuel</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🥉</span>
              <div>
                <p className="text-sm font-semibold text-zinc-700">3ème — 25€ de bonus</p>
                <p className="text-xs text-zinc-400">Troisième au classement mensuel</p>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-100">
              <p className="text-xs text-zinc-400">
                {lb.isEligible
                  ? 'Le classement est remis à zéro le 1er de chaque mois. Les bonus sont ajoutés à votre solde et versés via Stripe Connect.'
                  : 'Accessible dès le palier Argent (10 artisans actifs). Les bonus sont versés via Stripe Connect.'}
              </p>
            </div>
          </div>
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
