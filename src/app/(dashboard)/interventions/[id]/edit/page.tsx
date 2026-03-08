'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { InterventionForm } from '@/components/forms/intervention-form';
import { PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import type { Intervention, InterventionItem } from '@/types';

type InterventionEdit = Intervention & { items: InterventionItem[] };

export default function EditInterventionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [intervention, setIntervention] = useState<InterventionEdit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: InterventionEdit }>(`/api/interventions/${id}`)
      .then((r) => setIntervention(r.data))
      .catch(() => router.push('/interventions'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !intervention) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost !p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="page-title">Modifier l&apos;intervention</h1>
          <p className="page-subtitle">{intervention.reference} — {intervention.title}</p>
        </div>
      </div>
      <InterventionForm intervention={intervention} />
    </div>
  );
}
