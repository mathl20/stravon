'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ClientForm } from '@/components/forms/client-form';
import { PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import type { Client } from '@/types';

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: Client }>(`/api/clients/${id}`)
      .then((r) => setClient(r.data))
      .catch(() => router.push('/clients'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !client) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost !p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="page-title">Modifier le client</h1>
          <p className="page-subtitle">{client.firstName} {client.lastName}</p>
        </div>
      </div>
      <ClientForm client={client} />
    </div>
  );
}
