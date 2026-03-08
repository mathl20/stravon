'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Check, Eraser, AlertCircle, Loader2, FileText, ChevronDown, ChevronUp, X } from 'lucide-react';

interface DevisData {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  date: string;
  dateExpiration: string | null;
  amountHT: number;
  tvaRate: number;
  amountTTC: number;
  acomptePercent: number | null;
  conditionsPaiement: string | null;
  delaiTravaux: string | null;
  client: { firstName: string; lastName: string; address?: string; city?: string; postalCode?: string; email?: string; phone?: string };
  company: { name: string; email?: string; phone?: string; address?: string; city?: string; postalCode?: string; logoUrl?: string; primaryColor?: string; siret?: string };
  createdBy: { firstName: string; lastName: string };
  items: { description: string; quantity: number; unitPrice: number; total: number; type: string }[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

export default function DevisAcceptPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 flex items-center justify-center"><Loader2 className="w-8 h-8 text-zinc-400 animate-spin" /></div>}>
      <DevisAcceptContent />
    </Suspense>
  );
}

function DevisAcceptContent() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action');
  const [data, setData] = useState<DevisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [alreadyRefused, setAlreadyRefused] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [step, setStep] = useState<'review' | 'sign' | 'refuse' | 'success' | 'refused'>('review');
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch(`/api/devis/accept/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          if (json.accepted) {
            setAlreadyAccepted(true);
            setAcceptedAt(json.acceptedAt);
          } else if (json.refused) {
            setAlreadyRefused(true);
          } else {
            setError(json.error || 'Lien invalide');
          }
          return;
        }
        setData(json.data);
        // If user clicked "Refuser" in email, go directly to refuse step
        if (initialAction === 'refuse') {
          setStep('refuse');
        }
      })
      .catch(() => setError('Impossible de charger les données'))
      .finally(() => setLoading(false));
  }, [token, initialAction]);

  // Init canvas when entering sign step
  useEffect(() => {
    if (step !== 'sign') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [step]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    setHasDrawn(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const acceptWithoutSignature = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/devis/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erreur');
      }
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const acceptWithSignature = async () => {
    if (!hasDrawn || submitting) return;
    setSubmitting(true);
    try {
      const canvas = canvasRef.current!;
      const signatureClient = canvas.toDataURL('image/png');
      const res = await fetch(`/api/devis/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureClient }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erreur');
      }
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const refuseDevis = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/devis/accept/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motifRefus: motifRefus.trim() || null }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erreur');
      }
      setStep('refused');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  // Already accepted
  if (alreadyAccepted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Devis déjà accepté</h1>
          <p className="text-sm text-zinc-500">
            Ce devis a déjà été accepté{acceptedAt && ` le ${formatDate(acceptedAt)}`}.
          </p>
        </div>
      </div>
    );
  }

  // Already refused
  if (alreadyRefused) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Devis déjà refusé</h1>
          <p className="text-sm text-zinc-500">
            Ce devis a déjà été refusé.
          </p>
        </div>
      </div>
    );
  }

  // Error
  if (error && !data) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Lien invalide</h1>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  // Success (accepted)
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Devis accepté !</h1>
          <p className="text-sm text-zinc-500 mb-2">
            Votre devis a été accepté avec succès. L&apos;artisan a été notifié.
          </p>
          <p className="text-sm text-zinc-500">
            Vous pouvez fermer cette page.
          </p>
        </div>
      </div>
    );
  }

  // Refused confirmation
  if (step === 'refused') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <X className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Devis refusé</h1>
          <p className="text-sm text-zinc-500 mb-2">
            Le devis a bien été refusé. L&apos;artisan a été notifié.
          </p>
          <p className="text-sm text-zinc-500">
            Vous pouvez fermer cette page.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const brandColor = data.company.primaryColor || '#1b40f5';
  const tva = data.amountTTC - data.amountHT;
  const moTotal = data.items.filter(i => i.type === 'main_oeuvre').reduce((s, i) => s + i.total, 0);
  const matTotal = data.items.filter(i => i.type === 'materiel').reduce((s, i) => s + i.total, 0);
  const presTotal = data.items.filter(i => !i.type || i.type === 'prestation').reduce((s, i) => s + i.total, 0);

  // Refuse step
  if (step === 'refuse') {
    return (
      <div className="min-h-screen bg-zinc-50">
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
              <p className="text-xs text-zinc-400">Refus du devis {data.reference}</p>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1">Refuser le devis</p>

            <div className="text-sm text-zinc-700 mb-4 p-3 bg-zinc-50 rounded-xl">
              <p className="font-medium text-zinc-900">{data.title}</p>
              <p className="text-xs text-zinc-500 mt-1">Devis {data.reference} — {formatCurrency(data.amountTTC)} TTC</p>
            </div>

            {error && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Motif du refus <span className="text-zinc-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                value={motifRefus}
                onChange={(e) => setMotifRefus(e.target.value)}
                placeholder="Précisez la raison de votre refus..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 resize-none"
              />
            </div>

            <button
              onClick={refuseDevis}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-semibold text-base transition-colors shadow-lg disabled:opacity-50 bg-red-600 hover:bg-red-700"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <X className="w-5 h-5" />
              )}
              Confirmer le refus
            </button>

            <button
              onClick={() => setStep('review')}
              className="w-full mt-3 py-3 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Retour au devis
            </button>
          </div>

          <p className="text-[11px] text-zinc-400 text-center pb-4">
            Propulsé par <a href="https://stravon.fr" className="font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">STRAVON</a>
          </p>
        </div>
      </div>
    );
  }

  // Sign step
  if (step === 'sign') {
    return (
      <div className="min-h-screen bg-zinc-50">
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
              <p className="text-xs text-zinc-400">Signature du devis {data.reference}</p>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1">Signature du client</p>
            <p className="text-xs text-zinc-500 mb-4">Signez dans le cadre ci-dessous pour accepter le devis</p>

            <div className="text-sm text-zinc-700 mb-4 p-3 bg-zinc-50 rounded-xl">
              <p className="font-medium text-zinc-900">{data.client.firstName} {data.client.lastName}</p>
              <p className="text-xs text-zinc-500 mt-1">Devis {data.reference} — {formatCurrency(data.amountTTC)} TTC</p>
            </div>

            {error && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '200px' }}
              className="border-2 border-dashed border-zinc-300 rounded-xl bg-white cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={acceptWithSignature}
                disabled={!hasDrawn || submitting}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-white font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
                style={{ background: '#059669' }}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Signer et accepter
              </button>
              <button
                onClick={clear}
                className="px-5 py-4 rounded-xl border-2 border-zinc-300 text-zinc-600 font-medium hover:bg-zinc-50 transition-colors"
              >
                <Eraser className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setStep('review')}
              className="w-full mt-3 py-3 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Retour au devis
            </button>
          </div>

          <p className="text-[11px] text-zinc-400 text-center pb-2">
            En signant, vous acceptez les termes du devis {data.reference} et confirmez votre accord pour la réalisation des travaux décrits.
          </p>
          <p className="text-[11px] text-zinc-400 text-center pb-4">
            Propulsé par <a href="https://stravon.fr" className="font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">STRAVON</a>
          </p>
        </div>
      </div>
    );
  }

  // Review step (default)
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
        {/* Devis info */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Devis</p>
            <h1 className="text-lg font-bold text-zinc-900 mt-1">{data.title}</h1>
            <p className="text-sm text-zinc-500">{data.reference}</p>
          </div>

          {data.description && (
            <div className="text-sm">
              <p className="text-zinc-700 leading-relaxed">{data.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-zinc-400">Client</p>
              <p className="font-medium text-zinc-900">{data.client.firstName} {data.client.lastName}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Date</p>
              <p className="font-medium text-zinc-900">{formatDate(data.date)}</p>
            </div>
            {data.dateExpiration && (
              <div>
                <p className="text-xs text-zinc-400">Validité</p>
                <p className="font-medium text-zinc-900">{formatDate(data.dateExpiration)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-400">Rédigé par</p>
              <p className="font-medium text-zinc-900">{data.createdBy.firstName} {data.createdBy.lastName}</p>
            </div>
          </div>
        </div>

        {/* Financial summary */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-3">Résumé financier</p>

          {(moTotal > 0 || matTotal > 0) && (
            <div className="space-y-2 mb-4">
              {moTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    Main d&apos;oeuvre
                  </span>
                  <span className="font-medium">{formatCurrency(moTotal)}</span>
                </div>
              )}
              {matTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Matériel
                  </span>
                  <span className="font-medium">{formatCurrency(matTotal)}</span>
                </div>
              )}
              {presTotal > 0 && (moTotal > 0 || matTotal > 0) && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: brandColor }} />
                    Prestations
                  </span>
                  <span className="font-medium">{formatCurrency(presTotal)}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5 pt-3 border-t border-zinc-100">
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
            {data.acomptePercent != null && data.acomptePercent > 0 && (
              <>
                <div className="flex justify-between text-sm text-amber-600 pt-1">
                  <span>Acompte ({data.acomptePercent}%)</span>
                  <span className="font-medium">{formatCurrency(Math.round(data.amountTTC * data.acomptePercent) / 100)}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>Solde restant</span>
                  <span className="font-medium">{formatCurrency(data.amountTTC - Math.round(data.amountTTC * data.acomptePercent) / 100)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detail toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <span>Détail des prestations ({data.items.length} ligne{data.items.length > 1 ? 's' : ''})</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <div className="space-y-2">
              {data.items.map((item, i) => {
                const typeLabels: Record<string, string> = { main_oeuvre: 'MO', materiel: 'Mat.', prestation: 'Prest.' };
                const typeColors: Record<string, string> = { main_oeuvre: '#0284c7', materiel: '#d97706', prestation: brandColor };
                const t = item.type || 'prestation';
                return (
                  <div key={i} className="flex items-start justify-between text-sm py-2 border-b border-zinc-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold text-white flex-shrink-0"
                          style={{ background: typeColors[t] || brandColor }}
                        >
                          {typeLabels[t] || 'Prest.'}
                        </span>
                        <p className="text-zinc-800 truncate">{item.description}</p>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 ml-8">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-medium text-zinc-700 ml-3 flex-shrink-0">{formatCurrency(item.total)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Conditions */}
        {(data.conditionsPaiement || data.delaiTravaux) && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-3">Conditions</p>
            <div className="space-y-2 text-sm">
              {data.conditionsPaiement && (
                <div>
                  <span className="text-zinc-500">Paiement : </span>
                  <span className="text-zinc-800 font-medium">{data.conditionsPaiement}</span>
                </div>
              )}
              {data.delaiTravaux && (
                <div>
                  <span className="text-zinc-500">Délai des travaux : </span>
                  <span className="text-zinc-800 font-medium">{data.delaiTravaux}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => setStep('sign')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-semibold text-base transition-colors shadow-lg"
            style={{ background: '#059669' }}
          >
            <Check className="w-5 h-5" />
            Accepter et signer le devis
          </button>

          <button
            onClick={acceptWithoutSignature}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-zinc-300 text-zinc-700 font-medium text-sm hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Accepter sans signature
          </button>

          <button
            onClick={() => setStep('refuse')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Refuser le devis
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 text-center pb-2">
          En acceptant ce devis, vous confirmez votre accord pour la réalisation des travaux décrits ci-dessus aux conditions mentionnées.
        </p>
        <p className="text-[11px] text-zinc-400 text-center pb-4">
          Propulsé par <a href="https://stravon.fr" className="font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">STRAVON</a>
        </p>
      </div>
    </div>
  );
}
