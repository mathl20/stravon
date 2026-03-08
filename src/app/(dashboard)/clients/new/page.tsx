import { ClientForm } from '@/components/forms/client-form';

export default function NewClientPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Nouveau client</h1>
        <p className="page-subtitle">Ajoutez un nouveau client à votre base</p>
      </div>
      <ClientForm />
    </div>
  );
}
