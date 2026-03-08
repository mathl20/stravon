'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface RevenueChartProps {
  data: { month: string; revenue: number }[];
}

const CHART_HEIGHT = 200;

export function RevenueChart({ data }: RevenueChartProps) {
  const [animated, setAnimated] = useState(false);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const currentMonth = data.length > 0 ? data[data.length - 1] : null;
  const prevMonth = data.length > 1 ? data[data.length - 2] : null;
  const growth = prevMonth && prevMonth.revenue > 0
    ? Math.round(((currentMonth!.revenue - prevMonth.revenue) / prevMonth.revenue) * 100)
    : null;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Chiffre d&apos;affaires</h3>
          <p className="text-xs text-zinc-400 mt-0.5">12 derniers mois</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-zinc-900 tracking-tight">{formatCurrency(totalRevenue)}</p>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            {growth !== null && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <TrendingUp className={`w-3 h-3 ${growth < 0 ? 'rotate-180' : ''}`} />
                {growth >= 0 ? '+' : ''}{growth}%
              </span>
            )}
            <span className="text-[11px] text-zinc-400">vs mois préc.</span>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: CHART_HEIGHT }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full border-t border-dashed border-zinc-100" />
          ))}
        </div>

        {/* Bars — uses pixel heights for reliable rendering */}
        <div className="relative flex items-end gap-[3px]" style={{ height: CHART_HEIGHT }}>
          {data.map((d, i) => {
            const barH = Math.max((d.revenue / maxRevenue) * (CHART_HEIGHT - 16), 3);
            const isLast = i === data.length - 1;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Hover tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute -top-9 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                  <div className="bg-zinc-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap shadow-xl">
                    {formatCurrency(d.revenue)}
                  </div>
                  <div className="w-2 h-2 bg-zinc-900 rotate-45 mx-auto -mt-1" />
                </div>

                {/* Bar */}
                <div
                  className={`w-full max-w-[24px] rounded-t-md cursor-pointer transition-all ease-out ${
                    d.revenue > 0
                      ? isLast
                        ? 'bg-gradient-to-t from-brand-700 via-brand-500 to-brand-400 shadow-md shadow-brand-500/20'
                        : 'bg-gradient-to-t from-brand-600 to-brand-400 group-hover:from-brand-700 group-hover:to-brand-500 group-hover:shadow-md group-hover:shadow-brand-500/15'
                      : 'bg-zinc-100'
                  }`}
                  style={{
                    height: animated ? barH : 3,
                    transitionDuration: '800ms',
                    transitionDelay: `${i * 40}ms`,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex gap-[3px] mt-2">
          {data.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              <span className={`text-[9px] font-medium ${i === data.length - 1 ? 'text-brand-600' : 'text-zinc-400'}`}>
                {d.month}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
