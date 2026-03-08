'use client';

import { useEffect, useState } from 'react';
import { Gift, Users, Clock, Check, Copy, TrendingUp } from 'lucide-react';
import { Card, PageLoader } from '@/components/ui';
import { apiFetch, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  rewardedCount: number;
  pendingCount: number;
  freeMonthsEarned: number;
  monthsEarnedLast12Months: number;
  maxMonthsPerYear: number;
  referrals: {
    name: string;
    date: string;
    status: string;
  }[];
}

interface AdminData {
  totalReferrals: number;
  pendingCount: number;
  rewardedCount: number;
  totalFreeMonths: number;
  referrals: {
    id: string;
    referrer: string;
    referrerEmail: string;
    referred: string;
    referredEmail: string;
    status: string;
    createdAt: string;
    rewardedAt: string | null;
  }[];
}

export default function ParrainagePage() {
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: ReferralData }>('/api/referral').then(r => setReferral(r.data)),
      apiFetch<{ data: AdminData }>('/api/referral/admin').then(r => setAdmin(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Parrainage</h1>
        <p className="text-sm text-zinc-500 mt-1">Invitez des artisans et gagnez des mois gratuits</p>
      </div>

      {/* Incentive banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Gift className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Parrainez et gagnez 1 mois gratuit !</h2>
            <p className="text-sm text-emerald-700 mt-1">
              Pour chaque artisan que vous parrainez et qui souscrit un abonnement payant, vous recevez <strong>1 mois gratuit</strong> et votre filleul aussi (maximum {referral?.maxMonthsPerYear || 3} mois par an).
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {referral && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="!p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">Filleuls inscrits</p>
                <p className="text-2xl font-bold text-zinc-900">{referral.totalReferred}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">En attente de paiement</p>
                <p className="text-2xl font-bold text-amber-600">{referral.pendingCount}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">Mois gratuits (12 mois)</p>
                <p className="text-2xl font-bold text-emerald-600">{referral.monthsEarnedLast12Months} <span className="text-sm font-medium text-zinc-400">/ {referral.maxMonthsPerYear}</span></p>
                {referral.monthsEarnedLast12Months >= referral.maxMonthsPerYear && (
                  <p className="text-xs text-amber-600 mt-0.5">Limite atteinte</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Share section */}
      {referral && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Copy className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Votre lien de parrainage</h3>
              <p className="text-xs text-zinc-400">Partagez-le avec vos confrères artisans</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-700 font-mono truncate">
              {referral.referralLink}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referral.referralLink);
                setCopied(true);
                toast.success('Lien copié !');
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié' : 'Copier mon code'}
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                onClick={() => {
                  navigator.share({
                    title: 'Rejoignez STRAVON',
                    text: `Gérez votre activité d'artisan avec STRAVON. Inscrivez-vous avec mon lien pour profiter d'1 mois gratuit !`,
                    url: referral.referralLink,
                  }).catch(() => {});
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
              >
                Partager mon lien
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Code : <span className="font-mono font-medium text-zinc-600">{referral.referralCode}</span>
          </p>
        </Card>
      )}

      {/* Referral history */}
      {referral && referral.referrals.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-zinc-900 mb-4">Historique de vos parrainages</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Filleul</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Date d&apos;inscription</th>
                  <th className="text-right text-xs font-medium text-zinc-400 pb-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {referral.referrals.map((r, i) => (
                  <tr key={i}>
                    <td className="py-3 font-medium text-zinc-800">{r.name}</td>
                    <td className="py-3 text-zinc-500">{r.date}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                        r.status === 'REWARDED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.status === 'REWARDED' ? (
                          <><Check className="w-3 h-3" /> 1 mois offert</>
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

      {referral && referral.referrals.length === 0 && (
        <Card className="text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900">Aucun filleul pour le moment</h3>
          <p className="text-xs text-zinc-400 mt-1">Partagez votre lien de parrainage pour commencer</p>
        </Card>
      )}

      {/* Admin section - all company referrals */}
      {admin && admin.referrals.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-zinc-900 mb-2">Administration des parrainages</h3>
          <p className="text-xs text-zinc-400 mb-4">Vue d&apos;ensemble de tous les parrainages de votre entreprise</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-zinc-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-zinc-900">{admin.totalReferrals}</p>
              <p className="text-xs text-zinc-400">Total</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-600">{admin.pendingCount}</p>
              <p className="text-xs text-zinc-400">En attente</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{admin.rewardedCount}</p>
              <p className="text-xs text-zinc-400">Récompensés</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-blue-600">{admin.totalFreeMonths}</p>
              <p className="text-xs text-zinc-400">Mois offerts</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Parrain</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Filleul</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-3">Date</th>
                  <th className="text-right text-xs font-medium text-zinc-400 pb-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {admin.referrals.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3">
                      <p className="font-medium text-zinc-800">{r.referrer}</p>
                      <p className="text-xs text-zinc-400">{r.referrerEmail}</p>
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-zinc-800">{r.referred}</p>
                      <p className="text-xs text-zinc-400">{r.referredEmail}</p>
                    </td>
                    <td className="py-3 text-zinc-500">{formatDate(r.createdAt)}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                        r.status === 'REWARDED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.status === 'REWARDED' ? 'Récompensé' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
