'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button, Input, Card } from '@/components/ui';
import { apiFetch } from '@/lib/utils';

interface Intervention {
  id: string;
  reference: string;
  title: string;
}

interface FeuilleHeureData {
  id: string;
  date: string;
  heureDebut: string | null;
  heureFin: string | null;
  heuresTravaillees: number;
  panierRepas: boolean;
  zone: number | null;
  grandDeplacement: boolean;
  interventionId: string | null;
}

interface Props {
  initial?: FeuilleHeureData;
}

export function FeuilleHeureForm({ initial }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [form, setForm] = useState({
    date: initial?.date ? new Date(initial.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    heureDebut: initial?.heureDebut ?? '',
    heureFin: initial?.heureFin ?? '',
    heuresTravaillees: initial?.heuresTravaillees ?? 7,
    panierRepas: initial?.panierRepas ?? false,
    zone: initial?.zone ?? '',
    grandDeplacement: initial?.grandDeplacement ?? false,
    interventionId: initial?.interventionId ?? '',
  });

  // Auto-calculate duration from start/end
  const updateTime = (field: 'heureDebut' | 'heureFin', value: string) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      if (updated.heureDebut && updated.heureFin) {
        const [hd, md] = updated.heureDebut.split(':').map(Number);
        const [hf, mf] = updated.heureFin.split(':').map(Number);
        const diff = Math.max(0, (hf * 60 + mf - hd * 60 - md) / 60);
        updated.heuresTravaillees = Math.round(diff * 10) / 10;
      }
      return updated;
    });
  };

  useEffect(() => {
    apiFetch<{ data: Intervention[] }>('/api/interventions')
      .then((r) => setInterventions(r.data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        heureDebut: form.heureDebut || null,
        heureFin: form.heureFin || null,
        heuresTravaillees: Number(form.heuresTravaillees),
        panierRepas: form.panierRepas,
        zone: form.zone ? Number(form.zone) : null,
        grandDeplacement: form.grandDeplacement,
        interventionId: form.interventionId || '',
      };

      if (initial?.id) {
        await apiFetch(`/api/feuilles-heures/${initial.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Feuille modifiée');
      } else {
        await apiFetch('/api/feuilles-heures', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Feuille créée');
      }
      router.push('/feuilles-heures');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
          <Input
            label="Heures travaillées"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={String(form.heuresTravaillees)}
            onChange={(e) => setForm((f) => ({ ...f, heuresTravaillees: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Heure de début"
            type="time"
            value={form.heureDebut}
            onChange={(e) => updateTime('heureDebut', e.target.value)}
          />
          <Input
            label="Heure de fin"
            type="time"
            value={form.heureFin}
            onChange={(e) => updateTime('heureFin', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Zone (1-5, optionnel)"
            type="number"
            min="1"
            max="5"
            value={String(form.zone)}
            onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
          />
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
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.panierRepas}
              onChange={(e) => setForm((f) => ({ ...f, panierRepas: e.target.checked }))}
              className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
            />
            Panier repas
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.grandDeplacement}
              onChange={(e) => setForm((f) => ({ ...f, grandDeplacement: e.target.checked }))}
              className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
            />
            Grand déplacement
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving}>
            {initial?.id ? 'Modifier' : 'Créer la feuille'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  );
}
