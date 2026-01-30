# 🚀 GUIDE DE CONFIGURATION CONVEX - OPTIMISÉ

## ✅ Ce qui a été créé

### 1. Schema Optimisé (`convex/schema.ts`)
- ✅ **17 tables** complètes pour la plateforme de tournois
- ✅ **Indexes stratégiques** sur tous les champs fréquemment filtrés
- ✅ **Types stricts** avec `v.union()` pour les enums
- ✅ **Relations** via `v.id("table")`
- ✅ **Timestamps** en `number` (Date.now()) pour performance

### 2. Queries Tournois (`convex/tournaments.ts`)
- ✅ `listPublic` : Liste tournois publics avec filtres
- ✅ `getById` : Détails d'un tournoi avec organisateur
- ✅ `listByOrganizer` : Tournois d'un organisateur
- ✅ `search` : Recherche multi-critères
- ✅ `getAvailableGames` : Liste des jeux
- ✅ `isUserRegistered` : Vérification inscription

### 3. Mutations Tournois (`convex/tournamentsMutations.ts`)
- ✅ `create` : Création avec validation
- ✅ `update` : Modification avec autorisation
- ✅ `updateStatus` : Changement de statut
- ✅ `remove` : Suppression sécurisée

---

## 🔧 PROCHAINES ÉTAPES

### Étape 1 : Finaliser l'installation Convex

Dans le terminal qui a demandé "Login or create an account" :
1. **Choisis** : "Login or create an account"
2. **Suis** les instructions pour te connecter
3. **Nomme** ton projet : "mon-tournoi" ou "fluky-boys"

### Étape 2 : Installer les dépendances React Convex

```bash
npm install convex-helpers
```

### Étape 3 : Configurer le client Convex

Crée `src/convexClient.ts` :
```typescript
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export default convex;
```

### Étape 4 : Wrapper ton App avec ConvexProvider

Dans `src/main.jsx` :
```jsx
import { ConvexProvider } from "convex/react";
import convex from "./convexClient";

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
);
```

### Étape 5 : Variables d'environnement

Ajoute dans `.env` :
```env
VITE_CONVEX_URL=https://xxx.convex.cloud
```

(L'URL sera fournie après l'installation)

---

## 📝 FICHIERS À CRÉER ENSUITE

### Queries/Mutations à ajouter :

1. **Users** (`convex/users.ts`)
   - `getCurrent` : Utilisateur connecté
   - `getById` : Profil utilisateur
   - `update` : Modifier profil

2. **Teams** (`convex/teams.ts`)
   - `create` : Créer équipe
   - `listByUser` : Équipes d'un joueur
   - `addMember` : Ajouter membre
   - `removeMember` : Retirer membre

3. **Matches** (`convex/matches.ts`)
   - `listByTournament` : Matchs d'un tournoi
   - `getById` : Détails match
   - `updateScore` : Mettre à jour score
   - `updateStatus` : Changer statut

4. **Registrations** (`convex/registrations.ts`)
   - `register` : S'inscrire à un tournoi
   - `checkIn` : Check-in
   - `listByTournament` : Participants

5. **Notifications** (`convex/notifications.ts`)
   - `listByUser` : Notifications d'un user
   - `markAsRead` : Marquer comme lu
   - `create` : Créer notification

6. **Chat** (`convex/chat.ts`)
   - `listByMatch` : Messages d'un match
   - `send` : Envoyer message

---

## 🎯 OPTIMISATIONS APPLIQUÉES

### 1. Indexes Stratégiques
```typescript
// ✅ Index simple
.index("by_status", ["status"])

// ✅ Index composé pour requêtes fréquentes
.index("by_game_and_status", ["game", "status"])

// ✅ Index pour relations
.index("by_tournament", ["tournamentId"])
```

### 2. Types Stricts
```typescript
// ✅ Enums avec v.union()
status: v.union(
  v.literal("draft"),
  v.literal("ongoing"),
  v.literal("completed")
)

// ✅ Relations avec v.id()
organizerId: v.id("users")

// ✅ Champs optionnels
description: v.optional(v.string())
```

### 3. Timestamps Optimisés
```typescript
// ✅ number (Date.now()) au lieu de Date
createdAt: v.number()
updatedAt: v.number()

// Dans le code :
createdAt: Date.now()
```

### 4. Validation dans les Mutations
```typescript
// ✅ Vérification auth
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Non authentifié");

// ✅ Vérification permissions
if (tournament.organizerId !== user._id) {
  throw new Error("Non autorisé");
}

// ✅ Validation métier
if (args.maxTeams < 2) {
  throw new Error("Au moins 2 participants");
}
```

---

## 🔥 UTILISATION DANS REACT

### Query
```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function TournamentList() {
  const tournaments = useQuery(api.tournaments.listPublic, {
    limit: 20,
    game: "League of Legends"
  });

  if (tournaments === undefined) return <div>Loading...</div>;

  return (
    <div>
      {tournaments.map(t => (
        <div key={t._id}>{t.name}</div>
      ))}
    </div>
  );
}
```

### Mutation
```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function CreateTournament() {
  const createTournament = useMutation(api.tournamentsMutations.create);

  const handleSubmit = async (data) => {
    try {
      const id = await createTournament({
        name: data.name,
        game: data.game,
        format: "elimination",
        maxTeams: 16,
        teamSize: 5,
        checkInRequired: true,
      });
      console.log("Tournoi créé:", id);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## 🎨 AUTHENTIFICATION

### Option 1 : Clerk (Recommandé)

```bash
npm install @clerk/clerk-react
```

```typescript
// src/main.jsx
import { ClerkProvider } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

<ClerkProvider publishableKey="pk_xxx">
  <ConvexProviderWithClerk client={convex}>
    <App />
  </ConvexProviderWithClerk>
</ClerkProvider>
```

### Option 2 : Auth0

```bash
npm install @auth0/auth0-react
```

### Option 3 : Custom JWT

Voir documentation Convex : https://docs.convex.dev/auth

---

## 📊 DASHBOARD CONVEX

Une fois connecté, tu auras accès à :
- ✅ **Data Browser** : Voir/éditer les données en temps réel
- ✅ **Logs** : Voir tous les appels de fonctions
- ✅ **Deployments** : Historique des déploiements
- ✅ **Settings** : Configuration du projet

URL : https://dashboard.convex.dev

---

## 🚀 COMMANDES UTILES

```bash
# Lancer Convex en dev (watch mode)
npx convex dev

# Déployer en production
npx convex deploy

# Voir les logs
npx convex logs

# Réinitialiser la DB (ATTENTION : supprime tout)
npx convex data clear
```

---

## ✅ CHECKLIST DE CONFIGURATION

- [ ] Convex installé (`npm install convex`)
- [ ] Compte Convex créé
- [ ] Projet Convex initialisé
- [ ] Schema déployé
- [ ] Variables d'environnement configurées
- [ ] ConvexProvider ajouté dans main.jsx
- [ ] Auth configurée (Clerk/Auth0/Custom)
- [ ] Première query testée
- [ ] Première mutation testée

---

## 🆘 BESOIN D'AIDE ?

Je peux créer pour toi :
- ✅ Les autres fichiers de queries/mutations (users, teams, matches, etc.)
- ✅ Les composants React avec useQuery/useMutation
- ✅ La configuration Clerk pour l'auth
- ✅ Les helpers et utils Convex
- ✅ Les tests

**Dis-moi ce dont tu as besoin ! 😊**
