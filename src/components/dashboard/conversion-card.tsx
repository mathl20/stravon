'use client';

import { useEffect, useState } from 'react';
import { FileSignature, Check } from 'lucide-react';

interface Props {
  rate: number;
  totalDevis: number;
  devisAcceptes: number;
}

export function ConversionCard({ rate, totalDevis, devisAcceptes }: Props) {
  const [animated, setAnimated] = useState(false);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (rate / 100) * circumference;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900 mb-5">Conversion Devis</h3>

      <div className="flex flex-col items-center">
        {/* Circular progress */}
        <div className="relative w-28 h-28 mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="#f4f4f5"
              strokeWidth="6"
            />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="url(#conversionGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={animated ? offset : circumference}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="conversionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1b40f5" />
                <stop offset="100%" stopColor="#5989ff" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-zinc-900">{rate}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/80">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-700">{devisAcceptes}</p>
              <p className="text-[10px] text-emerald-600/70">Acceptés</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center">
              <FileSignature className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-700">{totalDevis}</p>
              <p className="text-[10px] text-zinc-400">Total</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
