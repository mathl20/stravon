export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import Link from 'next/link';
import { ArrowLeft, Shield, MessageSquare, Users, Link2, Trophy } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-zinc-50/60">
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-tight">Administration</span>
                  <span className="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 hidden sm:block">{user.email}</p>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/admin" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </Link>
            <Link href="/admin/affiliations" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Affiliations</span>
            </Link>
            <Link href="/admin/ambassadeurs" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ambassadeurs</span>
            </Link>
            <Link href="/admin/tickets" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tickets</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
