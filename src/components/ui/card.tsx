import { cn } from '@/lib/utils';

export function Card({ children, className, padding = true }: { children: React.ReactNode; className?: string; padding?: boolean }) {
  return <div className={cn('card', padding && 'p-6', className)}>{children}</div>;
}
