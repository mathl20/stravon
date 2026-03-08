'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Gift, Search, CheckCircle2, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { apiFetch } from '@/lib/utils';

const METIERS = [
  { value: 'plombier', label: 'Plombier' },
  { value: 'electricien', label: 'Électricien' },
  { value: 'chauffagiste', label: 'Chauffagiste' },
  { value: 'climatisation', label: 'Climatisation' },
  { value: 'carreleur', label: 'Carreleur' },
  { value: 'peintre', label: 'Peintre' },
  { value: 'menuisier', label: 'Menuisier' },
  { value: 'maçon', label: 'Maçon' },
  { value: 'multi-services', label: 'Multi-services' },
  { value: 'autre', label: 'Autre' },
];

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { score: 1, label: 'Faible', color: 'bg-red-500' };
    if (score <= 2) return { score: 2, label: 'Moyen', color: 'bg-amber-500' };
    if (score <= 3) return { score: 3, label: 'Bon', color: 'bg-emerald-400' };
    return { score: 4, label: 'Fort', color: 'bg-emerald-600' };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-zinc-200'}`} />
        ))}
      </div>
      <p className={`text-xs ${strength.score <= 1 ? 'text-red-500' : strength.score <= 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
        {strength.label}
      </p>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState('');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    companyName: '', metier: 'multi-services',
    siret: '', companyAddress: '', companyPostalCode: '', companyCity: '',
  });
  const [siretStatus, setSiretStatus] = useState<'idle' | 'loading' | 'found' | 'error'>('idle');
  const [siretError, setSiretError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm(f => ({ ...f, [k]: e.target.value })); setError(null); };

  useEffect(() => {
    if (refCode) {
      fetch(`/api/referral/validate?code=${encodeURIComponent(refCode)}`)
        .then(r => r.json())
        .then(data => { if (data.valid) setReferrerName(data.referrerName); })
        .catch(() => {});
    }
  }, [refCode]);

  const lookupSiret = useCallback(async (siret: string) => {
    const clean = siret.replace(/\s/g, '');
    if (clean.length !== 14) {
      if (clean.length > 0) {
        setSiretError('Le SIRET doit contenir 14 chiffres');
        setSiretStatus('error');
      } else {
        setSiretStatus('idle');
        setSiretError('');
      }
      return;
    }
    if (!/^\d{14}$/.test(clean)) {
      setSiretError('Le SIRET ne doit contenir que des chiffres');
      setSiretStatus('error');
      return;
    }

    setSiretStatus('loading');
    setSiretError('');
    try {
      const res = await fetch(`/api/siret?siret=${clean}`);
      const data = await res.json();
      if (!res.ok) {
        setSiretError(data.error || 'SIRET introuvable');
        setSiretStatus('error');
        return;
      }
      setForm(f => ({
        ...f,
        siret: clean,
        companyName: data.nom || f.companyName,
        companyAddress: data.address || f.companyAddress,
        companyPostalCode: data.postalCode || f.companyPostalCode,
        companyCity: data.city || f.companyCity,
      }));
      setSiretStatus('found');
      toast.success('Entreprise trouvée ! Les champs ont été remplis.');
    } catch {
      setSiretError('Erreur de connexion');
      setSiretStatus('error');
    }
  }, []);

  const handleSiretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d\s]/g, '');
    setForm(f => ({ ...f, siret: val }));
    setSiretStatus('idle');
    setSiretError('');
  };

  const handleSiretBlur = () => {
    const clean = form.siret.replace(/\s/g, '');
    if (clean.length === 14) lookupSiret(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSiret = form.siret.replace(/\s/g, '');
    if (cleanSiret && !/^\d{14}$/.test(cleanSiret)) {
      setError('SIRET invalide');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          siret: cleanSiret || undefined,
          ...(refCode ? { referralCode: refCode } : {}),
        }),
      });
      toast.success('Compte créé ! Vérifiez votre email.');
      router.push('/verify-email');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création du compte';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold text-zinc-900 mb-1">Créer un compte</h1>
      <p className="text-sm text-zinc-500 mb-6">Commencez à gérer votre activité avec STRAVON</p>

      {referrerName && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 mb-5">
          <Gift className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Vous avez été parrainé par {referrerName} !</p>
            <p className="text-xs text-emerald-600">1 mois offert à l&apos;inscription</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" name="firstName" value={form.firstName} onChange={set('firstName')} required />
          <Input label="Nom" name="lastName" value={form.lastName} onChange={set('lastName')} required />
        </div>

        {/* SIRET avec recherche */}
        <div>
          <label className="label-field">SIRET <span className="text-zinc-400 font-normal">(optionnel)</span></label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ex: 12345678901234"
              maxLength={17}
              value={form.siret}
              onChange={handleSiretChange}
              onBlur={handleSiretBlur}
              className={`input-field w-full pr-10 ${siretStatus === 'error' ? 'border-red-300 focus:border-red-400' : siretStatus === 'found' ? 'border-emerald-300 focus:border-emerald-400' : ''}`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {siretStatus === 'loading' && <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />}
              {siretStatus === 'found' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {siretStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
              {siretStatus === 'idle' && form.siret.replace(/\s/g, '').length === 0 && <Building2 className="w-4 h-4 text-zinc-300" />}
            </div>
          </div>
          {siretError && <p className="text-xs text-red-500 mt-1">{siretError}</p>}
          {siretStatus === 'idle' && !siretError && (
            <p className="text-xs text-zinc-400 mt-1">Saisissez votre SIRET pour remplir automatiquement les informations</p>
          )}
          {form.siret.replace(/\s/g, '').length === 14 && siretStatus === 'idle' && (
            <button type="button" onClick={() => lookupSiret(form.siret)} className="text-xs text-brand-600 font-medium mt-1 hover:underline flex items-center gap-1">
              <Search className="w-3 h-3" /> Rechercher l&apos;entreprise
            </button>
          )}
        </div>

        <Input label="Nom de l'entreprise" name="companyName" value={form.companyName} onChange={set('companyName')} required placeholder="Ex: Plomberie Martin" />

        {/* Adresse auto-remplie */}
        {(siretStatus === 'found' || form.companyAddress || form.companyPostalCode || form.companyCity) && (
          <div className="space-y-3 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Adresse de l&apos;entreprise</p>
            <Input label="Adresse" name="companyAddress" value={form.companyAddress} onChange={set('companyAddress')} placeholder="Rue, numéro..." />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Code postal" name="companyPostalCode" value={form.companyPostalCode} onChange={set('companyPostalCode')} placeholder="75001" />
              <Input label="Ville" name="companyCity" value={form.companyCity} onChange={set('companyCity')} placeholder="Paris" />
            </div>
          </div>
        )}

        {/* Métier */}
        <div>
          <label className="label-field">Corps de métier</label>
          <select
            value={form.metier}
            onChange={(e) => setForm(f => ({ ...f, metier: e.target.value }))}
            className="input-field w-full"
          >
            {METIERS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <p className="text-xs text-zinc-400 mt-1">Les prestations seront adaptées à votre métier</p>
        </div>

        <Input label="Email" name="email" type="email" value={form.email} onChange={set('email')} required placeholder="vous@exemple.fr" />
        <div>
          <Input label="Mot de passe" name="password" type="password" value={form.password} onChange={set('password')} required placeholder="8 caractères minimum" />
          <PasswordStrength password={form.password} />
        </div>
        <Button type="submit" loading={loading} className="w-full">Créer mon compte</Button>
      </form>
      <p className="text-sm text-zinc-500 text-center mt-6">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">Se connecter</Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
