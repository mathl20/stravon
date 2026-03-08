'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { FeuilleHeureForm } from '@/components/forms/feuille-heure-form';
import { PageLoader } from '@/components/ui';
import { apiFetch, formatDate } from '@/lib/utils';

interface FeuilleHeure {
  id: string;
  date: string;
  heureDebut: string | null;
  heureFin: string | null;
  heuresTravaillees: number;
  panierRepas: boolean;
  zone: number | null;
  grandDeplacement: boolean;
  interventionId: string | null;
}

export default function EditFeuilleHeurePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [feuille, setFeuille] = useState<FeuilleHeure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: FeuilleHeure }>(`/api/feuilles-heures/${id}`)
      .then((r) => setFeuille(r.data))
      .catch(() => router.push('/feuilles-heures'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !feuille) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost !p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">Modifier la feuille d&apos;heures</h1>
          <p className="page-subtitle">{formatDate(feuille.date)}</p>
        </div>
      </div>
      <FeuilleHeureForm initial={feuille} />
    </div>
  );
}
