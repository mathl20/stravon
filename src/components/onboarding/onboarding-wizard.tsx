'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, FileText, Zap, Bell, ArrowRight, Check, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/utils';
import toast from 'react-hot-toast';

const STEPS = [
  {
    icon: Building2,
    title: 'Tes infos entreprise',
    description: 'SIRET, adresse, logo — pour que tes devis soient conformes.',
    action: 'Compléter mes infos',
    color: '#6C63FF',
  },
  {
    icon: FileText,
    title: 'Ton premier devis',
    description: 'On a préparé un exemple type "Installation chauffe-eau" avec matériaux et main d\'œuvre. Tu verras le résultat en 10 secondes.',
    action: 'Créer un devis d\'exemple',
    color: '#4ade80',
  },
  {
    icon: Zap,
    title: 'Devis → Facture en 1 clic',
    description: 'Une fois le devis accepté, tu le transformes en facture instantanément. C\'est le moment "wow".',
    action: 'Compris, suivant',
    color: '#60a5fa',
  },
  {
    icon: Bell,
    title: 'Relances automatiques',
    description: 'Un client ne paie pas ? Stravon envoie les relances à ta place à 7, 14 et 30 jours. Tu n\'as rien à faire.',
    action: 'Activer les relances',
    color: '#fbbf24',
  },
];

export function OnboardingWizard({ onComplete, currentStep = 0 }: { onComplete: () => void; currentStep?: number }) {
  const router = useRouter();
  const [step, setStep] = useState(currentStep);
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (step === 0) {
        // Go to settings to fill company info
        await apiFetch('/api/onboarding/status', { method: 'POST', body: JSON.stringify({ step: 1 }) });
        router.push('/settings');
        onComplete();
        return;
      }

      if (step === 1) {
        // Create sample devis
        const res = await apiFetch<{ devisId: string; reference: string }>('/api/onboarding/sample-devis', { method: 'POST' });
        toast.success(`Devis ${res.reference} créé !`);
        await apiFetch('/api/onboarding/status', { method: 'POST', body: JSON.stringify({ step: 2 }) });
        setStep(2);
        setLoading(false);
        return;
      }

      if (step === 2) {
        // Just advance — this is the "wow moment" explanation
        await apiFetch('/api/onboarding/status', { method: 'POST', body: JSON.stringify({ step: 3 }) });
        setStep(3);
        setLoading(false);
        return;
      }

      if (step === 3) {
        // Activate relances (already default true, but confirm)
        await apiFetch('/api/company', {
          method: 'PUT',
          body: JSON.stringify({ relancesActive: true, devisRelancesActive: true }),
        });
        await apiFetch('/api/onboarding/status', { method: 'POST', body: JSON.stringify({ step: 4 }) });
        toast.success('Relances activées !');
        onComplete();
        return;
      }
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await apiFetch('/api/onboarding/status', { method: 'POST', body: JSON.stringify({ dismiss: true }) });
    onComplete();
  };

  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md" style={{ background: '#111119', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        {/* Progress bar */}
        <div className="flex gap-1.5 p-4 pb-0">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i <= step ? '#6C63FF' : 'rgba(255,255,255,0.08)' }} />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 pt-5 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${s.color}20` }}>
            <Icon className="w-7 h-7" style={{ color: s.color }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9d9bab' }}>
            Étape {step + 1} sur {STEPS.length}
          </p>
          <h2 className="text-xl font-bold text-white mb-2">{s.title}</h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#9d9bab' }}>{s.description}</p>

          {step === 2 && (
            <div className="mb-6 p-4 rounded-xl text-left" style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.2)' }}>📋</div>
                <span className="text-sm font-medium text-white">Devis accepté</span>
              </div>
              <div className="flex items-center gap-2 my-2">
                <div className="h-6 w-px" style={{ background: 'rgba(255,255,255,0.1)', marginLeft: '15px' }} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.2)' }}>📄</div>
                <span className="text-sm font-medium text-white">Facture générée</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>1 clic</span>
              </div>
            </div>
          )}

          <button
            onClick={handleAction}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-white transition-all"
            style={{ background: '#6C63FF' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {s.action}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          <button onClick={handleSkip} className="mt-3 text-xs font-medium transition-colors" style={{ color: '#5f5d6e' }}>
            Passer l&apos;introduction
          </button>
        </div>
      </div>
    </div>
  );
}
