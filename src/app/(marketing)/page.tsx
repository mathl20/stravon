import './marketing.css';
import {
  FileText, CalendarDays, Coins,
  Sparkles, QrCode, Receipt, CalendarRange, Wrench, Users,
  Clock, Bell, BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const PAIN_POINTS = [
  { Icon: FileText, title: 'Devis & Factures', before: 'Avant : 30 min sur Excel, erreurs, oublis', after: 'Avec Stravon : 2 min, conforme, envoyé' },
  { Icon: CalendarDays, title: 'Planning', before: 'Avant : appels, SMS, qui fait quoi demain ?', after: 'Avec Stravon : chaque technicien voit son planning' },
  { Icon: Coins, title: 'Facturation', before: 'Avant : factures en retard, relances oubliées', after: 'Avec Stravon : relances automatiques à 7, 14, 30j' },
];

const FEATURES: { Icon: LucideIcon; title: string; desc: string; highlight?: boolean; tag?: string }[] = [
  { Icon: Sparkles, title: 'Assistant IA', desc: 'Dites simplement "Demain Julien répare une fuite chez Dupont à 9h et fait un devis chauffe-eau." L\'IA crée l\'intervention, planifie le technicien et prépare le devis. En une phrase.', highlight: true, tag: 'Exclusif Stravon' },
  { Icon: QrCode, title: 'Signature QR Code', desc: 'Le client scanne, voit le récapitulatif de l\'intervention et signe sur son téléphone. Fini le papier.' },
  { Icon: Receipt, title: 'Devis & Factures', desc: 'Créez un devis en 2 minutes. Transformez-le en facture en un clic. Mentions légales, assurance décennale, tout est conforme.' },
  { Icon: CalendarRange, title: 'Planning d\'équipe', desc: 'Vue semaine complète. Assignez vos techniciens, ajoutez des créneaux. Chacun voit son planning en temps réel.' },
  { Icon: Wrench, title: 'Suivi d\'interventions', desc: 'Planifié → En cours → Terminé → Facturé → Payé. Suivez chaque intervention du début jusqu\'au paiement.' },
  { Icon: Users, title: 'Gestion d\'équipe', desc: 'Patron, secrétaire, employé — chaque rôle a ses permissions. Vos techniciens accèdent uniquement à ce dont ils ont besoin.' },
  { Icon: Clock, title: 'Feuilles d\'heures', desc: 'Heures, panier, zone, déplacement — tout est lié à l\'intervention. Export en un clic pour la paie.' },
  { Icon: Bell, title: 'Relances automatiques', desc: 'Factures impayées ? Devis sans réponse ? Stravon relance automatiquement vos clients à 7, 14 et 30 jours.' },
  { Icon: BarChart3, title: 'Tableau de bord', desc: 'CA du mois, annuel, en attente, dernières interventions — tout en un coup d\'œil dès l\'ouverture de Stravon.' },
];

const TIME_CARDS = [
  { number: '5h', unit: 'par semaine', label: 'Devis et factures créés en quelques clics au lieu d\'Excel' },
  { number: '2h', unit: 'par semaine', label: 'Planning et coordination d\'équipe automatisés' },
  { number: '2h', unit: 'par semaine', label: 'Relances et suivi des paiements en automatique' },
  { number: '1h', unit: 'par semaine', label: 'Feuilles d\'heures et rapports générés instantanément' },
];

const PRICING = [
  {
    name: 'Starter', users: '1 à 2 utilisateurs', price: '19', popular: false,
    features: [
      { text: 'Clients & historique', ok: true },
      { text: 'Devis & factures conformes', ok: true },
      { text: 'Interventions & suivi', ok: true },
      { text: 'Planning de base', ok: true },
      { text: 'Relances automatiques', ok: true },
      { text: 'Personnalisation PDF (logo, couleurs)', ok: true },
      { text: 'Assistant IA', ok: false },
      { text: 'Gestion d\'équipe & rôles', ok: false },
      { text: 'Signature QR Code', ok: false },
    ],
  },
  {
    name: 'Pro', users: '3 à 8 utilisateurs', price: '39', popular: true,
    features: [
      { text: 'Tout le plan Starter', ok: true },
      { text: 'Assistant IA', ok: true },
      { text: 'Signature QR Code', ok: true },
      { text: 'Gestion d\'équipe & rôles', ok: true },
      { text: 'Feuilles d\'heures', ok: true },
      { text: 'Modèles de devis & interventions', ok: true },
      { text: 'Bibliothèque de prestations', ok: true },
      { text: 'Export de rapports', ok: true },
      { text: 'Suivi de rentabilité', ok: true },
      { text: 'Planning de congés', ok: true },
      { text: 'Export comptable', ok: true },
    ],
  },
  {
    name: 'Business', users: '9 à 20 utilisateurs', price: '79', popular: false,
    features: [
      { text: 'Tout le plan Pro', ok: true },
      { text: 'Multi-équipes', ok: true },
      { text: 'Statistiques avancées', ok: true },
      { text: 'Support prioritaire', ok: true },
      { text: 'Intégration logo sur PDF', ok: true },
      { text: 'Onboarding personnalisé', ok: true },
    ],
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="m-hero">
        <div className="m-hero-badge">
          <span className="dot" />
          Nouveau — Assistant IA intégré
        </div>
        <h1>
          Gérez vos chantiers,<br />
          <span className="highlight">pas la paperasse.</span>
        </h1>
        <p className="m-hero-sub">
          Devis, factures, planning, équipes et suivi de chantier — tout centralisé dans un seul outil conçu pour les artisans du bâtiment.
        </p>
        <div className="m-hero-actions">
          <a href="/register" className="m-btn-primary">Essayer gratuitement 14 jours →</a>
          <a href="#fonctionnalites" className="m-btn-secondary">Voir les fonctionnalités</a>
        </div>
        <div className="m-hero-stats">
          <div className="m-hero-stat">
            <div className="number">10<span className="unit">h</span></div>
            <div className="label">gagnées par semaine</div>
          </div>
          <div className="m-hero-stat">
            <div className="number">2<span className="unit">min</span></div>
            <div className="label">pour créer un devis</div>
          </div>
          <div className="m-hero-stat">
            <div className="number">0</div>
            <div className="label">facture oubliée</div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="m-section m-pain-section">
        <div className="m-section-label">Le problème</div>
        <div className="m-section-title">Vous êtes artisan, pas comptable.</div>
        <div className="m-section-desc">Pourtant vous passez vos soirées sur l&apos;administratif au lieu de vous reposer.</div>
        <div className="m-pain-grid">
          {PAIN_POINTS.map((p, i) => (
            <div key={i} className="m-pain-card">
              <div className="m-pain-icon"><p.Icon className="m-lucide-icon" /></div>
              <div className="m-pain-title">{p.title}</div>
              <div className="m-pain-before">{p.before}</div>
              <div className="m-pain-after">{p.after}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" className="m-section">
        <div className="m-section-label">Fonctionnalités</div>
        <div className="m-section-title">Tout ce qu&apos;il faut. Rien de superflu.</div>
        <div className="m-section-desc">Chaque fonctionnalité a été pensée pour le quotidien réel d&apos;un artisan du bâtiment.</div>
        <div className="m-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className={`m-feature-card${f.highlight ? ' highlight-card' : ''}`}>
              <div className="m-feature-icon"><f.Icon className="m-lucide-icon-sm" /></div>
              <div className="m-feature-title">{f.title}</div>
              <div className="m-feature-desc">{f.desc}</div>
              {f.tag && <span className="m-feature-tag">{f.tag}</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Time Saved */}
      <section className="m-section">
        <div className="m-section-label">Temps gagné</div>
        <div className="m-section-title">10 heures par semaine. Minimum.</div>
        <div className="m-section-desc">Voilà ce que gagnent les artisans qui centralisent leur gestion avec un outil adapté.</div>
        <div className="m-time-grid">
          {TIME_CARDS.map((t, i) => (
            <div key={i} className="m-time-card">
              <div className="m-time-number">{t.number}</div>
              <div className="m-time-unit">{t.unit}</div>
              <div className="m-time-label">{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="m-section m-pricing-section" id="tarifs">
        <div className="m-section-label">Tarifs</div>
        <div className="m-section-title">Simple, transparent, sans engagement.</div>
        <div className="m-section-desc">14 jours d&apos;essai gratuit sur tous les plans. Sans carte bancaire.</div>
        <div className="m-pricing-grid">
          {PRICING.map((plan, i) => (
            <div key={i} className={`m-pricing-card${plan.popular ? ' popular' : ''}`}>
              {plan.popular && <div className="m-pricing-popular-tag">Le plus populaire</div>}
              <div className="m-pricing-name">{plan.name}</div>
              <div className="m-pricing-users">{plan.users}</div>
              <div className="m-pricing-price">
                <span className="m-pricing-amount" aria-label={`${plan.price} euros par mois`}>{plan.price}</span>
                <span className="m-pricing-currency">&euro;</span>
              </div>
              <div className="m-pricing-period">par mois, TTC</div>
              <ul className="m-pricing-features">
                {plan.features.map((f, j) => (
                  <li key={j} className={f.ok ? '' : 'disabled'}>
                    <span className="check">{f.ok ? '✓' : '—'}</span> {f.text}
                  </li>
                ))}
              </ul>
              <a href="/register" className={`m-pricing-btn ${plan.popular ? 'm-pricing-btn-primary' : 'm-pricing-btn-outline'}`}>
                Commencer l&apos;essai gratuit
              </a>
              <div className="m-pricing-trial">14 jours gratuits · Sans carte bancaire</div>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="m-social-proof">
        <div className="m-social-avatars">
          {['PL', 'JD', 'MR', 'AC', '+'].map((a, i) => (
            <div key={i} className="m-social-avatar">{a}</div>
          ))}
        </div>
        <p className="m-social-text">
          Rejoignez les artisans qui ont choisi de <strong>simplifier leur gestion</strong> et de <strong>gagner du temps</strong> chaque semaine avec Stravon.
        </p>
      </section>

      {/* CTA */}
      <section className="m-cta-section">
        <div className="m-cta-title">Prêt à gagner 10h par semaine ?</div>
        <p className="m-cta-desc">Essayez Stravon gratuitement pendant 14 jours. Sans carte bancaire, sans engagement. Votre premier devis en 2 minutes.</p>
        <a href="/register" className="m-btn-primary">Commencer gratuitement →</a>
      </section>
    </>
  );
}
