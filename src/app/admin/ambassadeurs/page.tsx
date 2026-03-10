'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, Wallet, Trophy, ChevronDown, ChevronUp, CreditCard, CheckCircle2, Award, Star, Crown, Gem } from 'lucide-react';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';
import { apiFetch, formatCurrency } from '@/lib/utils';

interface AmbassadorData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  affiliateCode: string;
  tier: string;
  tierName: string;
  commissionRate: number;
  customTier: string | null;
  customCommissionRate: number | null;
  balance: number;
  totalEarned: number;
  monthlyEarnings: number;
  totalTransferred: number;
  activeReferrals: number;
  totalReferrals: number;
  connectStatus: string;
  stripeConnectAccountId: string | null;
  createdAt: string;
  referrals: { id: string; name: string; status: string; createdAt: string }[];
}

interface LeaderboardEntry {
  id: string;
  name: string;
  referralsThisMonth: number;
}

const tierIcons: Record<string, any> = { bronze: Award, argent: Star, or: Crown, diamant: Gem };
const tierBadge: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700',
  argent: 'bg-zinc-100 text-zinc-600',
  or: 'bg-yellow-100 text-yellow-700',
  diamant: 'bg-violet-100 text-violet-700',
};
const connectBadge: Record<string, { label: string; cls: string }> = {
  active: { label: 'Connect actif', cls: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  not_created: { label: 'Non configuré', cls: 'bg-zinc-100 text-zinc-500' },
};

export default function AdminAmbassadeursPage() {
  const [ambassadors, setAmbassadors] = useState<AmbassadorData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState<string | null>(null);

  const fetchData = () => {
    apiFetch<{ data: AmbassadorData[]; leaderboard: LeaderboardEntry[] }>('/api/admin/ambassadors')
      .then(r => { setAmbassadors(r.data); setLeaderboard(r.leaderboard); })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const markAsPaid = async (id: string) => {
    if (!confirm('Confirmer le paiement manuel ?')) return;
    setPaying(id);
    try {
      await apiFetch('/api/admin/ambassadors', { method: 'PATCH', body: JSON.stringify({ ambassadorId: id, action: 'markPaid' }) });
      setAmbassadors(prev => prev.map(a => a.id === id ? { ...a, balance: 0 } : a));
      toast.success('Payé');
    } catch { toast.error('Erreur'); }
    finally { setPaying(null); }
  };

  const updateTier = async (id: string, customTier: string | null, customCommissionRate: number | null) => {
    try {
      await apiFetch('/api/admin/ambassadors', {
        method: 'PATCH',
        body: JSON.stringify({ ambassadorId: id, action: 'updateTier', customTier, customCommissionRate }),
      });
      toast.success('Palier mis à jour');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const totalActive = ambassadors.reduce((s, a) => s + a.activeReferrals, 0);
  const totalMonthly = ambassadors.reduce((s, a) => s + a.monthlyEarnings, 0);
  const totalBalance = ambassadors.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Ambassadeurs</h1>
        <p className="text-sm text-zinc-500 mt-1">{ambassadors.length} ambassadeurs inscrits</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <Users className="w-5 h-5 text-brand-600 mb-2" />
          <p className="text-2xl font-bold text-zinc-900">{ambassadors.length}</p>
          <p className="text-xs text-zinc-400">Ambassadeurs</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <Users className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-zinc-900">{totalActive}</p>
          <p className="text-xs text-zinc-400">Artisans actifs</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <TrendingUp className="w-5 h-5 text-violet-600 mb-2" />
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(totalMonthly)}</p>
          <p className="text-xs text-zinc-400">Commissions ce mois</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <Wallet className="w-5 h-5 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(totalBalance)}</p>
          <p className="text-xs text-zinc-400">En attente</p>
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-zinc-900">Leaderboard du mois</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {leaderboard.map((e, i) => (
              <div key={e.id} className="px-5 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-zinc-100 text-zinc-600' : i === 2 ? 'bg-amber-100 text-amber-700' : 'bg-zinc-50 text-zinc-400'
                  }`}>{i + 1}</span>
                  <span className="text-sm text-zinc-700">{e.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{e.referralsThisMonth} artisans</span>
                  {i < 3 && <span className="text-xs font-bold text-yellow-600">+{i === 0 ? '100' : i === 1 ? '50' : '25'}€</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ambassadors list */}
      <div className="space-y-4">
        {ambassadors.map((amb) => {
          const TierIcon = tierIcons[amb.tier] || Award;
          const cb = connectBadge[amb.connectStatus] || connectBadge.not_created;
          return (
            <div key={amb.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <div
                className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                onClick={() => setExpanded(p => ({ ...p, [amb.id]: !p[amb.id] }))}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tierBadge[amb.tier] || tierBadge.bronze}`}>
                    <TierIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900 truncate">{amb.name}</h3>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tierBadge[amb.tier]}`}>{amb.tierName}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cb.cls}`}>{cb.label}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{amb.email} — {(amb.commissionRate * 100).toFixed(0)}% commission</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-zinc-400">Artisans</p>
                    <p className="text-sm font-semibold">{amb.activeReferrals}/{amb.totalReferrals}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-zinc-400">Ce mois</p>
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(amb.monthlyEarnings)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Solde</p>
                    <p className={`text-sm font-bold ${amb.balance > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>{formatCurrency(amb.balance)}</p>
                  </div>
                  {expanded[amb.id] ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </div>
              </div>

              {expanded[amb.id] && (
                <div className="border-t border-zinc-100">
                  <div className="px-5 py-3 bg-zinc-50 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-zinc-500">Code: <span className="font-mono">{amb.affiliateCode}</span></span>
                      <span className="text-zinc-500">Total gagné: <span className="font-semibold">{formatCurrency(amb.totalEarned)}</span></span>
                      <span className="text-zinc-500">Transféré: <span className="font-semibold">{formatCurrency(amb.totalTransferred)}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      {amb.balance > 0 && amb.connectStatus !== 'active' && (
                        <Button variant="brand" onClick={(e: React.MouseEvent) => { e.stopPropagation(); markAsPaid(amb.id); }}
                          loading={paying === amb.id} className="text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Marquer payé ({formatCurrency(amb.balance)})
                        </Button>
                      )}
                      <select
                        className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5"
                        value={amb.customTier || ''}
                        onChange={(e) => updateTier(amb.id, e.target.value || null, amb.customCommissionRate)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Palier auto</option>
                        <option value="bronze">Bronze (15%)</option>
                        <option value="argent">Argent (20%)</option>
                        <option value="or">Or (25%)</option>
                        <option value="diamant">Diamant (30%)</option>
                      </select>
                    </div>
                  </div>

                  {amb.referrals.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-100 text-xs text-zinc-400">
                            <th className="text-left px-5 py-2 font-medium">Artisan</th>
                            <th className="text-left px-5 py-2 font-medium">Statut</th>
                            <th className="text-left px-5 py-2 font-medium">Inscrit le</th>
                          </tr>
                        </thead>
                        <tbody>
                          {amb.referrals.map(r => (
                            <tr key={r.id} className="border-b border-zinc-50 last:border-0">
                              <td className="px-5 py-2 font-medium text-zinc-700">{r.name}</td>
                              <td className="px-5 py-2">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                  {r.status === 'actif' ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td className="px-5 py-2 text-zinc-400">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
