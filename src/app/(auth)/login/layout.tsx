import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous a votre compte Stravon pour gerer vos devis, factures, planning et chantiers.',
  openGraph: {
    title: 'Connexion — Stravon',
    description: 'Connectez-vous a votre compte Stravon pour gerer vos devis, factures, planning et chantiers.',
    url: `${BASE_URL}/login`,
  },
  alternates: {
    canonical: `${BASE_URL}/login`,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
