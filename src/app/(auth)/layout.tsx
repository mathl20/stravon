import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-[#7C3AED] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">STRAVON</span>
        </Link>
        <div className="card p-8">{children}</div>
      </div>
    </div>
  );
}
