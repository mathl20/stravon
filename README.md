# STRAVON — Gestion pour artisans du bâtiment

## Prérequis

- Node.js 18+
- PostgreSQL (local ou distant)
- npm ou yarn

## Installation

```bash
# 1. Copier le dossier stravon/ sur votre machine

# 2. Installer les dépendances
cd stravon
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Puis éditer .env avec vos valeurs :
#   DATABASE_URL   → votre connexion PostgreSQL
#   JWT_SECRET     → une chaîne aléatoire de 32+ caractères
#   NEXT_PUBLIC_APP_URL → http://localhost:3000

# 4. Générer le client Prisma
npx prisma generate

# 5. Créer les tables dans la base
npx prisma migrate dev --name init

# 6. Lancer le serveur de développement
npm run dev
```

L'application est accessible sur **http://localhost:3000**

## Structure

```
src/
├── app/
│   ├── (marketing)/     → Landing page publique
│   ├── (auth)/          → Login / Register
│   ├── (dashboard)/     → App protégée (sidebar)
│   │   ├── dashboard/   → Tableau de bord + KPIs
│   │   ├── clients/     → CRUD clients
│   │   ├── interventions/ → CRUD interventions
│   │   └── settings/    → Paramètres entreprise
│   └── api/             → Routes backend
├── components/
│   ├── ui/              → Composants atomiques
│   ├── layout/          → Sidebar, Header, Shell
│   ├── dashboard/       → StatCard, RevenueChart
│   └── forms/           → ClientForm, InterventionForm
├── lib/                 → Auth, Prisma, Validations, Utils
└── types/               → Types TypeScript
```

## Fonctionnalités

- **Auth** : Inscription + Connexion (JWT httpOnly cookie)
- **Dashboard** : CA mensuel, CA annuel, CA en attente, graphique 12 mois
- **Clients** : CRUD complet, recherche dynamique, détail avec interventions liées
- **Interventions** : CRUD complet, lignes de détail, calcul TVA auto, statuts (En attente → Facturé → Payé)
- **PDF** : Génération HTML printable pour chaque intervention
- **Settings** : Mise à jour des infos entreprise (apparaissent sur les PDF)
- **Middleware** : Protection automatique des routes dashboard
- **Responsive** : Interface mobile-first

## Commandes utiles

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npx prisma studio    # Interface visuelle pour la BDD
npx prisma migrate dev --name <nom>  # Nouvelle migration
```

## Déploiement Vercel

1. Push sur GitHub/GitLab
2. Importer dans Vercel
3. Variables d'environnement à configurer dans Vercel :
   - `DATABASE_URL` (PostgreSQL distant : Neon, Supabase, Railway…)
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (URL Vercel)
4. Build command : `npm run build` (auto-détecté)
5. Le `postinstall` exécute `prisma generate` automatiquement
