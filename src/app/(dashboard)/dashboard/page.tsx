'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  UserPlus,
  FilePlus,
  FileText,
  FileSignature,
  AlertTriangle,
  Bell,
  Target,
  Gift,
  Copy,
  Check,
  Brain,
  Lightbulb,
  DollarSign,
  PhoneCall,
  Tag,
  ChevronRight,
  BarChart3,
  Zap,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { StatCard } from '@/components/dashboard/stat-card';
const RevenueChart = dynamic(() => import('@/components/dashboard/revenue-chart').then(m => m.RevenueChart), { ssr: false, loading: () => <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> });
const HorizontalBarChart = dynamic(() => import('@/components/dashboard/horizontal-bar-chart').then(m => m.HorizontalBarChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> });
const PieChart = dynamic(() => import('@/components/dashboard/pie-chart').then(m => m.PieChart), { ssr: false, loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> });
const ConversionCard = dynamic(() => import('@/components/dashboard/conversion-card').then(m => m.ConversionCard), { ssr: false, loading: () => <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> });
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { Card, StatusBadge, PageLoader } from '@/components/ui';
import { apiFetch, capitalize, formatCurrency, formatDate } from '@/lib/utils';
import { canManageClients, canViewGlobalRevenue, canViewProfitability, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { usePermissions } from '@/lib/permissions-context';
import type { DashboardStats } from '@/types';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist';
import { TrialSummaryPopup } from '@/components/onboarding/trial-summary-popup';

function isValidSiret(siret: string): boolean {
  const digits = siret.replace(/\s/g, '');
  if (!/^\d{14}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = parseInt(digits[i], 10);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-amber-400',
  EN_COURS: 'bg-blue-400',
  TERMINE: 'bg-violet-400',
  INVOICED: 'bg-sky-400',
  PAID: 'bg-emerald-400',
};

function AdvancedSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between pt-2">
        <div>
          <div className="h-4 w-40 bg-zinc-100 rounded" />
          <div className="h-3 w-56 bg-zinc-100 rounded mt-2" />
        </div>
        <div className="h-8 w-60 bg-zinc-100 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-6 h-48" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="card p-6 h-48" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const perms = usePermissions();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [adv, setAdv] = useState<any>(null);
  const [advLoading, setAdvLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [referral, setReferral] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [onboarding, setOnboarding] = useState<{ step: number; completed: boolean; checklist: any; trialEndsAt: string | null; createdAt: string } | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [companySiret, setCompanySiret] = useState<string | null>(null);
  const [companyAssurance, setCompanyAssurance] = useState<string | null>(null);

  const canSeeRevenue = canViewGlobalRevenue(perms);
  const canSeeAdvanced = hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE);

  // 1. Load basic stats (fast — 5-6 queries) + refresh on tab focus
  const loadStats = () => {
    apiFetch<{ data: DashboardStats }>('/api/dashboard/stats')
      .then((r) => setStats(r.data))
      .catch((e) => { console.error('Dashboard stats error:', e); setError(e.message || 'Erreur'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, []);

  // Re-fetch when user comes back to the tab
  useEffect(() => {
    const onFocus = () => { loadStats(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // 1b. Load onboarding status + company SIRET
  useEffect(() => {
    if (!canSeeAdvanced) return;
    apiFetch<any>('/api/onboarding/status')
      .then((data) => {
        setOnboarding(data);
        if (!data.completed && data.step === 0) setShowWizard(true);
      })
      .catch(() => {});
    apiFetch<{ data: { siret?: string; assuranceDecennaleNom?: string } }>('/api/company')
      .then((r) => { setCompanySiret(r.data.siret || null); setCompanyAssurance(r.data.assuranceDecennaleNom || null); })
      .catch(() => {});
  }, [canSeeAdvanced]);

  // 2. Load advanced stats lazily after basic stats are ready
  useEffect(() => {
    if (!stats || !canSeeAdvanced) return;
    setAdvLoading(true);
    const params = new URLSearchParams({ advanced: 'true' });
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    apiFetch<{ advancedStats: any }>(`/api/dashboard/stats?${params}`)
      .then((r) => setAdv(r.advancedStats))
      .catch((e) => console.error('Advanced stats error:', e))
      .finally(() => setAdvLoading(false));
  }, [canSeeAdvanced, dateFrom, dateTo]);

  // 3. Load referral data for PATRON
  useEffect(() => {
    if (!stats || !canSeeAdvanced) return;
    apiFetch<{ data: any }>('/api/referral')
      .then((r) => setReferral(r.data))
      .catch(() => {});
  }, [stats, canSeeAdvanced]);

  // 4. Load analytics data (Analyse STRAVON)
  useEffect(() => {
    if (!stats || !canSeeAdvanced) return;
    setAnalyticsLoading(true);
    apiFetch<any>('/api/analytics')
      .then((r) => setAnalytics(r))
      .catch((e) => console.error('Analytics error:', e))
      .finally(() => setAnalyticsLoading(false));
  }, [stats, canSeeAdvanced]);

  if (loading) return <PageLoader />;

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <p className="text-sm text-red-500 mb-3">{error || 'Impossible de charger le tableau de bord'}</p>
        <button onClick={() => window.location.reload()} className="btn-secondary text-sm">
          Réessayer
        </button>
      </div>
    );
  }

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const showChart = canSeeRevenue && stats.monthlyData.length > 0;

  const quickActions = [
    ...(canManageClients(perms) ? [{ href: '/clients/new', label: 'Nouveau client', icon: UserPlus }] : []),
    { href: '/interventions/new', label: 'Nouvelle intervention', icon: FilePlus },
    ...(hasPermission(perms, PERMISSIONS.DEVIS_VIEW) ? [{ href: '/devis/new', label: 'Nouveau devis', icon: FileSignature }] : []),
    { href: '/feuilles-heures', label: 'Mes heures', icon: Clock },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Onboarding wizard modal */}
      {showWizard && onboarding && (
        <OnboardingWizard
          currentStep={onboarding.step}
          onComplete={() => {
            setShowWizard(false);
            apiFetch<any>('/api/onboarding/status').then(setOnboarding).catch(() => {});
          }}
        />
      )}

      {/* Trial summary popup (J+10) */}
      {onboarding?.trialEndsAt && onboarding?.createdAt && (
        <TrialSummaryPopup trialEndsAt={onboarding.trialEndsAt} createdAt={onboarding.createdAt} />
      )}

      {/* SIRET warning */}
      {canSeeAdvanced && companySiret !== null && !isValidSiret(companySiret) && (
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>SIRET invalide ou manquant</p>
            <p className="text-xs" style={{ color: '#9d9bab' }}>Votre SIRET est obligatoire et doit etre valide pour generer des devis conformes.</p>
          </div>
          <Link href="/settings" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            Corriger
          </Link>
        </div>
      )}

      {/* Assurance décennale warning */}
      {canSeeAdvanced && companyAssurance === null && companySiret !== null && (
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Assurance decennale non renseignee</p>
            <p className="text-xs" style={{ color: '#9d9bab' }}>Obligatoire pour les professionnels du BTP. Vos devis ne mentionneront pas l&apos;assurance tant qu&apos;elle n&apos;est pas renseignee.</p>
          </div>
          <Link href="/settings" className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            Completer
          </Link>
        </div>
      )}

      {/* ── Mobile-first main dashboard card ── */}
      <div className="relative">
        {/* Violet glow behind card */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-full max-w-xl h-72 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(108,99,255,0.12) 0%, transparent 70%)', zIndex: 0 }}
        />
        {/* Main dark card */}
        <div
          className="relative z-10 overflow-hidden"
          style={{ background: '#111119', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 48px rgba(108,99,255,0.08)' }}
        >
          {/* Greeting */}
          <div className="px-5 pt-5 pb-4">
            <p className="text-base font-bold text-white">
              {greeting}{stats.userFirstName ? `, ${capitalize(stats.userFirstName)}` : ''} 👋
            </p>
            <p className="text-[11px] capitalize" style={{ color: '#9d9bab' }}>{dateStr}</p>
          </div>

          {/* 4 Stat cards 2×2 — patron */}
          {canSeeRevenue && (
            <div className="guide-kpis grid grid-cols-2 gap-2.5 px-5 pb-4">
              <div className="p-3 animate-fade-up" style={{ background: '#1a1a24', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', animationDelay: '0ms' }}>
                <p className="font-medium uppercase" style={{ color: '#5f5d6e', fontSize: '9px', letterSpacing: '0.06em' }}>CA DU MOIS</p>
                <p className="font-bold mt-1 tabular-nums" style={{ color: '#6C63FF', fontSize: '22px' }}>{formatCurrency(stats.monthlyRevenue)}</p>
                {(() => {
                  const prev = stats.previousMonthRevenue ?? 0;
                  if (prev === 0) return <p style={{ color: '#9d9bab', fontSize: '9px' }}>Ce mois-ci</p>;
                  const pct = Math.round(((stats.monthlyRevenue - prev) / prev) * 100);
                  return <p style={{ color: pct >= 0 ? '#4ade80' : '#f87171', fontSize: '9px' }}>{pct >= 0 ? `↗ +${pct}%` : `↘ ${pct}%`} vs mois dernier</p>;
                })()}
              </div>
              <div className="p-3 animate-fade-up" style={{ background: '#1a1a24', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', animationDelay: '100ms' }}>
                <p className="font-medium uppercase" style={{ color: '#5f5d6e', fontSize: '9px', letterSpacing: '0.06em' }}>NON PAYÉES</p>
                <p className="font-bold mt-1 tabular-nums" style={{ color: '#4ade80', fontSize: '22px' }}>{formatCurrency(stats.pendingRevenue)}</p>
                <p style={{ color: '#4ade80', fontSize: '9px' }}>{stats.facturesEnAttenteCount ?? 0} facture{(stats.facturesEnAttenteCount ?? 0) !== 1 ? 's' : ''}</p>
              </div>
              <div className="p-3 animate-fade-up" style={{ background: '#1a1a24', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', animationDelay: '200ms' }}>
                <p className="font-medium uppercase" style={{ color: '#5f5d6e', fontSize: '9px', letterSpacing: '0.06em' }}>INTERVENTIONS</p>
                <p className="font-bold mt-1 tabular-nums text-white" style={{ fontSize: '22px' }}>{stats.interventionsCetteSemaine ?? 0}</p>
                <p style={{ color: '#60a5fa', fontSize: '9px' }}>cette semaine</p>
              </div>
              <div className="p-3 animate-fade-up" style={{ background: '#1a1a24', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', animationDelay: '300ms' }}>
                <p className="font-medium uppercase" style={{ color: '#5f5d6e', fontSize: '9px', letterSpacing: '0.06em' }}>DEVIS EN COURS</p>
                <p className="font-bold mt-1 tabular-nums text-white" style={{ fontSize: '22px' }}>{stats.devisEnCours ?? 0}</p>
                <p style={{ color: '#fbbf24', fontSize: '9px' }}>{stats.devisARelancer ?? 0} à relancer</p>
              </div>
            </div>
          )}

          {/* Simplified stats for employees */}
          {!canSeeRevenue && (
            <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
              <div className="p-3" style={{ background: '#1a1a24', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-medium uppercase" style={{ color: '#5f5d6e', fontSize: '9px', letterSpacing: '0.06em' }}>MES INTERVENTIONS</p>
                <p className="font-bold mt-1 text-white" style={{ fontSize: '22px' }}>{stats.totalInterventions}</p>
                <p style={{ color: '#5f5d6e', fontSize: '9px' }}>Total</p>
              </div>
              <div className="p-3" style={{ background: '#1a1a24', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-medium uppercase" style={{ color: '#5f5d6e', fontSize: '9px', letterSpacing: '0.06em' }}>CETTE SEMAINE</p>
                <p className="font-bold mt-1 text-white" style={{ fontSize: '22px' }}>{stats.interventionsCetteSemaine ?? 0}</p>
                <p style={{ color: '#60a5fa', fontSize: '9px' }}>interventions</p>
              </div>
            </div>
          )}

          {/* Quick actions inside dark card */}
          <div className="guide-quick-actions grid grid-cols-2 lg:grid-cols-4 gap-2 px-5 pb-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors" style={{ background: 'rgba(255,255,255,0.06)', color: '#9d9bab', border: '1px solid rgba(255,255,255,0.06)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#9d9bab'; }}>
                <action.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{action.label}</span>
              </Link>
            ))}
          </div>

          {/* Activité récente */}
          {stats.activiteRecente && stats.activiteRecente.length > 0 && (
            <div className="px-5 pb-5">
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <p className="font-medium uppercase mb-3" style={{ color: '#9d9bab', fontSize: '10px', letterSpacing: '0.06em' }}>ACTIVITÉ RÉCENTE</p>
                <div>
                  {stats.activiteRecente.map((item, i) => {
                    const isLastItem = i === (stats.activiteRecente?.length ?? 1) - 1;
                    const iconConfig: Record<string, { bg: string; emoji: string }> = {
                      facture: { bg: 'rgba(74,222,128,0.20)', emoji: '📄' },
                      devis: { bg: 'rgba(96,165,250,0.20)', emoji: '📋' },
                      intervention: { bg: 'rgba(108,99,255,0.20)', emoji: '🔧' },
                    };
                    const cfg = iconConfig[item.type] || { bg: 'rgba(255,255,255,0.08)', emoji: '📌' };
                    const getBadge = (): { label: string; color: string; bg: string } => {
                      if (item.type === 'facture') {
                        if (item.status === 'PAYEE' || item.status === 'PAID') return { label: 'Payée', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' };
                        if (item.status === 'PAIEMENT_DECLARE') return { label: 'Paiement déclaré', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' };
                        if (item.status === 'ENVOYEE') return { label: 'Envoyée', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' };
                        if (item.status === 'EN_RETARD') return { label: 'En retard', color: '#f87171', bg: 'rgba(248,113,113,0.15)' };
                        if (item.status === 'ANNULEE') return { label: 'Annulée', color: '#9d9bab', bg: 'rgba(255,255,255,0.08)' };
                        return { label: 'En attente', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
                      }
                      if (item.type === 'devis') {
                        if (item.status === 'ACCEPTE') return { label: 'Accepté', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' };
                        if (item.status === 'REFUSE') return { label: 'Refusé', color: '#f87171', bg: 'rgba(248,113,113,0.15)' };
                        return { label: 'Envoyé', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' };
                      }
                      if (item.status === 'PAID') return { label: 'Payée', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' };
                      if (item.status === 'PENDING') return { label: 'En attente', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
                      return { label: item.status, color: '#9d9bab', bg: 'rgba(255,255,255,0.08)' };
                    };
                    const badge = getBadge();
                    const href = item.type === 'facture' ? `/factures/${item.id}` : item.type === 'devis' ? `/devis/${item.id}` : `/interventions/${item.id}`;
                    return (
                      <Link
                        key={`${item.type}-${item.id}`}
                        href={href}
                        className="flex items-center gap-3 py-2.5 rounded-lg transition-colors"
                        style={!isLastItem ? { borderBottom: '1px solid rgba(255,255,255,0.05)', paddingLeft: '6px', paddingRight: '6px', marginLeft: '-6px', marginRight: '-6px' } : { paddingLeft: '6px', paddingRight: '6px', marginLeft: '-6px', marginRight: '-6px' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                      >
                        <div className="flex-shrink-0 flex items-center justify-center text-base" style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg }}>
                          {cfg.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate" style={{ fontSize: '13px' }}>{item.title}</p>
                          <p className="truncate" style={{ color: '#9d9bab', fontSize: '11px' }}>{item.description}</p>
                        </div>
                        <div className="flex-shrink-0 px-2.5 py-1 rounded-full font-semibold" style={{ fontSize: '11px', background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding checklist */}
      {onboarding && !onboarding.completed && canSeeAdvanced && (
        <OnboardingChecklist checklist={onboarding.checklist} completed={onboarding.completed} />
      )}

      {/* Advanced stats — permissions-based, lazy loaded */}
      {canSeeAdvanced && (
        <>
          {advLoading && !adv && <AdvancedSkeleton />}
          {adv && (
            <>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Statistiques avancées</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Données détaillées de votre activité</p>
                </div>
                <DateRangePicker
                  from={dateFrom}
                  to={dateTo}
                  onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
                />
              </div>

              {/* Overdue invoices alert + relances button */}
              {(adv.facturesEnRetard > 0) && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700">
                      {adv.facturesEnRetard} facture{adv.facturesEnRetard > 1 ? 's' : ''} en retard de paiement
                    </p>
                    <p className="text-xs text-red-500 mt-0.5">Date d'échéance dépassée</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const r = await apiFetch<{ message: string; count: number }>('/api/relances/check', { method: 'POST' });
                        toast.success(r.message);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Erreur');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Envoyer les relances
                  </button>
                </div>
              )}

              {/* Devis tracking */}
              {(adv.devisEnAttente > 0 || adv.totalDevis > 0) && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="!p-4">
                    <p className="text-xs text-zinc-400 font-medium">Devis en attente</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">{adv.devisEnAttente}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Envoyés sans réponse</p>
                  </Card>
                  <Card className="!p-4">
                    <p className="text-xs text-zinc-400 font-medium">Montant potentiel</p>
                    <p className="text-xl font-bold text-zinc-900 mt-1">{formatCurrency(adv.montantDevisEnAttente)}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Devis en attente</p>
                  </Card>
                  <Card className="!p-4">
                    <p className="text-xs text-zinc-400 font-medium">Devis relancés</p>
                    <p className="text-xl font-bold text-sky-600 mt-1">{adv.devisRelances}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Avec relance(s)</p>
                  </Card>
                  <Card className="!p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-zinc-400 font-medium">Relancer</p>
                      <p className="text-[11px] text-zinc-400 mt-1">Vérifier et envoyer les relances devis</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const r = await apiFetch<{ message: string; count: number }>('/api/relances-devis/check', { method: 'POST' });
                          toast.success(r.message);
                          // Refresh advanced stats
                          const params = new URLSearchParams({ advanced: 'true' });
                          if (dateFrom) params.set('from', dateFrom);
                          if (dateTo) params.set('to', dateTo);
                          apiFetch<{ advancedStats: any }>(`/api/dashboard/stats?${params}`)
                            .then((res) => setAdv(res.advancedStats));
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Erreur');
                        }
                      }}
                      className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      Relancer les devis
                    </button>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card>
                  <HorizontalBarChart
                    title="Top 5 Clients (CA)"
                    items={adv.topClients}
                    formatValue={formatCurrency}
                  />
                </Card>

                <Card>
                  <HorizontalBarChart
                    title="CA par Employé"
                    items={adv.caEmployes}
                    formatValue={formatCurrency}
                    color="from-violet-500 to-violet-400"
                  />
                </Card>

                <Card>
                  <ConversionCard
                    rate={adv.conversionRate}
                    totalDevis={adv.totalDevis}
                    devisAcceptes={adv.devisAcceptes}
                  />
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card>
                  <PieChart
                    title="Répartition des interventions"
                    segments={[
                      { label: 'En attente', value: adv.statusDistrib?.find((s: any) => s.status === 'PENDING')?.count || 0, color: '#f59e0b' },
                      { label: 'Facturé', value: adv.statusDistrib?.find((s: any) => s.status === 'INVOICED')?.count || 0, color: '#0284c7' },
                      { label: 'Payé', value: adv.statusDistrib?.find((s: any) => s.status === 'PAID')?.count || 0, color: '#059669' },
                    ]}
                  />
                </Card>

                <Card>
                  <HorizontalBarChart
                    title="Heures travaillées par employé"
                    items={adv.heuresParEmploye}
                    formatValue={(v) => `${(v ?? 0).toFixed(1)}h`}
                    color="from-sky-500 to-sky-400"
                  />
                </Card>
              </div>

              {/* Referral section */}
              {referral && (
                <>
                  <div className="pt-2">
                    <h2 className="text-sm font-semibold text-zinc-900">Parrainage</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Invitez un artisan et gagnez 1 mois gratuit pour vous et votre filleul</p>
                  </div>

                  {/* Incentive banner */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Gift className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-emerald-900">Parrainez et gagnez !</h3>
                        <p className="text-sm text-emerald-700 mt-1">
                          Pour chaque artisan parrainé qui souscrit un abonnement, vous recevez <strong>1 mois gratuit</strong> et votre filleul aussi (max {referral.maxMonthsPerYear || 3} par an).
                        </p>
                        <p className="text-sm font-semibold text-emerald-800 mt-2">
                          {referral.monthsEarnedLast12Months ?? referral.freeMonthsEarned} / {referral.maxMonthsPerYear || 3} mois gratuits gagnés cette année
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <Card className="lg:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <Copy className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900">Votre lien de parrainage</h3>
                          <p className="text-xs text-zinc-400">Partagez-le pour parrainer un artisan</p>
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
                          {copied ? 'Copié' : 'Copier'}
                        </button>
                        {typeof navigator !== 'undefined' && navigator.share && (
                          <button
                            onClick={() => {
                              navigator.share({
                                title: 'Rejoignez STRAVON',
                                text: 'Gérez votre activité d\'artisan avec STRAVON. Inscrivez-vous avec mon lien pour profiter d\'1 mois gratuit !',
                                url: referral.referralLink,
                              }).catch(() => {});
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                          >
                            Partager
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-2">Code : <span className="font-mono font-medium text-zinc-600">{referral.referralCode}</span></p>
                    </Card>

                    <div className="space-y-4">
                      <Card className="!p-4">
                        <p className="text-xs text-zinc-400 font-medium">Filleuls inscrits</p>
                        <p className="text-2xl font-bold text-zinc-900 mt-1">{referral.totalReferred}</p>
                        {(referral.pendingCount ?? 0) > 0 && (
                          <p className="text-xs text-amber-600 mt-1">{referral.pendingCount} en attente de paiement</p>
                        )}
                      </Card>
                      <Card className="!p-4">
                        <p className="text-xs text-zinc-400 font-medium">Mois gratuits gagnés</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{referral.monthsEarnedLast12Months ?? referral.freeMonthsEarned} <span className="text-sm font-medium text-zinc-400">/ {referral.maxMonthsPerYear || 3}</span></p>
                        {(referral.monthsEarnedLast12Months ?? 0) >= (referral.maxMonthsPerYear || 3) && (
                          <p className="text-xs text-amber-600 mt-1">Limite atteinte cette année</p>
                        )}
                      </Card>
                    </div>
                  </div>

                  {referral.referrals.length > 0 && (
                    <Card>
                      <h3 className="text-sm font-semibold text-zinc-900 mb-3">Derniers filleuls</h3>
                      <div className="space-y-2">
                        {referral.referrals.map((r: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${r.status === 'REWARDED' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                <UserPlus className={`w-4 h-4 ${r.status === 'REWARDED' ? 'text-emerald-600' : 'text-amber-600'}`} />
                              </div>
                              <div>
                                <span className="text-sm font-medium text-zinc-800">{r.name}</span>
                                <p className="text-xs text-zinc-400">{r.date}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              r.status === 'REWARDED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {r.status === 'REWARDED' ? '1 mois offert' : 'En attente'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* Profitability section */}
              {canViewProfitability(perms) && adv.profitability && (
                <>
                  <div className="pt-2">
                    <h2 className="text-sm font-semibold text-zinc-900">Rentabilité</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Analyse des marges sur vos interventions payées</p>
                  </div>

                  {/* Profitability KPI cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="!p-4">
                      <p className="text-xs text-zinc-400 font-medium">CA total</p>
                      <p className="text-xl font-bold text-zinc-900 mt-1">{formatCurrency(adv.profitability.totalCA)}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{adv.profitability.count} intervention{adv.profitability.count > 1 ? 's' : ''}</p>
                    </Card>
                    <Card className="!p-4">
                      <p className="text-xs text-zinc-400 font-medium">Marge totale</p>
                      <p className={`text-xl font-bold mt-1 ${adv.profitability.totalMarge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(adv.profitability.totalMarge)}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Après coûts MO + matériaux</p>
                    </Card>
                    <Card className="!p-4">
                      <p className="text-xs text-zinc-400 font-medium">Marge moyenne</p>
                      <div className="flex items-center gap-2 mt-1">
                        {(() => {
                          const m = adv.profitability.avgMarge;
                          const Icon = m >= 10 ? TrendingUp : m >= 0 ? Minus : TrendingDown;
                          const color = m >= 30 ? 'text-emerald-600' : m >= 10 ? 'text-amber-600' : 'text-red-600';
                          return (
                            <>
                              <p className={`text-xl font-bold ${color}`}>{m}%</p>
                              <Icon className={`w-4 h-4 ${color}`} />
                            </>
                          );
                        })()}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {adv.profitability.avgMarge >= 30 ? 'Bonne rentabilité' : adv.profitability.avgMarge >= 10 ? 'Rentabilité correcte' : 'Rentabilité faible'}
                      </p>
                    </Card>
                    <Card className="!p-4">
                      <p className="text-xs text-zinc-400 font-medium">Heures totales</p>
                      <p className="text-xl font-bold text-zinc-900 mt-1">{Math.round(adv.profitability.totalHeures * 10) / 10}h</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Sur interventions payées</p>
                    </Card>
                  </div>

                  {/* Profitability margin bar */}
                  <Card>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-sm font-semibold text-zinc-900">Indicateur de marge global</h3>
                    </div>
                    <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          adv.profitability.avgMarge >= 30 ? 'bg-emerald-500' :
                          adv.profitability.avgMarge >= 10 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(Math.min(adv.profitability.avgMarge, 100), 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>0%</span>
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{'< 10%'}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />10-30%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{'>= 30%'}</span>
                      </div>
                      <span>100%</span>
                    </div>
                  </Card>

                  {/* Top/Least profitable */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <Card>
                      <h3 className="text-sm font-semibold text-zinc-900 mb-1">Interventions les plus rentables</h3>
                      <p className="text-xs text-zinc-400 mb-4">Par marge nette</p>
                      {adv.profitability.topProfitable.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-6">Aucune donnée</p>
                      ) : (
                        <div className="space-y-2">
                          {adv.profitability.topProfitable.map((p: any) => (
                            <Link key={p.id} href={`/interventions/${p.id}`}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 transition-colors group">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                p.tauxMarge >= 30 ? 'bg-emerald-500' : p.tauxMarge >= 10 ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-zinc-800 truncate group-hover:text-brand-600 transition-colors">{p.title}</p>
                                <p className="text-xs text-zinc-400">CA {formatCurrency(p.amountHT)}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-emerald-600">+{formatCurrency(p.marge)}</p>
                                <p className={`text-xs font-medium ${
                                  p.tauxMarge >= 30 ? 'text-emerald-500' : p.tauxMarge >= 10 ? 'text-amber-500' : 'text-red-500'
                                }`}>{p.tauxMarge}%</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </Card>

                    <Card>
                      <h3 className="text-sm font-semibold text-zinc-900 mb-1">Interventions les moins rentables</h3>
                      <p className="text-xs text-zinc-400 mb-4">Attention requise</p>
                      {adv.profitability.leastProfitable.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-6">Aucune donnée</p>
                      ) : (
                        <div className="space-y-2">
                          {adv.profitability.leastProfitable.map((p: any) => (
                            <Link key={p.id} href={`/interventions/${p.id}`}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 transition-colors group">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                p.tauxMarge >= 30 ? 'bg-emerald-500' : p.tauxMarge >= 10 ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-zinc-800 truncate group-hover:text-brand-600 transition-colors">{p.title}</p>
                                <p className="text-xs text-zinc-400">CA {formatCurrency(p.amountHT)}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-sm font-bold ${p.marge >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {p.marge >= 0 ? '+' : ''}{formatCurrency(p.marge)}
                                </p>
                                <p className={`text-xs font-medium ${
                                  p.tauxMarge >= 30 ? 'text-emerald-500' : p.tauxMarge >= 10 ? 'text-amber-500' : 'text-red-500'
                                }`}>{p.tauxMarge}%</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                </>
              )}

              {/* ── ANALYSE STRAVON ── */}
              {analyticsLoading && !analytics && (
                <div className="space-y-4 animate-pulse pt-2">
                  <div className="h-5 w-44 bg-zinc-100 rounded" />
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="card p-6 h-28" />)}
                  </div>
                  <div className="card p-6 h-64" />
                </div>
              )}

              {analytics && (
                <>
                  <div className="pt-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center">
                        <Brain className="w-[18px] h-[18px] text-white" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-900">Analyse STRAVON</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">Insights et recommandations intelligentes</p>
                      </div>
                    </div>
                  </div>

                  {/* Key metrics overview */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="!p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-3.5 h-3.5 text-brand-500" />
                        <p className="text-xs text-zinc-400 font-medium">Taux acceptation devis</p>
                      </div>
                      <p className={`text-2xl font-bold ${
                        analytics.metrics.devis.tauxAcceptation >= 50 ? 'text-emerald-600' :
                        analytics.metrics.devis.tauxAcceptation >= 30 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {analytics.metrics.devis.tauxAcceptation}%
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {analytics.metrics.devis.acceptes} / {analytics.metrics.devis.total} devis
                      </p>
                    </Card>

                    <Card className="!p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-3.5 h-3.5 text-violet-500" />
                        <p className="text-xs text-zinc-400 font-medium">Prevision CA</p>
                      </div>
                      <p className="text-2xl font-bold text-zinc-900">
                        {formatCurrency(analytics.metrics.revenue.previsionProchainMois)}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {analytics.metrics.revenue.tendance === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                        {analytics.metrics.revenue.tendance === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                        {analytics.metrics.revenue.tendance === 'stable' && <Minus className="w-3 h-3 text-zinc-400" />}
                        <p className={`text-[11px] ${
                          analytics.metrics.revenue.tendance === 'up' ? 'text-emerald-500' :
                          analytics.metrics.revenue.tendance === 'down' ? 'text-red-500' : 'text-zinc-400'
                        }`}>
                          {analytics.metrics.revenue.tendance === 'up' ? 'En hausse' :
                           analytics.metrics.revenue.tendance === 'down' ? 'En baisse' : 'Stable'}
                        </p>
                      </div>
                    </Card>

                    <Card className="!p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5 text-sky-500" />
                        <p className="text-xs text-zinc-400 font-medium">Clients actifs</p>
                      </div>
                      <p className="text-2xl font-bold text-zinc-900">{analytics.metrics.clients.totalActifs}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {analytics.metrics.clients.dormants.length > 0
                          ? `${analytics.metrics.clients.dormants.length} client${analytics.metrics.clients.dormants.length > 1 ? 's' : ''} a recontacter`
                          : 'Tous recemment actifs'}
                      </p>
                    </Card>

                    <Card className="!p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-xs text-zinc-400 font-medium">Impayees</p>
                      </div>
                      <p className={`text-2xl font-bold ${
                        analytics.metrics.factures.overdue_count > 0 ? 'text-red-600' : 'text-zinc-900'
                      }`}>
                        {formatCurrency(analytics.metrics.factures.total)}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {analytics.metrics.factures.overdue_count > 0
                          ? `dont ${analytics.metrics.factures.overdue_count} en retard`
                          : `${analytics.metrics.factures.count} facture${analytics.metrics.factures.count > 1 ? 's' : ''} en attente`}
                      </p>
                    </Card>
                  </div>

                  {/* Recommendations */}
                  {analytics.recommendations.length > 0 && (
                    <Card>
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-zinc-900">Recommandations</h3>
                        <span className="ml-auto text-[11px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                          {analytics.recommendations.length} conseil{analytics.recommendations.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {analytics.recommendations.map((rec: any, i: number) => {
                          const iconMap: Record<string, any> = {
                            price: Tag,
                            relance: Bell,
                            client: PhoneCall,
                            warning: AlertTriangle,
                            opportunity: Zap,
                          };
                          const colorMap: Record<string, string> = {
                            high: 'border-l-red-500 bg-red-50/30',
                            medium: 'border-l-amber-500 bg-amber-50/30',
                            low: 'border-l-emerald-500 bg-emerald-50/30',
                          };
                          const iconBgMap: Record<string, string> = {
                            price: 'bg-violet-100 text-violet-600',
                            relance: 'bg-sky-100 text-sky-600',
                            client: 'bg-emerald-100 text-emerald-600',
                            warning: 'bg-red-100 text-red-600',
                            opportunity: 'bg-amber-100 text-amber-600',
                          };
                          const RecIcon = iconMap[rec.type] || Lightbulb;

                          return (
                            <div
                              key={i}
                              className={`border-l-[3px] rounded-r-xl p-3.5 ${colorMap[rec.priority]} transition-colors`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgMap[rec.type] || 'bg-zinc-100 text-zinc-600'}`}>
                                  <RecIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-zinc-800">{rec.title}</p>
                                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{rec.description}</p>
                                </div>
                                {rec.action && (
                                  <Link
                                    href={rec.action.href}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-600 bg-white border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors flex-shrink-0 self-center"
                                  >
                                    {rec.action.label}
                                    <ChevronRight className="w-3 h-3" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Work types profitability + Top materials */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Most profitable work types */}
                    {analytics.metrics.travaux.plusRentables.length > 0 && (
                      <Card>
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          <h3 className="text-sm font-semibold text-zinc-900">Travaux les plus rentables</h3>
                        </div>
                        <div className="space-y-2.5">
                          {analytics.metrics.travaux.plusRentables.map((t: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-medium text-zinc-700 truncate">{t.category}</p>
                                  <span className={`text-xs font-bold ${
                                    t.avg_margin >= 30 ? 'text-emerald-600' : t.avg_margin >= 15 ? 'text-amber-600' : 'text-red-600'
                                  }`}>{t.avg_margin}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      t.avg_margin >= 30 ? 'bg-emerald-500' : t.avg_margin >= 15 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.max(Math.min(t.avg_margin, 100), 0)}%` }}
                                  />
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  {formatCurrency(t.revenue)} CA · {t.count} intervention{t.count > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Least profitable work types */}
                    {analytics.metrics.travaux.moinsRentables.length > 0 && (
                      <Card>
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingDown className="w-4 h-4 text-red-500" />
                          <h3 className="text-sm font-semibold text-zinc-900">Travaux les moins rentables</h3>
                        </div>
                        <div className="space-y-2.5">
                          {analytics.metrics.travaux.moinsRentables.map((t: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-medium text-zinc-700 truncate">{t.category}</p>
                                  <span className={`text-xs font-bold ${
                                    t.avg_margin >= 30 ? 'text-emerald-600' : t.avg_margin >= 15 ? 'text-amber-600' : 'text-red-600'
                                  }`}>{t.avg_margin}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      t.avg_margin >= 30 ? 'bg-emerald-500' : t.avg_margin >= 15 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.max(Math.min(t.avg_margin, 100), 0)}%` }}
                                  />
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  {formatCurrency(t.revenue)} CA · {t.count} intervention{t.count > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Top clients + Dormant clients */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {analytics.metrics.clients.top.length > 0 && (
                      <Card>
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="w-4 h-4 text-brand-500" />
                          <h3 className="text-sm font-semibold text-zinc-900">Clients les plus rentables</h3>
                        </div>
                        <div className="space-y-1.5">
                          {analytics.metrics.clients.top.slice(0, 5).map((c: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-800 truncate">{c.name}</p>
                                <p className="text-[11px] text-zinc-400">{c.count} intervention{c.count > 1 ? 's' : ''}</p>
                              </div>
                              <p className="text-sm font-bold text-zinc-700">{formatCurrency(c.revenue)}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Top materials cost */}
                    {analytics.metrics.materiaux.length > 0 && (
                      <Card>
                        <div className="flex items-center gap-2 mb-4">
                          <Package className="w-4 h-4 text-amber-500" />
                          <h3 className="text-sm font-semibold text-zinc-900">Depenses materiaux (annee)</h3>
                        </div>
                        <div className="space-y-1.5">
                          {analytics.metrics.materiaux.slice(0, 5).map((m: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-600">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-800 truncate">{m.nom}</p>
                                <p className="text-[11px] text-zinc-400">{m.usage_count} utilisation{m.usage_count > 1 ? 's' : ''}</p>
                              </div>
                              <p className="text-sm font-bold text-zinc-700">{formatCurrency(m.total_cost)}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Devis to relance */}
                  {analytics.devisARelancer.length > 0 && (
                    <Card>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-sky-500" />
                          <h3 className="text-sm font-semibold text-zinc-900">Devis a relancer</h3>
                          <span className="text-[11px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full font-medium">
                            {analytics.devisARelancer.length}
                          </span>
                        </div>
                        <Link
                          href="/devis?status=ENVOYE"
                          className="text-xs text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1 transition-colors"
                        >
                          Tous les devis <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                      <div className="space-y-1">
                        {analytics.devisARelancer.map((d: any) => (
                          <Link
                            key={d.id}
                            href={`/devis/${d.id}`}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors group"
                          >
                            <div className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-zinc-800 truncate group-hover:text-brand-600 transition-colors">
                                {d.reference} — {d.title}
                              </p>
                              <p className="text-xs text-zinc-400">{d.client_name} · {d.days_old} jours</p>
                            </div>
                            <span className="text-sm font-semibold text-zinc-700 tabular-nums flex-shrink-0">
                              {formatCurrency(d.amount)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Hours summary */}
                  {analytics.metrics.heures.total_hours > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="!p-4">
                        <p className="text-xs text-zinc-400 font-medium">Heures (annee)</p>
                        <p className="text-xl font-bold text-zinc-900 mt-1">{Math.round(analytics.metrics.heures.total_hours)}h</p>
                      </Card>
                      <Card className="!p-4">
                        <p className="text-xs text-zinc-400 font-medium">Moy. / jour</p>
                        <p className="text-xl font-bold text-zinc-900 mt-1">{analytics.metrics.heures.avg_hours_per_day.toFixed(1)}h</p>
                      </Card>
                      <Card className="!p-4">
                        <p className="text-xs text-zinc-400 font-medium">Jours travailles</p>
                        <p className="text-xl font-bold text-zinc-900 mt-1">{analytics.metrics.heures.days_worked}</p>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
