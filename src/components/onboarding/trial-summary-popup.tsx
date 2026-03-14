'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, FileText, Receipt, Clock, ArrowRight } from 'lucide-react';
import { apiFetch, formatCurrency } from '@/lib/utils';

interface TrialStats {
  devisCount: number;
  facturesCount: number;
  totalAmount: number;
  estimatedTimeSaved: number; // minutes
}

export function TrialSummaryPopup({ trialEndsAt, createdAt }: { trialEndsAt: string; createdAt: string }) {
  const [show, setShow] = useState(false);
  const [stats, setStats] = useState<TrialStats | null>(null);

  useEffect(() => {
    // Show popup between J+10 and J+12 of trial
    const created = new Date(createdAt);
    const daysSinceCreation = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    const dismissed = sessionStorage.getItem('trial-summary-dismissed');

    if (daysSinceCreation >= 10 && daysSinceCreation <= 12 && !dismissed) {
      apiFetch<TrialStats>('/api/onboarding/trial-stats')
        .then(data => {
          if (data.devisCount > 0 || data.facturesCount > 0) {
            setStats(data);
            setShow(true);
          }
        })
        .catch(() => {});
    }
  }, [createdAt]);

  if (!show || !stats) return null;

  const trialEnd = new Date(trialEndsAt);
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const hoursStr = Math.round(stats.estimatedTimeSaved / 60);

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('trial-summary-dismissed', '1');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm" style={{ background: '#111119', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        {/* Gradient top */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #6C63FF, #4ade80)' }} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6C63FF' }}>
                Ton bilan après 10 jours
              </p>
              <h3 className="text-lg font-bold text-white mt-1">
                Tu as bien avancé !
              </h3>
            </div>
            <button onClick={handleDismiss} className="p-1 rounded-lg" style={{ color: '#5f5d6e' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="p-3 rounded-xl text-center" style={{ background: '#1a1a24' }}>
              <FileText className="w-4 h-4 mx-auto mb-1" style={{ color: '#60a5fa' }} />
              <p className="text-lg font-bold text-white">{stats.devisCount}</p>
              <p className="text-[10px]" style={{ color: '#9d9bab' }}>devis créés</p>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: '#1a1a24' }}>
              <Receipt className="w-4 h-4 mx-auto mb-1" style={{ color: '#4ade80' }} />
              <p className="text-lg font-bold text-white">{stats.facturesCount}</p>
              <p className="text-[10px]" style={{ color: '#9d9bab' }}>factures</p>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: '#1a1a24' }}>
              <Clock className="w-4 h-4 mx-auto mb-1" style={{ color: '#fbbf24' }} />
              <p className="text-lg font-bold text-white">~{hoursStr}h</p>
              <p className="text-[10px]" style={{ color: '#9d9bab' }}>gagnées</p>
            </div>
          </div>

          {stats.totalAmount > 0 && (
            <div className="p-3 rounded-xl mb-5 text-center" style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.15)' }}>
              <p className="text-xs" style={{ color: '#9d9bab' }}>Montant total facturé</p>
              <p className="text-xl font-bold" style={{ color: '#6C63FF' }}>{formatCurrency(stats.totalAmount)}</p>
            </div>
          )}

          <p className="text-xs text-center mb-4" style={{ color: '#9d9bab' }}>
            Il te reste <strong className="text-white">{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong> d&apos;essai gratuit.
            <br />Passe en Starter pour ne rien perdre.
          </p>

          <Link
            href="/subscription"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all"
            style={{ background: '#6C63FF' }}
          >
            Garder tout ça <ArrowRight className="w-4 h-4" />
          </Link>

          <button onClick={handleDismiss} className="w-full mt-2 text-xs font-medium py-2" style={{ color: '#5f5d6e' }}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
