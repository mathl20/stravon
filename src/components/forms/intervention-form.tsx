'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2, Wrench, Clock, Package } from 'lucide-react';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { apiFetch, formatCurrency, calculateTTC } from '@/lib/utils';
import type { Client, Intervention, InterventionItem } from '@/types';

interface InterventionFormProps {
  intervention?: Intervention & { items: InterventionItem[] };
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'prestation' | 'main_oeuvre' | 'materiel';
  prixAchat?: number | null;
  coefMarge?: number | null;
}

const LINE_TYPES = [
  { value: 'prestation', label: 'Prestation', color: 'bg-brand-100 text-brand-700', icon: Wrench },
  { value: 'main_oeuvre', label: "Main d'oeuvre", color: 'bg-blue-100 text-blue-700', icon: Clock },
  { value: 'materiel', label: 'Matériel', color: 'bg-amber-100 text-amber-700', icon: Package },
] as const;

export function InterventionForm({ intervention }: InterventionFormProps) {
  const router = useRouter();
  const isEditing = !!intervention;
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState({
    title: intervention?.title || '',
    description: intervention?.description || '',
    address: (intervention as any)?.address || '',
    date: intervention?.date ? new Date(intervention.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    clientId: intervention?.clientId || '',
    status: intervention?.status || 'PENDING',
    tvaRate: intervention?.tvaRate ?? 20,
    notes: intervention?.notes || '',
    heuresEstimees: (intervention as any)?.heuresEstimees ?? '',
  });

  const [items, setItems] = useState<LineItem[]>(
    intervention?.items?.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      type: ((it as any).type || 'prestation') as LineItem['type'],
      prixAchat: (it as any).prixAchat ?? null,
      coefMarge: (it as any).coefMarge ?? null,
    })) || [{ description: '', quantity: 1, unitPrice: 0, type: 'prestation' }]
  );

  useEffect(() => {
    apiFetch<{ data: Client[] }>('/api/clients').then((r) => setClients(r.data)).catch(() => {});
  }, []);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const addItem = (type: LineItem['type'] = 'prestation') => setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, type, prixAchat: null, coefMarge: type === 'materiel' ? 1.5 : null }]);

  const removeItem = (i: number) => {
    if (items.length > 1) setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, field: keyof LineItem, value: string | number | null) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: value };
      if (updated.type === 'materiel' && updated.prixAchat != null && updated.coefMarge != null) {
        if (field === 'prixAchat' || field === 'coefMarge') {
          updated.unitPrice = Math.round(updated.prixAchat * updated.coefMarge * 100) / 100;
        }
      }
      if (field === 'type' && value === 'materiel' && !updated.coefMarge) {
        updated.coefMarge = 1.5;
      }
      if (field === 'type' && value !== 'materiel') {
        updated.prixAchat = null;
        updated.coefMarge = null;
      }
      return updated;
    }));
  };

  const totalHT = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const totalTTC = calculateTTC(totalHT, form.tvaRate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Sélectionnez un client'); return; }
    if (items.some((it) => !it.description)) { toast.error('Renseignez toutes les descriptions'); return; }
    if (items.some((it) => it.unitPrice < 0 || it.quantity < 0)) { toast.error('Les prix et quantités doivent être positifs'); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        tvaRate: Number(form.tvaRate),
        heuresEstimees: form.heuresEstimees ? Number(form.heuresEstimees) : null,
        items: items.map((it) => ({ ...it, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
      };

      if (isEditing) {
        await apiFetch(`/api/interventions/${intervention.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Intervention modifiée');
      } else {
        await apiFetch('/api/interventions', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Intervention créée');
      }
      router.push('/interventions');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
{/* General info */}
      <div className="space-y-4">
        <Input label="Titre de l'intervention" name="title" value={form.title} onChange={set('title')} required placeholder="Ex: Fuite robinet cuisine" />
        <Input label="Adresse du chantier" name="address" value={form.address} onChange={set('address')} placeholder="Ex: 12 rue de la Paix, 75002 Paris" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Client"
            name="clientId"
            value={form.clientId}
            onChange={set('clientId')}
            placeholder="Sélectionner un client"
            options={clients.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))}
          />
          <Input label="Date" name="date" type="date" value={form.date} onChange={set('date')} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Statut"
            name="status"
            value={form.status}
            onChange={set('status')}
            options={[
              { value: 'PENDING', label: 'Planifié' },
              { value: 'EN_COURS', label: 'En cours' },
              { value: 'TERMINE', label: 'Terminé' },
              { value: 'INVOICED', label: 'Facturé' },
              { value: 'PAID', label: 'Payé' },
            ]}
          />
          <Input label="Taux TVA (%)" name="tvaRate" type="number" value={form.tvaRate} onChange={(e) => setForm((f) => ({ ...f, tvaRate: Number(e.target.value) }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Heures estimées" name="heuresEstimees" type="number" value={form.heuresEstimees} onChange={(e) => setForm((f) => ({ ...f, heuresEstimees: e.target.value }))} placeholder="Ex: 3.5" />
        </div>
        <Textarea label="Description" name="description" value={form.description} onChange={set('description')} placeholder="Détails de l'intervention…" />
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Lignes de détail</h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => addItem('prestation')} className="text-xs !px-3 !py-1.5">
              <Plus className="w-3.5 h-3.5" /> Ligne
            </Button>
            <Button type="button" variant="secondary" onClick={() => addItem('materiel')} className="text-xs !px-3 !py-1.5">
              <Package className="w-3.5 h-3.5" /> Matériel
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => {
            const lt = LINE_TYPES.find((t) => t.value === item.type) || LINE_TYPES[0];
            const isMateriel = item.type === 'materiel';
            const hasMargin = isMateriel && item.prixAchat != null && item.prixAchat > 0;
            const marginPercent = hasMargin && item.coefMarge ? Math.round((item.coefMarge - 1) * 100) : 0;
            return (
              <div key={i} className="p-4 bg-zinc-50/80 rounded-xl border border-zinc-100 space-y-2">
                <div className="flex items-start gap-3">
                  <select
                    value={item.type}
                    onChange={(e) => updateItem(i, 'type', e.target.value)}
                    className={`flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer ${lt.color}`}
                  >
                    {LINE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <div className="flex-1 min-w-0">
                    <input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(i, 'description', e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Qté"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                      className="input-field text-sm text-center"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder={isMateriel ? 'Prix revente' : 'Prix unit.'}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))}
                      className="input-field text-sm text-right"
                      min="0"
                      step="0.01"
                      readOnly={isMateriel && item.prixAchat != null && item.prixAchat > 0}
                    />
                  </div>
                  <div className="w-24 py-2.5 text-sm font-medium text-zinc-700 text-right">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </div>
                  <button type="button" onClick={() => removeItem(i)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors mt-0.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {isMateriel && (
                  <div className="flex items-center gap-3 ml-[72px]">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-zinc-400 whitespace-nowrap">Achat HT</label>
                      <input
                        type="number"
                        placeholder="Prix achat"
                        value={item.prixAchat ?? ''}
                        onChange={(e) => updateItem(i, 'prixAchat', e.target.value ? Number(e.target.value) : null)}
                        className="input-field text-xs text-right w-24"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-zinc-400 whitespace-nowrap">Coef.</label>
                      <input
                        type="number"
                        placeholder="1.5"
                        value={item.coefMarge ?? ''}
                        onChange={(e) => updateItem(i, 'coefMarge', e.target.value ? Number(e.target.value) : null)}
                        className="input-field text-xs text-center w-16"
                        min="1"
                        step="0.1"
                      />
                    </div>
                    {hasMargin && (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        +{marginPercent}% marge
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Total HT</span>
              <span className="font-medium">{formatCurrency(totalHT)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>TVA ({form.tvaRate}%)</span>
              <span className="font-medium">{formatCurrency(totalTTC - totalHT)}</span>
            </div>
            <div className="flex justify-between text-zinc-900 font-bold text-base pt-1.5 border-t border-zinc-200">
              <span>Total TTC</span>
              <span>{formatCurrency(totalTTC)}</span>
            </div>
          </div>
        </div>
      </div>

      <Textarea label="Notes internes" name="notes" value={form.notes} onChange={set('notes')} placeholder="Remarques, rappels…" />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{isEditing ? 'Enregistrer' : "Créer l'intervention"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
