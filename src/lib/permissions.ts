import { Role } from '@prisma/client';

export { Role };

export const ROLES = [Role.PATRON, Role.SECRETAIRE, Role.EMPLOYE] as const;

// ──────────────────────────────────────────
// Permission constants
// ──────────────────────────────────────────

export const PERMISSIONS = {
  CLIENTS_VIEW: 'clients:view',
  CLIENTS_MANAGE: 'clients:manage',
  DEVIS_VIEW: 'devis:view',
  DEVIS_MANAGE: 'devis:manage',
  FACTURES_VIEW: 'factures:view',
  FACTURES_MANAGE: 'factures:manage',
  INTERVENTIONS_VIEW: 'interventions:view',
  INTERVENTIONS_MANAGE: 'interventions:manage',
  PLANNING_VIEW: 'planning:view',
  PLANNING_MANAGE: 'planning:manage',
  TEAM_MANAGE: 'team:manage',
  SETTINGS_MANAGE: 'settings:manage',
TIMESHEETS_VIEW: 'timesheets:view',
  TIMESHEETS_MANAGE: 'timesheets:manage',
  DASHBOARD_REVENUE: 'dashboard:revenue',
  PROFITABILITY_VIEW: 'profitability:view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// ──────────────────────────────────────────
// Default permissions per role
// ──────────────────────────────────────────

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  PATRON: [...ALL_PERMISSIONS],
  SECRETAIRE: [
    'clients:view', 'clients:manage',
    'devis:view', 'devis:manage',
    'factures:view', 'factures:manage',
    'interventions:view', 'interventions:manage',
    'planning:view', 'planning:manage',
'timesheets:view',
    'dashboard:revenue',
    'profitability:view',
  ],
  EMPLOYE: [
    'clients:view',
    'interventions:view',
    'planning:view',
    'timesheets:view',
  ],
};

// ──────────────────────────────────────────
// Core utilities
// ──────────────────────────────────────────

export function getEffectivePermissions(user: { role: string; permissions: string[] }): string[] {
  return user.permissions.length > 0 ? user.permissions : (DEFAULT_PERMISSIONS[user.role] || []);
}

export function hasPermission(perms: string[], permission: string): boolean {
  if (perms.includes(permission)) return true;
  // :manage implies :view for the same domain
  if (permission.endsWith(':view')) {
    return perms.includes(permission.replace(':view', ':manage'));
  }
  return false;
}

// ──────────────────────────────────────────
// Permission check functions (accept string[])
// ──────────────────────────────────────────

export function canManageTeam(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.TEAM_MANAGE);
}

export function canEditSettings(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE);
}

export function canManageClients(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.CLIENTS_MANAGE);
}

export function canViewClients(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.CLIENTS_VIEW);
}

export function canViewAllInterventions(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE);
}

export function canDeleteIntervention(perms: string[], isOwner: boolean): boolean {
  return hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE) || isOwner;
}

export function canEditIntervention(perms: string[], isOwner: boolean): boolean {
  return hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE) || isOwner;
}

export function canViewAllTimesheets(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.TIMESHEETS_VIEW);
}

export function canValidateTimesheets(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.TIMESHEETS_MANAGE);
}

export function canManagePlanning(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.PLANNING_MANAGE);
}

export function canViewGlobalRevenue(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.DASHBOARD_REVENUE);
}

export function canManageAllDevis(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.DEVIS_MANAGE);
}

export function canDeleteDevis(perms: string[], isOwner: boolean): boolean {
  return hasPermission(perms, PERMISSIONS.DEVIS_MANAGE) || isOwner;
}

export function canConvertDevis(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.DEVIS_MANAGE);
}

export function canManageFactures(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.FACTURES_MANAGE);
}

export function canViewProfitability(perms: string[]): boolean {
  return hasPermission(perms, PERMISSIONS.PROFITABILITY_VIEW);
}

// ──────────────────────────────────────────
// Display helpers (still role-based)
// ──────────────────────────────────────────

export function getRoleLabel(role: Role | string): string {
  return (
    {
      [Role.PATRON]: 'Patron',
      [Role.SECRETAIRE]: 'Secrétaire',
      [Role.EMPLOYE]: 'Employé',
    } as Record<string, string>
  )[role] || role;
}

export function getRoleBadgeColor(role: Role | string): string {
  return (
    {
      [Role.PATRON]: 'bg-brand-50 text-brand-700 border-brand-200',
      [Role.SECRETAIRE]: 'bg-violet-50 text-violet-700 border-violet-200',
      [Role.EMPLOYE]: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    } as Record<string, string>
  )[role] || 'bg-zinc-100 text-zinc-600 border-zinc-200';
}
