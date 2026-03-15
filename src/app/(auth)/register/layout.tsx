import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

export const metadata: Metadata = {
  title: 'Créer un compte',
  description: 'Créez votre compte Stravon et commencez à gérer votre activité. Essai gratuit 14 jours, sans carte bancaire.',
  openGraph: {
    title: 'Créer un compte — Stravon',
    description: 'Créez votre compte Stravon et commencez à gérer votre activité. Essai gratuit 14 jours, sans carte bancaire.',
    url: `${BASE_URL}/register`,
  },
  alternates: {
    canonical: `${BASE_URL}/register`,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
