import './marketing.css';
import { ScrollReveal } from './scroll-reveal';

export const dynamic = 'force-static';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Stravon',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Logiciel de gestion pour artisans du bâtiment. Devis, factures, planning, équipes et suivi de chantier.',
  url: BASE_URL,
  offers: [
    { '@type': 'Offer', name: 'Starter', price: '19', priceCurrency: 'EUR', description: '1 à 2 utilisateurs — Devis, factures, planning, relances automatiques' },
    { '@type': 'Offer', name: 'Pro', price: '39', priceCurrency: 'EUR', description: '3 à 8 utilisateurs — Assistant IA, équipe, feuilles d\'heures, signature QR' },
    { '@type': 'Offer', name: 'Business', price: '79', priceCurrency: 'EUR', description: '9 à 20 utilisateurs — Multi-équipes, statistiques avancées, support dédié' },
  ],
};

export default function LandingPage() {
  return (
    <>
      <ScrollReveal />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ═══════ HERO ═══════ */}
      <section className="hero">
        <div className="m-container">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Nouveau — Assistant IA intégré
          </div>
          <h1>Gérez vos chantiers,<br /><em>pas la paperasse.</em></h1>
          <p className="hero-sub">
            Devis, factures, planning, équipes et suivi de chantier — tout centralisé dans un seul outil conçu pour les artisans du bâtiment.
          </p>
          <div className="hero-actions">
            <a href="/register" className="btn-primary">Essayer gratuitement 14 jours →</a>
            <a href="#fonctionnalites" className="btn-ghost">Voir les fonctionnalités</a>
          </div>
          <div className="hero-metrics">
            <div className="hero-metric">
              <div className="hero-metric-value">10<span>h</span></div>
              <div className="hero-metric-label">gagnées par semaine</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value">2<span>min</span></div>
              <div className="hero-metric-label">pour créer un devis</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value">0</div>
              <div className="hero-metric-label">facture oubliée</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PROBLÈME ═══════ */}
      <section className="section section-alt">
        <div className="m-container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Le problème</span>
            <h2 className="section-title">Vous êtes artisan, <em>pas comptable.</em></h2>
            <p className="section-subtitle">Pourtant vous passez vos soirées sur l&apos;administratif au lieu de vous reposer.</p>
          </div>
          <div className="problem-grid">
            <div className="problem-card reveal reveal-d1">
              <div className="problem-card-title"><span className="problem-icon">📄</span> Devis &amp; Factures</div>
              <div className="problem-row">
                <span className="problem-dot red" />
                <div><div className="problem-label red">Avant</div><div className="problem-text">30 min sur Excel, erreurs, oublis de mentions légales</div></div>
              </div>
              <div className="problem-row">
                <span className="problem-dot green" />
                <div><div className="problem-label green">Avec Stravon</div><div className="problem-text">2 min, conforme, envoyé par email avec PDF</div></div>
              </div>
            </div>
            <div className="problem-card reveal reveal-d2">
              <div className="problem-card-title"><span className="problem-icon">📅</span> Planning</div>
              <div className="problem-row">
                <span className="problem-dot red" />
                <div><div className="problem-label red">Avant</div><div className="problem-text">Appels, SMS, qui fait quoi demain ? Personne ne sait</div></div>
              </div>
              <div className="problem-row">
                <span className="problem-dot green" />
                <div><div className="problem-label green">Avec Stravon</div><div className="problem-text">Chaque technicien voit son planning en temps réel</div></div>
              </div>
            </div>
            <div className="problem-card reveal reveal-d3">
              <div className="problem-card-title"><span className="problem-icon">💶</span> Facturation</div>
              <div className="problem-row">
                <span className="problem-dot red" />
                <div><div className="problem-label red">Avant</div><div className="problem-text">Factures en retard, relances oubliées, trésorerie fragile</div></div>
              </div>
              <div className="problem-row">
                <span className="problem-dot green" />
                <div><div className="problem-label green">Avec Stravon</div><div className="problem-text">Relances automatiques à 7, 14 et 30 jours</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FONCTIONNALITÉS ═══════ */}
      <section className="section" id="fonctionnalites">
        <div className="m-container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Fonctionnalités</span>
            <h2 className="section-title">Tout ce qu&apos;il faut.<br /><em>Rien de superflu.</em></h2>
            <p className="section-subtitle">Chaque fonctionnalité a été pensée pour le quotidien réel d&apos;un artisan du bâtiment.</p>
          </div>

          {/* Hero features */}
          <div className="feature-hero-row">
            <div className="feature-hero-card ia reveal">
              <span className="feature-badge-tag violet">Exclusif Stravon</span>
              <h3>🤖 Assistant IA</h3>
              <p>Dites simplement ce que vous voulez. L&apos;IA crée l&apos;intervention, planifie le technicien et prépare le devis. En une phrase.</p>
              <div className="ai-prompt">💬 Demain Julien répare une fuite chez Dupont à 9h et fait un devis chauffe-eau.</div>
            </div>
            <div className="feature-hero-card qr reveal reveal-d1">
              <span className="feature-badge-tag green">Sans papier</span>
              <h3>📱 Signature QR Code</h3>
              <p>Le client scanne le QR Code, voit le récapitulatif complet de l&apos;intervention et signe directement sur son téléphone. Fini le papier perdu, fini les allers-retours.</p>
            </div>
          </div>

          {/* Grid */}
          <div className="features-grid">
            <div className="feature-card reveal">
              <div className="feature-icon fi-violet">📄</div>
              <h3>Devis &amp; Factures</h3>
              <p>Créez un devis en 2 minutes. Transformez-le en facture en un clic. Mentions légales, assurance décennale — tout conforme.</p>
            </div>
            <div className="feature-card reveal reveal-d1">
              <div className="feature-icon fi-blue">📅</div>
              <h3>Planning d&apos;équipe</h3>
              <p>Vue semaine complète. Assignez vos techniciens, ajoutez des créneaux. Chacun voit son planning en temps réel.</p>
            </div>
            <div className="feature-card reveal reveal-d2">
              <div className="feature-icon fi-green">🔄</div>
              <h3>Suivi d&apos;interventions</h3>
              <p>Planifié → En cours → Terminé → Facturé → Payé. Chaque intervention suivie du début au paiement.</p>
            </div>
            <div className="feature-card reveal reveal-d3">
              <div className="feature-icon fi-red">👥</div>
              <h3>Gestion d&apos;équipe</h3>
              <p>Patron, secrétaire, employé — chaque rôle a ses permissions. Vos techniciens accèdent à ce dont ils ont besoin.</p>
            </div>
            <div className="feature-card reveal reveal-d4">
              <div className="feature-icon fi-amber">⏱️</div>
              <h3>Feuilles d&apos;heures</h3>
              <p>Heures, panier, zone, déplacement — tout lié à l&apos;intervention. Export en un clic pour la paie.</p>
            </div>
            <div className="feature-card reveal reveal-d5">
              <div className="feature-icon fi-cyan">🔔</div>
              <h3>Relances automatiques</h3>
              <p>Factures impayées ? Devis sans réponse ? Stravon relance automatiquement à 7, 14 et 30 jours.</p>
            </div>
            <div className="feature-card reveal reveal-d6">
              <div className="feature-icon fi-violet">📊</div>
              <h3>Tableau de bord</h3>
              <p>CA du mois, annuel, en attente, dernières interventions — tout en un coup d&apos;œil dès l&apos;ouverture.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ WORKFLOW ═══════ */}
      <section className="section section-bordered">
        <div className="m-container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Comment ça marche</span>
            <h2 className="section-title">Du devis au paiement,<br /><em>en 4 étapes</em></h2>
            <p className="section-subtitle">Un flux automatisé qui élimine la double saisie et les oublis.</p>
          </div>
          <div className="workflow-track reveal">
            <div className="workflow-step">
              <div className="workflow-icon">📝</div>
              <h4>Créez le devis</h4>
              <p>Depuis un modèle ou de zéro, avec marges automatiques.</p>
            </div>
            <div className="workflow-step">
              <div className="workflow-icon">📅</div>
              <h4>Planifiez</h4>
              <p>Assignez l&apos;intervention à votre équipe sur le planning.</p>
            </div>
            <div className="workflow-step">
              <div className="workflow-icon">🔧</div>
              <h4>Intervenez</h4>
              <p>Photos, matériel, signature client par QR Code.</p>
            </div>
            <div className="workflow-step">
              <div className="workflow-icon">💶</div>
              <h4>Facturez</h4>
              <p>Facture auto-générée, email + relance automatique.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ TEMPS GAGNÉ ═══════ */}
      <section className="section">
        <div className="m-container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Temps gagné</span>
            <h2 className="section-title">10 heures par semaine. <em>Minimum.</em></h2>
            <p className="section-subtitle">Voilà ce que gagnent les artisans qui centralisent leur gestion avec Stravon.</p>
          </div>
          <div className="time-grid">
            <div className="time-card reveal reveal-d1">
              <div className="time-value">5h</div>
              <div className="time-unit">par semaine</div>
              <div className="time-bar"><div className="time-bar-fill" style={{ '--w': '100%' } as React.CSSProperties} /></div>
              <div className="time-desc">Devis et factures en quelques clics au lieu d&apos;Excel</div>
            </div>
            <div className="time-card reveal reveal-d2">
              <div className="time-value">2h</div>
              <div className="time-unit">par semaine</div>
              <div className="time-bar"><div className="time-bar-fill" style={{ '--w': '40%' } as React.CSSProperties} /></div>
              <div className="time-desc">Planning et coordination d&apos;équipe automatisés</div>
            </div>
            <div className="time-card reveal reveal-d3">
              <div className="time-value">2h</div>
              <div className="time-unit">par semaine</div>
              <div className="time-bar"><div className="time-bar-fill" style={{ '--w': '40%' } as React.CSSProperties} /></div>
              <div className="time-desc">Relances et suivi des paiements en automatique</div>
            </div>
            <div className="time-card reveal reveal-d4">
              <div className="time-value">1h</div>
              <div className="time-unit">par semaine</div>
              <div className="time-bar"><div className="time-bar-fill" style={{ '--w': '20%' } as React.CSSProperties} /></div>
              <div className="time-desc">Feuilles d&apos;heures et rapports en un clic</div>
            </div>
          </div>
          <div className="time-total reveal">
            <div className="time-total-value">= 10h / semaine</div>
            <div className="time-total-label">récupérées pour ce qui compte vraiment</div>
          </div>
        </div>
      </section>

      {/* ═══════ TARIFS ═══════ */}
      <section className="section section-alt" id="tarifs">
        <div className="m-container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Tarifs</span>
            <h2 className="section-title">Simple, transparent,<br /><em>sans engagement.</em></h2>
            <p className="section-subtitle">14 jours d&apos;essai gratuit sur tous les plans. Sans carte bancaire.</p>
          </div>
          <div className="pricing-grid">
            {/* Starter */}
            <div className="pricing-card reveal">
              <div className="pricing-name">Starter</div>
              <div className="pricing-users">1 à 2 utilisateurs</div>
              <div className="pricing-amount"><span className="price">19</span><span className="currency">€</span></div>
              <div className="pricing-period">par mois, TTC</div>
              <ul className="pricing-features">
                <li><span className="ck">✓</span> Clients &amp; historique</li>
                <li><span className="ck">✓</span> Devis &amp; factures conformes</li>
                <li><span className="ck">✓</span> Interventions &amp; suivi</li>
                <li><span className="ck">✓</span> Planning de base</li>
                <li><span className="ck">✓</span> Relances automatiques</li>
                <li><span className="ck">✓</span> Personnalisation PDF</li>
                <li className="off"><span className="ds">—</span> Assistant IA</li>
                <li className="off"><span className="ds">—</span> Gestion d&apos;équipe &amp; rôles</li>
                <li className="off"><span className="ds">—</span> Signature QR Code</li>
              </ul>
              <a href="/register" className="pricing-cta alt">Commencer l&apos;essai gratuit</a>
              <div className="pricing-note">14 jours gratuits · Sans carte bancaire</div>
            </div>
            {/* Pro */}
            <div className="pricing-card popular reveal reveal-d1">
              <div className="pricing-popular-tag">Le plus populaire</div>
              <div className="pricing-name">Pro</div>
              <div className="pricing-users">3 à 8 utilisateurs</div>
              <div className="pricing-amount"><span className="price">39</span><span className="currency">€</span></div>
              <div className="pricing-period">par mois, TTC</div>
              <ul className="pricing-features">
                <li><span className="ck">✓</span> Tout le plan Starter</li>
                <li><span className="ck">✓</span> Assistant IA</li>
                <li><span className="ck">✓</span> Signature QR Code</li>
                <li><span className="ck">✓</span> Gestion d&apos;équipe &amp; rôles</li>
                <li><span className="ck">✓</span> Feuilles d&apos;heures</li>
                <li><span className="ck">✓</span> Modèles de devis</li>
                <li><span className="ck">✓</span> Bibliothèque prestations</li>
                <li><span className="ck">✓</span> Export rapports &amp; comptable</li>
                <li><span className="ck">✓</span> Suivi de rentabilité</li>
                <li><span className="ck">✓</span> Planning de congés</li>
              </ul>
              <a href="/register" className="pricing-cta main">Commencer l&apos;essai gratuit</a>
              <div className="pricing-note">14 jours gratuits · Sans carte bancaire</div>
            </div>
            {/* Business */}
            <div className="pricing-card reveal reveal-d2">
              <div className="pricing-name">Business</div>
              <div className="pricing-users">9 à 20 utilisateurs</div>
              <div className="pricing-amount"><span className="price">79</span><span className="currency">€</span></div>
              <div className="pricing-period">par mois, TTC</div>
              <ul className="pricing-features">
                <li><span className="ck">✓</span> Tout le plan Pro</li>
                <li><span className="ck">✓</span> Multi-équipes</li>
                <li><span className="ck">✓</span> Statistiques avancées</li>
                <li><span className="ck">✓</span> Support prioritaire</li>
                <li><span className="ck">✓</span> Logo sur PDF</li>
                <li><span className="ck">✓</span> Onboarding personnalisé</li>
              </ul>
              <a href="/register" className="pricing-cta alt">Commencer l&apos;essai gratuit</a>
              <div className="pricing-note">14 jours gratuits · Sans carte bancaire</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ AMBASSADEURS ═══════ */}
      <section className="section" id="ambassadeurs">
        <div className="m-container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Programme Ambassadeur</span>
            <h2 className="section-title">Parrainez, gagnez,<br /><em>montez en palier.</em></h2>
            <p className="section-subtitle">100% gratuit. Plus vous recommandez Stravon, plus vos commissions augmentent.</p>
          </div>
          <div className="ambassador-grid">
            <div className="amb-card reveal reveal-d1">
              <span className="amb-emoji">🌱</span>
              <div className="amb-name">Starter</div>
              <div className="amb-pct">10%</div>
              <div className="amb-desc">Commission de base sur chaque artisan parrainé</div>
            </div>
            <div className="amb-card pop reveal reveal-d2">
              <span className="amb-emoji">⚡</span>
              <div className="amb-name">Booster</div>
              <div className="amb-pct">15%</div>
              <div className="amb-desc">Bonus leaderboard mensuel</div>
            </div>
            <div className="amb-card reveal reveal-d3">
              <span className="amb-emoji">🔥</span>
              <div className="amb-name">Expert</div>
              <div className="amb-pct">20%</div>
              <div className="amb-desc">Accès prioritaire aux nouveautés</div>
            </div>
            <div className="amb-card reveal reveal-d4">
              <span className="amb-emoji">👑</span>
              <div className="amb-name">Élite</div>
              <div className="amb-pct">25%</div>
              <div className="amb-desc">Commission max + visibilité leaderboard</div>
            </div>
          </div>
          <div className="amb-extras reveal">
            <div className="amb-extra">
              <div className="amb-extra-icon">🏆</div>
              <div className="amb-extra-label"><strong>Leaderboard mensuel</strong>Classement en temps réel</div>
            </div>
            <div className="amb-extra">
              <div className="amb-extra-icon">💳</div>
              <div className="amb-extra-label"><strong>Stripe Connect</strong>Paiement direct</div>
            </div>
            <div className="amb-extra">
              <div className="amb-extra-icon">🎁</div>
              <div className="amb-extra-label"><strong>100% gratuit</strong>Aucun frais, aucun engagement</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }} className="reveal">
            <a href="/ambassadeur" className="btn-primary" style={{ fontSize: '1.05rem', padding: '16px 40px' }}>Devenir ambassadeur gratuitement →</a>
          </div>
        </div>
      </section>

      {/* ═══════ SOCIAL PROOF ═══════ */}
      <section className="social-proof section-bordered reveal">
        <div className="m-container">
          <div className="social-avatars">
            <div className="social-av">PL</div>
            <div className="social-av">JD</div>
            <div className="social-av">MR</div>
            <div className="social-av">AC</div>
            <div className="social-av more">+</div>
          </div>
          <p className="social-text">
            Rejoignez les artisans qui ont choisi de <strong>simplifier leur gestion</strong> et de <strong>gagner du temps</strong> chaque semaine avec Stravon.
          </p>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="final-cta">
        <div className="m-container">
          <div className="cta-card reveal">
            <h2>Prêt à gagner <em>10h par semaine ?</em></h2>
            <p>Essayez Stravon gratuitement pendant 14 jours. Sans carte bancaire, sans engagement. Votre premier devis en 2 minutes.</p>
            <a href="/register" className="btn-primary" style={{ fontSize: '1.05rem', padding: '16px 40px' }}>Commencer gratuitement →</a>
            <span className="cta-note">✦ <strong>14 jours gratuits</strong> — sans engagement, sans carte bancaire</span>
          </div>
        </div>
      </section>
    </>
  );
}
