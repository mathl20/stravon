'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Wrench, Clock, Package, X, Plus } from 'lucide-react';
import { apiFetch, formatCurrency } from '@/lib/utils';

interface Prestation {
  id: string;
  label: string;
  description: string | null;
  category: string;
  hours: number;
  prixMateriel: number;
}

interface PrestationPickerProps {
  onSelect: (items: { description: string; quantity: number; unitPrice: number }[]) => void;
  onClose: () => void;
}

export function PrestationPicker({ onSelect, onClose }: PrestationPickerProps) {
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [tauxHoraire, setTauxHoraire] = useState(45);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: Prestation[] }>('/api/prestations'),
      apiFetch<{ data: { tauxHoraire: number } }>('/api/company'),
    ]).then(([prestRes, companyRes]) => {
      setPrestations(prestRes.data || []);
      setTauxHoraire((companyRes.data as any).tauxHoraire ?? 45);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  const filtered = prestations.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.label.toLowerCase().includes(s)
      || p.category.toLowerCase().includes(s)
      || (p.description && p.description.toLowerCase().includes(s));
  });

  // Group by category
  const grouped: Record<string, Prestation[]> = {};
  for (const p of filtered) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const items = prestations
      .filter((p) => selected.has(p.id))
      .map((p) => {
        const moPrice = Math.round(p.hours * tauxHoraire * 100) / 100;
        const totalUnit = moPrice + p.prixMateriel;
        return {
          description: p.description ? `${p.label} — ${p.description}` : p.label,
          quantity: 1,
          unitPrice: totalUnit,
        };
      });
    onSelect(items);
    onClose();
  };

  const calcTotal = (p: Prestation) => Math.round(p.hours * tauxHoraire * 100) / 100 + p.prixMateriel;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in"
        style={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#eae9f0' }}>Ajouter une prestation</h2>
              <p className="text-xs text-zinc-400">Taux horaire : {formatCurrency(tauxHoraire)}/h</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-zinc-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              ref={inputRef}
              placeholder="Rechercher une prestation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="text-center py-12 text-sm text-zinc-400">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">
                {prestations.length === 0 ? 'Aucune prestation configurée' : 'Aucun résultat'}
              </p>
              {prestations.length === 0 && (
                <p className="text-xs text-zinc-400 mt-1">Configurez vos prestations dans Paramètres &gt; Prestations</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">{category}</p>
                  <div className="space-y-1">
                    {items.map((p) => {
                      const isSelected = selected.has(p.id);
                      const mo = Math.round(p.hours * tauxHoraire * 100) / 100;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleSelect(p.id)}
                          className={`w-full text-left px-3.5 py-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-brand-500 bg-brand-600/15'
                              : 'border-transparent hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={{ color: '#eae9f0' }}>{p.label}</p>
                              {p.description && (
                                <p className="text-xs text-zinc-400 mt-0.5 truncate">{p.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="flex items-center gap-1 text-xs text-zinc-500">
                                  <Clock className="w-3 h-3" /> {p.hours}h
                                </span>
                                <span className="text-xs text-zinc-400">MO : {formatCurrency(mo)}</span>
                                {p.prixMateriel > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                                    <Package className="w-3 h-3" /> Mat. : {formatCurrency(p.prixMateriel)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold" style={{ color: '#eae9f0' }}>{formatCurrency(calcTotal(p))}</p>
                              <p className="text-[10px] text-zinc-400">prix unitaire</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {selected.size > 0
              ? `${selected.size} prestation${selected.size > 1 ? 's' : ''} sélectionnée${selected.size > 1 ? 's' : ''}`
              : 'Sélectionnez des prestations'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors" style={{ color: '#9d9bab', background: 'rgba(255,255,255,0.06)' }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Ajouter au devis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
