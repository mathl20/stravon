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
            Créé par un artisan du bâtiment
          </div>
          <h1>Fini les soirées<br />à faire <em>des devis.</em></h1>
          <p className="hero-sub">
            Stravon gère tes devis, factures, relances et planning.<br />
            Toi, tu te concentres sur tes chantiers.
          </p>
          <div className="hero-actions">
            <a href="/register" className="btn-primary">Essai gratuit 14 jours →</a>
            <span className="hero-no-cb">Sans carte bancaire · Sans engagement</span>
          </div>
          <div className="hero-metrics">
            <div className="hero-metric">
              <div className="hero-metric-value">2<span>min</span></div>
              <div className="hero-metric-label">pour créer un devis</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value">1<span>clic</span></div>
              <div className="hero-metric-label">pour facturer</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value">0</div>
              <div className="hero-metric-label">facture oubliée</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ BANDE DE CONFIANCE ═══════ */}
      <section className="trust-band">
        <div className="m-container">
          <p className="trust-headline">Pensé pour les artisans du bâtiment</p>
          <div className="trust-trades">
            <div className="trust-trade">🔧<span>Plomberie</span></div>
            <div className="trust-trade">⚡<span>Électricité</span></div>
            <div className="trust-trade">🎨<span>Peinture</span></div>
            <div className="trust-trade">🧱<span>Maçonnerie</span></div>
            <div className="trust-trade">🏠<span>Couverture</span></div>
            <div className="trust-trade">🪵<span>Menuiserie</span></div>
            <div className="trust-trade">❄️<span>Climatisation</span></div>
            <div className="trust-trade">🔩<span>Serrurerie</span></div>
          </div>
        </div>
      </section>

      {/* ═══════ PROBLÈME ═══════ */}
      <section className="section section-alt">
        <div className="m-container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Le vrai problème</span>
            <h2 className="section-title">Tu es artisan,<br /><em>pas secrétaire.</em></h2>
            <p className="section-subtitle">Pourtant tu passes tes soirées sur l&apos;administratif au lieu de te reposer.</p>
          </div>
          <div className="problem-grid">
            <div className="problem-card reveal reveal-d1">
              <div className="problem-card-title"><span className="problem-icon">📄</span> Les devis</div>
              <div className="problem-row">
                <span className="problem-dot red" />
                <div><div className="problem-label red">Sans Stravon</div><div className="problem-text">30 min sur Excel le soir, erreurs de calcul, mentions légales oubliées, PDF moche</div></div>
              </div>
              <div className="problem-row">
                <span className="problem-dot green" />
                <div><div className="problem-label green">Avec Stravon</div><div className="problem-text">2 min chrono, conforme, envoyé par email avec PDF pro</div></div>
              </div>
            </div>
            <div className="problem-card reveal reveal-d2">
              <div className="problem-card-title"><span className="problem-icon">💶</span> Les factures</div>
              <div className="problem-row">
                <span className="problem-dot red" />
                <div><div className="problem-label red">Sans Stravon</div><div className="problem-text">Tu oublies de facturer, tes clients paient en retard, ta trésorerie trinque</div></div>
              </div>
              <div className="problem-row">
                <span className="problem-dot green" />
                <div><div className="problem-label green">Avec Stravon</div><div className="problem-text">Facture en 1 clic depuis le devis. Relance auto à 7, 14 et 30 jours</div></div>
              </div>
            </div>
            <div className="problem-card reveal reveal-d3">
              <div className="problem-card-title"><span className="problem-icon">📅</span> Le planning</div>
              <div className="problem-row">
                <span className="problem-dot red" />
                <div><div className="problem-label red">Sans Stravon</div><div className="problem-text">Appels, SMS, &quot;t&apos;es où demain ?&quot; — personne ne sait qui fait quoi</div></div>
              </div>
              <div className="problem-row">
                <span className="problem-dot green" />
                <div><div className="problem-label green">Avec Stravon</div><div className="problem-text">Chaque technicien voit son planning. Tu assignes en 2 clics</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ COMMENT ÇA MARCHE ═══════ */}
      <section className="section section-bordered">
        <div className="m-container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Simple comme bonjour</span>
            <h2 className="section-title">Du devis au paiement,<br /><em>en 4 étapes.</em></h2>
          </div>
          <div className="workflow-track reveal">
            <div className="workflow-step">
              <div className="workflow-icon">📝</div>
              <h4>Crée ton devis</h4>
              <p>En 2 min, avec tes prix, tes marges, conforme et pro.</p>
            </div>
            <div className="workflow-step">
              <div className="workflow-icon">📅</div>
              <h4>Planifie</h4>
              <p>Assigne le chantier à ton équipe sur le planning.</p>
            </div>
            <div className="workflow-step">
              <div className="workflow-icon">🔧</div>
              <h4>Interviens</h4>
              <p>Photos, matériel, signature du client par QR Code.</p>
            </div>
            <div className="workflow-step">
              <div className="workflow-icon">💶</div>
              <h4>Facture</h4>
              <p>Facture auto, envoyée par email. Relances incluses.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FONCTIONNALITÉS CLÉS ═══════ */}
      <section className="section" id="fonctionnalites">
        <div className="m-container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Fonctionnalités</span>
            <h2 className="section-title">Tout ce qu&apos;il te faut.<br /><em>Rien de superflu.</em></h2>
            <p className="section-subtitle">Chaque fonctionnalité a été pensée pour le quotidien réel d&apos;un artisan.</p>
          </div>
          <div className="features-grid features-grid-6">
            <div className="feature-card reveal">
              <div className="feature-icon fi-violet">📄</div>
              <h3>Devis en 2 minutes</h3>
              <p>Crée un devis conforme avec tes prix, tes marges et ton assurance décennale. Envoie-le en PDF par email.</p>
            </div>
            <div className="feature-card reveal reveal-d1">
              <div className="feature-icon fi-green">💶</div>
              <h3>Facture en 1 clic</h3>
              <p>Transforme ton devis en facture. Envoi automatique par email. Suivi du paiement en temps réel.</p>
            </div>
            <div className="feature-card reveal reveal-d2">
              <div className="feature-icon fi-red">🔔</div>
              <h3>Relances automatiques</h3>
              <p>Un client ne paie pas ? Stravon relance à 7, 14 et 30 jours. Tu n&apos;as plus rien à faire.</p>
            </div>
            <div className="feature-card reveal reveal-d3">
              <div className="feature-icon fi-blue">📅</div>
              <h3>Planning d&apos;équipe</h3>
              <p>Vue semaine complète. Assigne tes techniciens. Chacun voit son planning sur son téléphone.</p>
            </div>
            <div className="feature-card reveal reveal-d4">
              <div className="feature-icon fi-cyan">📱</div>
              <h3>Signature QR Code</h3>
              <p>Le client scanne, voit le récap et signe sur son téléphone. Fini le papier perdu.</p>
            </div>
            <div className="feature-card reveal reveal-d5">
              <div className="feature-icon fi-amber">🤖</div>
              <h3>Assistant IA</h3>
              <p>&quot;Demain Julien répare une fuite chez Dupont à 9h.&quot; L&apos;IA crée tout : intervention, planning, devis.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ TÉMOIGNAGES ═══════ */}
      <section className="section section-alt" id="temoignages">
        <div className="m-container">
          <div className="section-header reveal">
            <span className="section-eyebrow">Ils utilisent Stravon</span>
            <h2 className="section-title">Ce qu&apos;en disent<br /><em>les artisans.</em></h2>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card reveal reveal-d1">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">&quot;Avant, je passais 2h le soir sur mes devis. Maintenant c&apos;est fait en 10 min entre deux chantiers. Ma femme me remercie.&quot;</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">PL</div>
                <div>
                  <div className="testimonial-name">Pierre L.</div>
                  <div className="testimonial-role">Plombier · Paris</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card reveal reveal-d2">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">&quot;Les relances automatiques m&apos;ont fait récupérer 3 factures impayées le premier mois. Ça s&apos;est payé tout seul.&quot;</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">JD</div>
                <div>
                  <div className="testimonial-name">Julien D.</div>
                  <div className="testimonial-role">Électricien · Lyon</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card reveal reveal-d3">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">&quot;Le planning, c&apos;est ce qui m&apos;a convaincu. Mes 4 gars savent exactement où aller le matin. Plus un seul appel à 7h.&quot;</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">MR</div>
                <div>
                  <div className="testimonial-name">Marc R.</div>
                  <div className="testimonial-role">Peintre · Bordeaux</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ TARIFS ═══════ */}
      <section className="section" id="tarifs">
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
              <div className="pricing-users">Artisan seul ou en duo</div>
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
                <li className="off"><span className="ds">—</span> Gestion d&apos;équipe</li>
              </ul>
              <a href="/register" className="pricing-cta alt">Essai gratuit 14 jours</a>
              <div className="pricing-note">Sans carte bancaire</div>
            </div>
            {/* Pro */}
            <div className="pricing-card popular reveal reveal-d1">
              <div className="pricing-popular-tag">Le plus choisi</div>
              <div className="pricing-name">Pro</div>
              <div className="pricing-users">Artisan avec équipe (3-8 pers.)</div>
              <div className="pricing-amount"><span className="price">39</span><span className="currency">€</span></div>
              <div className="pricing-period">par mois, TTC</div>
              <ul className="pricing-features">
                <li><span className="ck">✓</span> Tout le plan Starter</li>
                <li><span className="ck">✓</span> Assistant IA</li>
                <li><span className="ck">✓</span> Signature QR Code</li>
                <li><span className="ck">✓</span> Gestion d&apos;équipe &amp; rôles</li>
                <li><span className="ck">✓</span> Feuilles d&apos;heures</li>
                <li><span className="ck">✓</span> Bibliothèque prestations</li>
                <li><span className="ck">✓</span> Export comptable</li>
                <li><span className="ck">✓</span> Suivi de rentabilité</li>
              </ul>
              <a href="/register" className="pricing-cta main">Essai gratuit 14 jours</a>
              <div className="pricing-note">Sans carte bancaire</div>
            </div>
            {/* Business */}
            <div className="pricing-card reveal reveal-d2">
              <div className="pricing-name">Business</div>
              <div className="pricing-users">Grosse équipe (9-20 pers.)</div>
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
              <a href="/register" className="pricing-cta alt">Essai gratuit 14 jours</a>
              <div className="pricing-note">Sans carte bancaire</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA FINAL ═══════ */}
      <section className="final-cta">
        <div className="m-container">
          <div className="cta-card reveal">
            <h2>Ton premier devis<br />en <em>2 minutes.</em></h2>
            <p>Essaie Stravon gratuitement pendant 14 jours.<br />Sans carte bancaire, sans engagement, sans prise de tête.</p>
            <a href="/register" className="btn-primary" style={{ fontSize: '1.05rem', padding: '16px 40px' }}>Commencer gratuitement →</a>
            <span className="cta-note">✦ <strong>14 jours gratuits</strong> — ton premier devis en 2 min</span>
          </div>
        </div>
      </section>
    </>
  );
}
