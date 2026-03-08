import { InterventionForm } from '@/components/forms/intervention-form';

export default function NewInterventionPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Nouvelle intervention</h1>
        <p className="page-subtitle">Créez une fiche d&apos;intervention détaillée</p>
      </div>
      <InterventionForm />
    </div>
  );
}
