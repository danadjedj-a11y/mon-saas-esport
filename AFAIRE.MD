# 🚀 Guide de Finalisation Migration : Supabase vers Convex

Ce document détaille **précisément** ce qui reste à faire pour terminer la migration de l'application, en particulier pour le composant critique [Tournament.jsx](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/Tournament.jsx).

> **État actuel** : L'infrastructure Core, Auth, Profils, Équipes, Dashboard Joueur/Organisateur, et Création de Tournoi sont **100% migrés**.
> Le fichier [Tournament.jsx](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/Tournament.jsx) est migré à **60%** (Imports, Hooks, StartTournament, GenerateBracket, RemoveParticipant, CheckIn sont faits).

---

## 📅 Reste à faire sur [src/Tournament.jsx](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/Tournament.jsx)

Le fichier a déjà les imports Convex et les hooks `useMutation` définis. Il reste à remplacer les appels `supabase.from(...)` dans les fonctions de logique de jeu suivantes :

### 1. [saveScore](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/Tournament.jsx#683-744) (Ligne ~658)
Cette fonction gère la validation d'un score et la progression.
- **Action** : Remplacer `supabase.from('matches').update(...)` par `updateMatchScore`.
- **Action** : Remplacer `supabase.from('matches').select(...)` pour récupérer le match mis à jour par un appel à la query `api.matches.getById` ou en utilisant le retour de la mutation si adapté.
- **Progression** : La logique de progression (Single/Double Elimination) fait des appels directs. Migrer vers `api.matchesMutations.progressWinner` (à vérifier/créer si la logique est complexe côté client, voir point 2).

### 2. [handleDoubleEliminationProgression](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/Tournament.jsx#745-815) (Ligne ~720)
Cette fonction contient une logique complexe de mise à jour de plusieurs matchs (Winners bracket -> Losers bracket).
- **Consigne CRITIQUE** : Ne pas essayer de reproduire cette logique complexe avec 15 appels `mutation` séparés côté client.
- **Solution recommandée** : Déplacer toute cette logique dans une **nouvelle mutation Convex** `api.matchesMutations.handleProgression` qui prend le `matchId` et le `winnerId`.
    - Cette mutation devra encapsuler la logique de "Si Winner Bracket -> Move to next winner & Drop to loser" et "Si Loser Bracket -> Move to next loser".
    - Cela rendra le client beaucoup plus léger et la transaction atomique.

### 3. [exportToPDF](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/Tournament.jsx#528-597) (Ligne ~503)
- **Action** : Cette fonction utilise les données locales (`participants`, `matches`) qui viennent déjà du hook [useTournament](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/hooks/useConvex.js#59-73).
- **Vérification** : S'assurer que les données structurées correspondent à ce qu'attend `exportTournamentToPDF`. Normalement OK car [useTournament](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/hooks/useConvex.js#59-73) retourne les mêmes structures.

### 4. [generateNextSwissRound](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/Tournament.jsx#598-661) (Ligne ~574)
- **Action** : Remplacer `supabase.from('matches').select` par `useQuery` (déjà chargé dans `matches`) ou une action serveur.
- **Action** : Remplacer `supabase.from('matches').insert` par `api.matchesMutations.batchCreate`.
- **Action** : Remplacer `getSwissScores` (qui appelle supabase) par `api.swiss.getScores`.

---

## 🧩 Composants Enfants à Vérifier

Ces composants sont importés dans [Tournament.jsx](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/Tournament.jsx) et contiennent probablement encore du code Supabase :

1.  **[src/TeamJoinButton.jsx](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/TeamJoinButton.jsx)**
    - Doit utiliser `api.tournamentRegistrationsMutations.register`.
2.  **[src/CheckInButton.jsx](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/CheckInButton.jsx)**
    - Doit utiliser `api.tournamentRegistrationsMutations.toggleCheckIn`.
3.  **[src/AdminPanel.jsx](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/AdminPanel.jsx)**
    - Vérifier s'il fait des appels directs pour gérer les matchs/scores.
4.  **[src/SeedingModal.jsx](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/SeedingModal.jsx)**
    - Doit utiliser `api.tournamentRegistrationsMutations.updateSeed`.
5.  **[src/SchedulingModal.jsx](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/SchedulingModal.jsx)**
    - Doit utiliser une mutation pour update `scheduledTime`.

---

## 🛠️ Mapping des APIs Convex Disponibles

Voici les mutations déjà créées et prêtes à l'emploi (dans `convex/_generated/api`) :

| Fonction Supabase Frontend | Mutation Convex Correspondante | Fichier |
|----------------------------|--------------------------------|---------|
| `matches.insert` (batch) | `api.matchesMutations.batchCreate` | [matchesMutations.ts](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/convex/matchesMutations.ts) |
| `matches.delete` (all) | `api.matchesMutations.deleteAllByTournament` | [matchesMutations.ts](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/convex/matchesMutations.ts) |
| `matches.update` (score) | `api.matchesMutations.updateScore` | [matchesMutations.ts](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/convex/matchesMutations.ts) |
| `matches.update` (teams) | `api.matchesMutations.updateTeams` | [matchesMutations.ts](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/convex/matchesMutations.ts) |
| `matches.insert` (game) | `api.matchesMutations.createGame` | [matchesMutations.ts](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/convex/matchesMutations.ts) |
| `participants.delete` | `api.tournamentRegistrationsMutations.removeParticipant` | [tournamentRegistrationsMutations.ts](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/convex/tournamentRegistrationsMutations.ts) |
| `participants.update` (checkin)| `api.tournamentRegistrationsMutations.toggleCheckIn` | [tournamentRegistrationsMutations.ts](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/convex/tournamentRegistrationsMutations.ts) |
| `participants.update` (seed) | `api.tournamentRegistrationsMutations.updateSeed` | [tournamentRegistrationsMutations.ts](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/convex/tournamentRegistrationsMutations.ts) |
| `tournaments.update` (status)| `api.tournamentsMutations.updateStatus` | [tournamentsMutations.ts](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/convex/tournamentsMutations.ts) |

---

## ⚠️ Points d'Attention (Mappings Schéma)

Le schéma Convex diffère légèrement de l'ancien schéma Supabase :

- **Supabase** `round_number` ➡️ **Convex** `round`
- **Supabase** `bracket_type` ➡️ **Convex** `isLosersBracket` (boolean)
- **Supabase** `owner_id` ➡️ **Convex** `organizerId`
- **Supabase** `seed_order` ➡️ **Convex** `seed`
- **Supabase** `checked_in` (bool) ➡️ **Convex** `status: "checked_in"` (enum)

---

## 🏁 Finalisation

1.  Terminer le remplacement dans [Tournament.jsx](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/Tournament.jsx).
2.  Migrer les composants enfants listés ci-dessus.
3.  Supprimer le fichier [src/supabaseClient.js](file:///c:/Users/Dan/Documents/Fluky%20Boys/site/mon-tournoi/src/supabaseClient.js).
4.  Désinstaller `@supabase/supabase-js`.
5.  Faire un `npm run build` final pour valider.
