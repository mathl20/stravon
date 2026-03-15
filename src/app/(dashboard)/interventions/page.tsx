'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, Trash2, Download } from 'lucide-react';
import { Button, Card, StatusBadge, EmptyState, PageLoader } from '@/components/ui';
import { apiFetch, formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { InterventionWithRelations } from '@/types';
import { usePermissions } from '@/lib/permissions-context';
import { isEmployeeRole } from '@/lib/permissions';

const STATUS_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'Planifié' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINE', label: 'Terminé' },
  { value: 'INVOICED', label: 'Facturé' },
  { value: 'PAID', label: 'Payé' },
];

export default function InterventionsPage() {
  const router = useRouter();
  const perms = usePermissions();
  const isEmp = isEmployeeRole(perms);
  const [interventions, setInterventions] = useState<InterventionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback((q: string, status: string) => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (status) params.set('status', status);
    apiFetch<{ data: InterventionWithRelations[] }>(`/api/interventions?${params}`)
      .then((r) => setInterventions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData('', ''); }, [fetchData]);

  useEffect(() => {
    const t = setTimeout(() => fetchData(search, statusFilter), 300);
    return () => clearTimeout(t);
  }, [search, statusFilter, fetchData]);

  const handleDelete = async (id: string, ref: string) => {
    if (!confirm(`Supprimer l'intervention ${ref} ?`)) return;
    try {
      await apiFetch(`/api/interventions/${id}`, { method: 'DELETE' });
      toast.success('Intervention supprimée');
      setInterventions((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Interventions</h1>
          <p className="page-subtitle">{interventions.length} intervention{interventions.length > 1 ? 's' : ''}</p>
        </div>
        {!isEmp && (
          <div className="flex gap-2">
            <Button variant="secondary" href="/api/interventions/export" download onClick={() => toast.success('Téléchargement en cours...')}><Download className="w-4 h-4" /> Exporter</Button>
            <Button href="/interventions/new"><Plus className="w-4 h-4" /> Nouvelle intervention</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${statusFilter === f.value ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {interventions.length === 0 && !search && !statusFilter ? (
        <EmptyState
          icon={FileText}
          title="Aucune intervention"
          description={isEmp ? "Aucune intervention ne vous est assignée." : "Créez votre première fiche d'intervention."}
          action={!isEmp ? <Button href="/interventions/new"><Plus className="w-4 h-4" /> Créer une intervention</Button> : undefined}
        />
      ) : interventions.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">Aucun résultat</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {interventions.map((inv) => (
              <div key={inv.id} className="card p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => router.push(`/interventions/${inv.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{inv.title}</p>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{inv.reference}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{inv.client.firstName} {inv.client.lastName}</span>
                    <span>{formatDate(inv.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEmp && <span className="text-sm font-semibold text-zinc-700">{formatCurrency(inv.amountTTC)}</span>}
                    {!isEmp && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(inv.id, inv.reference); }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <Card padding={false} className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Réf.</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Titre</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Client</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Date</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Statut</th>
                    {!isEmp && <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">TTC</th>}
                    {!isEmp && <th className="px-5 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {interventions.map((inv) => (
                    <tr key={inv.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                      onClick={() => router.push(`/interventions/${inv.id}`)}>
                      <td className="px-5 py-3.5 text-zinc-500 font-mono text-xs">{inv.reference}</td>
                      <td className="px-5 py-3.5 font-medium text-zinc-900 max-w-[200px] truncate">{inv.title}</td>
                      <td className="px-5 py-3.5 text-zinc-500">{inv.client.firstName} {inv.client.lastName}</td>
                      <td className="px-5 py-3.5 text-zinc-500">{formatDate(inv.date)}</td>
                      <td className="px-5 py-3.5 text-center"><StatusBadge status={inv.status} /></td>
                      {!isEmp && <td className="px-5 py-3.5 text-right font-semibold text-zinc-700">{formatCurrency(inv.amountTTC)}</td>}
                      {!isEmp && (
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleDelete(inv.id, inv.reference)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
