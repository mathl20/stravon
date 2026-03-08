'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  X, Play, Pause, Square, Package, Camera, List, MessageSquare,
  Plus, Trash2, Receipt, PenTool, ArrowLeft, Clock, Check, Loader2, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, formatCurrency } from '@/lib/utils';
import { SignaturePad } from '@/components/interventions/signature-pad';

// ─── Types ───
interface InterventionData {
  id: string;
  reference: string;
  title: string;
  status: string;
  client: { firstName: string; lastName: string };
  photos: { id: string; data: string; label?: string }[];
  materiels: { id: string; nom: string; quantite: number; prixUnitaire: number }[];
  notes: string | null;
}

interface TimerData {
  state: 'idle' | 'running' | 'paused';
  startTime: number;
  pausedElapsed: number;
}

// ─── Helpers ───
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const MAX_DIM = 1200;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > maxSize * 1.37 && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Component ───
export default function ChantierPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Data
  const [inv, setInv] = useState<InterventionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Timer
  const STORAGE_KEY = `chantier-${id}`;
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);

  // UI
  const [screen, setScreen] = useState<'main' | 'summary'>('main');
  const [showMaterial, setShowMaterial] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [matNom, setMatNom] = useState('');
  const [matQte, setMatQte] = useState('1');
  const [matPrix, setMatPrix] = useState('');
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Load intervention
  useEffect(() => {
    apiFetch<{ data: InterventionData }>(`/api/interventions/${id}`)
      .then((r) => {
        setInv(r.data);
        setNoteText(r.data.notes || '');
      })
      .catch(() => setError('Intervention introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  // Restore timer from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: TimerData = JSON.parse(saved);
        if (data.state === 'running') {
          startTimeRef.current = data.startTime;
          pausedElapsedRef.current = data.pausedElapsed;
          setTimerState('running');
          setElapsed(Math.floor((Date.now() - data.startTime) / 1000) + data.pausedElapsed);
        } else if (data.state === 'paused') {
          pausedElapsedRef.current = data.pausedElapsed;
          setTimerState('paused');
          setElapsed(data.pausedElapsed);
        }
      }
    } catch {}
  }, [STORAGE_KEY]);

  // Timer tick
  useEffect(() => {
    if (timerState !== 'running') return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerState]);

  // Persist timer
  const saveTimer = useCallback((state: 'idle' | 'running' | 'paused', startTime: number, pausedElapsed: number) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, startTime, pausedElapsed }));
  }, [STORAGE_KEY]);

  // Timer controls
  const handleStart = () => {
    startTimeRef.current = Date.now();
    pausedElapsedRef.current = 0;
    setTimerState('running');
    setElapsed(0);
    saveTimer('running', startTimeRef.current, 0);
    // Update intervention status to EN_COURS
    apiFetch(`/api/interventions/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'EN_COURS' }) }).catch(() => {});
  };

  const handlePause = () => {
    const currentElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current;
    pausedElapsedRef.current = currentElapsed;
    setTimerState('paused');
    setElapsed(currentElapsed);
    saveTimer('paused', 0, currentElapsed);
  };

  const handleResume = () => {
    startTimeRef.current = Date.now();
    setTimerState('running');
    saveTimer('running', startTimeRef.current, pausedElapsedRef.current);
  };

  const handleFinish = async () => {
    if (!confirm('Terminer cette intervention ?')) return;
    setSubmitting(true);
    try {
      const totalHours = Math.round((elapsed / 3600) * 100) / 100;
      const today = new Date().toISOString().split('T')[0];

      // Create timesheet entry
      await apiFetch('/api/feuilles-heures', {
        method: 'POST',
        body: JSON.stringify({
          date: today,
          heuresTravaillees: Math.max(totalHours, 0.5),
          interventionId: id,
        }),
      });

      // Update intervention status
      await apiFetch(`/api/interventions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'TERMINE' }),
      });

      // Save notes if changed
      if (noteText !== (inv?.notes || '')) {
        await apiFetch(`/api/interventions/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ notes: noteText }),
        });
      }

      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      setTimerState('done');
      setScreen('summary');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Material
  const addMaterial = async () => {
    if (!matNom.trim()) { toast.error('Nom requis'); return; }
    try {
      const res = await apiFetch<{ data: any }>(`/api/interventions/${id}/materiels`, {
        method: 'POST',
        body: JSON.stringify({ nom: matNom, quantite: Number(matQte) || 1, prixUnitaire: Number(matPrix) || 0 }),
      });
      setInv((prev) => prev ? { ...prev, materiels: [...prev.materiels, res.data] } : prev);
      setMatNom('');
      setMatQte('1');
      setMatPrix('');
      setShowMaterial(false);
      toast.success('Matériel ajouté');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const deleteMaterial = async (materielId: string) => {
    try {
      await apiFetch(`/api/interventions/${id}/materiels`, {
        method: 'DELETE',
        body: JSON.stringify({ materielId }),
      });
      setInv((prev) => prev ? { ...prev, materiels: prev.materiels.filter((m) => m.id !== materielId) } : prev);
    } catch {
      toast.error('Erreur suppression');
    }
  };

  // Photo
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const data = await resizeImage(file, 500 * 1024);
      const res = await apiFetch<{ data: any }>(`/api/interventions/${id}/photos`, {
        method: 'POST',
        body: JSON.stringify({ data, label: '' }),
      });
      setInv((prev) => prev ? { ...prev, photos: [...prev.photos, res.data] } : prev);
      toast.success('Photo ajoutée');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  // Generate facture
  const handleGenerateFacture = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch<{ data: { id: string } }>(`/api/interventions/${id}/generate-facture`, { method: 'POST' });
      toast.success('Facture créée');
      router.push(`/factures/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading / Error ───
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-zinc-600">{error || 'Erreur'}</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-brand-600 font-medium">Retour</button>
        </div>
      </div>
    );
  }

  // ─── Summary Screen ───
  if (screen === 'summary') {
    const totalHours = Math.round((elapsed / 3600) * 100) / 100;
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <div className="bg-white border-b border-zinc-200 px-5 py-4">
          <div className="max-w-lg mx-auto">
            <h1 className="text-lg font-bold text-zinc-900">Intervention terminée</h1>
            <p className="text-sm text-zinc-500">{inv.title}</p>
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-auto w-full px-5 py-6 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 text-center">
              <Clock className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-zinc-900">{formatTime(elapsed)}</p>
              <p className="text-[11px] text-zinc-400">Durée</p>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 text-center">
              <Package className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-zinc-900">{inv.materiels.length}</p>
              <p className="text-[11px] text-zinc-400">Matériels</p>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 text-center">
              <Camera className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-zinc-900">{inv.photos.length}</p>
              <p className="text-[11px] text-zinc-400">Photos</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <Check className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-emerald-800">
              {totalHours}h enregistrées dans vos feuilles d&apos;heures
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGenerateFacture}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-brand-600 text-white font-semibold text-base hover:bg-brand-700 active:bg-brand-800 transition-colors disabled:opacity-50"
            >
              <Receipt className="w-5 h-5" />
              Créer la facture
            </button>

            <button
              onClick={() => setShowSignature(true)}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-zinc-900 text-white font-semibold text-base hover:bg-zinc-800 active:bg-zinc-700 transition-colors"
            >
              <PenTool className="w-5 h-5" />
              Faire signer le client
            </button>

            <button
              onClick={() => router.push(`/interventions/${id}`)}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-white border-2 border-zinc-200 text-zinc-700 font-semibold text-base hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour à l&apos;intervention
            </button>
          </div>
        </div>

        {showSignature && (
          <SignaturePad
            interventionId={id}
            onSaved={() => { setShowSignature(false); toast.success('Signature enregistrée !'); }}
            onClose={() => setShowSignature(false)}
          />
        )}
      </div>
    );
  }

  // ─── Main Screen ───
  const timerLabel = {
    idle: 'Prêt à démarrer',
    running: 'En cours',
    paused: 'En pause',
    done: 'Terminé',
  }[timerState];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-5 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push(`/interventions/${id}`)}
            className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0 hover:bg-zinc-200 active:bg-zinc-300 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-600" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-900 truncate">{inv.title}</p>
            <p className="text-xs text-zinc-400">{inv.client.firstName} {inv.client.lastName} · {inv.reference}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            timerState === 'running' ? 'bg-emerald-100 text-emerald-700' :
            timerState === 'paused' ? 'bg-amber-100 text-amber-700' :
            'bg-zinc-100 text-zinc-600'
          }`}>
            {timerLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-6 space-y-5">
        {/* Timer */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 text-center">
          <p className="text-6xl font-mono font-bold text-zinc-900 tracking-tight tabular-nums">
            {formatTime(elapsed)}
          </p>
          <p className="text-sm text-zinc-400 mt-2">{timerLabel}</p>

          <div className="flex gap-3 mt-6">
            {timerState === 'idle' && (
              <button
                onClick={handleStart}
                className="flex-1 flex items-center justify-center gap-2.5 py-5 rounded-2xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-lg shadow-emerald-200"
              >
                <Play className="w-6 h-6" />
                Démarrer
              </button>
            )}
            {timerState === 'running' && (
              <button
                onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-2.5 py-5 rounded-2xl bg-amber-500 text-white font-semibold text-lg hover:bg-amber-600 active:bg-amber-700 transition-colors shadow-lg shadow-amber-200"
              >
                <Pause className="w-6 h-6" />
                Pause
              </button>
            )}
            {timerState === 'paused' && (
              <>
                <button
                  onClick={handleResume}
                  className="flex-1 flex items-center justify-center gap-2.5 py-5 rounded-2xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
                >
                  <Play className="w-6 h-6" />
                  Reprendre
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowMaterial(true)}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-white border-2 border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
          >
            <Package className="w-6 h-6 text-zinc-500" />
            <span className="text-sm">Matériel</span>
            {inv.materiels.length > 0 && (
              <span className="text-xs text-zinc-400">{inv.materiels.length} ajouté{inv.materiels.length > 1 ? 's' : ''}</span>
            )}
          </button>

          <button
            onClick={() => photoRef.current?.click()}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-white border-2 border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
          >
            <Camera className="w-6 h-6 text-zinc-500" />
            <span className="text-sm">Photo</span>
            {inv.photos.length > 0 && (
              <span className="text-xs text-zinc-400">{inv.photos.length} prise{inv.photos.length > 1 ? 's' : ''}</span>
            )}
          </button>

          <button
            onClick={() => setShowRecap(!showRecap)}
            className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-2 font-medium transition-colors ${
              showRecap ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100'
            }`}
          >
            <List className="w-6 h-6" />
            <span className="text-sm">Récap</span>
          </button>

          <button
            onClick={() => setShowNote(true)}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-white border-2 border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
          >
            <MessageSquare className="w-6 h-6 text-zinc-500" />
            <span className="text-sm">Note</span>
            {noteText && <span className="text-xs text-zinc-400">Ajoutée</span>}
          </button>
        </div>

        {/* Recap inline */}
        {showRecap && (
          <div className="space-y-4 animate-fade-in">
            {/* Materials list */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-3">Matériels ({inv.materiels.length})</p>
              {inv.materiels.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucun matériel ajouté</p>
              ) : (
                <div className="space-y-2">
                  {inv.materiels.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-zinc-800">{m.nom}</p>
                        <p className="text-xs text-zinc-400">x{m.quantite} {m.prixUnitaire > 0 && `· ${formatCurrency(m.prixUnitaire)}`}</p>
                      </div>
                      <button onClick={() => deleteMaterial(m.id)} className="p-2 text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Photos grid */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-3">Photos ({inv.photos.length})</p>
              {inv.photos.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucune photo prise</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {inv.photos.map((p) => (
                    <img key={p.id} src={p.data} alt="" className="w-full h-24 object-cover rounded-xl border border-zinc-100" />
                  ))}
                </div>
              )}
            </div>

            {/* Note */}
            {noteText && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-4">
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-2">Note</p>
                <p className="text-sm text-zinc-700 whitespace-pre-wrap">{noteText}</p>
              </div>
            )}
          </div>
        )}

        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
      </div>

      {/* Finish button (sticky bottom) */}
      {(timerState === 'running' || timerState === 'paused') && (
        <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-5 py-4 pb-safe">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2.5 py-5 rounded-2xl bg-red-600 text-white font-semibold text-lg hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50 shadow-lg shadow-red-200"
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Square className="w-6 h-6" />}
              Terminer l&apos;intervention
            </button>
          </div>
        </div>
      )}

      {/* ─── Modals ─── */}

      {/* Material modal */}
      {showMaterial && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setShowMaterial(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6 space-y-4 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900">Ajouter matériel</h3>
              <button onClick={() => setShowMaterial(false)} className="p-2 text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-600 mb-1 block">Nom du matériel</label>
              <input
                autoFocus
                value={matNom}
                onChange={(e) => setMatNom(e.target.value)}
                placeholder="Ex: Tuyau PVC 32mm"
                className="w-full px-4 py-3.5 rounded-xl border border-zinc-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-zinc-600 mb-1 block">Quantité</label>
                <input
                  type="number"
                  value={matQte}
                  onChange={(e) => setMatQte(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3.5 rounded-xl border border-zinc-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-600 mb-1 block">Prix unit. (opt.)</label>
                <input
                  type="number"
                  value={matPrix}
                  onChange={(e) => setMatPrix(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3.5 rounded-xl border border-zinc-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <button
              onClick={addMaterial}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 text-white font-semibold text-base hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Note modal */}
      {showNote && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setShowNote(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6 space-y-4 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900">Note d&apos;intervention</h3>
              <button onClick={() => setShowNote(false)} className="p-2 text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
              placeholder="Remarques, observations..."
              className="w-full px-4 py-3.5 rounded-xl border border-zinc-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={() => setShowNote(false)}
              className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-semibold text-base hover:bg-zinc-800 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Signature */}
      {showSignature && (
        <SignaturePad
          interventionId={id}
          onSaved={() => { setShowSignature(false); toast.success('Signature enregistrée !'); }}
          onClose={() => setShowSignature(false)}
        />
      )}
    </div>
  );
}
