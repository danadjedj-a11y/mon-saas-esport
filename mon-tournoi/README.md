# 🎮 Mon-Tournoi

**Plateforme de gestion de tournois eSport**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://play.flukyboys.fr)
[![React](https://img.shields.io/badge/React-19.2-61DAFB)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)](https://supabase.com)

---

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Stack Technique](#-stack-technique)
- [Installation](#-installation)
- [Scripts Disponibles](#-scripts-disponibles)
- [Structure du Projet](#-structure-du-projet)
- [Configuration](#-configuration)
- [Contribution](#-contribution)

---

## ✨ Fonctionnalités

### Formats de tournois
- ✅ **Single Elimination** - Bracket classique
- ✅ **Double Elimination** - Winners/Losers bracket avec Grand Final
- ✅ **Swiss System** - Appariement par score avec Buchholz
- ✅ **Round Robin** - Tous contre tous
- ✅ **Gauntlet** - Format pyramidal

### Gestion des équipes
- ✅ Équipes permanentes et temporaires
- ✅ Invitations et gestion des membres
- ✅ Comptes gaming liés (Riot, Steam, etc.)

### Expérience joueur
- ✅ Check-in avant tournoi
- ✅ Lobby de match avec chat
- ✅ Système de veto de maps (BO3, BO5)
- ✅ Notifications en temps réel
- ✅ Profils publics

### Outils organisateur
- ✅ Dashboard de gestion complet
- ✅ Export PDF des brackets
- ✅ Widgets embed pour streams
- ✅ Overlay OBS

---

## 🛠 Stack Technique

| Catégorie | Technologie |
|-----------|-------------|
| **Frontend** | React 19.2, Vite 7.2, TailwindCSS 3.4 |
| **State** | Zustand 5.0 (avec persist) |
| **Routing** | React Router 7.11 |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **i18n** | i18next (FR/EN) |
| **Monitoring** | Sentry |
| **Hosting** | Vercel |

---

## 🚀 Installation

### Prérequis
- Node.js 20+ (LTS recommandé)
- npm 10+ ou pnpm
- Compte Supabase (gratuit)

### 1. Cloner le repository
```bash
git clone https://github.com/flukyboys/mon-tournoi.git
cd mon-tournoi
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer les variables d'environnement
```bash
cp .env.example .env
```

Éditer `.env` avec vos valeurs :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key
VITE_MONITORING_ENABLED=true
VITE_SENTRY_DSN=optionnel
```

### 4. Lancer en développement
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

---

## 📜 Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement (Vite) |
| `npm run build` | Build de production |
| `npm run preview` | Preview du build local |
| `npm run lint` | Vérification ESLint |
| `npm test` | Exécuter les tests Jest |
| `npm run test:watch` | Tests en mode watch |
| `npm run test:coverage` | Couverture de tests |

---

## 📁 Structure du Projet

```
mon-tournoi/
├── src/
│   ├── components/       # Composants React réutilisables
│   │   ├── admin/        # Composants admin
│   │   ├── bracket/      # Visualisation brackets
│   │   ├── match/        # Gestion matchs
│   │   ├── tournament/   # Composants tournoi
│   │   └── ui/           # Composants UI génériques
│   ├── pages/            # Pages/routes
│   │   ├── organizer/    # Interface organisateur
│   │   ├── play/         # Interface joueur
│   │   ├── embed/        # Widgets intégrables
│   │   └── legal/        # Pages légales
│   ├── shared/           # Code partagé
│   │   ├── hooks/        # Hooks React personnalisés
│   │   ├── services/     # Services API
│   │   ├── components/   # Composants partagés
│   │   └── constants/    # Constantes
│   ├── stores/           # Zustand stores
│   ├── types/            # Types TypeScript
│   ├── utils/            # Fonctions utilitaires
│   └── i18n/             # Traductions
├── supabase/
│   └── migrations/       # Migrations SQL
├── public/               # Assets statiques
└── docs/                 # Documentation
```

---

## ⚙️ Configuration

### Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `VITE_SUPABASE_URL` | ✅ | URL de votre projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Clé anonyme Supabase |
| `VITE_MONITORING_ENABLED` | ❌ | Activer le monitoring (true/false) |
| `VITE_SENTRY_DSN` | ❌ | DSN Sentry pour error tracking |
| `VITE_MAKE_WEBHOOK_URL` | ❌ | Webhook Make.com pour automations |

### Base de données

Les migrations Supabase sont dans `supabase/migrations/`. Pour appliquer :
```bash
supabase db push
```

---

## 🧪 Tests

```bash
# Exécuter tous les tests
npm test

# Mode watch
npm run test:watch

# Avec couverture
npm run test:coverage
```

Tests disponibles :
- `swissUtils.test.js` - Algorithme Swiss et Buchholz
- `matchGenerator.test.js` - Génération de brackets
- `bofUtils.test.js` - Logique Best-of-X

---

## 🤝 Contribution

Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour les guidelines.

### Quick start
1. Fork le projet
2. Créer une branche (`git checkout -b feature/ma-feature`)
3. Commit (`git commit -m 'Ajout de ma feature'`)
4. Push (`git push origin feature/ma-feature`)
5. Ouvrir une Pull Request

---

## 📄 Licence

Propriétaire - Fluky Boys © 2026

---

## 🔗 Liens

- **Production** : [play.flukyboys.fr](https://play.flukyboys.fr)
- **Supabase Dashboard** : [supabase.com](https://app.supabase.com)
- **Documentation Supabase** : [supabase.com/docs](https://supabase.com/docs)
