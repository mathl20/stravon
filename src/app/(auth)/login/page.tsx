'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm(f => ({ ...f, [k]: e.target.value })); setError(null); setUnverifiedEmail(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverifiedEmail(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setUnverifiedEmail(data.email);
          setError(data.error);
        } else {
          setError(data.error || 'Erreur de connexion');
        }
        return;
      }
      setRedirecting(true);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('Login fetch error:', err);
      setError('Erreur de connexion au serveur. Vérifiez votre connexion internet.');
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      toast.success('Email de vérification renvoyé !');
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setResending(false);
    }
  };

  if (redirecting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm text-zinc-500 font-medium">Connexion en cours...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-zinc-900 mb-1">Connexion</h1>
      <p className="text-sm text-zinc-500 mb-6">Accédez à votre espace STRAVON</p>

      {error && !unverifiedEmail && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {unverifiedEmail && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-4 rounded-xl mb-4">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Email non vérifié</p>
              <p className="text-xs text-amber-700 mt-1">
                Vérifiez votre boîte mail pour activer votre compte.
              </p>
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="mt-2 text-xs font-medium text-amber-900 hover:underline flex items-center gap-1"
              >
                {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Renvoyer l&apos;email de vérification
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" name="email" type="email" value={form.email} onChange={set('email')} required placeholder="vous@exemple.fr" />
        <div>
          <Input label="Mot de passe" name="password" type="password" value={form.password} onChange={set('password')} required placeholder="••••••••" />
          <div className="text-right mt-1.5">
            <Link href="/forgot-password" className="text-xs text-brand-600 font-medium hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
        </div>
        <Button type="submit" loading={loading} className="w-full">Se connecter</Button>
      </form>
      <p className="text-sm text-zinc-500 text-center mt-6">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-brand-600 font-medium hover:underline">Créer un compte</Link>
      </p>
    </>
  );
}
