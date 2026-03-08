'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Package, X, Plus, Tag, Percent } from 'lucide-react';
import { apiFetch, formatCurrency } from '@/lib/utils';

interface Article {
  id: string;
  nom: string;
  description: string | null;
  reference: string | null;
  categorie: string;
  unite: string;
  prixAchat: number;
  margePercent: number;
  prixVente: number;
}

interface ArticlePickerProps {
  onSelect: (items: { description: string; quantity: number; unitPrice: number; type: string }[]) => void;
  onClose: () => void;
}

export function ArticlePicker({ onSelect, onClose }: ArticlePickerProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<string, number>>(new Map()); // id -> quantity
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<{ data: Article[] }>('/api/articles-catalogue')
      .then((r) => setArticles(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  const filtered = articles.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.nom.toLowerCase().includes(s)
      || a.categorie.toLowerCase().includes(s)
      || (a.reference && a.reference.toLowerCase().includes(s))
      || (a.description && a.description.toLowerCase().includes(s));
  });

  const grouped: Record<string, Article[]> = {};
  for (const a of filtered) {
    if (!grouped[a.categorie]) grouped[a.categorie] = [];
    grouped[a.categorie].push(a);
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 1);
      return next;
    });
  };

  const updateQty = (id: string, qty: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (qty > 0) next.set(id, qty);
      else next.delete(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const items = articles
      .filter((a) => selected.has(a.id))
      .map((a) => ({
        description: a.reference ? `${a.nom} (Réf: ${a.reference})` : a.nom,
        quantity: selected.get(a.id) || 1,
        unitPrice: a.prixVente,
        type: 'materiel' as const,
      }));
    onSelect(items);
    onClose();
  };

  const totalSelected = Array.from(selected.entries()).reduce((sum, [id, qty]) => {
    const art = articles.find((a) => a.id === id);
    return sum + (art ? art.prixVente * qty : 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Catalogue matériel</h2>
              <p className="text-xs text-zinc-400">Sélectionnez des articles à ajouter au devis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-zinc-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              ref={inputRef}
              placeholder="Rechercher un article..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="text-center py-12 text-sm text-zinc-400">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">
                {articles.length === 0 ? 'Aucun article dans le catalogue' : 'Aucun résultat'}
              </p>
              {articles.length === 0 && (
                <p className="text-xs text-zinc-400 mt-1">Ajoutez des articles dans Paramètres &gt; Catalogue matériel</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([categorie, items]) => (
                <div key={categorie}>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">{categorie}</p>
                  <div className="space-y-1">
                    {items.map((a) => {
                      const isSelected = selected.has(a.id);
                      const qty = selected.get(a.id) || 1;
                      return (
                        <div
                          key={a.id}
                          className={`w-full text-left px-3.5 py-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-transparent bg-zinc-50 hover:bg-zinc-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button type="button" onClick={() => toggleSelect(a.id)} className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium text-zinc-800">{a.nom}</p>
                              {a.description && (
                                <p className="text-xs text-zinc-400 mt-0.5 truncate">{a.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5">
                                {a.reference && (
                                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                                    <Tag className="w-3 h-3" /> {a.reference}
                                  </span>
                                )}
                                <span className="text-xs text-zinc-400">{a.unite}</span>
                                {a.margePercent > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                                    <Percent className="w-3 h-3" /> {a.margePercent}% marge
                                  </span>
                                )}
                                {a.prixAchat > 0 && a.prixAchat !== a.prixVente && (
                                  <span className="text-xs text-zinc-400 line-through">{formatCurrency(a.prixAchat)}</span>
                                )}
                              </div>
                            </button>
                            <div className="text-right flex-shrink-0 flex items-center gap-2">
                              {isSelected && (
                                <input
                                  type="number"
                                  value={qty}
                                  onChange={(e) => updateQty(a.id, Number(e.target.value))}
                                  className="w-16 px-2 py-1 text-sm text-center rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  min="0.01"
                                  step="0.01"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{formatCurrency(a.prixVente)}</p>
                                <p className="text-[10px] text-zinc-400">/{a.unite}</p>
                              </div>
                            </div>
                          </div>
                        </div>
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
          <div>
            <p className="text-sm text-zinc-500">
              {selected.size > 0
                ? `${selected.size} article${selected.size > 1 ? 's' : ''} — ${formatCurrency(totalSelected)}`
                : 'Sélectionnez des articles'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
