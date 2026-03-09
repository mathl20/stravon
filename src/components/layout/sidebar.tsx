'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, FileText, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Zap, UsersRound, Clock, CalendarDays, FileSignature, Receipt, Sparkles, X, Wrench, Palmtree, Gift, CreditCard, ShieldCheck, LifeBuoy, Lock, UserCircle, Link2 } from 'lucide-react';
import { canEditSettings, canManageTeam, canManageFactures, canViewClients, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { usePlan } from '@/lib/plan-context';
import { getRequiredTierForRoute, TIER_PLAN_NAME } from '@/lib/plans';

interface SidebarProps {
  companyName: string;
  collapsed: boolean;
  onToggle: () => void;
  permissions: string[];
  onLinkClick?: () => void;
  isMobile?: boolean;
  isAdmin?: boolean;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, showFor: () => true },
  { href: '/clients', label: 'Clients', icon: Users, showFor: (p: string[]) => canViewClients(p) },
  { href: '/interventions', label: 'Interventions', icon: FileText, showFor: (p: string[]) => hasPermission(p, PERMISSIONS.INTERVENTIONS_VIEW) },
  { href: '/devis', label: 'Devis', icon: FileSignature, showFor: (p: string[]) => hasPermission(p, PERMISSIONS.DEVIS_VIEW) },
  { href: '/factures', label: 'Factures', icon: Receipt, showFor: (p: string[]) => canManageFactures(p) },
{ href: '/feuilles-heures', label: 'Feuilles d\'heures', icon: Clock, showFor: (p: string[]) => hasPermission(p, PERMISSIONS.TIMESHEETS_VIEW) },
  { href: '/conges', label: 'Congés', icon: Palmtree, showFor: () => true },
  { href: '/planning', label: 'Planning', icon: CalendarDays, showFor: (p: string[]) => hasPermission(p, PERMISSIONS.PLANNING_VIEW) },
  { href: '/prestations', label: 'Prestations', icon: Wrench, showFor: (p: string[]) => canEditSettings(p) },
  { href: '/assistant', label: 'Assistant IA', icon: Sparkles, showFor: (p: string[]) => hasPermission(p, PERMISSIONS.CLIENTS_MANAGE) || hasPermission(p, PERMISSIONS.INTERVENTIONS_MANAGE) || hasPermission(p, PERMISSIONS.DEVIS_MANAGE) },
  { href: '/parrainage', label: 'Parrainage', icon: Gift, showFor: () => true },
  { href: '/affiliation', label: 'Affiliation', icon: Link2, showFor: (p: string[]) => canEditSettings(p) },
  { href: '/team', label: 'Équipe', icon: UsersRound, showFor: (p: string[]) => canManageTeam(p) },
  { href: '/support', label: 'Support', icon: LifeBuoy, showFor: () => true },
  { href: '/subscription', label: 'Abonnement', icon: CreditCard, showFor: (p: string[]) => canEditSettings(p) },
  { href: '/settings', label: 'Paramètres', icon: Settings, showFor: (p: string[]) => canEditSettings(p) },
];

export function Sidebar({ companyName, collapsed, onToggle, permissions, onLinkClick, isMobile, isAdmin: isAdminUser }: SidebarProps) {
  const pathname = usePathname();
  const { tier: currentTier } = usePlan();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const visibleNav = NAV_ITEMS.filter((item) => item.showFor(permissions));
  const isCollapsed = isMobile ? false : collapsed;

  return (
    <aside className={cn(
      'h-screen bg-zinc-950 flex flex-col transition-all duration-300 ease-out',
      isCollapsed ? 'w-[68px]' : 'w-[272px]'
    )}>
      {/* Logo + close on mobile */}
      <div className={cn('flex items-center h-[60px]', isCollapsed ? 'justify-center px-0' : 'px-5')}>
        <Link href="/dashboard" onClick={onLinkClick} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-600/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && <span className="text-[15px] font-bold tracking-tight text-white">STRAVON</span>}
        </Link>
        {isMobile && (
          <button onClick={onToggle} className="ml-auto p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Company */}
      {!isCollapsed && (
        <div className="px-4 py-3">
          <div className="px-3 py-2 rounded-lg bg-white/[0.06]">
            <p className="text-[11px] font-medium text-zinc-400 truncate">{companyName}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 min-h-0 py-2 px-3 space-y-0.5 overflow-y-auto overscroll-contain">
        {visibleNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const requiredTier = getRequiredTierForRoute(item.href);
          const isLocked = currentTier < requiredTier;
          const requiredPlan = TIER_PLAN_NAME[requiredTier];
          return (
            <Link key={item.href} href={item.href} title={isCollapsed ? (isLocked ? `${item.label} (${requiredPlan})` : item.label) : undefined}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-3 px-3 rounded-xl text-[13px] font-medium transition-all duration-150',
                isMobile ? 'py-3.5 min-h-[44px]' : 'py-2.5',
                active
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : isLocked
                  ? 'text-zinc-600 hover:bg-white/[0.04] hover:text-zinc-500'
                  : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 active:bg-white/[0.1]',
                isCollapsed && 'justify-center px-0 w-10 h-10 mx-auto'
              )}>
              <item.icon className={cn('w-[18px] h-[18px] flex-shrink-0', isLocked && !active && 'opacity-50')} />
              {!isCollapsed && (
                <>
                  <span className={cn(isLocked && !active && 'opacity-50')}>{item.label}</span>
                  {isLocked && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-600">
                      <Lock className="w-3 h-3" />
                      <span className="hidden xl:inline">{requiredPlan}</span>
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-3 pt-2 space-y-0.5 border-t border-white/[0.06]">
        <Link href="/profil" title={isCollapsed ? 'Mon profil' : undefined}
          onClick={onLinkClick}
          className={cn(
            'flex items-center gap-3 px-3 rounded-xl text-[13px] font-medium transition-all duration-150',
            isMobile ? 'py-3.5 min-h-[44px]' : 'py-2.5',
            pathname === '/profil'
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
              : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 active:bg-white/[0.1]',
            isCollapsed && 'justify-center px-0 w-10 h-10 mx-auto'
          )}>
          <UserCircle className="w-[18px] h-[18px]" />
          {!isCollapsed && <span>Mon profil</span>}
        </Link>
        {isAdminUser && (
          <Link href="/admin" title={isCollapsed ? 'Admin' : undefined}
            onClick={onLinkClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-all w-full',
              isCollapsed && 'justify-center px-0 w-10 h-10 mx-auto'
            )}>
            <ShieldCheck className="w-[18px] h-[18px]" />
            {!isCollapsed && <span>Admin</span>}
          </Link>
        )}
        {!isMobile && (
          <button onClick={onToggle}
            className={cn('flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-all w-full', isCollapsed && 'justify-center px-0 w-10 h-10 mx-auto')}>
            {isCollapsed ? <PanelLeftOpen className="w-[18px] h-[18px]" /> : <><PanelLeftClose className="w-[18px] h-[18px]" /><span>Réduire</span></>}
          </button>
        )}
        <button onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 px-3 rounded-xl text-[13px] font-medium text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all w-full',
            isMobile ? 'py-3.5 min-h-[44px]' : 'py-2',
            isCollapsed && 'justify-center px-0 w-10 h-10 mx-auto'
          )}>
          <LogOut className="w-[18px] h-[18px]" />
          {!isCollapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
