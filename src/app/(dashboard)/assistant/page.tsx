'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Check, X, User, FileText, FileSignature, Receipt, CalendarDays, UserPlus, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface AIAction {
  type: string;
  [key: string]: unknown;
}

interface ActionResult {
  type: string;
  success: boolean;
  message: string;
  link?: string;
}

type Phase = 'input' | 'loading' | 'review' | 'executing' | 'done';

const ACTION_META: Record<string, { label: string; icon: typeof User; color: string }> = {
  create_client: { label: 'Créer client', icon: UserPlus, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  create_intervention: { label: 'Créer intervention', icon: FileText, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  create_devis: { label: 'Créer devis', icon: FileSignature, color: 'bg-violet-50 text-violet-700 border-violet-200' },
  create_facture: { label: 'Créer facture', icon: Receipt, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  create_planning: { label: 'Planning', icon: CalendarDays, color: 'bg-sky-50 text-sky-700 border-sky-200' },
  assign_employee: { label: 'Assignation', icon: User, color: 'bg-pink-50 text-pink-700 border-pink-200' },
};

function ActionCard({ action, index, onRemove }: { action: AIAction; index: number; onRemove: (i: number) => void }) {
  const meta = ACTION_META[action.type] || { label: action.type, icon: FileText, color: 'bg-zinc-50 text-zinc-600 border-zinc-200' };
  const Icon = meta.icon;

  const details: string[] = [];
  if (action.clientName) details.push(`Client: ${action.clientName}`);
  if (action.firstName && action.lastName) details.push(`${action.firstName} ${action.lastName}`);
  if (action.title) details.push(`${action.title}`);
  if (action.description) details.push(`${action.description}`);
  if (action.date) details.push(`Date: ${action.date}`);
  if (action.heureDebut) details.push(`${action.heureDebut} - ${action.heureFin || '?'}`);
  if (action.employeeName) details.push(`Employé: ${action.employeeName}`);
  if (action.address) details.push(`Adresse: ${action.address}`);
  if (action.phone) details.push(`Tél: ${action.phone}`);
  if (Array.isArray(action.items) && action.items.length > 0) {
    (action.items as any[]).forEach(it => {
      const price = Number(it.unitPrice) || 0;
      const qty = Number(it.quantity) || 1;
      details.push(`• ${it.description}${qty > 1 ? ` x${qty}` : ''}${price > 0 ? ` — ${(qty * price).toFixed(2)}€` : ''}`);
    });
  }

  return (
    <div className="border border-zinc-200 rounded-xl bg-white p-4 relative group">
      <button
        onClick={() => onRemove(index)}
        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
        title="Retirer cette action"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-800">{meta.label}</p>
          {details.map((d, i) => (
            <p key={i} className="text-xs text-zinc-500 mt-0.5 truncate">{d}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: ActionResult }) {
  const meta = ACTION_META[result.type] || { label: result.type, icon: FileText, color: 'bg-zinc-50 text-zinc-600 border-zinc-200' };
  const Icon = meta.icon;

  return (
    <div className={`border rounded-xl p-4 ${result.success ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${result.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
          {result.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-800">{result.message}</p>
          </div>
        </div>
        {result.link && (
          <Link href={result.link} className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 flex-shrink-0">
            Voir <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [phase, setPhase] = useState<Phase>('input');
  const [input, setInput] = useState('');
  const [actions, setActions] = useState<AIAction[]>([]);
  const [summary, setSummary] = useState('');
  const [results, setResults] = useState<ActionResult[]>([]);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (phase === 'input') inputRef.current?.focus();
  }, [phase]);

  const analyze = async () => {
    const prompt = input.trim();
    if (!prompt) return;

    setPhase('loading');
    setError('');

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const data = json.data;
      if (!data.actions || data.actions.length === 0) {
        setError(data.summary || 'Aucune action détectée. Reformulez votre demande.');
        setPhase('input');
        return;
      }

      setActions(data.actions);
      setSummary(data.summary || '');
      setPhase('review');
    } catch (err: any) {
      setError(err.message || 'Erreur');
      setPhase('input');
    }
  };

  const execute = async () => {
    if (actions.length === 0) return;
    setPhase('executing');

    try {
      const res = await fetch('/api/assistant/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setResults(json.data.results || []);
      setPhase('done');
    } catch (err: any) {
      setError(err.message || 'Erreur');
      setPhase('review');
    }
  };

  const removeAction = (index: number) => {
    setActions(prev => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setPhase('input');
    setInput('');
    setActions([]);
    setSummary('');
    setResults([]);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyze();
    }
  };

  const suggestions = [
    'Demain Julien répare une fuite chez Dupont à 9h et fait un devis chauffe-eau',
    'Crée un client Pierre Martin, 06 12 34 56 78, 5 rue de la Paix Paris',
    'Facture pose robinet 150€ chez Mme Bernard',
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Assistant IA</h1>
            <p className="text-xs text-zinc-500">Organisez votre entreprise en une phrase</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── INPUT PHASE ── */}
        {(phase === 'input' || phase === 'loading') && (
          <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-5">
              <Sparkles className="w-8 h-8 text-violet-500" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-800 mb-1">Que souhaitez-vous organiser ?</h2>
            <p className="text-sm text-zinc-500 mb-6 text-center max-w-md">
              Décrivez les tâches de la journée. L&apos;IA analysera et préparera toutes les actions pour validation.
            </p>

            {error && (
              <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="w-full mb-4">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: Demain Julien va réparer une fuite chez Dupont à 9h..."
                  rows={3}
                  disabled={phase === 'loading'}
                  className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-14 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  onClick={analyze}
                  disabled={!input.trim() || phase === 'loading'}
                  className="absolute bottom-3 right-3 w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand-200"
                >
                  {phase === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="w-full space-y-2">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Exemples</p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  disabled={phase === 'loading'}
                  className="w-full text-left px-4 py-3 text-xs text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── REVIEW PHASE ── */}
        {phase === 'review' && (
          <div className="max-w-2xl mx-auto px-6 py-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-800">Vérifiez avant de valider</h2>
              </div>
              {summary && <p className="text-sm text-zinc-500 ml-8">{summary}</p>}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-3 mb-6">
              {actions.map((action, i) => (
                <ActionCard key={i} action={action} index={i} onRemove={removeAction} />
              ))}
            </div>

            {actions.length === 0 && (
              <div className="text-center py-8 text-sm text-zinc-400">
                Toutes les actions ont été retirées.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Modifier
              </button>
              <button
                onClick={execute}
                disabled={actions.length === 0}
                className="flex-1 px-4 py-3 rounded-xl bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 transition-colors shadow-lg shadow-brand-200 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Valider ({actions.length} action{actions.length > 1 ? 's' : ''})
              </button>
            </div>
          </div>
        )}

        {/* ── EXECUTING PHASE ── */}
        {phase === 'executing' && (
          <div className="max-w-2xl mx-auto px-6 py-20 flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
            <p className="text-sm font-medium text-zinc-600">Création en cours...</p>
            <p className="text-xs text-zinc-400 mt-1">{actions.length} action{actions.length > 1 ? 's' : ''} à exécuter</p>
          </div>
        )}

        {/* ── DONE PHASE ── */}
        {phase === 'done' && (
          <div className="max-w-2xl mx-auto px-6 py-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-800">Terminé</h2>
            </div>

            <div className="space-y-3 mb-6">
              {results.map((result, i) => (
                <ResultCard key={i} result={result} />
              ))}
            </div>

            <button
              onClick={reset}
              className="w-full px-4 py-3 rounded-xl bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Nouvelle demande
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-100 bg-white px-6 py-2">
        <p className="text-[11px] text-zinc-400 text-center">
          Propulsé par Claude Haiku — Vos données restent privées
        </p>
      </div>
    </div>
  );
}
