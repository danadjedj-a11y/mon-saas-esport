# Phase 2 - Hooks Personnalisés Créés

## 🎯 Objectif
Créer des hooks réutilisables pour simplifier la logique des composants et améliorer la maintenabilité.

## ✅ Hooks Créés

### 1. `useTournament` (`src/features/tournaments/hooks/useTournament.js`)
**Description :** Hook pour gérer un tournoi avec toutes ses données associées.

**Fonctionnalités :**
- ✅ Chargement automatique du tournoi, participants, matchs, waitlist, scores suisses
- ✅ Cache via Zustand store (évite les requêtes répétées)
- ✅ Abonnements Realtime pour mises à jour automatiques
- ✅ Gestion des race conditions avec `fetchVersionRef`
- ✅ Protection contre les mises à jour sur composants démontés
- ✅ Fonction `refetch()` pour forcer un refresh

**Exemple d'utilisation :**
```javascript
const { tournament, participants, matches, loading, error, refetch } = useTournament(
  tournamentId,
  { 
    enabled: true,
    subscribe: true,
    currentUserId: session?.user?.id,
    myTeamId: myTeam?.id
  }
);
```

**Retourne :**
- `tournament` : Données du tournoi
- `participants` : Liste des participants
- `matches` : Liste des matchs
- `waitlist` : Liste d'attente
- `swissScores` : Scores suisses (si format suisse)
- `loading` : État de chargement
- `error` : Erreur éventuelle
- `refetch` : Fonction pour recharger
- `isOrganizer` : Booléen si l'utilisateur est organisateur
- `isParticipant` : Booléen si l'utilisateur est participant

---

### 2. `useMatch` (`src/features/matches/hooks/useMatch.js`)
**Description :** Hook pour gérer un match avec ses équipes et scores.

**Fonctionnalités :**
- ✅ Chargement automatique du match avec relations (tournoi, équipes)
- ✅ Abonnements Realtime pour mises à jour automatiques
- ✅ Fonctions pour mettre à jour le score et compléter le match
- ✅ Helpers pour identifier l'équipe de l'utilisateur et l'adversaire
- ✅ Protection contre les race conditions

**Exemple d'utilisation :**
```javascript
const { 
  match, 
  loading, 
  error, 
  updateScore, 
  completeMatch,
  isMyMatch,
  myTeam,
  opponentTeam,
  myScore,
  opponentScore
} = useMatch(matchId, {
  enabled: true,
  subscribe: true,
  myTeamId: myTeam?.id
});
```

**Retourne :**
- `match` : Données du match
- `loading` : État de chargement
- `error` : Erreur éventuelle
- `refetch` : Fonction pour recharger
- `updateScore(scoreP1, scoreP2)` : Mettre à jour le score
- `completeMatch(winnerId)` : Compléter le match
- `isMyMatch` : Booléen si l'utilisateur participe au match
- `isMyTeam1` / `isMyTeam2` : Booléen si l'équipe est team1 ou team2
- `myTeam` / `opponentTeam` : Données de l'équipe de l'utilisateur / adversaire
- `myScore` / `opponentScore` : Scores de l'équipe de l'utilisateur / adversaire
- `tournament` : Données du tournoi associé

---

### 3. `useTeam` (`src/features/teams/hooks/useTeam.js`)
**Description :** Hook pour gérer une équipe avec ses membres.

**Fonctionnalités :**
- ✅ Chargement automatique de l'équipe et de ses membres
- ✅ Abonnements Realtime pour mises à jour automatiques
- ✅ Fonctions pour ajouter/retirer des membres
- ✅ Fonction pour mettre à jour l'équipe
- ✅ Helpers pour identifier le rôle de l'utilisateur (capitaine, membre, etc.)

**Exemple d'utilisation :**
```javascript
const { 
  team, 
  members, 
  loading, 
  error, 
  addMember, 
  removeMember, 
  updateTeam,
  isCaptain,
  isMember,
  canEdit
} = useTeam(teamId, {
  enabled: true,
  subscribe: true,
  currentUserId: session?.user?.id,
  isAdmin: false
});
```

**Retourne :**
- `team` : Données de l'équipe
- `members` : Liste des membres avec leurs profils
- `loading` : État de chargement
- `error` : Erreur éventuelle
- `refetch` : Fonction pour recharger
- `addMember(userId)` : Ajouter un membre
- `removeMember(userId)` : Retirer un membre
- `updateTeam(updates)` : Mettre à jour l'équipe
- `isCaptain` : Booléen si l'utilisateur est capitaine
- `isMember` : Booléen si l'utilisateur est membre
- `canEdit` : Booléen si l'utilisateur peut modifier (capitaine ou admin)

---

## 📦 Exports

Tous les hooks sont exportés depuis `src/shared/hooks/index.js` :

```javascript
export { useTournament } from '../../features/tournaments/hooks/useTournament';
export { useMatch } from '../../features/matches/hooks/useMatch';
export { useTeam } from '../../features/teams/hooks/useTeam';
```

## 🔧 Intégration

Les hooks sont prêts à être utilisés dans les composants existants :

1. **Tournament.jsx** → Remplacer la logique actuelle par `useTournament`
2. **MatchLobby.jsx** → Utiliser `useMatch` pour simplifier
3. **MyTeam.jsx** → Utiliser `useTeam` pour gérer l'équipe
4. **CreateTeam.jsx** → Utiliser `useTeam` après création

## 📝 Notes

- ✅ Tous les hooks gèrent les race conditions
- ✅ Tous les hooks protègent contre les mises à jour sur composants démontés
- ✅ Tous les hooks supportent les abonnements Realtime
- ✅ Le cache via Zustand réduit les requêtes inutiles
- ⚠️ Les hooks nécessitent `useSupabaseSubscription` (déjà créé)
- ⚠️ Les hooks nécessitent les services API (déjà créés)

## 🚀 Prochaines Étapes

1. Migrer `Tournament.jsx` pour utiliser `useTournament`
2. Migrer `MatchLobby.jsx` pour utiliser `useMatch`
3. Améliorer `CreateTournament` avec validation Zod
4. Améliorer `CreateTeam` avec les nouveaux composants UI
