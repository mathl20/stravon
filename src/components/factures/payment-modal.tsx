'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Select, Input } from '@/components/ui';
import { apiFetch } from '@/lib/utils';

interface PaymentModalProps {
  factureId: string;
  onPaid: () => void;
  onClose: () => void;
}

const MODE_OPTIONS = [
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'especes', label: 'Especes' },
  { value: 'cb', label: 'Carte bancaire' },
  { value: 'prelevement', label: 'Prelevement' },
];

export function PaymentModal({ factureId, onPaid, onClose }: PaymentModalProps) {
  const [saving, setSaving] = useState(false);
  const [modePaiement, setModePaiement] = useState('virement');
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/factures/${factureId}/pay`, {
        method: 'PUT',
        body: JSON.stringify({ modePaiement, datePaiement }),
      });
      toast.success('Facture marquee comme payee');
      onPaid();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Enregistrer le paiement</h2>
        <p className="text-xs text-zinc-400 mb-5">Renseignez les informations du paiement recu</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Mode de paiement"
            name="modePaiement"
            value={modePaiement}
            onChange={(e) => setModePaiement(e.target.value)}
            options={MODE_OPTIONS}
          />
          <Input
            label="Date du paiement"
            name="datePaiement"
            type="date"
            value={datePaiement}
            onChange={(e) => setDatePaiement(e.target.value)}
            required
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving}>Valider le paiement</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
