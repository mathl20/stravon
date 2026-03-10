'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Users, Wallet, ArrowRight, ArrowLeft, Star, Award, Crown, Gem } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/utils';
import Link from 'next/link';

export default function AmbassadeurLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch<{ redirect: string }>('/api/ambassador/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Compte ambassadeur créé !');
      router.push(res.redirect);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const tiers = [
    { name: 'Bronze', rate: '15%', range: '0-9 artisans', icon: Award, color: 'text-amber-700', bg: 'bg-amber-100' },
    { name: 'Argent', rate: '20%', range: '10-19 artisans', icon: Star, color: 'text-zinc-500', bg: 'bg-zinc-100' },
    { name: 'Or', rate: '25%', range: '20-49 artisans', icon: Crown, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { name: 'Diamant', rate: '30%', range: '50+ artisans', icon: Gem, color: 'text-violet-600', bg: 'bg-violet-100' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Back link */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>
      </div>
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-400 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          <Trophy className="w-3.5 h-3.5" /> Programme Ambassadeur
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Gagnez de l&apos;argent en recommandant <span className="text-brand-400">Stravon</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
          Gratuit, sans engagement, sans être artisan. Partagez votre lien, recommandez Stravon aux artisans et touchez des commissions récurrentes.
        </p>

        {/* Stats preview */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-12">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <Users className="w-5 h-5 text-brand-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">15-30%</p>
            <p className="text-[11px] text-zinc-500">Commission</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <Wallet className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">Récurrent</p>
            <p className="text-[11px] text-zinc-500">Chaque mois</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">100€</p>
            <p className="text-[11px] text-zinc-500">Bonus mensuel</p>
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Paliers de commission</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {tiers.map((tier) => (
            <div key={tier.name} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className={`w-10 h-10 rounded-xl ${tier.bg} flex items-center justify-center mx-auto mb-3`}>
                <tier.icon className={`w-5 h-5 ${tier.color}`} />
              </div>
              <p className="text-sm font-bold text-white">{tier.name}</p>
              <p className="text-2xl font-extrabold text-brand-400 my-1">{tier.rate}</p>
              <p className="text-xs text-zinc-500">{tier.range}</p>
            </div>
          ))}
        </div>

        {/* Leaderboard bonus */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center mb-16">
          <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Leaderboard mensuel</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Chaque mois, les 3 meilleurs ambassadeurs gagnent un bonus :
          </p>
          <div className="flex justify-center gap-6">
            <div><p className="text-2xl font-extrabold text-yellow-400">100€</p><p className="text-xs text-zinc-500">1er</p></div>
            <div><p className="text-2xl font-extrabold text-zinc-300">50€</p><p className="text-xs text-zinc-500">2e</p></div>
            <div><p className="text-2xl font-extrabold text-amber-600">25€</p><p className="text-xs text-zinc-500">3e</p></div>
          </div>
        </div>

        {/* Registration form */}
        <div id="inscription" className="bg-white rounded-2xl p-8 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-zinc-900 text-center mb-1">Devenir ambassadeur</h2>
          <p className="text-sm text-zinc-500 text-center mb-6">Inscription gratuite, sans engagement</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Prénom</label>
                <input
                  type="text" required value={form.firstName}
                  onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Nom</label>
                <input
                  type="text" required value={form.lastName}
                  onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1 block">Email</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1 block">Téléphone <span className="text-zinc-400">(optionnel)</span></label>
              <input
                type="tel" value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 mb-1 block">Mot de passe</label>
              <input
                type="password" required minLength={8} value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="8 caractères minimum"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Création...' : <>Créer mon compte ambassadeur <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-xs text-zinc-400 text-center mt-4">
            Déjà ambassadeur ? <Link href="/ambassadeur/login" className="text-brand-600 hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
