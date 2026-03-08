'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button, Input, Textarea } from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import type { Client } from '@/types';

interface ClientFormProps {
  client?: Client;
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
  const isEditing = !!client;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    firstName: client?.firstName || '',
    lastName: client?.lastName || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    city: client?.city || '',
    postalCode: client?.postalCode || '',
    notes: client?.notes || '',
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Le prénom est requis';
    if (!form.lastName.trim()) errs.lastName = 'Le nom est requis';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email invalide';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEditing) {
        await apiFetch(`/api/clients/${client.id}`, { method: 'PUT', body: JSON.stringify(form) });
        toast.success('Client modifié');
      } else {
        await apiFetch('/api/clients', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Client créé');
      }
      router.push('/clients');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Prénom" name="firstName" value={form.firstName} onChange={set('firstName')} error={errors.firstName} required />
        <Input label="Nom" name="lastName" value={form.lastName} onChange={set('lastName')} error={errors.lastName} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Email" name="email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label="Téléphone" name="phone" value={form.phone} onChange={set('phone')} />
      </div>
      <Input label="Adresse" name="address" value={form.address} onChange={set('address')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Code postal" name="postalCode" value={form.postalCode} onChange={set('postalCode')} />
        <Input label="Ville" name="city" value={form.city} onChange={set('city')} />
      </div>
      <Textarea label="Notes" name="notes" value={form.notes} onChange={set('notes')} placeholder="Informations complémentaires…" />
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{isEditing ? 'Enregistrer' : 'Créer le client'}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
