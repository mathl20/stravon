'use client';

import { Menu } from 'lucide-react';
import { NotificationBell } from './notification-bell';

export function Header({ userName, onMenuToggle }: { userName: string; onMenuToggle?: () => void }) {
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <header className="h-[60px] backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30" style={{ backgroundColor: 'rgba(9,9,15,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onMenuToggle} className="lg:hidden p-2 -ml-2 rounded-lg transition-colors" style={{ color: '#9d9bab' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm" style={{ boxShadow: '0 0 0 2px rgba(108,99,255,0.3)' }}>
          <span className="text-[11px] font-semibold text-white">{initials}</span>
        </div>
      </div>
    </header>
  );
}
