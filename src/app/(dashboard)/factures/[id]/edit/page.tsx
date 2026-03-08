'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { FactureForm } from '@/components/forms/facture-form';
import { PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import type { Facture, FactureItem } from '@/types';

type FactureEdit = Facture & { items: FactureItem[] };

export default function EditFacturePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [facture, setFacture] = useState<FactureEdit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: FactureEdit }>(`/api/factures/${id}`)
      .then((r) => setFacture(r.data))
      .catch(() => router.push('/factures'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !facture) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost !p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="page-title">Modifier la facture</h1>
          <p className="page-subtitle">{facture.numero}</p>
        </div>
      </div>
      <FactureForm facture={facture} />
    </div>
  );
}
