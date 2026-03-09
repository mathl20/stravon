'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, Wallet, CheckCircle2, ChevronDown, ChevronUp, CreditCard, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';
import { apiFetch, formatCurrency } from '@/lib/utils';

interface Referral {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  createdAt: string;
}

interface Transfer {
  id: string;
  amount: number;
  stripeTransferId: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface AffiliateCompany {
  id: string;
  name: string;
  email: string;
  affiliateCode: string;
  balance: number;
  iban: string | null;
  connectStatus: 'not_created' | 'pending' | 'active';
  stripeConnectAccountId: string | null;
  monthlyEarnings: number;
  totalEarned: number;
  totalTransferred: number;
  activeReferrals: number;
  totalReferrals: number;
  referrals: Referral[];
  recentTransfers: Transfer[];
}

export default function AdminAffiliationsPage() {
  const [affiliates, setAffiliates] = useState<AffiliateCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: AffiliateCompany[] }>('/api/admin/affiliations')
      .then((r) => setAffiliates(r.data))
      .catch(() => toast.error('Impossible de charger les affiliations'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const markAsPaid = async (companyId: string) => {
    if (!confirm('Confirmer le paiement manuel ? Le solde sera remis à zéro et les commissions marquées comme payées.')) return;
    setPaying(companyId);
    try {
      await apiFetch('/api/admin/affiliations', {
        method: 'PATCH',
        body: JSON.stringify({ companyId }),
      });
      setAffiliates((prev) =>
        prev.map((a) =>
          a.id === companyId ? { ...a, balance: 0 } : a
        )
      );
      toast.success('Paiement marqué comme effectué');
    } catch {
      toast.error('Erreur lors du marquage');
    } finally {
      setPaying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalBalance = affiliates.reduce((s, a) => s + a.balance, 0);
  const totalMonthly = affiliates.reduce((s, a) => s + a.monthlyEarnings, 0);
  const totalActiveReferrals = affiliates.reduce((s, a) => s + a.activeReferrals, 0);
  const totalTransferred = affiliates.reduce((s, a) => s + a.totalTransferred, 0);

  const connectStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Actif', className: 'bg-emerald-100 text-emerald-700' };
      case 'pending': return { label: 'En attente', className: 'bg-amber-100 text-amber-700' };
      default: return { label: 'Non configuré', className: 'bg-zinc-100 text-zinc-500' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Affiliations</h1>
        <p className="text-sm text-zinc-500 mt-1">Suivi des affiliés, filleuls, transferts Stripe Connect et paiements</p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center mb-3">
            <Users className="w-4.5 h-4.5 text-brand-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{totalActiveReferrals}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Filleuls actifs</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(totalMonthly)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Commissions ce mois</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
            <ArrowUpRight className="w-4.5 h-4.5 text-violet-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(totalTransferred)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Total transféré</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <Wallet className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(totalBalance)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">En attente</p>
        </div>
      </div>

      {/* Affiliates list */}
      {affiliates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-zinc-300" />
          </div>
          <p className="text-sm text-zinc-500">Aucun affilié avec des filleuls pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {affiliates.map((affiliate) => {
            const cs = connectStatusLabel(affiliate.connectStatus);
            return (
              <div key={affiliate.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                {/* Header */}
                <div
                  className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                  onClick={() => toggleExpand(affiliate.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-brand-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900 truncate">{affiliate.name}</h3>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cs.className}`}>
                          {cs.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate">{affiliate.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-zinc-400">Filleuls</p>
                      <p className="text-sm font-semibold text-zinc-900">{affiliate.activeReferrals}/{affiliate.totalReferrals}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-zinc-400">Ce mois</p>
                      <p className="text-sm font-semibold text-emerald-600">{formatCurrency(affiliate.monthlyEarnings)}</p>
                    </div>
                    <div className="text-right hidden lg:block">
                      <p className="text-xs text-zinc-400">Transféré</p>
                      <p className="text-sm font-semibold text-violet-600">{formatCurrency(affiliate.totalTransferred)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">En attente</p>
                      <p className={`text-sm font-bold ${affiliate.balance > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>
                        {formatCurrency(affiliate.balance)}
                      </p>
                    </div>
                    {expanded[affiliate.id] ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Expanded */}
                {expanded[affiliate.id] && (
                  <div className="border-t border-zinc-100">
                    {/* Connect status + actions */}
                    <div className="px-5 py-3 bg-zinc-50 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-zinc-400" />
                          <span className="text-zinc-500">Connect :</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cs.className}`}>
                            {cs.label}
                          </span>
                        </div>
                        {affiliate.stripeConnectAccountId && (
                          <span className="text-xs text-zinc-400 font-mono">{affiliate.stripeConnectAccountId}</span>
                        )}
                      </div>
                      {/* Manual pay button for non-Connect affiliates */}
                      {affiliate.balance > 0 && affiliate.connectStatus !== 'active' && (
                        <Button
                          variant="brand"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            markAsPaid(affiliate.id);
                          }}
                          loading={paying === affiliate.id}
                          className="text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Marquer comme payé ({formatCurrency(affiliate.balance)})
                        </Button>
                      )}
                      {affiliate.connectStatus === 'active' && affiliate.balance > 0 && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Transfert automatique activé
                        </div>
                      )}
                    </div>

                    {/* Recent transfers */}
                    {affiliate.recentTransfers.length > 0 && (
                      <div className="border-t border-zinc-100">
                        <div className="px-5 py-2 bg-violet-50/50">
                          <p className="text-xs font-medium text-violet-700">Derniers transferts</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-zinc-100 text-xs text-zinc-400">
                                <th className="text-left px-5 py-2 font-medium">Date</th>
                                <th className="text-right px-5 py-2 font-medium">Montant</th>
                                <th className="text-left px-5 py-2 font-medium">Transfer ID</th>
                              </tr>
                            </thead>
                            <tbody>
                              {affiliate.recentTransfers.map((t) => (
                                <tr key={t.id} className="border-b border-zinc-50 last:border-0">
                                  <td className="px-5 py-2 text-zinc-400">
                                    {t.paidAt ? new Date(t.paidAt).toLocaleDateString('fr-FR') : '-'}
                                  </td>
                                  <td className="px-5 py-2 text-right font-semibold text-emerald-600">
                                    {formatCurrency(t.amount)}
                                  </td>
                                  <td className="px-5 py-2 text-xs text-zinc-400 font-mono">
                                    {t.stripeTransferId || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Referrals table */}
                    {affiliate.referrals.length > 0 ? (
                      <div className="border-t border-zinc-100">
                        <div className="px-5 py-2 bg-zinc-50/50">
                          <p className="text-xs font-medium text-zinc-500">Filleuls</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-zinc-100 text-xs text-zinc-400">
                                <th className="text-left px-5 py-2.5 font-medium">Entreprise</th>
                                <th className="text-left px-5 py-2.5 font-medium">Email</th>
                                <th className="text-left px-5 py-2.5 font-medium">Plan</th>
                                <th className="text-left px-5 py-2.5 font-medium">Statut</th>
                                <th className="text-left px-5 py-2.5 font-medium">Inscrit le</th>
                              </tr>
                            </thead>
                            <tbody>
                              {affiliate.referrals.map((r) => (
                                <tr key={r.id} className="border-b border-zinc-50 last:border-0">
                                  <td className="px-5 py-3 font-medium text-zinc-700">{r.name}</td>
                                  <td className="px-5 py-3 text-zinc-500">{r.email}</td>
                                  <td className="px-5 py-3 text-zinc-500">{r.plan}</td>
                                  <td className="px-5 py-3">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                      r.status === 'actif'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-zinc-100 text-zinc-500'
                                    }`}>
                                      {r.status === 'actif' ? 'Actif' : 'Inactif'}
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
                    ) : (
                      <div className="px-5 py-4 text-sm text-zinc-400 border-t border-zinc-100">Aucun filleul</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
