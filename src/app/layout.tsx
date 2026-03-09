import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Stravon — Logiciel de gestion pour artisans du batiment',
    template: '%s — Stravon',
  },
  description: 'Gerez vos devis, factures, planning, equipes et chantiers dans un seul outil. Assistant IA integre. Essai gratuit 14 jours.',
  keywords: ['logiciel artisan', 'gestion batiment', 'devis facture artisan', 'planning chantier', 'logiciel BTP', 'gestion entreprise batiment', 'facturation artisan', 'stravon'],
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
    title: 'Stravon — Logiciel de gestion pour artisans du batiment',
    description: 'Gerez vos devis, factures, planning, equipes et chantiers dans un seul outil. Assistant IA integre. Essai gratuit 14 jours.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stravon — Logiciel de gestion pour artisans du batiment',
    description: 'Gerez vos devis, factures, planning, equipes et chantiers dans un seul outil. Assistant IA integre. Essai gratuit 14 jours.',
  },
  icons: {
    icon: [
      { url: '/favicon.jpg', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/favicon.jpg' },
    ],
  },
  alternates: {
    canonical: BASE_URL,
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
      </body>
    </html>
  );
}
