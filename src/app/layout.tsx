import type { Metadata } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from '@/components/providers';
import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Stravon — Logiciel de gestion pour artisans du bâtiment',
    template: '%s — Stravon',
  },
  description: 'Stravon est le logiciel tout-en-un pour les artisans du bâtiment. Gérez vos devis, factures, planning, équipes et chantiers. Assistant IA intégré. Essai gratuit 14 jours sans carte bancaire.',
  keywords: ['stravon', 'logiciel artisan', 'gestion bâtiment', 'devis facture artisan', 'planning chantier', 'logiciel BTP', 'gestion entreprise batiment', 'facturation artisan', 'logiciel devis artisan'],
  authors: [{ name: 'Stravon' }],
  creator: 'Stravon',
  publisher: 'Stravon',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: BASE_URL,
    siteName: 'Stravon',
    title: 'Stravon — Le logiciel tout-en-un pour artisans du bâtiment',
    description: 'Devis en 2 min, factures en 1 clic, planning d\'équipe, relances auto et assistant IA. 14 jours gratuits sans carte bancaire.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Stravon — Logiciel artisans du bâtiment' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stravon — Logiciel de gestion pour artisans du bâtiment',
    description: 'Devis, factures, planning, équipe et IA. Essai gratuit 14 jours.',
    images: ['/opengraph-image'],
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: BASE_URL,
  },
  other: {
    'theme-color': '#6C63FF',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
