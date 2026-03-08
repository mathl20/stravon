import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stravon — Gestion simplifiée pour artisans du bâtiment',
  description: 'Devis, factures, planning, équipes et suivi de chantier — tout centralisé dans un seul outil conçu pour les artisans du bâtiment.',
  openGraph: {
    title: 'Stravon — Gestion simplifiée pour artisans du bâtiment',
    description: 'Devis, factures, planning, équipes et suivi de chantier — tout centralisé dans un seul outil conçu pour les artisans du bâtiment.',
    type: 'website',
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: '#060608', color: '#f0f0f5', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(6,6,8,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #1e1e28',
      }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px', color: '#f0f0f5', textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: '#4f6ef7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>⚡</div>
          STRAVON
        </Link>
        <ul style={{ display: 'flex', gap: 32, listStyle: 'none', margin: 0, padding: 0 }} className="marketing-nav-links">
          <li><a href="#fonctionnalites" style={{ color: '#8888a0', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Fonctionnalités</a></li>
          <li><a href="#tarifs" style={{ color: '#8888a0', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Tarifs</a></li>
        </ul>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/login" style={{
            color: '#8888a0', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
            padding: '10px 20px', borderRadius: 10, border: '1px solid #1e1e28', transition: 'all 0.2s',
          }}>Connexion</Link>
          <Link href="/register" style={{
            background: '#4f6ef7', color: 'white', padding: '10px 24px', borderRadius: 10,
            fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
          }}>Créer un compte</Link>
        </div>
      </nav>

      <main>{children}</main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #1e1e28', padding: 40,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.8rem', color: '#55556a', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10, color: '#f0f0f5' }}>
          <div style={{ width: 26, height: 26, background: '#4f6ef7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>⚡</div>
          STRAVON
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link href="/mentions-legales" style={{ color: '#8888a0', textDecoration: 'none' }}>Mentions légales</Link>
          <Link href="/cgv" style={{ color: '#8888a0', textDecoration: 'none' }}>CGV</Link>
          <a href="mailto:contact@stravon.fr" style={{ color: '#8888a0', textDecoration: 'none' }}>Contact</a>
        </div>
        <div>&copy; 2026 Stravon. Tous droits réservés.</div>
      </footer>
    </div>
  );
}
