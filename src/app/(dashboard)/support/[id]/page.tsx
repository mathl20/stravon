'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Clock, CheckCircle, AlertCircle, XCircle, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  isAdmin: boolean;
  authorName: string | null;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  messages: Message[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: 'Ouvert', icon: AlertCircle, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  in_progress: { label: 'En cours', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  resolved: { label: 'Resolu', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  closed: { label: 'Ferme', icon: XCircle, color: 'text-zinc-500 bg-zinc-50 border-zinc-200' },
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  bug: 'Bug',
  billing: 'Facturation',
  feature: 'Suggestion',
  other: 'Autre',
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTicket(data.ticket);
    } catch {
      toast.error('Ticket introuvable');
      router.push('/support');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setReply('');
      fetchTicket();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) return null;

  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const StatusIcon = status.icon;
  const isClosed = ticket.status === 'closed';

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Back */}
      <Link href="/support" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Retour aux tickets
      </Link>

      {/* Header */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-zinc-500">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-medium ${status.color}`}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 font-medium">
                {CATEGORY_LABELS[ticket.category] || ticket.category}
              </span>
              <span>Cree le {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {ticket.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.isAdmin
                ? 'bg-white border border-zinc-200 rounded-tl-md'
                : 'bg-brand-600 text-white rounded-tr-md'
            }`}>
              <div className={`flex items-center gap-1.5 mb-1 text-[11px] font-medium ${
                msg.isAdmin ? 'text-zinc-500' : 'text-brand-200'
              }`}>
                {msg.isAdmin && <Shield className="w-3 h-3" />}
                {msg.authorName || 'Anonyme'}
                <span className="mx-1">·</span>
                {new Date(msg.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
              <p className={`text-sm whitespace-pre-wrap ${msg.isAdmin ? 'text-zinc-700' : 'text-white'}`}>
                {msg.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply */}
      {!isClosed ? (
        <form onSubmit={handleSend} className="card p-4">
          <div className="flex gap-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Votre reponse..."
              rows={2}
              className="input-field resize-none flex-1"
              required
            />
            <button type="submit" disabled={sending || !reply.trim()} className="btn-primary self-end shrink-0">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      ) : (
        <div className="card p-4 text-center text-sm text-zinc-500">
          Ce ticket est ferme. Creez un nouveau ticket si necessaire.
        </div>
      )}
    </div>
  );
}
