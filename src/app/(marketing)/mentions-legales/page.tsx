import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mentions légales — Stravon' };

export default function MentionsLegalesPage() {
  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '120px 24px 80px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 32 }}>Mentions légales</h1>

      <div style={{ lineHeight: 1.8, color: '#b0b0c0', fontSize: '0.95rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Éditeur du site</h2>
        <p>
          Le site stravon.fr est édité par la société STRAVON.<br />
          Adresse : [À compléter]<br />
          SIRET : [À compléter]<br />
          Email : contact@stravon.fr<br />
          Directeur de la publication : [À compléter]
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Hébergement</h2>
        <p>
          Le site est hébergé par Vercel Inc.<br />
          440 N Baxter St, Coppell, TX 75019, États-Unis<br />
          Site web : vercel.com
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble du contenu du site (textes, images, graphismes, logo, icônes) est la propriété exclusive de STRAVON, sauf mention contraire.
          Toute reproduction, représentation, modification ou exploitation non autorisée est interdite.
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Protection des données personnelles</h2>
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données personnelles.
          Pour exercer ces droits, contactez-nous à : contact@stravon.fr
        </p>
        <p style={{ marginTop: 12 }}>
          Les données collectées sont utilisées exclusivement pour le fonctionnement du service STRAVON et ne sont jamais revendues à des tiers.
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Cookies</h2>
        <p>
          Le site utilise des cookies strictement nécessaires au fonctionnement du service (authentification, préférences).
          Aucun cookie publicitaire ou de tracking n&apos;est utilisé.
        </p>
      </div>
    </section>
  );
}
