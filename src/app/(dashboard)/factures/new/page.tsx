'use client';

import { FactureForm } from '@/components/forms/facture-form';

export default function NewFacturePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Nouvelle facture</h1>
        <p className="page-subtitle">Créez une facture détaillée</p>
      </div>
      <FactureForm />
    </div>
  );
}
