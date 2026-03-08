import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Conditions Générales de Vente — Stravon' };

export default function CGVPage() {
  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '120px 24px 80px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 32 }}>Conditions Générales de Vente</h1>

      <div style={{ lineHeight: 1.8, color: '#b0b0c0', fontSize: '0.95rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Article 1 — Objet</h2>
        <p>
          Les présentes Conditions Générales de Vente (CGV) régissent l&apos;utilisation du service STRAVON, plateforme de gestion en ligne
          destinée aux artisans du bâtiment, accessible à l&apos;adresse stravon.fr.
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Article 2 — Inscription et compte</h2>
        <p>
          L&apos;accès au service nécessite la création d&apos;un compte. L&apos;utilisateur s&apos;engage à fournir des informations exactes et à maintenir
          la confidentialité de ses identifiants. Toute utilisation du compte est sous la responsabilité du titulaire.
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Article 3 — Tarifs et paiement</h2>
        <p>
          Les tarifs sont indiqués en euros hors taxes sur la page Tarifs. L&apos;abonnement est mensuel et sans engagement.
          Le paiement est effectué par carte bancaire via Stripe. Toute période entamée est due.
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Article 4 — Essai gratuit</h2>
        <p>
          Un essai gratuit de 14 jours est proposé sans carte bancaire. À l&apos;issue de cette période, l&apos;utilisateur doit souscrire
          un abonnement payant pour continuer à utiliser le service.
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Article 5 — Résiliation</h2>
        <p>
          L&apos;utilisateur peut résilier son abonnement à tout moment depuis ses paramètres. La résiliation prend effet
          à la fin de la période de facturation en cours. Les données restent accessibles pendant 30 jours après résiliation.
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Article 6 — Données et confidentialité</h2>
        <p>
          STRAVON s&apos;engage à protéger les données de ses utilisateurs conformément au RGPD.
          Les données sont hébergées en Europe et ne sont jamais partagées avec des tiers sans consentement.
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Article 7 — Responsabilité</h2>
        <p>
          STRAVON met tout en œuvre pour assurer la disponibilité du service mais ne peut garantir une disponibilité
          ininterrompue. L&apos;utilisateur reste responsable de la conformité légale de ses documents (devis, factures).
        </p>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f5', marginTop: 32, marginBottom: 12 }}>Article 8 — Droit applicable</h2>
        <p>
          Les présentes CGV sont soumises au droit français. En cas de litige, les tribunaux compétents seront ceux du siège social de STRAVON.
        </p>

        <p style={{ marginTop: 40, color: '#55556a', fontSize: '0.85rem' }}>
          Dernière mise à jour : mars 2026
        </p>
      </div>
    </section>
  );
}
