import { FeuilleHeureForm } from '@/components/forms/feuille-heure-form';

export default function NewFeuilleHeurePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Nouvelle feuille d&apos;heures</h1>
        <p className="page-subtitle">Saisissez vos heures de travail</p>
      </div>
      <FeuilleHeureForm />
    </div>
  );
}
