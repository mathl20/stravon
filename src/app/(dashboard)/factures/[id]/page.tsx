'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, FileDown, CreditCard, Receipt, Mail, Ban, FileX, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Card, PageLoader } from '@/components/ui';
import { apiFetch, formatCurrency, formatDate, getFactureStatusLabel, getFactureStatusColor, getModePaiementLabel, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { FactureFull } from '@/types';
import { PaymentModal } from '@/components/factures/payment-modal';

export default function FactureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [fac, setFac] = useState<FactureFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [sending, setSending] = useState(false);

  const reload = () => {
    apiFetch<{ data: FactureFull }>(`/api/factures/${id}`)
      .then((r) => setFac(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    apiFetch<{ data: FactureFull }>(`/api/factures/${id}`)
      .then((r) => setFac(r.data))
      .catch(() => router.push('/factures'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !fac) return <PageLoader />;

  const tva = fac.amountTTC - fac.amountHT;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => router.push('/factures')} className="btn-ghost !p-2"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{fac.numero}</h1>
              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border', getFactureStatusColor(fac.status))}>
                {getFactureStatusLabel(fac.status)}
              </span>
            </div>
            <p className="page-subtitle">Facture du {formatDate(fac.date)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(fac.status === 'EN_ATTENTE' || fac.status === 'ENVOYEE') && (
            <Button variant="brand" onClick={() => setShowPayment(true)}>
              <CreditCard className="w-4 h-4" /> Marquer payée
            </Button>
          )}
          {fac.status === 'PAIEMENT_DECLARE' && (
            <>
              <Button variant="brand" onClick={async () => {
                if (!confirm('Valider le paiement déclaré par le client ?')) return;
                try {
                  await apiFetch(`/api/factures/${id}/pay`, { method: 'PUT', body: JSON.stringify({ modePaiement: (fac as any).paymentDeclaredMethod || 'virement', datePaiement: (fac as any).paymentDeclaredAt || new Date().toISOString() }) });
                  toast.success('Paiement validé');
                  reload();
                } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
              }}>
                <CheckCircle2 className="w-4 h-4" /> Valider le paiement
              </Button>
              <Button variant="secondary" onClick={async () => {
                if (!confirm('Contester le paiement déclaré ? La facture repassera en attente et le client sera notifié.')) return;
                try {
                  await apiFetch(`/api/factures/${id}/contest-payment`, { method: 'POST' });
                  toast.success('Paiement contesté');
                  reload();
                } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
              }}>
                <XCircle className="w-4 h-4" /> Contester
              </Button>
            </>
          )}
          {fac.status === 'EN_RETARD' && (
            <Button variant="secondary" onClick={() => toast('Fonctionnalite de relance a venir')}>
              <Receipt className="w-4 h-4" /> Relancer
            </Button>
          )}
          {fac.client.email && (
            <Button variant="secondary" loading={sending} onClick={async () => {
              if (!confirm(`Envoyer la facture par email a ${fac.client.email} ?`)) return;
              setSending(true);
              try {
                const r = await apiFetch<{ message: string }>(`/api/factures/${id}/send`, { method: 'POST' });
                toast.success(r.message);
                reload();
              } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
              finally { setSending(false); }
            }}>
              <Mail className="w-4 h-4" /> Envoyer au client
            </Button>
          )}

          {/* Annuler / Avoir — only for non-cancelled, non-paid-by-avoir invoices */}
          {(fac.status === 'EN_ATTENTE' || fac.status === 'ENVOYEE' || fac.status === 'PAIEMENT_DECLARE' || fac.status === 'EN_RETARD' || fac.status === 'PAYEE') && (
            <Button variant="secondary" onClick={async () => {
              const action = fac.status === 'PAYEE' ? 'avoir' : 'annuler';
              const msg = fac.status === 'PAYEE'
                ? 'Creer un avoir pour annuler cette facture ? Un avoir (facture negative) sera genere.'
                : 'Annuler cette facture ? Cette action est irreversible.';
              if (!confirm(msg)) return;
              try {
                if (action === 'avoir') {
                  const r = await apiFetch<{ data: { id: string } }>(`/api/factures/${id}/avoir`, { method: 'POST' });
                  toast.success('Avoir cree');
                  router.push(`/factures/${r.data.id}`);
                } else {
                  await apiFetch(`/api/factures/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'ANNULEE' }) });
                  toast.success('Facture annulee');
                  setFac(prev => prev ? { ...prev, status: 'ANNULEE' } : prev);
                }
              } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
            }}>
              {fac.status === 'PAYEE' ? <><FileX className="w-4 h-4" /> Creer un avoir</> : <><Ban className="w-4 h-4" /> Annuler</>}
            </Button>
          )}

          <Button variant="secondary" href={`/api/factures/${id}/pdf`} target="_blank" rel="noreferrer"><FileDown className="w-4 h-4" /> PDF</Button>
          {/* Only show edit for EN_ATTENTE invoices */}
          {(fac.status === 'EN_ATTENTE' || fac.status === 'ENVOYEE') && (
            <Button variant="secondary" href={`/factures/${id}/edit`}><Pencil className="w-4 h-4" /> Modifier</Button>
          )}
        </div>
      </div>

      {fac.status === 'PAIEMENT_DECLARE' && (
        <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-violet-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-800">Paiement déclaré par le client</p>
            <p className="text-xs text-violet-600 mt-0.5">
              {fac.client.firstName} {fac.client.lastName} a déclaré avoir payé
              {(fac as any).paymentDeclaredMethod ? ` par ${getModePaiementLabel((fac as any).paymentDeclaredMethod)}` : ''}
              {(fac as any).paymentDeclaredAt ? ` le ${formatDate((fac as any).paymentDeclaredAt)}` : ''}.
              {(fac as any).paymentDeclaredReference ? ` Réf: ${(fac as any).paymentDeclaredReference}` : ''}
            </p>
          </div>
        </div>
      )}

      {fac.status === 'ANNULEE' && (
        <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-xl flex items-center gap-3">
          <Ban className="w-5 h-5 text-zinc-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-zinc-700">Facture annulee</p>
            <p className="text-xs text-zinc-500">Cette facture a ete annulee et ne peut plus etre modifiee. {(fac as any).factureAvoirId ? '' : 'Un avoir a ete genere.'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items table */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900">Lignes de facture</h3>
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
                {fac.items.map((item) => (
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
                  <span>Total HT</span><span className="font-medium">{formatCurrency(fac.amountHT)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>TVA ({fac.tvaRate}%)</span><span className="font-medium">{formatCurrency(tva)}</span>
                </div>
                <div className="flex justify-between text-zinc-900 font-bold text-base pt-1.5 border-t border-zinc-200">
                  <span>Total TTC</span><span>{formatCurrency(fac.amountTTC)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment info */}
          {fac.status === 'PAYEE' && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Paiement</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Mode de paiement</span>
                  <span className="font-medium text-zinc-700">{fac.modePaiement ? getModePaiementLabel(fac.modePaiement) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Date de paiement</span>
                  <span className="font-medium text-zinc-700">{fac.datePaiement ? formatDate(fac.datePaiement) : '—'}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Mention devis */}
          {(fac as any).mentionDevis && (
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
              <Receipt className="w-4 h-4 flex-shrink-0" />
              {(fac as any).mentionDevis}
            </div>
          )}

          {/* Conditions de paiement */}
          {fac.conditionsPaiement && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Conditions de paiement</h3>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{fac.conditionsPaiement}</p>
            </Card>
          )}

          {/* Mentions legales */}
          {fac.mentionsLegales && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Mentions legales</h3>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{fac.mentionsLegales}</p>
            </Card>
          )}

          {/* Notes */}
          {fac.notes && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Notes internes</h3>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{fac.notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Client */}
          <Card>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Client</h3>
            <Link href={`/clients/${fac.client.id}`} className="block group">
              <p className="text-sm font-semibold text-zinc-900 group-hover:text-brand-600 transition-colors">
                {fac.client.firstName} {fac.client.lastName}
              </p>
              {fac.client.phone && <p className="text-xs text-zinc-500 mt-0.5">{fac.client.phone}</p>}
              {fac.client.email && <p className="text-xs text-zinc-500">{fac.client.email}</p>}
              {fac.client.city && <p className="text-xs text-zinc-400 mt-0.5">{fac.client.postalCode} {fac.client.city}</p>}
            </Link>
          </Card>

          {/* Informations */}
          <Card>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Informations</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Date</span><span className="font-medium text-zinc-700">{formatDate(fac.date)}</span></div>
              {fac.dateEcheance && (
                <div className="flex justify-between"><span className="text-zinc-500">Échéance</span><span className="font-medium text-zinc-700">{formatDate(fac.dateEcheance)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-zinc-500">Créée le</span><span className="font-medium text-zinc-700">{formatDate(fac.createdAt)}</span></div>
              {fac.createdBy && (
                <div className="flex justify-between"><span className="text-zinc-500">Par</span><span className="font-medium text-zinc-700">{fac.createdBy.firstName} {fac.createdBy.lastName}</span></div>
              )}
            </div>
          </Card>

          {/* Linked intervention */}
          {fac.intervention && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Intervention liee</h3>
              <Link href={`/interventions/${fac.intervention.id}`} className="block group">
                <p className="text-sm font-semibold text-zinc-900 group-hover:text-brand-600 transition-colors">
                  {fac.intervention.reference}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{fac.intervention.title}</p>
              </Link>
            </Card>
          )}

          {/* Linked devis */}
          {fac.devis && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Devis d&apos;origine</h3>
              <Link href={`/devis/${fac.devis.id}`} className="block group">
                <p className="text-sm font-semibold text-zinc-900 group-hover:text-brand-600 transition-colors">
                  {(fac.devis as any).reference || 'Devis'}
                </p>
                {(fac.devis as any).title && <p className="text-xs text-zinc-500 mt-0.5">{(fac.devis as any).title}</p>}
                {(fac.devis as any).date && <p className="text-xs text-zinc-400 mt-0.5">Du {formatDate((fac.devis as any).date)}</p>}
              </Link>
            </Card>
          )}
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          factureId={id}
          onPaid={() => { setShowPayment(false); reload(); }}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
