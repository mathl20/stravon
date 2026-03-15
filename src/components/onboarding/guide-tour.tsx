'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, ArrowRight, Rocket, PartyPopper, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/utils';

/* ── Step definitions ── */
interface GuideStep {
  page: string; // pathname where this step applies
  targetSelector?: string; // CSS selector to spotlight
  title: string;
  text: string;
  buttonLabel: string;
  buttonAction?: 'next' | 'navigate';
  navigateTo?: string;
}

const STEPS: GuideStep[] = [
  {
    page: '/dashboard',
    targetSelector: '.guide-kpis',
    title: 'Ton activité en un coup d\'œil 📊',
    text: 'Ici tu vois tout ce qui compte : ton chiffre d\'affaires, tes factures en attente, tes interventions et tes devis en cours.',
    buttonLabel: 'Suivant →',
  },
  {
    page: '/dashboard',
    targetSelector: '.guide-quick-actions',
    title: 'Tes raccourcis 🚀',
    text: 'Ces boutons te permettent de tout créer en un clic. On va commencer par ajouter ton premier client !',
    buttonLabel: 'Ajouter mon premier client →',
    buttonAction: 'navigate',
    navigateTo: '/clients/new',
  },
  {
    page: '/clients/new',
    targetSelector: '.guide-client-form',
    title: 'Crée ton premier client 👤',
    text: 'Remplis juste le nom et le téléphone pour commencer. Tu pourras compléter le reste plus tard.',
    buttonLabel: 'Suivant →',
  },
  {
    page: '/devis/new',
    targetSelector: '.guide-devis-form',
    title: 'Ton premier devis pro 📝',
    text: 'Donne un titre à ton devis et ajoute tes lignes. Tu peux cliquer "Remplir avec un exemple" pour voir comment ça marche !',
    buttonLabel: 'Suivant →',
  },
  {
    page: '/devis',
    title: 'Voilà le résultat ! ✨',
    text: 'Tu peux envoyer le devis au client par email, le télécharger en PDF, ou le faire signer sur place. Tout est là.',
    buttonLabel: 'Compris ! Voyons le planning →',
    buttonAction: 'navigate',
    navigateTo: '/planning',
  },
  {
    page: '/planning',
    title: 'Ton planning de la semaine 📅',
    text: 'Ici tu planifies tes interventions jour par jour. Clique sur "Ajouter" pour créer un créneau. Tes clients et employés verront le planning en temps réel.',
    buttonLabel: 'Suivant →',
    buttonAction: 'navigate',
    navigateTo: '/assistant',
  },
  {
    page: '/assistant',
    title: 'L\'assistant IA, ton meilleur allié 🤖',
    text: 'Tape en langage naturel : "Crée un devis pour Dupont, pose robinet 150€" et il s\'occupe de tout. Comme si tu parlais à un collègue.',
    buttonLabel: 'Suivant →',
    buttonAction: 'navigate',
    navigateTo: '/settings',
  },
  {
    page: '/settings',
    title: 'Relances automatiques 🔔',
    text: 'Stravon envoie des relances automatiques quand une facture n\'est pas payée. Tu n\'as rien à faire — tes clients reçoivent un rappel à 7, 14 et 30 jours.',
    buttonLabel: 'Terminer le guide →',
  },
];

const TOTAL_STEPS = STEPS.length;

/* ── Main component ── */
export function GuideTour({ initialStep }: { initialStep: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState(initialStep);
  const [showWelcome, setShowWelcome] = useState(initialStep === 0);
  const [showFinal, setShowFinal] = useState(false);
  const [visible, setVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [bubblePos, setBubblePos] = useState<'bottom' | 'top'>('bottom');

  const currentStep = STEPS[step];
  const isOnCorrectPage = currentStep && pathname.startsWith(currentStep.page);

  // Find and measure target element
  const measureTarget = useCallback(() => {
    if (!currentStep?.targetSelector || !isOnCorrectPage) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Position bubble above or below based on space
      const spaceBelow = window.innerHeight - rect.bottom;
      setBubblePos(spaceBelow > 250 ? 'bottom' : 'top');
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isOnCorrectPage]);

  useEffect(() => {
    measureTarget();
    const timer = setTimeout(measureTarget, 500); // re-measure after animations
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget);
    };
  }, [measureTarget, step, pathname]);

  const saveStep = async (s: number | null) => {
    try {
      if (s === null) {
        await apiFetch('/api/guide', { method: 'POST', body: JSON.stringify({ action: 'complete' }) });
      } else {
        await apiFetch('/api/guide', { method: 'POST', body: JSON.stringify({ step: s }) });
      }
    } catch { /* non-blocking */ }
  };

  const handleNext = async () => {
    const nextStep = step + 1;
    if (nextStep >= TOTAL_STEPS) {
      setShowFinal(true);
      await saveStep(null);
      return;
    }

    const nextDef = STEPS[nextStep];
    setStep(nextStep);
    await saveStep(nextStep);

    if (currentStep?.buttonAction === 'navigate' && currentStep.navigateTo) {
      router.push(currentStep.navigateTo);
    } else if (nextDef && !pathname.startsWith(nextDef.page)) {
      router.push(nextDef.page);
    }
  };

  const handleSkip = async () => {
    setVisible(false);
    await saveStep(null);
  };

  const handleFinish = async () => {
    setShowFinal(false);
    setVisible(false);
    await saveStep(null);
    router.push('/dashboard');
  };

  const handleStartGuide = () => {
    setShowWelcome(false);
    setStep(0);
  };

  if (!visible) return null;

  // Welcome modal
  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4" style={{ backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-6">
            <Rocket className="w-10 h-10 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Bienvenue sur Stravon ! 👋</h1>
          <p className="text-zinc-500 text-sm leading-relaxed mb-2">On va configurer ton espace en 3 minutes.</p>
          <p className="text-zinc-400 text-sm mb-8">Tu vas voir, c&apos;est simple comme un coup de fil.</p>
          <button
            onClick={handleStartGuide}
            className="w-full py-4 rounded-xl text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #7C3AED)' }}
          >
            C&apos;est parti <ArrowRight className="w-5 h-5 inline ml-1" />
          </button>
          <button
            onClick={handleSkip}
            className="mt-4 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Je connais déjà, passer le guide
          </button>
        </div>
      </div>
    );
  }

  // Final celebration modal
  if (showFinal) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4" style={{ backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Tu es prêt ! 🎉</h1>
          <p className="text-zinc-500 text-sm leading-relaxed mb-6">Tu connais maintenant l&apos;essentiel de Stravon.</p>
          <div className="bg-zinc-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-sm text-zinc-700 flex items-center gap-2">✅ Dashboard et KPIs découverts</p>
            <p className="text-sm text-zinc-700 flex items-center gap-2">✅ Création de client et devis maîtrisée</p>
            <p className="text-sm text-zinc-700 flex items-center gap-2">✅ Planning et assistant IA explorés</p>
            <p className="text-sm text-zinc-700 flex items-center gap-2">✅ Relances automatiques comprises</p>
          </div>
          <p className="text-xs text-zinc-400 mb-6">Si tu as une question, le support est accessible depuis le menu latéral.</p>
          <button
            onClick={handleFinish}
            className="w-full py-4 rounded-xl text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
          >
            Commencer à utiliser Stravon <ArrowRight className="w-5 h-5 inline ml-1" />
          </button>
        </div>
      </div>
    );
  }

  // Don't show overlay if not on the correct page for this step
  if (!isOnCorrectPage) {
    return null;
  }

  // Spotlight overlay + bubble
  const padding = 8;
  const hasTarget = targetRect !== null;

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Dark overlay with hole */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="guide-mask">
            <rect width="100%" height="100%" fill="white" />
            {hasTarget && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#guide-mask)" style={{ pointerEvents: 'auto' }} />
      </svg>

      {/* Spotlight glow ring */}
      {hasTarget && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            left: targetRect.left - padding - 2,
            top: targetRect.top - padding - 2,
            width: targetRect.width + (padding + 2) * 2,
            height: targetRect.height + (padding + 2) * 2,
            boxShadow: '0 0 0 2px rgba(108,99,255,0.5), 0 0 20px rgba(108,99,255,0.15)',
          }}
        />
      )}

      {/* Bubble */}
      <div
        className="absolute z-10 w-[calc(100%-32px)] max-w-sm animate-fade-in"
        style={{
          left: hasTarget
            ? Math.max(16, Math.min(targetRect.left, window.innerWidth - 380))
            : '50%',
          top: hasTarget
            ? (bubblePos === 'bottom' ? targetRect.bottom + padding + 16 : targetRect.top - padding - 16)
            : '50%',
          transform: hasTarget
            ? (bubblePos === 'top' ? 'translateY(-100%)' : 'none')
            : 'translate(-50%, -50%)',
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-5 border border-zinc-100">
          {/* Step counter */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-semibold text-violet-600">Étape {step + 1}/{TOTAL_STEPS}</span>
            </div>
            <button onClick={handleSkip} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-1">
              <X className="w-3 h-3" /> Passer
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-zinc-100 rounded-full mb-4">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%`, background: 'linear-gradient(90deg, #6C63FF, #7C3AED)' }}
            />
          </div>

          <h3 className="text-base font-bold text-zinc-900 mb-1">{currentStep.title}</h3>
          <p className="text-sm text-zinc-500 leading-relaxed mb-4">{currentStep.text}</p>

          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #7C3AED)' }}
          >
            {currentStep.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Progress banner ── */
export function GuideProgressBanner({ step, onContinue }: { step: number; onContinue: () => void }) {
  return (
    <button
      onClick={onContinue}
      className="w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-xl transition-colors hover:opacity-90"
      style={{ background: 'linear-gradient(90deg, rgba(108,99,255,0.1), rgba(124,58,237,0.1))', border: '1px solid rgba(108,99,255,0.2)' }}
    >
      <span className="flex items-center gap-2">
        <Rocket className="w-4 h-4 text-violet-600" />
        <span className="font-medium text-violet-700">Guide de démarrage : étape {step + 1}/{TOTAL_STEPS}</span>
      </span>
      <span className="text-xs font-semibold text-violet-600 flex items-center gap-1">
        Continuer <ArrowRight className="w-3 h-3" />
      </span>
    </button>
  );
}
