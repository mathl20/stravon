'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fafafa' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Une erreur est survenue</h2>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>{error.message}</p>
          <button
            onClick={reset}
            style={{ padding: '0.5rem 1.5rem', background: '#18181b', color: '#fff', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
