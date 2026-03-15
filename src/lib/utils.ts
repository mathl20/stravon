import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function formatName(firstName: string, lastName: string): string {
  return `${capitalize(firstName)} ${capitalize(lastName)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
}

export function formatDateLong(date: Date | string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

export function generateReference(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INT-${y}${m}-${rand}`;
}

export function calculateTTC(ht: number, tvaRate: number): number {
  return Math.round(ht * (1 + tvaRate / 100) * 100) / 100;
}

export function getStatusLabel(s: string): string {
  return {
    PENDING: 'Planifié', EN_COURS: 'En cours', TERMINE: 'Terminé', INVOICED: 'Facturé', PAID: 'Payé',
    EN_ATTENTE: 'En attente', PAYEE: 'Payée', EN_RETARD: 'En retard', ANNULEE: 'Annulée',
  }[s] || s;
}

export function getStatusColor(s: string): string {
  return {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    EN_COURS: 'bg-blue-50 text-blue-700 border-blue-200',
    TERMINE: 'bg-violet-50 text-violet-700 border-violet-200',
    INVOICED: 'bg-sky-50 text-sky-700 border-sky-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EN_ATTENTE: 'bg-amber-50 text-amber-700 border-amber-200',
    PAYEE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EN_RETARD: 'bg-red-50 text-red-700 border-red-200',
    ANNULEE: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  }[s] || 'bg-gray-50 text-gray-700 border-gray-200';
}

export function generateDevisReference(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DEV-${y}${m}-${rand}`;
}

export function getDevisStatusLabel(s: string): string {
  return ({ BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', ACCEPTE: 'Accepté', REFUSE: 'Refusé', FACTURE: 'Facturé' } as Record<string, string>)[s] || s;
}

export function getDevisStatusColor(s: string): string {
  return ({
    BROUILLON: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    ENVOYE: 'bg-sky-50 text-sky-700 border-sky-200',
    ACCEPTE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REFUSE: 'bg-red-50 text-red-700 border-red-200',
    FACTURE: 'bg-violet-50 text-violet-700 border-violet-200',
  } as Record<string, string>)[s] || 'bg-zinc-100 text-zinc-600 border-zinc-200';
}

export function getFactureStatusLabel(s: string): string {
  return ({ EN_ATTENTE: 'En attente', ENVOYEE: 'Envoyée', PAYEE: 'Payée', EN_RETARD: 'En retard', ANNULEE: 'Annulée' } as Record<string, string>)[s] || s;
}

export function getFactureStatusColor(s: string): string {
  return ({
    EN_ATTENTE: 'bg-amber-50 text-amber-700 border-amber-200',
    ENVOYEE: 'bg-blue-50 text-blue-700 border-blue-200',
    PAYEE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EN_RETARD: 'bg-red-50 text-red-700 border-red-200',
    ANNULEE: 'bg-zinc-100 text-zinc-500 border-zinc-300',
  } as Record<string, string>)[s] || 'bg-zinc-100 text-zinc-600 border-zinc-200';
}

export function getModePaiementLabel(s: string): string {
  return ({ virement: 'Virement', cheque: 'Chèque', especes: 'Espèces', cb: 'Carte bancaire' } as Record<string, string>)[s] || s;
}

export function getUniteLabel(s: string): string {
  return ({ piece: 'Pièce', metre: 'Mètre', kg: 'Kg', litre: 'Litre' } as Record<string, string>)[s] || s;
}

export function calculateProfitability(amountHT: number, coutMateriaux: number, coutMO: number) {
  const marge = amountHT - coutMateriaux - coutMO;
  const tauxMarge = amountHT > 0 ? Math.round((marge / amountHT) * 100) : 0;
  return { marge, tauxMarge, coutMateriaux, coutMO };
}

export async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erreur serveur');
  return json;
}
