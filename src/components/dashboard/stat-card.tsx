import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: 'emerald' | 'brand' | 'amber' | 'zinc';
  subtitle?: string;
}

const ACCENT_MAP = {
  emerald: {
    gradient: 'from-emerald-500/10 to-emerald-500/0',
    iconBg: 'bg-emerald-50 ring-1 ring-emerald-100',
    iconText: 'text-emerald-600',
    value: 'text-emerald-700',
  },
  brand: {
    gradient: 'from-brand-500/10 to-brand-500/0',
    iconBg: 'bg-brand-50 ring-1 ring-brand-100',
    iconText: 'text-brand-600',
    value: 'text-zinc-900',
  },
  amber: {
    gradient: 'from-amber-500/10 to-amber-500/0',
    iconBg: 'bg-amber-50 ring-1 ring-amber-100',
    iconText: 'text-amber-600',
    value: 'text-amber-700',
  },
  zinc: {
    gradient: 'from-zinc-500/5 to-zinc-500/0',
    iconBg: 'bg-zinc-100 ring-1 ring-zinc-200/50',
    iconText: 'text-zinc-500',
    value: 'text-zinc-900',
  },
};

export function StatCard({ label, value, icon: Icon, accent = 'zinc', subtitle }: StatCardProps) {
  const colors = ACCENT_MAP[accent];

  return (
    <div className="kpi-card group relative overflow-hidden">
      {/* Subtle gradient on hover */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300', colors.gradient)} />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
          <p className={cn('text-2xl font-bold mt-1.5 tracking-tight', colors.value)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn('kpi-icon-box', colors.iconBg)}>
          <Icon className={cn('w-[18px] h-[18px]', colors.iconText)} />
        </div>
      </div>
    </div>
  );
}
