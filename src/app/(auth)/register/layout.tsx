import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

export const metadata: Metadata = {
  title: 'Creer un compte',
  description: 'Creez votre compte Stravon et commencez a gerer votre activite. Essai gratuit 14 jours, sans carte bancaire.',
  openGraph: {
    title: 'Creer un compte — Stravon',
    description: 'Creez votre compte Stravon et commencez a gerer votre activite. Essai gratuit 14 jours, sans carte bancaire.',
    url: `${BASE_URL}/register`,
  },
  alternates: {
    canonical: `${BASE_URL}/register`,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
