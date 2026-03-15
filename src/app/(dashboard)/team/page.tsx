'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { UsersRound, Plus, X, Shield, RotateCcw } from 'lucide-react';
import { Button, Input, Card, PageLoader } from '@/components/ui';
import { apiFetch, capitalize, formatDate } from '@/lib/utils';
import { getRoleLabel, getRoleBadgeColor, ROLES, ALL_PERMISSIONS, DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { usePermissions } from '@/lib/permissions-context';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
}

const INVITE_ROLES = ROLES.filter((r) => r !== 'PATRON');

const PERMISSION_GROUPS = [
  {
    label: 'Clients',
    permissions: [
      { key: 'clients:view', label: 'Voir les clients' },
      { key: 'clients:manage', label: 'Créer / modifier' },
    ],
  },
  {
    label: 'Interventions',
    permissions: [
      { key: 'interventions:view', label: 'Voir les interventions' },
      { key: 'interventions:manage', label: 'Gérer toutes' },
    ],
  },
  {
    label: 'Devis',
    permissions: [
      { key: 'devis:view', label: 'Voir les devis' },
      { key: 'devis:manage', label: 'Créer / modifier' },
    ],
  },
  {
    label: 'Factures',
    permissions: [
      { key: 'factures:view', label: 'Voir les factures' },
      { key: 'factures:manage', label: 'Créer / modifier' },
    ],
  },
  {
    label: 'Planning',
    permissions: [
      { key: 'planning:view', label: 'Voir le planning' },
      { key: 'planning:manage', label: 'Modifier le planning' },
    ],
  },
{
    label: 'Feuilles d\'heures',
    permissions: [
      { key: 'timesheets:view', label: 'Voir toutes les feuilles' },
      { key: 'timesheets:manage', label: 'Valider les feuilles' },
    ],
  },
  {
    label: 'Autres',
    permissions: [
      { key: 'team:manage', label: 'Gérer l\'équipe' },
      { key: 'settings:manage', label: 'Paramètres entreprise' },
      { key: 'dashboard:revenue', label: 'Voir le CA global' },
      { key: 'profitability:view', label: 'Voir la rentabilité' },
    ],
  },
];

export default function TeamPage() {
  const userPerms = usePermissions();
  const isManager = hasPermission(userPerms, PERMISSIONS.TEAM_MANAGE);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYE' });

  // Permissions editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const fetchMembers = () => {
    apiFetch<{ data: TeamMember[] }>('/api/team')
      .then((r) => setMembers(r.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMembers(); }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Tous les champs sont requis');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/team', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Membre ajouté');
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYE' });
      setShowForm(false);
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const openPermissions = async (memberId: string) => {
    try {
      const r = await apiFetch<{ data: { effectivePermissions: string[] } }>(`/api/team/${memberId}/permissions`);
      setEditPerms(r.data.effectivePermissions);
      setEditingId(memberId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const togglePerm = (perm: string) => {
    setEditPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  const savePermissions = async () => {
    if (!editingId) return;
    setSavingPerms(true);
    try {
      await apiFetch(`/api/team/${editingId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: editPerms }),
      });
      toast.success('Permissions mises à jour');
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSavingPerms(false);
    }
  };

  const resetPermissions = async () => {
    if (!editingId) return;
    setSavingPerms(true);
    try {
      await apiFetch(`/api/team/${editingId}/permissions`, { method: 'DELETE' });
      toast.success('Permissions réinitialisées');
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSavingPerms(false);
    }
  };

  if (loading) return <PageLoader />;

  const editingMember = editingId ? members.find((m) => m.id === editingId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Équipe</h1>
          <p className="page-subtitle">{members.length} membre{members.length > 1 ? 's' : ''}</p>
        </div>
        {isManager && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X className="w-4 h-4" /> Annuler</> : <><Plus className="w-4 h-4" /> Ajouter un membre</>}
          </Button>
        )}
      </div>

      {/* Invite form */}
      {showForm && isManager && (
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <UsersRound className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Nouveau membre</h2>
              <p className="text-xs text-zinc-400">Il pourra se connecter avec son email et mot de passe</p>
            </div>
          </div>

          <form onSubmit={handleInvite} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Prénom" value={form.firstName} onChange={set('firstName')} required />
              <Input label="Nom" value={form.lastName} onChange={set('lastName')} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Email" type="email" value={form.email} onChange={set('email')} required placeholder="nom@entreprise.fr" autoComplete="off" />
              <Input label="Mot de passe" type="password" value={form.password} onChange={set('password')} required placeholder="8 caractères min." autoComplete="new-password" />
            </div>
            <div>
              <label className="label-field">Rôle</label>
              <div className="flex gap-3">
                {INVITE_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      form.role === r
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    {getRoleLabel(r)}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-1">
              <Button type="submit" loading={saving}>Ajouter le membre</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Permissions editor */}
      {editingId && editingMember && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Permissions — {capitalize(editingMember.firstName)} {capitalize(editingMember.lastName)}
                </h2>
                <p className="text-xs text-zinc-400">
                  Rôle : {getRoleLabel(editingMember.role)} — Cochez les permissions à accorder
                </p>
              </div>
            </div>
            <button onClick={() => setEditingId(null)} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label} className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/50">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">{group.label}</p>
                <div className="space-y-1.5">
                  {group.permissions.map((perm) => (
                    <label key={perm.key} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={editPerms.includes(perm.key)}
                        onChange={() => togglePerm(perm.key)}
                        className="w-4 h-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
            <Button onClick={savePermissions} loading={savingPerms}>Enregistrer</Button>
            <Button variant="secondary" onClick={resetPermissions} loading={savingPerms}>
              <RotateCcw className="w-4 h-4" /> Réinitialiser
            </Button>
            <span className="text-xs text-zinc-400 ml-2">Réinitialiser applique les permissions par défaut du rôle</span>
          </div>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Membre</th>
                <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Email</th>
                <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Rôle</th>
                <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Depuis</th>
                {isManager && <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3 px-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-zinc-50 last:border-0">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                        {m.firstName[0].toUpperCase()}{m.lastName[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-zinc-900">{capitalize(m.firstName)} {capitalize(m.lastName)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-sm text-zinc-500">{m.email}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border whitespace-nowrap ${getRoleBadgeColor(m.role)}`}>
                      {getRoleLabel(m.role)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-sm text-zinc-400">{formatDate(m.createdAt)}</td>
                  {isManager && (
                    <td className="py-3 px-3 text-right">
                      {m.role !== 'PATRON' && (
                        <button
                          onClick={() => openPermissions(m.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-600 hover:bg-violet-50 border border-violet-200 transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5" /> Permissions
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
