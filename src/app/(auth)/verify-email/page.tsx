'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setTimeout(() => router.push('/dashboard'), 2000);
        } else {
          setErrorMsg(data.error || 'Erreur de vérification');
          setStatus('error');
        }
      })
      .catch(() => {
        setErrorMsg('Erreur de connexion');
        setStatus('error');
      });
  }, [token, router]);

  if (status === 'loading') {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Vérification en cours...</h1>
        <p className="text-sm text-zinc-500">Veuillez patienter</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Email vérifié !</h1>
        <p className="text-sm text-zinc-500 mb-6">Votre adresse email a été confirmée. Redirection vers votre tableau de bord...</p>
        <Link href="/dashboard">
          <Button className="w-full">Accéder au tableau de bord</Button>
        </Link>
      </div>
    );
  }

  if (status === 'no-token') {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Vérifiez votre email</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Un email de vérification a été envoyé à votre adresse. Cliquez sur le lien dans l&apos;email pour activer votre compte.
        </p>
        <p className="text-xs text-zinc-400">Vous n&apos;avez pas reçu l&apos;email ? Vérifiez vos spams ou</p>
        <Link href="/login" className="text-sm text-brand-600 font-medium hover:underline mt-1 inline-block">
          retourner à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-7 h-7 text-red-600" />
      </div>
      <h1 className="text-xl font-bold text-zinc-900 mb-2">Vérification échouée</h1>
      <p className="text-sm text-zinc-500 mb-6">{errorMsg}</p>
      <Link href="/login">
        <Button variant="secondary" className="w-full">Retour à la connexion</Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-8">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
