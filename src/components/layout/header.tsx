'use client';

import { Menu } from 'lucide-react';
import { NotificationBell } from './notification-bell';

export function Header({ userName, onMenuToggle }: { userName: string; onMenuToggle?: () => void }) {
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <header className="h-[60px] bg-white/80 backdrop-blur-xl border-b border-zinc-100/80 flex items-center justify-between px-6 sticky top-0 z-30">
      <button onClick={onMenuToggle} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-zinc-100 transition-colors">
        <Menu className="w-5 h-5 text-zinc-600" />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center ring-2 ring-white shadow-sm">
          <span className="text-[11px] font-semibold text-white">{initials}</span>
        </div>
      </div>
    </header>
  );
}
