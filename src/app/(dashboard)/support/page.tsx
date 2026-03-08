'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  user: { firstName: string; lastName: string };
  _count: { messages: number };
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; dot: string }> = {
  open: { label: 'Ouvert', icon: AlertCircle, dot: 'bg-blue-500' },
  in_progress: { label: 'En cours', icon: Clock, dot: 'bg-amber-500' },
  resolved: { label: 'Resolu', icon: CheckCircle, dot: 'bg-emerald-500' },
  closed: { label: 'Ferme', icon: XCircle, dot: 'bg-zinc-400' },
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  bug: 'Bug',
  billing: 'Facturation',
  feature: 'Suggestion',
  other: 'Autre',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTickets(data.tickets);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, message }),
      });
      if (!res.ok) throw new Error();
      toast.success('Ticket cree');
      setSubject('');
      setMessage('');
      setCategory('general');
      setShowForm(false);
      fetchTickets();
    } catch {
      toast.error('Erreur de creation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Support</h1>
          <p className="page-subtitle">Contactez-nous pour toute question ou probleme</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Nouveau ticket
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6 animate-fade-up space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Nouveau ticket</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Sujet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Decrivez votre probleme en quelques mots"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Categorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                <option value="general">General</option>
                <option value="bug">Bug / Probleme technique</option>
                <option value="billing">Facturation / Abonnement</option>
                <option value="feature">Suggestion / Amelioration</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Decrivez votre probleme en detail..."
              rows={4}
              className="input-field resize-none"
              required
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Envoyer
            </button>
          </div>
        </form>
      )}

      {/* Tickets list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="font-medium text-zinc-700">Aucun ticket</p>
          <p className="text-sm text-zinc-400 mt-1">Creez un ticket pour contacter le support</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
            return (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="card p-4 flex items-center gap-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 truncate group-hover:text-brand-600 transition-colors">
                    {ticket.subject}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    <span>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                    <span className="w-px h-3 bg-zinc-200" />
                    <span>{status.label}</span>
                    <span className="w-px h-3 bg-zinc-200" />
                    <span>{new Date(ticket.updatedAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {ticket._count.messages}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
