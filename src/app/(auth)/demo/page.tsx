'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/utils';
import {
  Wrench,
  Zap,
  Grid3X3,
  Hammer,
  TreePine,
  Paintbrush,
  Home,
  Flame,
  Wind,
  Settings,
  Building2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

const METIERS = [
  { id: 'plombier', label: 'Plombier', icon: Wrench },
  { id: 'electricien', label: 'Électricien', icon: Zap },
  { id: 'carreleur', label: 'Carreleur', icon: Grid3X3 },
  { id: 'macon', label: 'Maçon', icon: Hammer },
  { id: 'menuisier', label: 'Menuisier', icon: TreePine },
  { id: 'peintre', label: 'Peintre', icon: Paintbrush },
  { id: 'couvreur', label: 'Couvreur', icon: Home },
  { id: 'chauffagiste', label: 'Chauffagiste', icon: Flame },
  { id: 'climaticien', label: 'Climaticien', icon: Wind },
  { id: 'multi-services', label: 'Multi-services', icon: Settings },
  { id: 'entreprise-generale', label: 'Entreprise générale', icon: Building2 },
];

export default function DemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const startDemo = async (metier: string) => {
    setLoading(metier);
    try {
      await apiFetch('/api/demo/start', {
        method: 'POST',
        body: JSON.stringify({ metier }),
      });
      toast.success('Démo prête !');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
      setLoading(null);
    }
  };

  return (
    <>
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour
      </Link>

      <h1 className="text-xl font-bold text-zinc-900 mb-1">Essayer la démo</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Choisissez votre métier pour découvrir STRAVON avec des données adaptées
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {METIERS.map((m) => {
          const Icon = m.icon;
          const isLoading = loading === m.id;
          const isDisabled = loading !== null;

          return (
            <button
              key={m.id}
              onClick={() => startDemo(m.id)}
              disabled={isDisabled}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                isLoading
                  ? 'border-brand-300 bg-brand-50 ring-2 ring-brand-200'
                  : isDisabled
                  ? 'border-zinc-100 bg-zinc-50 opacity-50 cursor-not-allowed'
                  : 'border-zinc-200 hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isLoading ? 'bg-brand-100' : 'bg-zinc-100'
              }`}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-zinc-500" />
                )}
              </div>
              <span className="text-sm font-medium text-zinc-700">{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
        <p className="text-[11px] text-zinc-400 leading-relaxed text-center">
          Les données de démo sont temporaires et seront supprimées automatiquement.
          Vous pourrez créer un compte pour sauvegarder vos données.
        </p>
      </div>
    </>
  );
}
