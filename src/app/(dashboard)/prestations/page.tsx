'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Wrench, Plus, RotateCcw, Pencil, Trash2, Check, X, Search, Clock, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Card, PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/utils';

interface PrestationItem {
  id: string;
  label: string;
  description: string | null;
  category: string;
  hours: number;
  prixMateriel: number;
  metier: string;
}

interface CompanyInfo {
  tauxHoraire: number;
  metier: string;
}

const METIER_LABELS: Record<string, string> = {
  'plombier': 'Plombier',
  'electricien': 'Électricien',
  'chauffagiste': 'Chauffagiste',
  'climatisation': 'Climatisation / Froid',
  'carreleur': 'Carreleur',
  'peintre': 'Peintre',
  'menuisier': 'Menuisier',
  'maçon': 'Maçon',
  'couvreur': 'Couvreur',
  'serrurier': 'Serrurier',
  'pisciniste': 'Pisciniste',
  'paysagiste': 'Paysagiste',
  'terrassement': 'Terrassement',
  'renovation': 'Rénovation générale',
  'multi-services': 'Multi-services',
  'autre': 'Autre',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function PrestationsPage() {
  const [loading, setLoading] = useState(true);
  const [prestations, setPrestations] = useState<PrestationItem[]>([]);
  const [company, setCompany] = useState<CompanyInfo>({ tauxHoraire: 45, metier: 'multi-services' });
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newPrest, setNewPrest] = useState({ label: '', description: '', category: '', hours: 1, prixMateriel: 0 });

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: '', description: '', category: '', hours: 1, prixMateriel: 0 });

  // Load defaults modal
  const [showLoadDefaults, setShowLoadDefaults] = useState(false);
  const [loadMetier, setLoadMetier] = useState('');

  // Accordion state
  const [openMetiers, setOpenMetiers] = useState<Set<string>>(new Set());
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: PrestationItem[] }>('/api/prestations'),
      apiFetch<{ data: CompanyInfo }>('/api/company'),
    ]).then(([prestRes, companyRes]) => {
      setPrestations(prestRes.data || []);
      const metier = (companyRes.data as any).metier || 'multi-services';
      setCompany({
        tauxHoraire: (companyRes.data as any).tauxHoraire ?? 45,
        metier,
      });
      setLoadMetier(metier);
      // Auto-open company's own metier
      setOpenMetiers(new Set([metier]));
    }).catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  // Categories list (for add form datalist)
  const allCategories = [...new Set(prestations.map(p => p.category))].sort();

  // Filtered prestations (search across all, even closed sections)
  const filtered = prestations.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.label.toLowerCase().includes(s) || p.category.toLowerCase().includes(s)
      || (p.description && p.description.toLowerCase().includes(s));
  });

  // Group by metier, then by category
  const byMetier: Record<string, Record<string, PrestationItem[]>> = {};
  for (const p of filtered) {
    const m = p.metier || 'autre';
    if (!byMetier[m]) byMetier[m] = {};
    if (!byMetier[m][p.category]) byMetier[m][p.category] = [];
    byMetier[m][p.category].push(p);
  }

  // Sort metiers: company's metier first, then alphabetical
  const metierOrder = Object.keys(byMetier).sort((a, b) => {
    if (a === company.metier) return -1;
    if (b === company.metier) return 1;
    return (METIER_LABELS[a] || a).localeCompare(METIER_LABELS[b] || b);
  });

  const toggleMetier = (m: string) => {
    setOpenMetiers(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  const toggleCategory = (key: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // When searching, auto-open all sections with results
  const isSearching = search.length > 0;

  const addPrestation = async () => {
    if (!newPrest.label.trim() || !newPrest.category.trim()) { toast.error('Nom et catégorie requis'); return; }
    setActionLoading(true);
    try {
      const res = await apiFetch<{ data: PrestationItem }>('/api/prestations', { method: 'POST', body: JSON.stringify(newPrest) });
      setPrestations(p => [...p, res.data]);
      setNewPrest({ label: '', description: '', category: '', hours: 1, prixMateriel: 0 });
      setShowAdd(false);
      toast.success('Prestation ajoutée');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setActionLoading(false); }
  };

  const updatePrestation = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch<{ data: PrestationItem }>(`/api/prestations/${id}`, { method: 'PUT', body: JSON.stringify(editForm) });
      setPrestations(p => p.map(x => x.id === id ? res.data : x));
      setEditingId(null);
      toast.success('Prestation modifiée');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setActionLoading(false); }
  };

  const deletePrestation = async (id: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/prestations/${id}`, { method: 'DELETE' });
      setPrestations(p => p.filter(x => x.id !== id));
      toast.success('Prestation supprimée');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setActionLoading(false); }
  };

  const resetPrestations = async () => {
    if (!confirm('Cela supprimera toutes vos prestations et les remplacera par les prestations par défaut de votre métier. Continuer ?')) return;
    setActionLoading(true);
    try {
      const res = await apiFetch<{ data: PrestationItem[] }>('/api/prestations', { method: 'POST', body: JSON.stringify({ action: 'reset' }) });
      setPrestations(res.data || []);
      toast.success('Prestations réinitialisées selon votre métier');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setActionLoading(false); }
  };

  const loadDefaults = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch<{ data: PrestationItem[]; added: number }>('/api/prestations', {
        method: 'POST',
        body: JSON.stringify({ action: 'load-defaults', metier: loadMetier }),
      });
      setPrestations(res.data || []);
      const added = (res as any).added || 0;
      setShowLoadDefaults(false);
      if (added > 0) {
        toast.success(`${added} prestation${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}`);
        // Auto-open the imported metier
        setOpenMetiers(prev => new Set([...prev, loadMetier]));
      } else {
        toast.success('Toutes les prestations par défaut sont déjà présentes');
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setActionLoading(false); }
  };

  const startEdit = (p: PrestationItem) => {
    setEditingId(p.id);
    setEditForm({ label: p.label, description: p.description || '', category: p.category, hours: p.hours, prixMateriel: p.prixMateriel });
  };

  // Stats
  const totalHours = prestations.reduce((s, p) => s + p.hours, 0);
  const totalMateriel = prestations.reduce((s, p) => s + p.prixMateriel, 0);
  const metierCount = new Set(prestations.map(p => p.metier)).size;

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Prestations</h1>
          <p className="page-subtitle">
            Bibliothèque de prestations · {METIER_LABELS[company.metier] || company.metier} · {formatCurrency(company.tauxHoraire)}/h
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowLoadDefaults(true)} disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" /> Importer
          </button>
          <button onClick={resetPrestations} disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50">
            <RotateCcw className="w-4 h-4" /> Réinitialiser
          </button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="!p-4">
          <p className="text-xs text-zinc-400 font-medium">Prestations</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{prestations.length}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-zinc-400 font-medium">Métiers</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{metierCount}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-zinc-400 font-medium">Heures totales</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{Math.round(totalHours * 10) / 10}h</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-zinc-400 font-medium">Matériel total</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{formatCurrency(totalMateriel)}</p>
        </Card>
      </div>

      {/* Load defaults modal */}
      {showLoadDefaults && (
        <Card className="border-brand-200 bg-brand-50/30">
          <p className="text-sm font-semibold text-zinc-900 mb-2">Importer les prestations par défaut</p>
          <p className="text-xs text-zinc-500 mb-3">
            Sélectionnez un métier pour importer ses prestations. Les prestations déjà présentes ne seront pas dupliquées.
          </p>
          <div className="flex items-center gap-3">
            <select value={loadMetier} onChange={(e) => setLoadMetier(e.target.value)}
              className="input-field text-sm flex-1">
              {Object.entries(METIER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button onClick={loadDefaults} disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors whitespace-nowrap">
              Importer
            </button>
            <button onClick={() => setShowLoadDefaults(false)}
              className="px-3 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Add form */}
      {showAdd && (
        <Card className="border-brand-200 bg-brand-50/30">
          <p className="text-sm font-semibold text-zinc-900 mb-3">Nouvelle prestation</p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Nom de la prestation" value={newPrest.label}
                onChange={(e) => setNewPrest(p => ({ ...p, label: e.target.value }))}
                className="input-field text-sm" />
              <div className="relative">
                <input placeholder="Catégorie" value={newPrest.category}
                  onChange={(e) => setNewPrest(p => ({ ...p, category: e.target.value }))}
                  className="input-field text-sm" list="categories-list" />
                <datalist id="categories-list">
                  {allCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <input placeholder="Description (optionnel)" value={newPrest.description}
              onChange={(e) => setNewPrest(p => ({ ...p, description: e.target.value }))}
              className="input-field text-sm" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.5" placeholder="Heures" value={newPrest.hours}
                  onChange={(e) => setNewPrest(p => ({ ...p, hours: Number(e.target.value) }))}
                  className="input-field text-sm w-20 text-center" />
                <span className="text-xs text-zinc-400 whitespace-nowrap">heures</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="1" placeholder="Mat." value={newPrest.prixMateriel || ''}
                  onChange={(e) => setNewPrest(p => ({ ...p, prixMateriel: Number(e.target.value) }))}
                  className="input-field text-sm w-24 text-center" />
                <span className="text-xs text-zinc-400 whitespace-nowrap">€ matériel</span>
              </div>
              <div className="flex gap-1.5 ml-auto">
                <button onClick={addPrestation} disabled={actionLoading}
                  className="px-3 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  Ajouter
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="px-3 py-2 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input placeholder="Rechercher une prestation..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field text-sm pl-9 w-full" />
      </div>

      {/* Prestations accordion */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Wrench className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-500 mb-1">
              {prestations.length === 0 ? 'Aucune prestation configurée' : 'Aucun résultat'}
            </p>
            <p className="text-xs text-zinc-400 mb-4">
              {prestations.length === 0
                ? 'Importez les prestations par défaut de votre métier ou ajoutez-en manuellement.'
                : 'Modifiez votre recherche.'}
            </p>
            {prestations.length === 0 && (
              <button onClick={() => setShowLoadDefaults(true)}
                className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Importer les prestations par défaut
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {metierOrder.map((metier) => {
            const categories = byMetier[metier];
            const categoryNames = Object.keys(categories).sort();
            const metierTotal = Object.values(categories).flat().length;
            const isMetierOpen = isSearching || openMetiers.has(metier);

            return (
              <Card key={metier} className="!p-0 overflow-hidden">
                {/* Metier header */}
                <button
                  onClick={() => toggleMetier(metier)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors text-left"
                >
                  {isMetierOpen
                    ? <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-zinc-900">
                      {METIER_LABELS[metier] || metier}
                    </span>
                    {metier === company.metier && (
                      <span className="ml-2 text-[10px] font-semibold text-brand-600 bg-brand-50 rounded-full px-2 py-0.5">
                        Votre métier
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-zinc-400">{metierTotal} prestation{metierTotal > 1 ? 's' : ''}</span>
                    <span className="text-[10px] text-zinc-300 bg-zinc-100 rounded-full px-2 py-0.5">{categoryNames.length} cat.</span>
                  </div>
                </button>

                {/* Categories inside metier */}
                {isMetierOpen && (
                  <div className="border-t border-zinc-100">
                    {categoryNames.map((category) => {
                      const items = categories[category];
                      const catKey = `${metier}::${category}`;
                      const isCatOpen = isSearching || openCategories.has(catKey);

                      return (
                        <div key={catKey} className="border-b border-zinc-50 last:border-b-0">
                          {/* Category header */}
                          <button
                            onClick={() => toggleCategory(catKey)}
                            className="w-full flex items-center gap-3 pl-10 pr-5 py-2.5 hover:bg-zinc-50/50 transition-colors text-left"
                          >
                            {isCatOpen
                              ? <ChevronDown className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
                              : <ChevronRight className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
                            }
                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex-1">{category}</span>
                            <span className="text-[10px] text-zinc-300 bg-zinc-100 rounded-full px-2 py-0.5">{items.length}</span>
                          </button>

                          {/* Prestations inside category */}
                          {isCatOpen && (
                            <div className="pl-14 pr-5 pb-2 divide-y divide-zinc-50">
                              {items.map((p) => (
                                <div key={p.id} className="py-2.5 group">
                                  {editingId === p.id ? (
                                    /* Edit mode */
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-3">
                                        <input value={editForm.label}
                                          onChange={(e) => setEditForm(f => ({ ...f, label: e.target.value }))}
                                          className="input-field text-sm flex-1" placeholder="Nom" />
                                        <input value={editForm.category}
                                          onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
                                          className="input-field text-sm w-32" list="categories-list-edit" placeholder="Catégorie" />
                                        <datalist id="categories-list-edit">
                                          {allCategories.map(c => <option key={c} value={c} />)}
                                        </datalist>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <input value={editForm.description}
                                          onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                                          className="input-field text-sm flex-1" placeholder="Description (optionnel)" />
                                        <div className="flex items-center gap-1">
                                          <input type="number" min="0" step="0.5" value={editForm.hours}
                                            onChange={(e) => setEditForm(f => ({ ...f, hours: Number(e.target.value) }))}
                                            className="input-field text-sm w-16 text-center" />
                                          <span className="text-xs text-zinc-400">h</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <input type="number" min="0" step="1" value={editForm.prixMateriel || ''}
                                            onChange={(e) => setEditForm(f => ({ ...f, prixMateriel: Number(e.target.value) }))}
                                            className="input-field text-sm w-20 text-center" placeholder="0" />
                                          <span className="text-xs text-zinc-400">€</span>
                                        </div>
                                        <button onClick={() => updatePrestation(p.id)} disabled={actionLoading}
                                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setEditingId(null)}
                                          className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-colors">
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* View mode */
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-800 truncate">{p.label}</p>
                                        {p.description && <p className="text-xs text-zinc-400 truncate">{p.description}</p>}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-zinc-500 flex-shrink-0">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-sm tabular-nums">{p.hours}h</span>
                                      </div>
                                      {p.prixMateriel > 0 && (
                                        <span className="text-xs text-zinc-400 tabular-nums flex-shrink-0">+{formatCurrency(p.prixMateriel)} mat.</span>
                                      )}
                                      <span className="text-sm font-medium text-zinc-700 tabular-nums w-24 text-right flex-shrink-0">
                                        {formatCurrency(p.hours * company.tauxHoraire + p.prixMateriel)}
                                      </span>
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button onClick={() => startEdit(p)}
                                          className="p-2 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => deletePrestation(p.id)}
                                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer info */}
      {prestations.length > 0 && (
        <p className="text-xs text-zinc-400 text-center pb-2">
          {filtered.length} prestation{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
          {filtered.length !== prestations.length && ` sur ${prestations.length}`}
          {' · '}Ces prestations sont utilisées par l&apos;assistant IA pour estimer vos devis.
        </p>
      )}
    </div>
  );
}
