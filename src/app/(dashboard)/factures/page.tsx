'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Receipt, Download } from 'lucide-react';
import { Button, Card, EmptyState, PageLoader } from '@/components/ui';
import { apiFetch, formatCurrency, formatDate, getFactureStatusLabel, getFactureStatusColor, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { FactureWithRelations } from '@/types';

const STATUS_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'ENVOYEE', label: 'Envoyée' },
  { value: 'PAIEMENT_DECLARE', label: 'Paiement déclaré' },
  { value: 'PAYEE', label: 'Payée' },
  { value: 'EN_RETARD', label: 'En retard' },
  { value: 'ANNULEE', label: 'Annulée' },
];

export default function FacturesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [factures, setFactures] = useState<FactureWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [generating, setGenerating] = useState(false);

  // Auto-generate facture from intervention
  useEffect(() => {
    const fromIntervention = searchParams.get('from_intervention');
    if (!fromIntervention) return;

    setGenerating(true);
    apiFetch<{ data: { id: string } }>(`/api/interventions/${fromIntervention}/generate-facture`, { method: 'POST' })
      .then((r) => {
        toast.success('Facture générée');
        router.replace(`/factures/${r.data.id}`);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la génération');
        setGenerating(false);
      });
  }, [searchParams, router]);

  const fetchData = useCallback((q: string, status: string) => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (status) params.set('status', status);
    apiFetch<{ data: FactureWithRelations[] }>(`/api/factures?${params}`)
      .then((r) => setFactures(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData('', ''); }, [fetchData]);

  useEffect(() => {
    const t = setTimeout(() => fetchData(search, statusFilter), 300);
    return () => clearTimeout(t);
  }, [search, statusFilter, fetchData]);

  if (generating) return <PageLoader />;
  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Factures</h1>
          <p className="page-subtitle">{factures.length} facture{factures.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" href="/api/factures/export" download onClick={() => toast.success('Téléchargement en cours...')}><Download className="w-4 h-4" /> Exporter</Button>
          <Button href="/factures/new"><Plus className="w-4 h-4" /> Nouvelle facture</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${statusFilter === f.value ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {factures.length === 0 && !search && !statusFilter ? (
        <EmptyState
          icon={Receipt}
          title="Aucune facture"
          description="Créez votre première facture."
          action={<Button href="/factures/new"><Plus className="w-4 h-4" /> Créer une facture</Button>}
        />
      ) : factures.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">Aucun résultat</p>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Numéro</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden md:table-cell">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden lg:table-cell">Échéance</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Montant TTC</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody>
                {factures.map((fac) => (
                  <tr key={fac.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                    onClick={() => router.push(`/factures/${fac.id}`)}>
                    <td className="px-5 py-3.5 text-zinc-500 font-mono text-xs">{fac.numero}</td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden md:table-cell">{fac.client.firstName} {fac.client.lastName}</td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden sm:table-cell">{formatDate(fac.date)}</td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden lg:table-cell">{fac.dateEcheance ? formatDate(fac.dateEcheance) : '—'}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-zinc-700">{formatCurrency(fac.amountTTC)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border', getFactureStatusColor(fac.status))}>
                        {getFactureStatusLabel(fac.status)}
                      </span>
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
