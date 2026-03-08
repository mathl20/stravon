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
      <nav className="marketing-navbar">
        <Link href="/" className="marketing-logo">
          <div className="marketing-logo-icon">⚡</div>
          <span className="marketing-logo-text">STRAVON</span>
        </Link>
        <ul className="marketing-nav-links">
          <li><a href="#fonctionnalites">Fonctionnalités</a></li>
          <li><a href="#tarifs">Tarifs</a></li>
        </ul>
        <div className="marketing-nav-actions">
          <Link href="/login" className="marketing-nav-login">Connexion</Link>
          <Link href="/register" className="marketing-nav-register">Créer un compte</Link>
        </div>
      </nav>

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
