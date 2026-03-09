'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Users, Building2, CreditCard, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, Mail, Calendar,
  MoreVertical, RefreshCw, Filter, Trash2, MailCheck, MailX, Zap, UserCog,
  ChevronDown, ChevronUp, UsersRound,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  email: string;
  siret: string | null;
  isDemo: boolean;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  createdAt: string;
  _count: { users: number; clients: number; factures: number; devis: number; interventions: number };
}

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  company: Company;
}

interface ApiResponse {
  users: UserRow[];
  total: number;
  page: number;
  totalPages: number;
}

interface CompanyGroup {
  company: Company;
  patron: UserRow | null;
  members: UserRow[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'Actif', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200/60', dot: 'bg-emerald-500' },
  trialing: { label: 'Essai', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200/60', dot: 'bg-blue-500' },
  past_due: { label: 'Impaye', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200/60', dot: 'bg-amber-500' },
  canceled: { label: 'Annule', color: 'text-red-700', bg: 'bg-red-50 border-red-200/60', dot: 'bg-red-500' },
  inactive: { label: 'Inactif', color: 'text-zinc-600', bg: 'bg-zinc-50 border-zinc-200/60', dot: 'bg-zinc-400' },
  incomplete: { label: 'Incomplet', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200/60', dot: 'bg-amber-500' },
};

const ROLE_LABELS: Record<string, string> = { PATRON: 'Dirigeant', SECRETAIRE: 'Secretaire', EMPLOYE: 'Employe' };

const SUBSCRIPTION_OPTIONS = [
  { value: 'active', label: 'Actif', icon: CheckCircle, color: 'text-emerald-600' },
  { value: 'trialing', label: 'Essai', icon: Clock, color: 'text-blue-600' },
  { value: 'past_due', label: 'Impaye', icon: AlertTriangle, color: 'text-amber-600' },
  { value: 'canceled', label: 'Annule', icon: XCircle, color: 'text-red-600' },
  { value: 'inactive', label: 'Inactif', icon: XCircle, color: 'text-zinc-500' },
];

const PLAN_OPTIONS = [
  { priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO || '', label: 'Starter', color: 'text-zinc-600' },
  { priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || '', label: 'Pro', color: 'text-brand-600' },
  { priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS || '', label: 'Business', color: 'text-violet-600' },
];

export default function AdminPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteCompany, setConfirmDeleteCompany] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Erreur');
      setData(await res.json());
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, search]);

  useEffect(() => {
    const handleClick = () => setOpenMenu(null);
    if (openMenu) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openMenu]);

  const handleRefresh = async () => { setRefreshing(true); await fetchUsers(); setRefreshing(false); };

  const toggleExpand = (companyId: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };

  const updateSubscription = async (companyId: string, status: string) => {
    setActionLoading(companyId);
    try {
      const res = await fetch('/api/admin/companies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, subscriptionStatus: status }) });
      if (!res.ok) throw new Error();
      toast.success('Abonnement mis a jour');
      fetchUsers();
    } catch { toast.error('Erreur'); }
    finally { setActionLoading(null); setOpenMenu(null); }
  };

  const updatePlan = async (companyId: string, stripePriceId: string | null) => {
    setActionLoading(companyId);
    try {
      const res = await fetch('/api/admin/companies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, stripePriceId }) });
      if (!res.ok) throw new Error();
      toast.success('Plan mis a jour');
      fetchUsers();
    } catch { toast.error('Erreur'); }
    finally { setActionLoading(null); setOpenMenu(null); }
  };

  const toggleEmailVerified = async (userId: string, currentValue: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailVerified: !currentValue }) });
      if (!res.ok) throw new Error();
      toast.success(currentValue ? 'Email marque non verifie' : 'Email verifie');
      fetchUsers();
    } catch { toast.error('Erreur'); }
    finally { setActionLoading(null); setOpenMenu(null); }
  };

  const changeRole = async (userId: string, role: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
      if (!res.ok) throw new Error();
      toast.success('Role mis a jour');
      fetchUsers();
    } catch { toast.error('Erreur'); }
    finally { setActionLoading(null); setOpenMenu(null); }
  };

  const deleteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erreur'); }
      toast.success('Utilisateur supprime');
      setConfirmDelete(null); setOpenMenu(null);
      fetchUsers();
    } catch (e: any) { toast.error(e.message || 'Erreur'); }
    finally { setActionLoading(null); }
  };

  const deleteCompany = async (companyId: string) => {
    setActionLoading(companyId);
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erreur'); }
      toast.success('Entreprise et toutes ses donnees supprimees');
      setConfirmDeleteCompany(null); setOpenMenu(null);
      fetchUsers();
    } catch (e: any) { toast.error(e.message || 'Erreur'); }
    finally { setActionLoading(null); }
  };

  // Group by company
  const companyGroups: CompanyGroup[] = (() => {
    if (!data) return [];
    const map: Record<string, CompanyGroup> = {};
    for (const user of data.users) {
      const cid = user.company.id;
      if (!map[cid]) map[cid] = { company: user.company, patron: null, members: [] };
      if (user.role === 'PATRON') map[cid].patron = user;
      else map[cid].members.push(user);
    }
    return Object.values(map);
  })();

  const activeCount = companyGroups.filter(c => c.company.subscriptionStatus === 'active' || c.company.subscriptionStatus === 'trialing').length;
  const inactiveCount = companyGroups.filter(c => c.company.subscriptionStatus === 'inactive' || c.company.subscriptionStatus === 'canceled').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerez vos entreprises et leurs equipes</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary self-start sm:self-auto">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={Users} label="Utilisateurs" value={data.total} color="brand" />
          <KPICard icon={Building2} label="Entreprises" value={companyGroups.length} color="violet" />
          <KPICard icon={CreditCard} label="Abonnes actifs" value={activeCount}
            trend={companyGroups.length > 0 ? Math.round((activeCount / companyGroups.length) * 100) : 0}
            trendLabel="du total" color="emerald" />
          <KPICard icon={AlertTriangle} label="Sans abonnement" value={inactiveCount} color="amber" />
        </div>
      )}

      {/* Search */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" placeholder="Rechercher par nom, email ou entreprise..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-10" />
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Auto (Stripe)</div>
            <div className="flex items-center gap-1.5"><UserCog className="w-3.5 h-3.5 text-brand-500" /> Manuel</div>
            <div className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> {companyGroups.length} entreprise{companyGroups.length > 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* Company list */}
      {loading ? (
        <div className="card p-0"><TableSkeleton /></div>
      ) : companyGroups.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="font-medium text-zinc-600">Aucune entreprise trouvee</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companyGroups.map((group) => {
            const { company, patron, members } = group;
            const status = STATUS_CONFIG[company.subscriptionStatus] || STATUS_CONFIG.inactive;
            const hasStripe = !!company.stripeCustomerId;
            const isExpanded = expandedCompanies.has(company.id);
            const mainUser = patron || members[0];
            const subUsers = patron ? members : members.slice(1);
            const totalUsers = (patron ? 1 : 0) + members.length;

            return (
              <div key={company.id} className="card p-0">
                {/* Company header row */}
                <div className="px-5 py-4 flex items-center gap-4">
                  {/* Expand toggle */}
                  <div className="shrink-0">
                    {subUsers.length > 0 ? (
                      <button
                        onClick={() => toggleExpand(company.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    ) : (
                      <div className="w-7 h-7" />
                    )}
                  </div>

                  {/* Company info */}
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] lg:grid-cols-[1.5fr_1fr_auto_auto_auto] gap-x-6 gap-y-2 items-center">
                    {/* Company + patron */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                        <p className="font-bold text-zinc-900 truncate">{company.name}</p>
                        {company.isDemo && (
                          <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-md font-semibold shrink-0">DEMO</span>
                        )}
                      </div>
                      {mainUser && (
                        <div className="flex items-center gap-2 mt-1 ml-6">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {mainUser.firstName[0]}{mainUser.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-zinc-800 truncate">{mainUser.firstName} {mainUser.lastName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">{ROLE_LABELS[mainUser.role]}</span>
                              {mainUser.emailVerified ? (
                                <span title="Email verifie"><CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /></span>
                              ) : (
                                <span title="Email non verifie"><XCircle className="w-3 h-3 text-zinc-300 shrink-0" /></span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 truncate">{mainUser.email}</p>
                          </div>
                        </div>
                      )}
                      {company.siret && <p className="text-xs text-zinc-400 font-mono ml-6 mt-0.5">{company.siret}</p>}
                    </div>

                    {/* Subscription */}
                    <div className="hidden lg:block">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
                        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border ${status.bg} ${status.color}`}>{status.label}</span>
                        {hasStripe && <span title="Gere par Stripe"><Zap className="w-3 h-3 text-amber-500 shrink-0" /></span>}
                      </div>
                      {company.subscriptionCurrentPeriodEnd && (
                        <p className="text-[11px] text-zinc-400 mt-1 ml-4">
                          Exp. {new Date(company.subscriptionCurrentPeriodEnd).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="hidden lg:flex items-center gap-3 text-xs text-zinc-500">
                      <span><span className="font-semibold text-zinc-700">{company._count.clients}</span> clients</span>
                      <span className="w-px h-3 bg-zinc-200" />
                      <span><span className="font-semibold text-zinc-700">{company._count.factures}</span> fact.</span>
                      <span className="w-px h-3 bg-zinc-200" />
                      <span><span className="font-semibold text-zinc-700">{company._count.devis}</span> devis</span>
                    </div>

                    {/* Team count */}
                    <div className="hidden lg:flex items-center gap-1.5 text-xs text-zinc-500">
                      <UsersRound className="w-3.5 h-3.5" />
                      <span className="font-semibold text-zinc-700">{totalUsers}</span> membre{totalUsers > 1 ? 's' : ''}
                    </div>

                    {/* Mobile subscription */}
                    <div className="sm:hidden flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-lg border ${status.bg} ${status.color}`}>{status.label}</span>
                      <span className="text-xs text-zinc-400">{totalUsers} membre{totalUsers > 1 ? 's' : ''}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end">
                      {mainUser && (
                        <UserActionMenu
                          user={mainUser}
                          company={company}
                          hasStripe={hasStripe}
                          openMenu={openMenu}
                          setOpenMenu={setOpenMenu}
                          confirmDelete={confirmDelete}
                          setConfirmDelete={setConfirmDelete}
                          confirmDeleteCompany={confirmDeleteCompany}
                          setConfirmDeleteCompany={setConfirmDeleteCompany}
                          actionLoading={actionLoading}
                          updateSubscription={updateSubscription}
                          updatePlan={updatePlan}
                          toggleEmailVerified={toggleEmailVerified}
                          changeRole={changeRole}
                          deleteUser={deleteUser}
                          deleteCompany={deleteCompany}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded sub-users */}
                {isExpanded && subUsers.length > 0 && (
                  <div className="border-t border-zinc-100 bg-zinc-50/50">
                    {subUsers.map((member) => (
                      <div key={member.id} className="px-5 py-3 flex items-center gap-4 border-b border-zinc-100/50 last:border-b-0 hover:bg-white/60 transition-colors">
                        <div className="w-7 shrink-0" /> {/* indent spacer */}
                        <div className="ml-6 flex-1 flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-zinc-200 flex items-center justify-center text-zinc-600 text-[10px] font-bold shrink-0">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-zinc-700 truncate">{member.firstName} {member.lastName}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                member.role === 'SECRETAIRE' ? 'bg-violet-50 text-violet-600' : 'bg-zinc-100 text-zinc-500'
                              }`}>{ROLE_LABELS[member.role]}</span>
                              {member.emailVerified ? (
                                <span title="Email verifie"><CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /></span>
                              ) : (
                                <span title="Email non verifie"><XCircle className="w-3 h-3 text-zinc-300 shrink-0" /></span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 truncate">{member.email}</p>
                          </div>
                          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
                            <Calendar className="w-3 h-3" />
                            {new Date(member.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                          <UserActionMenu
                            user={member}
                            company={company}
                            hasStripe={false}
                            openMenu={openMenu}
                            setOpenMenu={setOpenMenu}
                            confirmDelete={confirmDelete}
                            setConfirmDelete={setConfirmDelete}
                            confirmDeleteCompany={confirmDeleteCompany}
                            setConfirmDeleteCompany={setConfirmDeleteCompany}
                            actionLoading={actionLoading}
                            updateSubscription={updateSubscription}
                            updatePlan={updatePlan}
                            toggleEmailVerified={toggleEmailVerified}
                            changeRole={changeRole}
                            deleteUser={deleteUser}
                            deleteCompany={deleteCompany}
                            hideSubscription
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500"><span className="font-medium text-zinc-700">{data.total}</span> utilisateur{data.total > 1 ? 's' : ''}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" /> Prec.
            </button>
            <span className="px-3 text-sm text-zinc-600">Page {data.page} / {data.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 transition-all">
              Suiv. <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── User Action Menu ───── */
function UserActionMenu({ user, company, hasStripe, openMenu, setOpenMenu, confirmDelete, setConfirmDelete,
  confirmDeleteCompany, setConfirmDeleteCompany, actionLoading,
  updateSubscription, updatePlan, toggleEmailVerified, changeRole, deleteUser, deleteCompany, hideSubscription = false,
}: {
  user: UserRow; company: Company; hasStripe: boolean;
  openMenu: string | null; setOpenMenu: (v: string | null) => void;
  confirmDelete: string | null; setConfirmDelete: (v: string | null) => void;
  confirmDeleteCompany: string | null; setConfirmDeleteCompany: (v: string | null) => void;
  actionLoading: string | null;
  updateSubscription: (companyId: string, status: string) => void;
  updatePlan: (companyId: string, stripePriceId: string | null) => void;
  toggleEmailVerified: (userId: string, current: boolean) => void;
  changeRole: (userId: string, role: string) => void;
  deleteUser: (userId: string) => void;
  deleteCompany: (companyId: string) => void;
  hideSubscription?: boolean;
}) {
  const isMenuOpen = openMenu === user.id;
  const isDeleting = confirmDelete === user.id;
  const isDeletingCompany = confirmDeleteCompany === company.id;
  const isLoading = actionLoading === user.id || actionLoading === company.id;

  return (
    <div className="relative shrink-0">
      {isLoading ? (
        <div className="w-8 h-8 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setOpenMenu(isMenuOpen ? null : user.id); setConfirmDelete(null); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      )}

      {isMenuOpen && (
        <div className="absolute right-0 top-10 z-50 w-64 bg-white rounded-xl border border-zinc-200 shadow-lg shadow-zinc-200/50 overflow-hidden animate-fade-in"
          onClick={(e) => e.stopPropagation()}>

          {/* Subscription (only for company-level = patron row) */}
          {!hideSubscription && (
            <>
              <div className="px-3 py-2 border-b border-zinc-100">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Abonnement
                  {hasStripe && <span className="text-amber-500 normal-case">(auto Stripe)</span>}
                </p>
              </div>
              <div className="p-1.5">
                {SUBSCRIPTION_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = company.subscriptionStatus === opt.value;
                  return (
                    <button key={opt.value} onClick={() => updateSubscription(company.id, opt.value)} disabled={isActive}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'}`}>
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-600' : opt.color}`} />
                      {opt.label}
                      {isActive && <span className="ml-auto text-[10px] text-brand-500 font-medium">Actuel</span>}
                    </button>
                  );
                })}
              </div>
              {/* Plan selector */}
              <div className="px-3 py-2 border-t border-zinc-100">
                <p className="text-[10px] text-zinc-400 mb-1.5">Plan</p>
                <div className="flex gap-1">
                  {PLAN_OPTIONS.map((plan) => {
                    const isActive = company.stripePriceId === plan.priceId;
                    return (
                      <button key={plan.label} onClick={() => updatePlan(company.id, plan.priceId)} disabled={isActive}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${isActive ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                        {plan.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* User actions */}
          <div className={`px-3 py-2 border-b border-zinc-100 ${!hideSubscription ? 'border-t' : ''}`}>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <UserCog className="w-3 h-3" /> Actions utilisateur
            </p>
          </div>
          <div className="p-1.5">
            <button onClick={() => toggleEmailVerified(user.id, user.emailVerified)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all">
              {user.emailVerified ? (
                <><MailX className="w-3.5 h-3.5 text-amber-500" /> Retirer la verification email</>
              ) : (
                <><MailCheck className="w-3.5 h-3.5 text-emerald-500" /> Verifier l&apos;email manuellement</>
              )}
            </button>
            <div className="px-3 py-2">
              <p className="text-[10px] text-zinc-400 mb-1.5">Changer le role</p>
              <div className="flex gap-1">
                {(['PATRON', 'SECRETAIRE', 'EMPLOYE'] as const).map((role) => (
                  <button key={role} onClick={() => changeRole(user.id, role)} disabled={user.role === role}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${user.role === role ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Danger */}
          <div className="border-t border-zinc-100 p-1.5">
            {isDeletingCompany ? (
              <div className="px-3 py-2 space-y-2">
                <p className="text-xs text-red-600 font-medium">Supprimer l&apos;entreprise &laquo; {company.name} &raquo; ?</p>
                <p className="text-[11px] text-zinc-500">
                  Etes-vous sur de vouloir supprimer cette entreprise et tous ses membres ? Cette action est irreversible.
                  Toutes les donnees seront supprimees (clients, devis, factures, interventions, feuilles d&apos;heures, etc.).
                </p>
                <div className="flex gap-2">
                  <button onClick={() => deleteCompany(company.id)} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-all">Supprimer</button>
                  <button onClick={() => setConfirmDeleteCompany(null)} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-all">Annuler</button>
                </div>
              </div>
            ) : isDeleting ? (
              <div className="px-3 py-2 space-y-2">
                <p className="text-xs text-red-600 font-medium">Supprimer cet utilisateur ?</p>
                <p className="text-[11px] text-zinc-500">
                  {company._count.users <= 1 ? 'Dernier utilisateur — l\'entreprise et toutes ses donnees seront supprimees.' : 'L\'utilisateur sera definitivement supprime.'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => deleteUser(user.id)} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-all">Confirmer</button>
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-all">Annuler</button>
                </div>
              </div>
            ) : (
              <>
                {!hideSubscription && (
                  <button onClick={() => { setConfirmDeleteCompany(company.id); setConfirmDelete(null); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-all">
                    <Building2 className="w-3.5 h-3.5" /> Supprimer l&apos;entreprise
                  </button>
                )}
                <button onClick={() => { setConfirmDelete(user.id); setConfirmDeleteCompany(null); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer l&apos;utilisateur
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── KPI Card ───── */
function KPICard({ icon: Icon, label, value, trend, trendLabel, color }: {
  icon: typeof Users; label: string; value: number; trend?: number; trendLabel?: string; color: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string; gradient: string }> = {
    brand: { bg: 'bg-brand-50', icon: 'text-brand-600', gradient: 'from-brand-500/10 to-transparent' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', gradient: 'from-violet-500/10 to-transparent' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', gradient: 'from-emerald-500/10 to-transparent' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', gradient: 'from-amber-500/10 to-transparent' },
  };
  const c = colorMap[color] || colorMap.brand;
  return (
    <div className="kpi-card group">
      <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-zinc-900 mt-2 tabular-nums">{value}</p>
          {trend !== undefined && trendLabel && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600">{trend}%</span>
              <span className="text-xs text-zinc-400">{trendLabel}</span>
            </div>
          )}
        </div>
        <div className={`kpi-icon-box ${c.bg}`}><Icon className={`w-5 h-5 ${c.icon}`} /></div>
      </div>
    </div>
  );
}

/* ───── Skeleton ───── */
function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-100 p-5 flex items-center gap-4">
          <div className="w-7 h-7 rounded-lg bg-zinc-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-zinc-100 rounded w-1/4" />
            <div className="h-3 bg-zinc-50 rounded w-1/3" />
          </div>
          <div className="h-6 bg-zinc-100 rounded-lg w-16" />
          <div className="h-3 bg-zinc-50 rounded w-20 hidden lg:block" />
        </div>
      ))}
    </div>
  );
}
