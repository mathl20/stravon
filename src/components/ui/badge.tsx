import { cn, getStatusLabel, getStatusColor } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border', getStatusColor(status))}>
      {getStatusLabel(status)}
    </span>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-zinc-50 text-zinc-600 border-zinc-200', className)}>
      {children}
    </span>
  );
}
