import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <h1 className="text-6xl font-bold text-zinc-900">404</h1>
      <p className="text-lg text-zinc-500 mt-3 mb-6">Page introuvable</p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
