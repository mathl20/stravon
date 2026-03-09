'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, FileText, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Zap, UsersRound, Clock, CalendarDays, FileSignature, Receipt, Sparkles, X, Wrench, Palmtree, Gift, CreditCard, ShieldCheck, LifeBuoy, UserCircle, Link2 } from 'lucide-react';
import { canEditSettings, canManageTeam, canManageFactures, canViewClients, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { usePlan } from '@/lib/plan-context';
import { getRequiredTierForRoute } from '@/lib/plans';

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
  { href: '/conges', label: 'Congés', icon: Palmtree, showFor: (p: string[]) => canEditSettings(p) },
  { href: '/planning', label: 'Planning', icon: CalendarDays, showFor: (p: string[]) => hasPermission(p, PERMISSIONS.PLANNING_VIEW) },
  { href: '/prestations', label: 'Prestations', icon: Wrench, showFor: () => true },
  { href: '/assistant', label: 'Assistant IA', icon: Sparkles, showFor: (p: string[]) => hasPermission(p, PERMISSIONS.CLIENTS_MANAGE) || hasPermission(p, PERMISSIONS.INTERVENTIONS_MANAGE) || hasPermission(p, PERMISSIONS.DEVIS_MANAGE) },
  { href: '/parrainage', label: 'Parrainage', icon: Gift, showFor: (p: string[]) => canEditSettings(p), paidOnly: true },
  { href: '/affiliation', label: 'Affiliation', icon: Link2, showFor: (p: string[]) => canEditSettings(p), paidOnly: true },
  { href: '/team', label: 'Équipe', icon: UsersRound, showFor: (p: string[]) => canManageTeam(p) },
  { href: '/support', label: 'Support', icon: LifeBuoy, showFor: (p: string[]) => canEditSettings(p) },
  { href: '/subscription', label: 'Abonnement', icon: CreditCard, showFor: (p: string[]) => canEditSettings(p) },
  { href: '/settings', label: 'Paramètres', icon: Settings, showFor: (p: string[]) => canEditSettings(p) },
];

export function Sidebar({ companyName, collapsed, onToggle, permissions, onLinkClick, isMobile, isAdmin: isAdminUser }: SidebarProps) {
  const pathname = usePathname();
  const { tier: currentTier, isPaidSubscriber } = usePlan();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (!item.showFor(permissions)) return false;
    // Hide items that require a higher plan tier
    const requiredTier = getRequiredTierForRoute(item.href);
    if (currentTier < requiredTier) return false;
    // Hide paid-only items for trial users
    if (item.paidOnly && !isPaidSubscriber) return false;
    return true;
  });
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

      {/* Scrollable area: nav + bottom actions */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {/* Nav */}
        <nav className="py-2 px-3 space-y-0.5">
          {visibleNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} title={isCollapsed ? item.label : undefined}
                onClick={onLinkClick}
                className={cn(
                  'flex items-center gap-3 px-3 rounded-xl text-[13px] font-medium transition-all duration-150',
                  isMobile ? 'py-3.5 min-h-[44px]' : 'py-2.5',
                  active
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                    : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 active:bg-white/[0.1]',
                  isCollapsed && 'justify-center px-0 w-10 h-10 mx-auto'
                )}>
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom - inside scroll area so always reachable */}
        <div className="mt-auto px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 space-y-0.5 border-t border-white/[0.06]">
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
      </div>
    </aside>
  );
}
