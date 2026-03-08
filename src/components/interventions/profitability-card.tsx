'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ProfitabilityCardProps {
  amountHT: number;
  rentabilite: {
    coutMateriaux: number;
    coutMO: number;
    marge: number;
    tauxMarge: number;
    tauxHoraire: number;
    totalHeures?: number;
  };
  heuresEstimees?: number | null;
}

export function ProfitabilityCard({ amountHT, rentabilite, heuresEstimees }: ProfitabilityCardProps) {
  const { coutMateriaux, coutMO, marge, tauxMarge } = rentabilite;

  const barColor =
    tauxMarge >= 30 ? 'bg-emerald-500' :
    tauxMarge >= 10 ? 'bg-amber-500' :
    'bg-red-500';

  const badgeColor =
    tauxMarge >= 30 ? 'bg-emerald-50 text-emerald-700' :
    tauxMarge >= 10 ? 'bg-amber-50 text-amber-700' :
    'bg-red-50 text-red-700';

  const Icon = tauxMarge >= 10 ? TrendingUp : tauxMarge >= 0 ? Minus : TrendingDown;

  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Rentabilité</h3>

      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${badgeColor}`}>
          <Icon className="w-3 h-3" />
          {tauxMarge}%
        </span>
        <span className="text-sm font-semibold text-zinc-900">
          {marge >= 0 ? '+' : ''}{formatCurrency(marge)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-zinc-100 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(Math.min(tauxMarge, 100), 0)}%` }}
        />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">CA HT</span>
          <span className="font-medium text-zinc-700">{formatCurrency(amountHT)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Matériaux</span>
          <span className="font-medium text-red-600">-{formatCurrency(coutMateriaux)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Main d'oeuvre{rentabilite.totalHeures ? ` (${rentabilite.totalHeures.toFixed(1)}h réelles)` : heuresEstimees ? ` (${heuresEstimees}h est.)` : ''}</span>
          <span className="font-medium text-red-600">-{formatCurrency(coutMO)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-zinc-100">
          <span className="font-semibold text-zinc-900">Marge</span>
          <span className={`font-bold ${marge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(marge)}
          </span>
        </div>
      </div>
    </div>
  );
}
