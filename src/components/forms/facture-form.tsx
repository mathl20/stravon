'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { apiFetch, formatCurrency, calculateTTC } from '@/lib/utils';
import type { Client, Facture, FactureItem } from '@/types';

interface FactureFormProps {
  facture?: Facture & { items: FactureItem[] };
  defaultClientId?: string;
  defaultItems?: LineItem[];
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export function FactureForm({ facture, defaultClientId, defaultItems }: FactureFormProps) {
  const router = useRouter();
  const isEditing = !!facture;
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState({
    clientId: facture?.clientId || defaultClientId || '',
    date: facture?.date ? new Date(facture.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dateEcheance: facture?.dateEcheance ? new Date(facture.dateEcheance).toISOString().split('T')[0] : '',
    tvaRate: facture?.tvaRate ?? 20,
    conditionsPaiement: facture?.conditionsPaiement || '',
    mentionsLegales: facture?.mentionsLegales || '',
    notes: facture?.notes || '',
    interventionId: (facture as any)?.interventionId || '',
    devisId: (facture as any)?.devisId || '',
  });

  const [items, setItems] = useState<LineItem[]>(
    facture?.items?.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })) || defaultItems || [{ description: '', quantity: 1, unitPrice: 0 }]
  );

  useEffect(() => {
    apiFetch<{ data: Client[] }>('/api/clients').then((r) => setClients(r.data)).catch(() => {});
  }, []);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);

  const removeItem = (i: number) => {
    if (items.length > 1) setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
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
      const payload: Record<string, unknown> = {
        clientId: form.clientId,
        date: form.date,
        dateEcheance: form.dateEcheance || null,
        tvaRate: Number(form.tvaRate),
        conditionsPaiement: form.conditionsPaiement || null,
        mentionsLegales: form.mentionsLegales || null,
        notes: form.notes || null,
        items: items.map((it) => ({ ...it, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
      };

      if (form.interventionId) payload.interventionId = form.interventionId;
      if (form.devisId) payload.devisId = form.devisId;

      if (isEditing) {
        await apiFetch(`/api/factures/${facture.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Facture modifiée');
      } else {
        await apiFetch('/api/factures', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Facture créée');
      }
      router.push('/factures');
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
          <Input label="Date d'échéance" name="dateEcheance" type="date" value={form.dateEcheance} onChange={set('dateEcheance')} />
          <Input label="Taux TVA (%)" name="tvaRate" type="number" value={form.tvaRate} onChange={(e) => setForm((f) => ({ ...f, tvaRate: Number(e.target.value) }))} />
        </div>
      </div>

      {/* Hidden relational fields if present */}
      {form.interventionId && <input type="hidden" name="interventionId" value={form.interventionId} />}
      {form.devisId && <input type="hidden" name="devisId" value={form.devisId} />}

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Lignes de détail</h3>
          <Button type="button" variant="secondary" onClick={addItem} className="text-xs !px-3 !py-1.5">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-zinc-50/80 rounded-xl border border-zinc-100">
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
                  placeholder="Qte"
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
                  placeholder="Prix unit."
                  value={item.unitPrice}
                  onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))}
                  className="input-field text-sm text-right"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="w-24 py-2.5 text-sm font-medium text-zinc-700 text-right">
                {formatCurrency(item.quantity * item.unitPrice)}
              </div>
              <button type="button" onClick={() => removeItem(i)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors mt-0.5">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
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

      <Textarea label="Conditions de paiement" name="conditionsPaiement" value={form.conditionsPaiement} onChange={set('conditionsPaiement')} placeholder="Ex: Paiement à 30 jours" />
      <Textarea label="Mentions légales" name="mentionsLegales" value={form.mentionsLegales} onChange={set('mentionsLegales')} placeholder="Mentions légales obligatoires..." />
      <Textarea label="Notes internes" name="notes" value={form.notes} onChange={set('notes')} placeholder="Remarques, rappels..." />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{isEditing ? 'Enregistrer' : 'Créer la facture'}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
