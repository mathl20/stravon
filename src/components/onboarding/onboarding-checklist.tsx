'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, Building2, FileText, Receipt, Bell, UserPlus, PartyPopper, X } from 'lucide-react';
import { apiFetch } from '@/lib/utils';

interface ChecklistItem {
  key: string;
  label: string;
  icon: React.ElementType;
  href: string;
  done: boolean;
  color: string;
}

interface OnboardingChecklistProps {
  checklist: {
    companyInfo: boolean;
    firstDevis: boolean;
    firstFacture: boolean;
    relances: boolean;
    firstClient: boolean;
  };
  completed: boolean;
}

export function OnboardingChecklist({ checklist, completed: initialCompleted }: OnboardingChecklistProps) {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const items: ChecklistItem[] = [
    { key: 'companyInfo', label: 'Infos entreprise complétées', icon: Building2, href: '/settings', done: checklist.companyInfo, color: '#6C63FF' },
    { key: 'firstClient', label: 'Premier client ajouté', icon: UserPlus, href: '/clients/new', done: checklist.firstClient, color: '#60a5fa' },
    { key: 'firstDevis', label: 'Premier devis créé', icon: FileText, href: '/devis/new', done: checklist.firstDevis, color: '#4ade80' },
    { key: 'firstFacture', label: 'Première facture générée', icon: Receipt, href: '/factures', done: checklist.firstFacture, color: '#fbbf24' },
    { key: 'relances', label: 'Relances automatiques activées', icon: Bell, href: '/settings', done: checklist.relances, color: '#f87171' },
  ];

  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;
  const pct = Math.round((doneCount / items.length) * 100);

  const handleDismiss = async () => {
    setDismissed(true);
    await apiFetch('/api/onboarding/status', { method: 'POST', body: JSON.stringify({ dismiss: true }) });
  };

  return (
    <div className="relative overflow-hidden" style={{ background: '#111119', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {allDone ? (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.2)' }}>
              <PartyPopper className="w-4 h-4" style={{ color: '#4ade80' }} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108,99,255,0.15)' }}>
              <span className="text-xs font-bold" style={{ color: '#6C63FF' }}>{doneCount}/{items.length}</span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white">
              {allDone ? 'Bravo, tout est en place !' : 'Bien démarrer avec Stravon'}
            </p>
            {!allDone && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-24 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#6C63FF' }} />
                </div>
                <span className="text-[10px] font-medium" style={{ color: '#9d9bab' }}>{pct}%</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allDone && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
              className="p-1 rounded-lg transition-colors"
              style={{ color: '#5f5d6e' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: '#5f5d6e' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#5f5d6e' }} />}
        </div>
      </button>

      {/* Items */}
      {expanded && (
        <div className="px-4 pb-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.done ? '#' : item.href}
                className="flex items-center gap-3 p-2.5 rounded-lg transition-colors"
                style={{ background: item.done ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                onClick={item.done ? (e) => e.preventDefault() : undefined}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: item.done ? 'rgba(74,222,128,0.15)' : `${item.color}15`,
                    border: item.done ? 'none' : `1px solid ${item.color}30`,
                  }}
                >
                  {item.done ? (
                    <Check className="w-3.5 h-3.5" style={{ color: '#4ade80' }} />
                  ) : (
                    <Icon className="w-3 h-3" style={{ color: item.color }} />
                  )}
                </div>
                <span
                  className="text-sm font-medium"
                  style={{
                    color: item.done ? '#5f5d6e' : '#eae9f0',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {allDone && (
            <div className="mt-2 p-3 rounded-xl text-center" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.12)' }}>
              <p className="text-sm font-medium" style={{ color: '#4ade80' }}>
                Tu es prêt ! Ton essai gratuit est actif.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
