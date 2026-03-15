'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { DevisForm } from '@/components/forms/devis-form';

export default function NewDevisPage() {
  const router = useRouter();

  return (
    <div className="guide-devis-form space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/devis')} className="btn-ghost !p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="page-title">Nouveau devis</h1>
          <p className="page-subtitle">Créez un devis détaillé</p>
        </div>
      </div>
      <DevisForm />
    </div>
  );
}
