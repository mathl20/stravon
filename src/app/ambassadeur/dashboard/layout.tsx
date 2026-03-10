'use client';

import { Trophy, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/utils';

export default function AmbassadeurDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiFetch('/api/ambassador/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    router.push('/ambassadeur/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50/60">
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Stravon</span>
              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                Ambassadeur
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
