'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, Trash2, Download, Phone, Mail, Wrench } from 'lucide-react';
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
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {clients.map((c) => (
              <div key={c.id} className="card p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => router.push(`/clients/${c.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900">{c.firstName} {c.lastName}</p>
                    {c.city && <p className="text-xs text-zinc-400 mt-0.5">{c.city}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded-lg">
                    <Wrench className="w-3 h-3" />
                    {c._count.interventions}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-100">
                  {!isEmp && c.phone && (
                    <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
                      <Phone className="w-3 h-3" /> {c.phone}
                    </a>
                  )}
                  {!isEmp && c.email && (
                    <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:underline truncate">
                      <Mail className="w-3 h-3" /> {c.email}
                    </a>
                  )}
                  {!isEmp && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id, `${c.firstName} ${c.lastName}`); }}
                      className="ml-auto p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Nom</th>
                    {!isEmp && <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Téléphone</th>}
                    {!isEmp && <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Email</th>}
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Ville</th>
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
                      </td>
                      {!isEmp && <td className="px-5 py-3.5 text-zinc-500">{c.phone || '—'}</td>}
                      {!isEmp && <td className="px-5 py-3.5 text-zinc-500">{c.email || '—'}</td>}
                      <td className="px-5 py-3.5 text-zinc-500">{c.city || '—'}</td>
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
        </>
      )}
    </div>
  );
}
