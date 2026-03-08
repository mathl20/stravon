'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface BarItem {
  name: string;
  value: number;
}

interface Props {
  title: string;
  items: BarItem[];
  formatValue?: (v: number) => string;
  color?: string;
}

export function HorizontalBarChart({ title, items, formatValue = formatCurrency, color = 'from-brand-500 to-brand-400' }: Props) {
  const [animated, setAnimated] = useState(false);
  const safeItems = (items || []).map((i) => ({ name: i.name || '', value: Number(i.value) || 0 }));
  const max = Math.max(...safeItems.map((i) => i.value), 1);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h3>
      {safeItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <p className="text-sm text-zinc-400">Aucune donnée</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {safeItems.map((item, i) => (
            <div key={item.name} className="group">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[13px] text-zinc-600 truncate mr-3 group-hover:text-zinc-900 transition-colors">{item.name}</span>
                <span className="text-[13px] font-bold text-zinc-900 tabular-nums flex-shrink-0">
                  {formatValue(item.value)}
                </span>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${color} rounded-full transition-all ease-out`}
                  style={{
                    width: animated ? `${Math.max((item.value / max) * 100, 2)}%` : '0%',
                    transitionDuration: '800ms',
                    transitionDelay: `${i * 80}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
