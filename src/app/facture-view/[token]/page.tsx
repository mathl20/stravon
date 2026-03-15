'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, FileText, FileDown, ChevronDown, ChevronUp, CheckCircle2, X, CreditCard } from 'lucide-react';

interface FactureData {
  id: string;
  numero: string;
  date: string;
  dateEcheance: string | null;
  status: string;
  amountHT: number;
  tvaRate: number;
  amountTTC: number;
  conditionsPaiement: string | null;
  mentionsLegales: string | null;
  notes: string | null;
  paymentDeclaredAt: string | null;
  paymentDeclaredMethod: string | null;
  client: { firstName: string; lastName: string; address?: string; city?: string; postalCode?: string; email?: string; phone?: string };
  company: { name: string; email?: string; phone?: string; address?: string; city?: string; postalCode?: string; logoUrl?: string; primaryColor?: string; siret?: string; tvaIntra?: string; formeJuridique?: string; capitalSocial?: string; rcs?: string };
  createdBy: { firstName: string; lastName: string };
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
}

const PAYMENT_METHODS = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'especes', label: 'Espèces' },
  { value: 'autre', label: 'Autre' },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

export default function FactureViewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<FactureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Payment declaration state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payMethod, setPayMethod] = useState('virement');
  const [payReference, setPayReference] = useState('');
  const [declaring, setDeclaring] = useState(false);
  const [declared, setDeclared] = useState(false);

  useEffect(() => {
    fetch(`/api/facture-view/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Lien invalide');
          return;
        }
        setData(json.data);
        if (json.data.paymentDeclaredAt || json.data.status === 'PAIEMENT_DECLARE' || json.data.status === 'PAYEE') {
          setDeclared(true);
        }
      })
      .catch(() => setError('Impossible de charger les données'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDeclarePayment = async () => {
    setDeclaring(true);
    try {
      const res = await fetch(`/api/facture-view/${token}/declare-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: payMethod, reference: payReference || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Erreur');
        return;
      }
      setDeclared(true);
      setShowPaymentModal(false);
      if (data) {
        setData({ ...data, status: 'PAIEMENT_DECLARE', paymentDeclaredAt: new Date().toISOString(), paymentDeclaredMethod: payMethod });
      }
    } catch {
      alert('Erreur de connexion');
    } finally {
      setDeclaring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Lien invalide</h1>
          <p className="text-sm text-zinc-500">{error || 'Ce lien de facture est invalide ou a expiré.'}</p>
        </div>
      </div>
    );
  }

  const brandColor = data.company.primaryColor || '#1b40f5';
  const tva = data.amountTTC - data.amountHT;
  const canDeclare = !declared && ['EN_ATTENTE', 'ENVOYEE', 'EN_RETARD'].includes(data.status);
  const methodLabel = PAYMENT_METHODS.find(m => m.value === data.paymentDeclaredMethod)?.label || data.paymentDeclaredMethod;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {data.company.logoUrl ? (
            <img src={data.company.logoUrl} alt="" className="h-8 object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: brandColor }}>
              <FileText className="w-4 h-4 text-white" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-zinc-900">{data.company.name}</p>
            {data.company.phone && <p className="text-xs text-zinc-400">{data.company.phone}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {/* Payment declared banner */}
        {declared && data.status !== 'PAYEE' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-800">Paiement déclaré</p>
              <p className="text-xs text-emerald-700 mt-1">
                {data.paymentDeclaredAt ? `Déclaré le ${formatDate(data.paymentDeclaredAt)}` : 'Déclaré avec succès'}
                {methodLabel ? ` par ${methodLabel}` : ''}.
                En attente de validation par {data.company.name}.
              </p>
            </div>
          </div>
        )}

        {data.status === 'PAYEE' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-800">Facture payée</p>
              <p className="text-xs text-emerald-700 mt-1">Le paiement de cette facture a été confirmé. Merci.</p>
            </div>
          </div>
        )}

        {/* Facture info */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Facture</p>
            <h1 className="text-lg font-bold text-zinc-900 mt-1">{data.numero}</h1>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-zinc-400">Client</p>
              <p className="font-medium text-zinc-900">{data.client.firstName} {data.client.lastName}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Date</p>
              <p className="font-medium text-zinc-900">{formatDate(data.date)}</p>
            </div>
            {data.dateEcheance && (
              <div>
                <p className="text-xs text-zinc-400">Échéance</p>
                <p className="font-medium text-zinc-900">{formatDate(data.dateEcheance)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-400">Émise par</p>
              <p className="font-medium text-zinc-900">{data.createdBy.firstName} {data.createdBy.lastName}</p>
            </div>
          </div>
        </div>

        {/* Financial summary */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-3">Résumé</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Total HT</span>
              <span className="font-medium">{formatCurrency(data.amountHT)}</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-500">
              <span>TVA ({data.tvaRate}%)</span>
              <span className="font-medium">{formatCurrency(tva)}</span>
            </div>
            <div className="flex justify-between font-bold text-zinc-900 text-lg pt-2 border-t border-zinc-200">
              <span>Total TTC</span>
              <span style={{ color: brandColor }}>{formatCurrency(data.amountTTC)}</span>
            </div>
          </div>
        </div>

        {/* Detail toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <span>Détail des lignes ({data.items.length} ligne{data.items.length > 1 ? 's' : ''})</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <div className="space-y-2">
              {data.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between text-sm py-2 border-b border-zinc-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-800">{item.description}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-medium text-zinc-700 ml-3 flex-shrink-0">{formatCurrency(item.total)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conditions */}
        {data.conditionsPaiement && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-3">Conditions de paiement</p>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{data.conditionsPaiement}</p>
          </div>
        )}

        {/* Mentions légales */}
        {data.mentionsLegales && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-3">Mentions légales</p>
            <p className="text-sm text-zinc-600 whitespace-pre-wrap">{data.mentionsLegales}</p>
          </div>
        )}

        {/* Confirm payment button */}
        {canDeclare && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-semibold text-base transition-colors shadow-lg"
            style={{ background: '#059669' }}
          >
            <CreditCard className="w-5 h-5" />
            Confirmer le paiement
          </button>
        )}

        {/* Download PDF */}
        <a
          href={`/api/factures/${data.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-semibold text-base transition-colors shadow-lg"
          style={{ background: brandColor }}
        >
          <FileDown className="w-5 h-5" />
          Télécharger le PDF
        </a>

        {/* Company info footer */}
        <div className="text-center space-y-1 pb-4">
          <p className="text-xs text-zinc-400">
            {data.company.name}
            {data.company.siret && ` — SIRET: ${data.company.siret}`}
            {data.company.tvaIntra && ` — TVA: ${data.company.tvaIntra}`}
          </p>
          {data.company.address && (
            <p className="text-xs text-zinc-400">
              {data.company.address}{data.company.postalCode ? `, ${data.company.postalCode}` : ''} {data.company.city || ''}
            </p>
          )}
          {data.company.email && (
            <p className="text-xs text-zinc-400">{data.company.email}</p>
          )}
          <p className="text-[11px] text-zinc-400 pt-2">
            Propulsé par <a href="https://stravon.fr" className="font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">STRAVON</a>
          </p>
        </div>
      </div>

      {/* Payment declaration modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in">
            <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900">Confirmer le paiement</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Vous confirmez avoir effectué le paiement de <strong>{formatCurrency(data.amountTTC)}</strong> pour la facture <strong>{data.numero}</strong> ?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Mode de paiement</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPayMethod(m.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        payMethod === m.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Référence de paiement <span className="text-zinc-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Ex: numéro de virement..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 bg-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeclarePayment}
                disabled={declaring}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#059669' }}
              >
                {declaring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
