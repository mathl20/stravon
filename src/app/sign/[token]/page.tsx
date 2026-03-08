'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Check, Eraser, Zap, AlertCircle, Loader2 } from 'lucide-react';

interface InterventionData {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  address: string | null;
  date: string;
  amountHT: number;
  tvaRate: number;
  amountTTC: number;
  client: { firstName: string; lastName: string; address?: string; city?: string; postalCode?: string };
  company: { name: string; email?: string; phone?: string; address?: string; city?: string; postalCode?: string; logoUrl?: string };
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  materiels: { nom: string; quantite: number }[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

export default function SignaturePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<InterventionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signedAt, setSignedAt] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          if (json.signed) {
            setAlreadySigned(true);
            setSignedAt(json.signedAt);
          } else {
            setError(json.error || 'Lien invalide');
          }
          return;
        }
        setData(json.data);
      })
      .catch(() => setError('Impossible de charger les données'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution for retina
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
  }, [data]);

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

  const submit = async () => {
    if (!hasDrawn || submitting) return;
    setSubmitting(true);

    try {
      const canvas = canvasRef.current!;
      const signatureClient = canvas.toDataURL('image/png');

      const res = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureClient }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erreur');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  // ── Already signed ──
  if (alreadySigned) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Déjà signée</h1>
          <p className="text-sm text-zinc-500">
            Cette intervention a déjà été signée
            {signedAt && ` le ${formatDate(signedAt)}`}.
          </p>
        </div>
      </div>
    );
  }

  // ── Error ──
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

  // ── Success ──
  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Merci !</h1>
          <p className="text-sm text-zinc-500">
            Votre signature a bien été enregistrée. Vous pouvez fermer cette page.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const tva = data.amountTTC - data.amountHT;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900">{data.company.name}</p>
            {data.company.phone && <p className="text-xs text-zinc-400">{data.company.phone}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {/* Intervention info */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Intervention</p>
            <h1 className="text-lg font-bold text-zinc-900 mt-1">{data.title}</h1>
            <p className="text-sm text-zinc-500">{data.reference}</p>
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
          </div>

          {data.address && (
            <div className="text-sm">
              <p className="text-xs text-zinc-400">Adresse</p>
              <p className="font-medium text-zinc-900">{data.address}</p>
            </div>
          )}

          {data.description && (
            <div className="text-sm">
              <p className="text-xs text-zinc-400">Description</p>
              <p className="text-zinc-700">{data.description}</p>
            </div>
          )}
        </div>

        {/* Travaux réalisés */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-3">Travaux réalisés</p>
          <div className="space-y-2">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-50 last:border-0">
                <div className="flex-1">
                  <p className="text-zinc-800">{item.description}</p>
                  {item.quantity > 1 && <p className="text-xs text-zinc-400">x {item.quantity}</p>}
                </div>
                {item.total > 0 && <p className="font-medium text-zinc-700">{formatCurrency(item.total)}</p>}
              </div>
            ))}
          </div>

          {data.amountHT > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-100 space-y-1 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>HT</span><span>{formatCurrency(data.amountHT)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>TVA ({data.tvaRate}%)</span><span>{formatCurrency(tva)}</span>
              </div>
              <div className="flex justify-between font-bold text-zinc-900 text-base pt-1">
                <span>Total TTC</span><span>{formatCurrency(data.amountTTC)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Matériel */}
        {data.materiels.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-3">Matériel utilisé</p>
            <div className="space-y-1.5">
              {data.materiels.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-zinc-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 flex-shrink-0" />
                  <span>{m.nom}</span>
                  {m.quantite > 1 && <span className="text-zinc-400">x{m.quantite}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1">Signature du client</p>
          <p className="text-xs text-zinc-500 mb-4">Signez dans le cadre ci-dessous avec votre doigt</p>

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
              onClick={submit}
              disabled={!hasDrawn || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600 text-white font-semibold text-base hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-200"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              Signer et valider
            </button>
            <button
              onClick={clear}
              className="px-5 py-4 rounded-xl border-2 border-zinc-300 text-zinc-600 font-medium hover:bg-zinc-50 transition-colors"
            >
              <Eraser className="w-5 h-5" />
            </button>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 text-center pb-2">
          En signant, vous confirmez la bonne réalisation des travaux décrits ci-dessus.
        </p>
        <p className="text-[11px] text-zinc-400 text-center pb-4">
          Propulsé par <a href="https://stravon.fr" className="font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">STRAVON</a>
        </p>
      </div>
    </div>
  );
}
