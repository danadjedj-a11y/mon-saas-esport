# 🚀 Migration Supabase → Convex : COMPLÈTE ✅

Ce document documente la migration de l'application de Supabase vers Convex.

> **État actuel** : ✅ **MIGRATION FRONTEND 100% COMPLÈTE !** Tous les fichiers React utilisent maintenant Convex. Build passe en ~6s.

---

## ✅ COMPLÉTÉ - Migration Complète

### Résumé de la migration :
- ✅ **Tous les fichiers React** migrés vers Convex
- ✅ **Tous les hooks personnalisés** migrés (useActiveMatch, useTournamentBracket, useRealtimeNotifications, useTeam, useMatch)
- ✅ **Tous les utilitaires** migrés (xpSystem, notifications, matchGenerator)
- ✅ **Tous les services API** remplacés et supprimés
- ✅ **Supabase retiré du bundle frontend**

### Schéma Convex (25 tables) :
- ✅ users, tournaments, tournamentPhases, teams, teamMembers
- ✅ teamInvitations, tournamentRegistrations, matches, matchGames
- ✅ matchVeto, matchChat, notifications, userStats, news, comments
- ✅ swissScores, tournamentFollows, teamFollows, userBadges, userLevels
- ✅ tournamentRatings, games, playerGameAccounts, bracketSlots
- ✅ gamingAccountChangeRequests

### Fichiers Core migrés :
- ✅ Tournament.jsx, TeamJoinButton.jsx, CheckInButton.jsx
- ✅ SeedingModal.jsx, SchedulingModal.jsx, AdminPanel.jsx
- ✅ Dashboard.jsx, PublicTournament.jsx, NotificationCenter.jsx
- ✅ Chat.jsx, MatchLobby.jsx, MatchDetails.jsx
- ✅ MapVetoSystem.jsx (migré vers `convex/matchVeto.ts`)

### Toutes les pages migrées :
- ✅ Pages Play (PlayHome, SearchResults, GamesDirectory, GamePage)
- ✅ Pages Embed (6 pages)
- ✅ Pages Tournament (TournamentRegister)
- ✅ Pages Organizer (25+ pages)
- ✅ Pages Profile (PrivacySettings, PublicProfile, PublicTeam)
- ✅ Pages Stream (StreamOverlay, StreamDashboard)
- ✅ Pages Admin (AdminUsers) - **NOUVEAU**

### Page d'administration des utilisateurs :
- ✅ Route : `/organizer/admin/users`
- ✅ Permet de changer les rôles : player ↔ organizer
- ✅ Query : `api.users.listAll` avec filtre par rôle
- ✅ Mutation : `api.usersMutations.updateRole`

### Fichiers supprimés (nettoyage) :
- ✅ src/supabaseClient.js
- ✅ src/App.backup.jsx
- ✅ src/components/registration/TournamentRegistration_backup.jsx
- ✅ src/shared/services/api/ (dossier entier)

---

## 🏁 État Actuel

✅ **Build réussi** : `npm run build` passe en ~6s
✅ **Dev server** : `npm run dev` fonctionne
✅ **Migration frontend** : 100% complète
✅ **Supabase** : Retiré du bundle frontend
✅ **Schéma Convex** : 25 tables vérifiées, pas de doublons

### Fichiers backend encore avec Supabase :
Ces fichiers sont des API routes serveur (Vercel), pas du code frontend :
- 🔲 server/api.js
- 🔲 api/tournament.js
- 🔲 api/tournament/[id]/[endpoint].js

### Comment changer un compte player → organizer :
1. Accéder à `/organizer/admin/users` (réservé aux organisateurs)
2. Trouver l'utilisateur dans la liste
3. Cliquer "Promouvoir" pour le passer en organizer

**Via code** :
```javascript
const updateRole = useMutation(api.usersMutations.updateRole);
await updateRole({ userId: user._id, role: "organizer" });
```

### Prochaines étapes optionnelles :
1. 🔲 Migrer les API routes Vercel vers Convex HTTP actions
2. 🔲 Désinstaller complètement `@supabase/supabase-js` après migration backend
