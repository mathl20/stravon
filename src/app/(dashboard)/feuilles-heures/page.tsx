'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Clock, Plus, Check, X, Trash2, Download, CheckCircle2, XCircle, CalendarCheck } from 'lucide-react';
import { Button, Card, PageLoader } from '@/components/ui';
import { apiFetch, formatDate } from '@/lib/utils';
import { canViewAllTimesheets, canValidateTimesheets } from '@/lib/permissions';
import { usePermissions } from '@/lib/permissions-context';

interface FeuilleHeure {
  id: string;
  date: string;
  heuresTravaillees: number;
  panierRepas: boolean;
  zone: number | null;
  grandDeplacement: boolean;
  valide: boolean;
  statut: string;
  motifRefus: string | null;
  utilisateur: { id: string; firstName: string; lastName: string };
  intervention: { id: string; reference: string; title: string } | null;
}

const STATUT_STYLES: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  VALIDEE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REFUSEE: 'bg-red-50 text-red-700 border-red-200',
};

const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
};

function getWeekBounds(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export default function FeuillesHeuresPage() {
  const perms = usePermissions();
  const [feuilles, setFeuilles] = useState<FeuilleHeure[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');

  const fetchData = () => {
    apiFetch<{ data: FeuilleHeure[] }>('/api/feuilles-heures')
      .then((r) => { setFeuilles(r.data); setSelected(new Set()); })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleValidate = async (id: string) => {
    try {
      await apiFetch(`/api/feuilles-heures/${id}/validate`, { method: 'PUT' });
      toast.success('Statut modifié');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette feuille ?')) return;
    try {
      await apiFetch(`/api/feuilles-heures/${id}`, { method: 'DELETE' });
      toast.success('Supprimée');
      setFeuilles((f) => f.filter((x) => x.id !== id));
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  // Bulk actions
  const bulkAction = async (action: 'validate' | 'refuse', motif?: string) => {
    const ids = [...selected];
    if (ids.length === 0) { toast.error('Aucune feuille sélectionnée'); return; }
    setBulkLoading(true);
    try {
      const res = await apiFetch<{ message: string; count: number }>('/api/feuilles-heures/bulk-validate', {
        method: 'POST',
        body: JSON.stringify({ ids, action, motifRefus: motif }),
      });
      toast.success(res.message);
      setShowRefuseModal(false);
      setMotifRefus('');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBulkLoading(false);
    }
  };

  const validateWeek = async () => {
    const { monday, sunday } = getWeekBounds(new Date());
    const weekFeuilles = feuilles.filter((f) => {
      const d = new Date(f.date);
      return d >= monday && d <= sunday && f.statut !== 'VALIDEE';
    });
    if (weekFeuilles.length === 0) { toast.success('Toutes les feuilles de la semaine sont déjà validées'); return; }
    setBulkLoading(true);
    try {
      const res = await apiFetch<{ message: string; count: number }>('/api/feuilles-heures/bulk-validate', {
        method: 'POST',
        body: JSON.stringify({ ids: weekFeuilles.map((f) => f.id), action: 'validate' }),
      });
      toast.success(res.message);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBulkLoading(false);
    }
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === feuilles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(feuilles.map((f) => f.id)));
    }
  };

  if (loading) return <PageLoader />;

  const showAllUsers = canViewAllTimesheets(perms);
  const canValidate = canValidateTimesheets(perms);
  const hasSelection = selected.size > 0;
  const allSelected = feuilles.length > 0 && selected.size === feuilles.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Feuilles d&apos;heures</h1>
          <p className="page-subtitle">{feuilles.length} feuille{feuilles.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" href="/api/feuilles-heures/export" download onClick={() => toast.success('Téléchargement en cours...')}><Download className="w-4 h-4" /> Exporter</Button>
          <Button href="/feuilles-heures/new"><Plus className="w-4 h-4" /> Nouvelle feuille</Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {canValidate && feuilles.length > 0 && (
        <Card className="!py-3 !px-4">
          <div className="flex items-center gap-3 flex-wrap">
            {hasSelection && (
              <>
                <span className="text-sm font-medium text-zinc-700">
                  {selected.size} sélectionnée{selected.size > 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => bulkAction('validate')}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> Valider
                </button>
                <button
                  onClick={() => setShowRefuseModal(true)}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Refuser
                </button>
                <div className="w-px h-5 bg-zinc-200" />
              </>
            )}
            <button
              onClick={validateWeek}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 disabled:opacity-50 transition-colors"
            >
              <CalendarCheck className="w-4 h-4" /> Valider toute la semaine
            </button>
          </div>
        </Card>
      )}

      {/* Refuse modal */}
      {showRefuseModal && (
        <Card className="border-red-200 bg-red-50/30">
          <p className="text-sm font-semibold text-zinc-900 mb-2">Refuser {selected.size} feuille{selected.size > 1 ? 's' : ''}</p>
          <textarea
            value={motifRefus}
            onChange={(e) => setMotifRefus(e.target.value)}
            placeholder="Motif du refus (optionnel)"
            rows={2}
            className="input-field text-sm w-full mb-3"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkAction('refuse', motifRefus)}
              disabled={bulkLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Confirmer le refus
            </button>
            <button
              onClick={() => { setShowRefuseModal(false); setMotifRefus(''); }}
              className="px-3 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Annuler
            </button>
          </div>
        </Card>
      )}

      <Card>
        {feuilles.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Aucune feuille d&apos;heures</p>
            <Link href="/feuilles-heures/new" className="text-sm text-brand-600 font-medium mt-2 inline-block hover:underline">
              Créer la première
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  {canValidate && (
                    <th className="pb-3 px-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Date</th>
                  {showAllUsers && <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Utilisateur</th>}
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Heures</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Panier</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Zone</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Gd dépl.</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Intervention</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Statut</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {feuilles.map((f) => {
                  const statut = f.statut || (f.valide ? 'VALIDEE' : 'EN_ATTENTE');
                  return (
                    <tr key={f.id} className={`border-b border-zinc-50 last:border-0 ${selected.has(f.id) ? 'bg-brand-50/30' : ''}`}>
                      {canValidate && (
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={selected.has(f.id)}
                            onChange={() => toggleSelect(f.id)}
                            className="w-4 h-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3 px-3 text-sm text-zinc-900">{formatDate(f.date)}</td>
                      {showAllUsers && (
                        <td className="py-3 px-3 text-sm text-zinc-700">{f.utilisateur.firstName} {f.utilisateur.lastName}</td>
                      )}
                      <td className="py-3 px-3 text-sm font-medium text-zinc-900">{f.heuresTravaillees}h</td>
                      <td className="py-3 px-3">{f.panierRepas ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-zinc-300" />}</td>
                      <td className="py-3 px-3 text-sm text-zinc-500">{f.zone ?? '-'}</td>
                      <td className="py-3 px-3">{f.grandDeplacement ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-zinc-300" />}</td>
                      <td className="py-3 px-3 text-sm text-zinc-500">
                        {f.intervention ? (
                          <Link href={`/interventions/${f.intervention.id}`} className="text-brand-600 hover:underline">
                            {f.intervention.reference}
                          </Link>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${STATUT_STYLES[statut] || STATUT_STYLES.EN_ATTENTE}`}>
                          {STATUT_LABELS[statut] || 'En attente'}
                        </span>
                        {statut === 'REFUSEE' && f.motifRefus && (
                          <p className="text-[10px] text-red-500 mt-0.5 truncate max-w-[150px]" title={f.motifRefus}>{f.motifRefus}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canValidate && (
                            <button
                              onClick={() => handleValidate(f.id)}
                              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-emerald-600 transition-colors"
                              title={statut === 'VALIDEE' ? 'Invalider' : 'Valider'}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {statut !== 'VALIDEE' && (
                            <Link
                              href={`/feuilles-heures/${f.id}/edit`}
                              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors text-sm"
                            >
                              Modifier
                            </Link>
                          )}
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
