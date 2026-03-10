import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingNav } from './marketing-nav';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

export const metadata: Metadata = {
  title: 'Stravon — Logiciel de gestion pour artisans du bâtiment',
  description: 'Gérez vos devis, factures, planning, équipes et chantiers dans un seul outil. Assistant IA intégré. Essai gratuit 14 jours.',
  openGraph: {
    title: 'Stravon — Logiciel de gestion pour artisans du bâtiment',
    description: 'Gérez vos devis, factures, planning, équipes et chantiers dans un seul outil. Assistant IA intégré. Essai gratuit 14 jours.',
    type: 'website',
    url: BASE_URL,
    siteName: 'Stravon',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stravon — Logiciel de gestion pour artisans du bâtiment',
    description: 'Gérez vos devis, factures, planning, équipes et chantiers dans un seul outil. Assistant IA intégré. Essai gratuit 14 jours.',
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#09090f', color: '#eae9f0', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100vw' }}>
      <MarketingNav />

      <main>{children}</main>

      <footer className="m-footer">
        <div className="m-container">
          <div className="footer-brand">
            <div className="footer-brand-icon">⚡</div>
            <div className="footer-brand-text">Stravon</div>
          </div>
          <span className="footer-copy">&copy; 2026 Stravon. Tous droits réservés.</span>
          <ul className="footer-links">
            <li><Link href="/mentions-legales">Mentions légales</Link></li>
            <li><Link href="/cgv">CGV</Link></li>
            <li><a href="mailto:contact@stravon.fr">Contact</a></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
