'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, FileDown, Send, CheckCircle, XCircle, ArrowRightLeft, Bell, Clock, Mail, Receipt, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button, Card, PageLoader } from '@/components/ui';
import { apiFetch, formatCurrency, formatDate, getDevisStatusLabel, getDevisStatusColor } from '@/lib/utils';
import { canConvertDevis, canManageAllDevis, canManageFactures } from '@/lib/permissions';
import { usePermissions } from '@/lib/permissions-context';
import toast from 'react-hot-toast';
import type { DevisFull } from '@/types';

export default function DevisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const perms = usePermissions();
  const [devis, setDevis] = useState<DevisFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [generatingFacture, setGeneratingFacture] = useState(false);
  const [relancing, setRelancing] = useState(false);
  const [sending, setSending] = useState(false);
  const [company, setCompany] = useState<{ assuranceDecennaleNom?: string | null } | null>(null);

  useEffect(() => {
    apiFetch<{ data: DevisFull }>(`/api/devis/${id}`)
      .then((r) => setDevis(r.data))
      .catch(() => router.push('/devis'))
      .finally(() => setLoading(false));
    apiFetch<{ data: { assuranceDecennaleNom?: string | null } }>('/api/company')
      .then((r) => setCompany(r.data))
      .catch(() => {});
  }, [id, router]);

  const changeStatus = async (status: string) => {
    try {
      await apiFetch(`/api/devis/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      toast.success('Statut mis a jour');
      setDevis((prev) => prev ? { ...prev, status: status as DevisFull['status'] } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleConvert = async () => {
    if (!confirm('Convertir ce devis en intervention ? Cette action est irreversible.')) return;
    setConverting(true);
    try {
      const result = await apiFetch<{ data: { id: string } }>(`/api/devis/${id}/convert`, { method: 'POST' });
      toast.success('Devis converti en intervention');
      router.push(`/interventions/${result.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setConverting(false);
    }
  };

  const handleGenerateFacture = async () => {
    if (!confirm(`Transformer ce devis en facture pour ${devis?.client.firstName} ${devis?.client.lastName} ?\nMontant : ${formatCurrency(devis?.amountTTC || 0)} TTC`)) return;
    setGeneratingFacture(true);
    try {
      const result = await apiFetch<{ data: { id: string; numero: string } }>(`/api/devis/${id}/generate-facture`, { method: 'POST' });
      toast.success(`Facture ${result.data.numero} creee avec succes`);
      router.push(`/factures/${result.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setGeneratingFacture(false);
    }
  };

  if (loading || !devis) return <PageLoader />;

  const tva = devis.amountTTC - devis.amountHT;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => router.push('/devis')} className="btn-ghost !p-2"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{devis.reference}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDevisStatusColor(devis.status)}`}>
                {getDevisStatusLabel(devis.status)}
              </span>
            </div>
            <p className="page-subtitle">{devis.title}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Status transitions */}
          {devis.status === 'BROUILLON' && (
            <Button variant="secondary" onClick={() => changeStatus('ENVOYE')}>
              <Send className="w-4 h-4" /> Marquer envoye
            </Button>
          )}
          {devis.status === 'ENVOYE' && (
            <>
              <Button variant="brand" onClick={() => changeStatus('ACCEPTE')}>
                <CheckCircle className="w-4 h-4" /> Accepter
              </Button>
              <Button variant="secondary" onClick={() => changeStatus('REFUSE')}>
                <XCircle className="w-4 h-4" /> Refuser
              </Button>
            </>
          )}
          {devis.status === 'ACCEPTE' && canManageFactures(perms) && (
            <Button variant="brand" onClick={handleGenerateFacture} loading={generatingFacture}>
              <Receipt className="w-4 h-4" /> Transformer en facture
            </Button>
          )}
          {devis.status === 'ACCEPTE' && canConvertDevis(perms) && (
            <Button variant="secondary" onClick={handleConvert} loading={converting}>
              <ArrowRightLeft className="w-4 h-4" /> Convertir en intervention
            </Button>
          )}
          {devis.status === 'FACTURE' && (devis as any).facture && (
            <Button variant="brand" href={`/factures/${(devis as any).facture.id}`}>
              <ExternalLink className="w-4 h-4" /> Voir {(devis as any).facture.numero}
            </Button>
          )}

          {devis.client.email && (
            <Button variant="secondary" loading={sending} onClick={async () => {
              if (!confirm(`Envoyer le devis par email a ${devis.client.email} ?`)) return;
              setSending(true);
              try {
                const r = await apiFetch<{ message: string }>(`/api/devis/${id}/send`, { method: 'POST' });
                toast.success(r.message);
                if (devis.status === 'BROUILLON') setDevis(prev => prev ? { ...prev, status: 'ENVOYE' } : prev);
              } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
              finally { setSending(false); }
            }}>
              <Mail className="w-4 h-4" /> Envoyer au client
            </Button>
          )}

          <Button variant="secondary" href={`/api/devis/${id}/pdf`} target="_blank" rel="noreferrer"><FileDown className="w-4 h-4" /> PDF</Button>
          <Button variant="secondary" href={`/devis/${id}/edit`}><Pencil className="w-4 h-4" /> Modifier</Button>
        </div>
      </div>

      {/* Assurance décennale warning */}
      {company && !company.assuranceDecennaleNom && (
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Assurance decennale non renseignee</p>
            <p className="text-xs" style={{ color: '#9d9bab' }}>L&apos;assurance decennale est obligatoire pour les professionnels du BTP. Les informations n&apos;apparaitront pas sur le devis tant qu&apos;elles ne sont pas renseignees.</p>
          </div>
          <Link href="/settings" className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            Completer
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {devis.description && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{devis.description}</p>
            </Card>
          )}

          {/* Items table */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900">Details</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Description</th>
                  <th className="text-center px-5 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Qte</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Prix unit.</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                {devis.items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-50">
                    <td className="px-5 py-3 text-zinc-700">{item.description}</td>
                    <td className="px-5 py-3 text-center text-zinc-500">{item.quantity}</td>
                    <td className="px-5 py-3 text-right text-zinc-500">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-700">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-zinc-100 flex justify-end">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Total HT</span><span className="font-medium">{formatCurrency(devis.amountHT)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>TVA ({devis.tvaRate}%)</span><span className="font-medium">{formatCurrency(tva)}</span>
                </div>
                <div className="flex justify-between text-zinc-900 font-bold text-base pt-1.5 border-t border-zinc-200">
                  <span>Total TTC</span><span>{formatCurrency(devis.amountTTC)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {devis.notes && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Notes internes</h3>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{devis.notes}</p>
            </Card>
          )}

          {/* Conditions particulieres */}
          {devis.conditionsParticulieres && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Conditions particulieres</h3>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{devis.conditionsParticulieres}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Client</h3>
            <Link href={`/clients/${devis.client.id}`} className="block group">
              <p className="text-sm font-semibold text-zinc-900 group-hover:text-brand-600 transition-colors">
                {devis.client.firstName} {devis.client.lastName}
              </p>
              {devis.client.phone && <p className="text-xs text-zinc-500 mt-0.5">{devis.client.phone}</p>}
              {devis.client.email && <p className="text-xs text-zinc-500">{devis.client.email}</p>}
              {devis.client.city && <p className="text-xs text-zinc-400 mt-0.5">{devis.client.postalCode} {devis.client.city}</p>}
            </Link>
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Informations</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Date</span><span className="font-medium text-zinc-700">{formatDate(devis.date)}</span></div>
              {devis.dateExpiration && (
                <div className="flex justify-between"><span className="text-zinc-500">Expiration</span><span className="font-medium text-zinc-700">{formatDate(devis.dateExpiration)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-zinc-500">Cree par</span><span className="font-medium text-zinc-700">{devis.createdBy?.firstName} {devis.createdBy?.lastName}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Cree le</span><span className="font-medium text-zinc-700">{formatDate(devis.createdAt)}</span></div>
            </div>
          </Card>

          {/* Relances */}
          {devis.status === 'ENVOYE' && canManageAllDevis(perms) && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Relances</h3>
                {(() => {
                  const joursDepuis = Math.floor((Date.now() - new Date(devis.date).getTime()) / (1000 * 60 * 60 * 24));
                  if (joursDepuis >= 7) return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full"><Clock className="w-3 h-3" />{joursDepuis}j</span>;
                  return null;
                })()}
              </div>

              {/* Timeline */}
              {((devis as any).relances || []).length > 0 ? (
                <div className="space-y-2 mb-4">
                  {((devis as any).relances as any[]).map((r: any) => (
                    <div key={r.id} className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-zinc-700">Relance n°{r.numero}</p>
                        <p className="text-[11px] text-zinc-400">{formatDate(r.date)}</p>
                        {r.message && <p className="text-xs text-zinc-500 mt-0.5">{r.message}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 mb-4">Aucune relance envoyee</p>
              )}

              <button
                onClick={async () => {
                  setRelancing(true);
                  try {
                    const r = await apiFetch<{ message: string; count: number }>('/api/relances-devis/check', { method: 'POST' });
                    toast.success(r.message);
                    // Reload devis to get updated relances
                    const updated = await apiFetch<{ data: DevisFull }>(`/api/devis/${id}`);
                    setDevis(updated.data);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Erreur');
                  } finally {
                    setRelancing(false);
                  }
                }}
                disabled={relancing}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <Bell className="w-3.5 h-3.5" />
                {relancing ? 'Verification...' : 'Verifier les relances'}
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
