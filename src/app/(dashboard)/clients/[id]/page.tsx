'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, FileText, Plus, FileSignature, Receipt, Camera } from 'lucide-react';
import { Button, Card, StatusBadge, PageLoader } from '@/components/ui';
import { apiFetch, formatCurrency, formatDate, getDevisStatusLabel, getDevisStatusColor } from '@/lib/utils';
import type { Client, InterventionWithRelations } from '@/types';

type ClientDetail = Client & {
  interventions: (InterventionWithRelations & { photos?: { id: string; data: string }[] })[];
  devis: any[];
  factures: any[];
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'interventions' | 'devis' | 'factures' | 'photos'>('interventions');

  useEffect(() => {
    apiFetch<{ data: ClientDetail }>(`/api/clients/${id}`)
      .then((r) => setClient(r.data))
      .catch(() => router.push('/clients'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !client) return <PageLoader />;

  const allPhotos = client.interventions.flatMap((inv) =>
    (inv.photos || []).map((p) => ({ ...p, interventionRef: inv.reference, interventionId: inv.id }))
  );

  const tabs = [
    { key: 'interventions' as const, label: 'Interventions', icon: FileText, count: client.interventions.length },
    { key: 'devis' as const, label: 'Devis', icon: FileSignature, count: client.devis?.length || 0 },
    { key: 'factures' as const, label: 'Factures', icon: Receipt, count: client.factures?.length || 0 },
    { key: 'photos' as const, label: 'Photos', icon: Camera, count: allPhotos.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/clients')} className="btn-ghost !p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <h1 className="page-title">{client.firstName} {client.lastName}</h1>
          <p className="page-subtitle">{client.email || 'Pas d\'email'} {client.phone ? `· ${client.phone}` : ''}</p>
        </div>
        <Button variant="secondary" href={`/clients/${id}/edit`}><Pencil className="w-4 h-4" /> Modifier</Button>
      </div>

      {/* Info card */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {[
            ['Adresse', client.address || '—'],
            ['Code postal', client.postalCode || '—'],
            ['Ville', client.city || '—'],
            ['Email', client.email || '—'],
            ['Téléphone', client.phone || '—'],
            ['Créé le', formatDate(client.createdAt)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-zinc-700 font-medium">{value}</p>
            </div>
          ))}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-zinc-600">{client.notes}</p>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 text-[10px] bg-zinc-100 text-zinc-600 rounded-full px-1.5 py-0.5">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Interventions tab */}
      {tab === 'interventions' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Interventions ({client.interventions.length})</h2>
            <Button variant="secondary" href="/interventions/new"><Plus className="w-4 h-4" /> Nouvelle</Button>
          </div>
          {client.interventions.length === 0 ? (
            <Card><p className="text-sm text-zinc-400 text-center py-8">Aucune intervention pour ce client</p></Card>
          ) : (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Réf.</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Titre</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden sm:table-cell">Date</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Statut</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.interventions.map((inv) => (
                      <tr key={inv.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                        onClick={() => router.push(`/interventions/${inv.id}`)}>
                        <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{inv.reference}</td>
                        <td className="px-5 py-3 font-medium text-zinc-900">{inv.title}</td>
                        <td className="px-5 py-3 text-zinc-500 hidden sm:table-cell">{formatDate(inv.date)}</td>
                        <td className="px-5 py-3 text-center"><StatusBadge status={inv.status} /></td>
                        <td className="px-5 py-3 text-right font-semibold text-zinc-700">{formatCurrency(inv.amountTTC)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Devis tab */}
      {tab === 'devis' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Devis ({client.devis?.length || 0})</h2>
            <Button variant="secondary" href="/devis/new"><Plus className="w-4 h-4" /> Nouveau devis</Button>
          </div>
          {!client.devis || client.devis.length === 0 ? (
            <Card><p className="text-sm text-zinc-400 text-center py-8">Aucun devis pour ce client</p></Card>
          ) : (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Réf.</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Titre</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden sm:table-cell">Date</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Statut</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.devis.map((d: any) => (
                      <tr key={d.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                        onClick={() => router.push(`/devis/${d.id}`)}>
                        <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{d.reference}</td>
                        <td className="px-5 py-3 font-medium text-zinc-900">{d.title}</td>
                        <td className="px-5 py-3 text-zinc-500 hidden sm:table-cell">{formatDate(d.date)}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDevisStatusColor(d.status)}`}>
                            {getDevisStatusLabel(d.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-zinc-700">{formatCurrency(d.amountTTC)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Factures tab */}
      {tab === 'factures' && (
        <>
          <h2 className="text-base font-semibold text-zinc-900">Factures ({client.factures?.length || 0})</h2>
          {!client.factures || client.factures.length === 0 ? (
            <Card><p className="text-sm text-zinc-400 text-center py-8">Aucune facture pour ce client</p></Card>
          ) : (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">N°</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden sm:table-cell">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden md:table-cell">Intervention</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Statut</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.factures.map((f: any) => (
                      <tr key={f.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                        onClick={() => router.push(`/factures/${f.id}`)}>
                        <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{f.numero}</td>
                        <td className="px-5 py-3 text-zinc-500 hidden sm:table-cell">{formatDate(f.date)}</td>
                        <td className="px-5 py-3 text-zinc-500 hidden md:table-cell">
                          {f.intervention ? (
                            <span className="text-brand-600">{f.intervention.reference}</span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-center"><StatusBadge status={f.status} /></td>
                        <td className="px-5 py-3 text-right font-semibold text-zinc-700">{formatCurrency(f.amountTTC)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Photos tab */}
      {tab === 'photos' && (
        <>
          <h2 className="text-base font-semibold text-zinc-900">Photos ({allPhotos.length})</h2>
          {allPhotos.length === 0 ? (
            <Card><p className="text-sm text-zinc-400 text-center py-8">Aucune photo</p></Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allPhotos.map((photo) => (
                <Link key={photo.id} href={`/interventions/${photo.interventionId}`} className="group">
                  <div className="aspect-square rounded-xl overflow-hidden border border-zinc-200 relative">
                    <img src={photo.data} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-[11px] text-white font-medium">{photo.interventionRef}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
