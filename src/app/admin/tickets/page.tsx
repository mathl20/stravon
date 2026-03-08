'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle,
  ChevronRight, Building2, Send, ArrowLeft, Loader2, Shield,
  AlertTriangle, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TicketRow {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  user: { firstName: string; lastName: string; email: string };
  company: { name: string };
  _count: { messages: number };
  messages: { createdAt: string; isAdmin: boolean; content: string }[];
}

interface TicketDetail {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  company: { name: string };
  messages: { id: string; content: string; isAdmin: boolean; authorName: string | null; createdAt: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  open: { label: 'Ouvert', dot: 'bg-blue-500' },
  in_progress: { label: 'En cours', dot: 'bg-amber-500' },
  resolved: { label: 'Resolu', dot: 'bg-emerald-500' },
  closed: { label: 'Ferme', dot: 'bg-zinc-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'text-zinc-500' },
  normal: { label: 'Normale', color: 'text-zinc-600' },
  high: { label: 'Haute', color: 'text-amber-600' },
  urgent: { label: 'Urgente', color: 'text-red-600' },
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  bug: 'Bug',
  billing: 'Facturation',
  feature: 'Suggestion',
  other: 'Autre',
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/tickets?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTickets(data.tickets);
      const countMap: Record<string, number> = {};
      data.counts.forEach((c: any) => { countMap[c.status] = c._count; });
      setCounts(countMap);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchTickets, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchTickets, search]);

  const openTicket = async (ticketId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedTicket(data.ticket);
    } catch {
      toast.error('Erreur');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success('Statut mis a jour');
      setSelectedTicket({ ...selectedTicket, status });
      fetchTickets();
    } catch {
      toast.error('Erreur');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updatePriority = async (priority: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      if (!res.ok) throw new Error();
      setSelectedTicket({ ...selectedTicket, priority });
      fetchTickets();
    } catch {
      toast.error('Erreur');
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply }),
      });
      if (!res.ok) throw new Error();
      setReply('');
      openTicket(selectedTicket.id);
      fetchTickets();
    } catch {
      toast.error('Erreur d\'envoi');
    } finally {
      setSending(false);
    }
  };

  const totalOpen = (counts.open || 0) + (counts.in_progress || 0);

  // Detail view
  if (selectedTicket) {
    const status = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.open;
    const priority = PRIORITY_CONFIG[selectedTicket.priority] || PRIORITY_CONFIG.normal;
    return (
      <div className="animate-fade-in">
        <button onClick={() => setSelectedTicket(null)} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour aux tickets
        </button>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Messages */}
          <div>
            <div className="card p-5 mb-4">
              <h1 className="text-lg font-bold text-zinc-900">{selectedTicket.subject}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-zinc-500">
                <span>{selectedTicket.user.firstName} {selectedTicket.user.lastName}</span>
                <span className="w-px h-3 bg-zinc-200" />
                <span>{selectedTicket.user.email}</span>
                <span className="w-px h-3 bg-zinc-200" />
                <span>{selectedTicket.company.name}</span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {selectedTicket.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.isAdmin
                      ? 'bg-brand-600 text-white rounded-tr-md'
                      : 'bg-white border border-zinc-200 rounded-tl-md'
                  }`}>
                    <div className={`flex items-center gap-1.5 mb-1 text-[11px] font-medium ${
                      msg.isAdmin ? 'text-brand-200' : 'text-zinc-500'
                    }`}>
                      {msg.isAdmin && <Shield className="w-3 h-3" />}
                      {msg.authorName || 'Anonyme'}
                      <span className="mx-1">·</span>
                      {new Date(msg.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <p className={`text-sm whitespace-pre-wrap ${msg.isAdmin ? 'text-white' : 'text-zinc-700'}`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply */}
            {selectedTicket.status !== 'closed' && (
              <form onSubmit={sendReply} className="card p-4">
                <div className="flex gap-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Repondre au client..."
                    rows={3}
                    className="input-field resize-none flex-1"
                    required
                  />
                  <button type="submit" disabled={sending || !reply.trim()} className="btn-brand self-end shrink-0">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Statut</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => updateStatus(key)}
                      disabled={updatingStatus || selectedTicket.status === key}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedTicket.status === key
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Priorite</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => updatePriority(key)}
                      disabled={selectedTicket.priority === key}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedTicket.priority === key
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Infos</p>
                <div className="space-y-2 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Categorie</span>
                    <span>{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Cree le</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Messages</span>
                    <span>{selectedTicket.messages.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Tickets Support</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {totalOpen > 0 ? `${totalOpen} ticket${totalOpen > 1 ? 's' : ''} en attente` : 'Aucun ticket en attente'}
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par sujet, email ou entreprise..."
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-1.5">
            {[
              { value: 'all', label: 'Tous' },
              { value: 'open', label: 'Ouverts' },
              { value: 'in_progress', label: 'En cours' },
              { value: 'resolved', label: 'Resolus' },
              { value: 'closed', label: 'Fermes' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {f.label}
                {f.value !== 'all' && counts[f.value] ? ` (${counts[f.value]})` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tickets */}
      {loading ? (
        <div className="card p-0">
          <div className="animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-zinc-50">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-100 rounded w-1/3" />
                  <div className="h-2.5 bg-zinc-50 rounded w-1/2" />
                </div>
                <div className="h-4 w-4 bg-zinc-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="font-medium text-zinc-700">Aucun ticket</p>
          <p className="text-sm text-zinc-400 mt-1">Les tickets des clients apparaitront ici</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden divide-y divide-zinc-50">
          {tickets.map((ticket) => {
            const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
            const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.normal;
            const lastMsg = ticket.messages[0];
            const waitingReply = lastMsg && !lastMsg.isAdmin && (ticket.status === 'open' || ticket.status === 'in_progress');
            return (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-brand-50/30 transition-colors text-left group"
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-zinc-900 truncate group-hover:text-brand-600 transition-colors">
                      {ticket.subject}
                    </p>
                    {waitingReply && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-semibold shrink-0">
                        En attente
                      </span>
                    )}
                    {ticket.priority === 'urgent' && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-semibold shrink-0">
                        Urgent
                      </span>
                    )}
                    {ticket.priority === 'high' && (
                      <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md font-semibold shrink-0">
                        Haute
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{ticket.company.name}</span>
                    <span className="w-px h-3 bg-zinc-200" />
                    <span>{ticket.user.firstName} {ticket.user.lastName}</span>
                    <span className="w-px h-3 bg-zinc-200" />
                    <span>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {ticket._count.messages}
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(ticket.updatedAt).toLocaleDateString('fr-FR')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-brand-500 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
