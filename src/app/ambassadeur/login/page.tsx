'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/utils';
import Link from 'next/link';

export default function AmbassadeurLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch<{ redirect: string }>('/api/ambassador/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.push(res.redirect);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Espace Ambassadeur</h1>
          <p className="text-sm text-zinc-500 mt-1">Connectez-vous à votre dashboard</p>
        </div>

        <div className="bg-white rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1 block">Email</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1 block">Mot de passe</label>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-xs text-zinc-400 text-center mt-4">
            Pas encore ambassadeur ? <Link href="/ambassadeur" className="text-brand-600 hover:underline">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
