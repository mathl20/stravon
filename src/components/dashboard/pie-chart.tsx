'use client';

import { useEffect, useState } from 'react';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  title: string;
  segments: Segment[];
}

export function PieChart({ title, segments }: Props) {
  const [animated, setAnimated] = useState(false);
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (total === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
          </div>
          <p className="text-sm text-zinc-400">Aucune donnée</p>
        </div>
      </div>
    );
  }

  // Build conic-gradient stops
  let cumulative = 0;
  const stops = segments.map((seg) => {
    const start = cumulative;
    const pct = (seg.value / total) * 100;
    cumulative += pct;
    return `${seg.color} ${start}% ${cumulative}%`;
  });

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900 mb-5">{title}</h3>
      <div className="flex items-center gap-8">
        {/* Donut chart */}
        <div className="relative flex-shrink-0">
          <div
            className="w-32 h-32 rounded-full transition-all duration-1000 ease-out"
            style={{
              background: animated
                ? `conic-gradient(${stops.join(', ')})`
                : `conic-gradient(#f4f4f5 0% 100%)`,
            }}
          />
          {/* Center hole for donut effect */}
          <div className="absolute inset-[14px] bg-white rounded-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl font-bold text-zinc-900 leading-none">{total}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">total</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2.5 min-w-0">
          {segments.map((seg) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div key={seg.label} className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-[13px] text-zinc-600 truncate">{seg.label}</span>
                  <span className="text-[13px] font-bold text-zinc-900 tabular-nums">{seg.value}</span>
                  <span className="text-[11px] text-zinc-400 tabular-nums">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
