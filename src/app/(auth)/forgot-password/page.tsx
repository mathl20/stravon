'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
        return;
      }
      setSent(true);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Email envoyé !</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Si un compte existe avec l&apos;adresse <strong>{email}</strong>, vous recevrez un lien pour réinitialiser votre mot de passe.
        </p>
        <p className="text-xs text-zinc-400 mb-4">Pensez à vérifier vos spams si vous ne le trouvez pas.</p>
        <Link href="/login">
          <Button variant="secondary" className="w-full">
            <ArrowLeft className="w-4 h-4" /> Retour à la connexion
          </Button>
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
          <Mail className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Mot de passe oublié</h1>
          <p className="text-sm text-zinc-500">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Adresse email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          required
          placeholder="vous@exemple.fr"
          autoFocus
        />
        <Button type="submit" loading={loading} className="w-full">
          Envoyer le lien de réinitialisation
        </Button>
      </form>
    </>
  );
}
