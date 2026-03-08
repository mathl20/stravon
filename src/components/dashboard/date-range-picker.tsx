'use client';

import { CalendarDays } from 'lucide-react';

interface Props {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangePicker({ from, to, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200/60">
      <CalendarDays className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
      <input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="bg-transparent text-xs text-zinc-600 font-medium focus:outline-none w-[110px]"
      />
      <span className="text-[10px] text-zinc-300 font-medium">&mdash;</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="bg-transparent text-xs text-zinc-600 font-medium focus:outline-none w-[110px]"
      />
    </div>
  );
}
