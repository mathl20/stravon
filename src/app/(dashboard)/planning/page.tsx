'use client';

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { Button, Card, Input, PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import { canManagePlanning } from '@/lib/permissions';
import { usePermissions } from '@/lib/permissions-context';

interface PlanningEntry {
  id: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  statut: string;
  utilisateur: { id: string; firstName: string; lastName: string };
  intervention: { id: string; reference: string; title: string } | null;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
}

interface Intervention {
  id: string;
  reference: string;
  title: string;
}

const STATUT_COLORS: Record<string, string> = {
  PREVU: 'bg-sky-50 text-sky-700 border-sky-200',
  CONFIRME: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ANNULE: 'bg-red-50 text-red-700 border-red-200',
  CONGE_CONGE_PAYE: 'bg-blue-50 text-blue-700 border-blue-200',
  CONGE_MALADIE: 'bg-rose-50 text-rose-700 border-rose-200',
  CONGE_RTT: 'bg-violet-50 text-violet-700 border-violet-200',
  CONGE_SANS_SOLDE: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const STATUT_LABELS: Record<string, string> = {
  PREVU: 'Prévu',
  CONFIRME: 'Confirmé',
  ANNULE: 'Annulé',
  CONGE_CONGE_PAYE: 'Congé payé',
  CONGE_MALADIE: 'Maladie',
  CONGE_RTT: 'RTT',
  CONGE_SANS_SOLDE: 'Sans solde',
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
  // Extract HH:MM directly from ISO string to avoid timezone conversion issues
  const match = iso.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function PlanningPage() {
  const perms = usePermissions();
  const [entries, setEntries] = useState<PlanningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: toDateStr(new Date()),
    heureDebut: '08:00',
    heureFin: '17:00',
    utilisateurId: '',
    interventionId: '',
    statut: 'PREVU',
  });

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const fetchPlanning = () => {
    const from = toDateStr(weekStart);
    const to = toDateStr(weekEnd);

    apiFetch<{ data: PlanningEntry[] }>(`/api/planning?date_from=${from}&date_to=${to}`)
      .then((r) => setEntries(r.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchPlanning();
  }, [weekStart]);

  // Load team + interventions for the modal
  const manage = canManagePlanning(perms);
  useEffect(() => {
    if (!manage) return;
    Promise.all([
      apiFetch<{ data: TeamMember[] }>('/api/team'),
      apiFetch<{ data: Intervention[] }>('/api/interventions'),
    ])
      .then(([tRes, iRes]) => {
        setTeam(tRes.data);
        setInterventions(iRes.data);
        if (tRes.data.length > 0 && !form.utilisateurId) {
          setForm((f) => ({ ...f, utilisateurId: tRes.data[0].id }));
        }
      })
      .catch(() => toast.error('Impossible de charger l\'équipe ou les interventions'));
  }, [manage]);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce créneau ?')) return;
    try {
      await apiFetch(`/api/planning/${id}`, { method: 'DELETE' });
      toast.success('Créneau supprimé');
      setEntries((e) => e.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.heureFin <= form.heureDebut) {
      toast.error('L\'heure de fin doit être après l\'heure de début');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/planning', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Créneau créé');
      setShowModal(false);
      fetchPlanning();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));
  const goToday = () => setWeekStart(getMonday(new Date()));

  if (loading) return <PageLoader />;

  // Group entries by day
  const entriesByDay: Record<string, PlanningEntry[]> = {};
  for (const day of weekDays) {
    entriesByDay[toDateStr(day)] = [];
  }
  for (const entry of entries) {
    const key = toDateStr(new Date(entry.date));
    if (entriesByDay[key]) entriesByDay[key].push(entry);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Planning</h1>
          <p className="page-subtitle">
            Semaine du {weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au{' '}
            {weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden">
            <button onClick={prevWeek} className="p-2 hover:bg-zinc-100 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToday} className="px-3 py-2 text-xs font-medium hover:bg-zinc-100 transition-colors border-x border-zinc-200">
              Aujourd&apos;hui
            </button>
            <button onClick={nextWeek} className="p-2 hover:bg-zinc-100 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {manage && (
            <Button onClick={() => { setForm((f) => ({ ...f, date: toDateStr(new Date()) })); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> Nouveau créneau
            </Button>
          )}
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const key = toDateStr(day);
          const isToday = key === toDateStr(new Date());
          const dayEntries = entriesByDay[key] || [];

          return (
            <div key={key} className="min-h-[180px]">
              <div className={`text-xs font-semibold uppercase tracking-wide mb-2 px-1 ${isToday ? 'text-brand-600' : 'text-zinc-400'}`}>
                {formatDayHeader(day)}
              </div>
              <div className="space-y-1.5">
                {dayEntries.length === 0 ? (
                  <div className="text-center py-6 text-zinc-300 text-xs">—</div>
                ) : (
                  dayEntries.map((entry) => (
                    <Card key={entry.id} className="!p-2.5 !rounded-lg group relative">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 truncate">
                            {entry.utilisateur.firstName} {entry.utilisateur.lastName}
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {formatTime(entry.heureDebut)} – {formatTime(entry.heureFin)}
                          </p>
                          {entry.intervention && (
                            <p className="text-[11px] text-brand-600 truncate mt-0.5">
                              {entry.intervention.reference}
                            </p>
                          )}
                        </div>
                        {manage && (
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUT_COLORS[entry.statut] || 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                          {STATUT_LABELS[entry.statut] || entry.statut}
                        </span>
                      </div>
                    </Card>
                  ))
                )}
                {manage && (
                  <button
                    onClick={() => { setForm((f) => ({ ...f, date: key })); setShowModal(true); }}
                    className="w-full py-1.5 text-[11px] text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors"
                  >
                    + Ajouter
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <Card>
          <div className="text-center py-16">
            <CalendarDays className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Aucun créneau cette semaine</p>
          </div>
        </Card>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-fade-in">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Nouveau créneau</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Heure de début"
                  type="time"
                  value={form.heureDebut}
                  onChange={(e) => setForm((f) => ({ ...f, heureDebut: e.target.value }))}
                  required
                />
                <Input
                  label="Heure de fin"
                  type="time"
                  value={form.heureFin}
                  onChange={(e) => setForm((f) => ({ ...f, heureFin: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label-field">Utilisateur</label>
                <select
                  value={form.utilisateurId}
                  onChange={(e) => setForm((f) => ({ ...f, utilisateurId: e.target.value }))}
                  className="input-field"
                  required
                >
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Intervention (optionnel)</label>
                <select
                  value={form.interventionId}
                  onChange={(e) => setForm((f) => ({ ...f, interventionId: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Aucune</option>
                  {interventions.map((i) => (
                    <option key={i.id} value={i.id}>{i.reference} - {i.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Statut</label>
                <select
                  value={form.statut}
                  onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                  className="input-field"
                >
                  <option value="PREVU">Prévu</option>
                  <option value="CONFIRME">Confirmé</option>
                  <option value="ANNULE">Annulé</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={saving}>Créer</Button>
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
