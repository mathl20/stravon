'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { DevisForm } from '@/components/forms/devis-form';
import { PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import type { Devis, DevisItem } from '@/types';

type DevisEdit = Devis & { items: DevisItem[] };

export default function EditDevisPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [devis, setDevis] = useState<DevisEdit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: DevisEdit }>(`/api/devis/${id}`)
      .then((r) => setDevis(r.data))
      .catch(() => router.push('/devis'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !devis) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/devis/${id}`)} className="btn-ghost !p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="page-title">Modifier le devis</h1>
          <p className="page-subtitle">{devis.reference} &mdash; {devis.title}</p>
        </div>
      </div>
      <DevisForm devis={devis} />
    </div>
  );
}
