'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, Trash2, Download } from 'lucide-react';
import { Button, Card, EmptyState, PageLoader } from '@/components/ui';
import { apiFetch, formatCurrency, formatDate, getDevisStatusLabel, getDevisStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { DevisWithRelations } from '@/types';

const STATUS_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'ENVOYE', label: 'Envoyé' },
  { value: 'ACCEPTE', label: 'Accepté' },
  { value: 'REFUSE', label: 'Refusé' },
  { value: 'FACTURE', label: 'Facturé' },
];

export default function DevisPage() {
  const router = useRouter();
  const [devisList, setDevisList] = useState<DevisWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback((q: string, status: string) => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (status) params.set('status', status);
    apiFetch<{ data: DevisWithRelations[] }>(`/api/devis?${params}`)
      .then((r) => setDevisList(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData('', ''); }, [fetchData]);

  useEffect(() => {
    const t = setTimeout(() => fetchData(search, statusFilter), 300);
    return () => clearTimeout(t);
  }, [search, statusFilter, fetchData]);

  const handleDelete = async (id: string, ref: string) => {
    if (!confirm(`Supprimer le devis ${ref} ?`)) return;
    try {
      await apiFetch(`/api/devis/${id}`, { method: 'DELETE' });
      toast.success('Devis supprimé');
      setDevisList((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Devis</h1>
          <p className="page-subtitle">{devisList.length} devis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" href="/api/devis/export" download onClick={() => toast.success('Téléchargement en cours...')}><Download className="w-4 h-4" /> Exporter</Button>
          <Button href="/devis/new"><Plus className="w-4 h-4" /> Nouveau devis</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${statusFilter === f.value ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {devisList.length === 0 && !search && !statusFilter ? (
        <EmptyState
          icon={FileText}
          title="Aucun devis"
          description="Créez votre premier devis."
          action={<Button href="/devis/new"><Plus className="w-4 h-4" /> Créer un devis</Button>}
        />
      ) : devisList.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">Aucun résultat</p>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Référence</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden md:table-cell">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Montant TTC</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Statut</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {devisList.map((devis) => (
                  <tr key={devis.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                    onClick={() => router.push(`/devis/${devis.id}`)}>
                    <td className="px-5 py-3.5 text-zinc-500 font-mono text-xs">{devis.reference}</td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden md:table-cell">{devis.client.firstName} {devis.client.lastName}</td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden sm:table-cell">{formatDate(devis.date)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-zinc-700">{formatCurrency(devis.amountTTC)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDevisStatusColor(devis.status)}`}>
                        {getDevisStatusLabel(devis.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(devis.id, devis.reference)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
