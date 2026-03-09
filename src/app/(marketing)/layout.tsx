import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingNav } from './marketing-nav';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

export const metadata: Metadata = {
  title: 'Stravon — Logiciel de gestion pour artisans du batiment',
  description: 'Gerez vos devis, factures, planning, equipes et chantiers dans un seul outil. Assistant IA integre. Essai gratuit 14 jours.',
  openGraph: {
    title: 'Stravon — Logiciel de gestion pour artisans du batiment',
    description: 'Gerez vos devis, factures, planning, equipes et chantiers dans un seul outil. Assistant IA integre. Essai gratuit 14 jours.',
    type: 'website',
    url: BASE_URL,
    siteName: 'Stravon',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stravon — Logiciel de gestion pour artisans du batiment',
    description: 'Gerez vos devis, factures, planning, equipes et chantiers dans un seul outil. Assistant IA integre. Essai gratuit 14 jours.',
  },
  alternates: {
    canonical: BASE_URL,
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
