'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';

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

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Lien invalide</h1>
        <p className="text-sm text-zinc-500 mb-6">Ce lien de réinitialisation est invalide ou incomplet.</p>
        <Link href="/forgot-password">
          <Button className="w-full">Demander un nouveau lien</Button>
        </Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Mot de passe modifié !</h1>
        <p className="text-sm text-zinc-500 mb-6">Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.</p>
        <Link href="/login">
          <Button className="w-full">Se connecter</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
      } else {
        setError(data.error || 'Erreur');
        if (res.status === 410 || res.status === 400) setStatus('error');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'error') {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Lien expiré</h1>
        <p className="text-sm text-zinc-500 mb-6">{error}</p>
        <Link href="/forgot-password">
          <Button className="w-full">Demander un nouveau lien</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Lock className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Nouveau mot de passe</h1>
          <p className="text-sm text-zinc-500">Choisissez un nouveau mot de passe sécurisé</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Nouveau mot de passe"
            name="password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            required
            placeholder="8 caractères minimum"
            autoFocus
          />
          <PasswordStrength password={password} />
        </div>
        <Input
          label="Confirmer le mot de passe"
          name="confirm"
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(''); }}
          required
          placeholder="Confirmez votre mot de passe"
        />
        <Button type="submit" loading={loading} className="w-full">
          Réinitialiser le mot de passe
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-8">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
