'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, Trash2, Download } from 'lucide-react';
import { Button, Card, EmptyState, PageLoader } from '@/components/ui';
import { apiFetch, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ClientWithCount } from '@/types';
import { usePermissions } from '@/lib/permissions-context';
import { isEmployeeRole } from '@/lib/permissions';

export default function ClientsPage() {
  const router = useRouter();
  const perms = usePermissions();
  const isEmp = isEmployeeRole(perms);
  const [clients, setClients] = useState<ClientWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchClients = useCallback((q: string) => {
    apiFetch<{ data: ClientWithCount[] }>(`/api/clients?search=${encodeURIComponent(q)}`)
      .then((r) => setClients(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchClients(''); }, [fetchClients]);

  useEffect(() => {
    const t = setTimeout(() => fetchClients(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchClients]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le client ${name} et toutes ses interventions ?`)) return;
    try {
      await apiFetch(`/api/clients/${id}`, { method: 'DELETE' });
      toast.success('Client supprimé');
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients.length} client{clients.length > 1 ? 's' : ''}</p>
        </div>
        {!isEmp && (
          <div className="flex gap-2">
            <Button variant="secondary" href="/api/clients/export" download onClick={() => toast.success('Téléchargement en cours...')}><Download className="w-4 h-4" /> Exporter</Button>
            <Button href="/clients/new"><Plus className="w-4 h-4" /> Nouveau client</Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Rechercher un client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {clients.length === 0 && !search ? (
        <EmptyState
          icon={Users}
          title="Aucun client"
          description={isEmp ? "Aucun client disponible." : "Créez votre premier client pour commencer à gérer vos interventions."}
          action={!isEmp ? <Button href="/clients/new"><Plus className="w-4 h-4" /> Créer un client</Button> : undefined}
        />
      ) : clients.length === 0 && search ? (
        <p className="text-sm text-zinc-400 text-center py-12">Aucun résultat pour &quot;{search}&quot;</p>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Nom</th>
                  {!isEmp && <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden sm:table-cell">Téléphone</th>}
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden md:table-cell">Ville</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Interventions</th>
                  {!isEmp && <th className="px-5 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                    onClick={() => router.push(`/clients/${c.id}`)}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-zinc-900">{c.firstName} {c.lastName}</p>
                      {!isEmp && c.email && <p className="text-xs text-zinc-400">{c.email}</p>}
                    </td>
                    {!isEmp && <td className="px-5 py-3.5 text-zinc-500 hidden sm:table-cell">{c.phone || '—'}</td>}
                    <td className="px-5 py-3.5 text-zinc-500 hidden md:table-cell">{c.city || '—'}</td>
                    <td className="px-5 py-3.5 text-center text-zinc-600 font-medium">{c._count.interventions}</td>
                    {!isEmp && (
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(c.id, `${c.firstName} ${c.lastName}`)}
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
      )}
    </div>
  );
}
