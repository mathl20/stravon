'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Check, X, Trash2, CalendarDays, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { Button, Card, PageLoader } from '@/components/ui';
import { apiFetch, formatDate } from '@/lib/utils';
import { canValidateTimesheets } from '@/lib/permissions';
import { usePermissions } from '@/lib/permissions-context';

interface DemandeConge {
  id: string;
  dateDebut: string;
  dateFin: string;
  type: string;
  commentaire: string | null;
  statut: string;
  reponse: string | null;
  dateReponse: string | null;
  demandeur: { id: string; firstName: string; lastName: string };
  validateur: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  CONGE_PAYE: 'Congé payé',
  MALADIE: 'Maladie',
  RTT: 'RTT',
  SANS_SOLDE: 'Sans solde',
};

const TYPE_COLORS: Record<string, string> = {
  CONGE_PAYE: 'bg-blue-50 text-blue-700 border-blue-200',
  MALADIE: 'bg-rose-50 text-rose-700 border-rose-200',
  RTT: 'bg-violet-50 text-violet-700 border-violet-200',
  SANS_SOLDE: 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

const STATUT_STYLES: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  ACCEPTE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REFUSE: 'bg-red-50 text-red-700 border-red-200',
};

const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  ACCEPTE: 'Accepté',
  REFUSE: 'Refusé',
};

function countBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday = 0
  const days: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export default function CongesPage() {
  const perms = usePermissions();
  const canManage = canValidateTimesheets(perms);

  const [demandes, setDemandes] = useState<DemandeConge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({ dateDebut: '', dateFin: '', type: 'CONGE_PAYE', commentaire: '' });

  // Response modal
  const [respondingTo, setRespondingTo] = useState<{ id: string; action: 'accepter' | 'refuser' } | null>(null);
  const [reponseText, setReponseText] = useState('');

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const fetchData = () => {
    apiFetch<{ data: DemandeConge[] }>('/api/conges')
      .then((r) => setDemandes(r.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    if (!form.dateDebut || !form.dateFin) { toast.error('Dates requises'); return; }
    setActionLoading(true);
    try {
      await apiFetch('/api/conges', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Demande envoyée');
      setShowForm(false);
      setForm({ dateDebut: '', dateFin: '', type: 'CONGE_PAYE', commentaire: '' });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setActionLoading(false); }
  };

  const handleResponse = async () => {
    if (!respondingTo) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/conges/${respondingTo.id}`, {
        method: 'PUT',
        body: JSON.stringify({ action: respondingTo.action, reponse: reponseText }),
      });
      toast.success(respondingTo.action === 'accepter' ? 'Demande acceptée' : 'Demande refusée');
      setRespondingTo(null);
      setReponseText('');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setActionLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette demande ?')) return;
    try {
      await apiFetch(`/api/conges/${id}`, { method: 'DELETE' });
      toast.success('Demande supprimée');
      setDemandes((d) => d.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  // Calendar data — accepted leaves
  const acceptedLeaves = demandes.filter((d) => d.statut === 'ACCEPTE');
  const calDays = getMonthDays(calYear, calMonth);
  const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  function getLeavesForDay(date: Date) {
    return acceptedLeaves.filter((d) => {
      const start = new Date(d.dateDebut);
      const end = new Date(d.dateFin);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const check = new Date(date);
      check.setHours(12, 0, 0, 0);
      return check >= start && check <= end;
    });
  }

  if (loading) return <PageLoader />;

  const pendingCount = demandes.filter((d) => d.statut === 'EN_ATTENTE').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Congés</h1>
          <p className="page-subtitle">
            {demandes.length} demande{demandes.length > 1 ? 's' : ''}
            {pendingCount > 0 && ` · ${pendingCount} en attente`}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvelle demande
        </Button>
      </div>

      {/* New request form */}
      {showForm && (
        <Card className="border-brand-200 bg-brand-50/30">
          <p className="text-sm font-semibold text-zinc-900 mb-3">Nouvelle demande de congé</p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Date de début</label>
                <input type="date" value={form.dateDebut}
                  onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
                  className="input-field text-sm w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Date de fin</label>
                <input type="date" value={form.dateFin}
                  onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))}
                  className="input-field text-sm w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Type de congé</label>
                <select value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="input-field text-sm w-full">
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              placeholder="Commentaire (optionnel)"
              value={form.commentaire}
              onChange={(e) => setForm((f) => ({ ...f, commentaire: e.target.value }))}
              rows={2}
              className="input-field text-sm w-full"
            />
            {form.dateDebut && form.dateFin && new Date(form.dateFin) >= new Date(form.dateDebut) && (
              <p className="text-xs text-zinc-500">
                {countBusinessDays(new Date(form.dateDebut), new Date(form.dateFin))} jour{countBusinessDays(new Date(form.dateDebut), new Date(form.dateFin)) > 1 ? 's' : ''} ouvré{countBusinessDays(new Date(form.dateDebut), new Date(form.dateFin)) > 1 ? 's' : ''}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button onClick={handleSubmit} disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                Envoyer la demande
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-3 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Response modal */}
      {respondingTo && (
        <Card className={respondingTo.action === 'accepter' ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'}>
          <p className="text-sm font-semibold text-zinc-900 mb-2">
            {respondingTo.action === 'accepter' ? 'Accepter la demande' : 'Refuser la demande'}
          </p>
          <textarea
            value={reponseText}
            onChange={(e) => setReponseText(e.target.value)}
            placeholder="Commentaire (optionnel)"
            rows={2}
            className="input-field text-sm w-full mb-3"
          />
          <div className="flex items-center gap-2">
            <button onClick={handleResponse} disabled={actionLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
                respondingTo.action === 'accepter' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {respondingTo.action === 'accepter' ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
            </button>
            <button onClick={() => { setRespondingTo(null); setReponseText(''); }}
              className="px-3 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Absence calendar */}
      {canManage && acceptedLeaves.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">Calendrier des absences</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); }}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-zinc-700 w-36 text-center">{MONTHS[calMonth]} {calYear}</span>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); }}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-zinc-400 uppercase py-1">{d}</div>
            ))}
            {calDays.map((date, i) => {
              if (!date) return <div key={`pad-${i}`} className="h-16" />;
              const leaves = getLeavesForDay(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div key={date.toISOString()} className={`h-16 border border-zinc-100 rounded-lg p-1 ${isWeekend ? 'bg-zinc-50' : ''} ${isToday ? 'ring-2 ring-brand-300' : ''}`}>
                  <span className={`text-[11px] font-medium ${isToday ? 'text-brand-600' : 'text-zinc-500'}`}>{date.getDate()}</span>
                  <div className="space-y-0.5 mt-0.5">
                    {leaves.slice(0, 2).map((l) => (
                      <div key={l.id} className={`text-[9px] truncate rounded px-1 py-0.5 font-medium border ${TYPE_COLORS[l.type] || TYPE_COLORS.CONGE_PAYE}`}>
                        {l.demandeur.firstName}
                      </div>
                    ))}
                    {leaves.length > 2 && (
                      <div className="text-[9px] text-zinc-400">+{leaves.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Requests list */}
      <Card>
        {demandes.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Aucune demande de congé</p>
            <button onClick={() => setShowForm(true)} className="text-sm text-brand-600 font-medium mt-2 inline-block hover:underline">
              Créer la première
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  {canManage && <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Employé</th>}
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Type</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Dates</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Jours</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Statut</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Commentaire</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {demandes.map((d) => {
                  const days = countBusinessDays(new Date(d.dateDebut), new Date(d.dateFin));
                  return (
                    <tr key={d.id} className="border-b border-zinc-50 last:border-0">
                      {canManage && (
                        <td className="py-3 px-3 text-sm text-zinc-700">{d.demandeur.firstName} {d.demandeur.lastName}</td>
                      )}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${TYPE_COLORS[d.type] || TYPE_COLORS.CONGE_PAYE}`}>
                          {TYPE_LABELS[d.type] || d.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm text-zinc-900">
                        {formatDate(d.dateDebut)} — {formatDate(d.dateFin)}
                      </td>
                      <td className="py-3 px-3 text-sm font-medium text-zinc-900">{days}j</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${STATUT_STYLES[d.statut] || STATUT_STYLES.EN_ATTENTE}`}>
                          {STATUT_LABELS[d.statut] || d.statut}
                        </span>
                        {d.reponse && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[150px]" title={d.reponse}>
                            <MessageSquare className="w-2.5 h-2.5 inline mr-0.5" />{d.reponse}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm text-zinc-500 max-w-[200px] truncate" title={d.commentaire || ''}>
                        {d.commentaire || '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && d.statut === 'EN_ATTENTE' && (
                            <>
                              <button
                                onClick={() => setRespondingTo({ id: d.id, action: 'accepter' })}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600 transition-colors"
                                title="Accepter"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRespondingTo({ id: d.id, action: 'refuser' })}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                                title="Refuser"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(d.statut === 'EN_ATTENTE' || canManage) && (
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
