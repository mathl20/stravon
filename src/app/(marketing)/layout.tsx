import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingNav } from './marketing-nav';

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
    <div style={{ fontFamily: "'Outfit', sans-serif", background: '#060608', color: '#f0f0f5', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100vw' }}>
      <MarketingNav />

      <main>{children}</main>

      {/* Footer */}
      <footer className="marketing-footer">
        <div className="marketing-footer-logo">
          <div className="marketing-logo-icon-sm">⚡</div>
          STRAVON
        </div>
        <div className="marketing-footer-links">
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgv">CGV</Link>
          <a href="mailto:contact@stravon.fr">Contact</a>
        </div>
        <div>&copy; 2026 Stravon. Tous droits réservés.</div>
      </footer>
    </div>
  );
}
