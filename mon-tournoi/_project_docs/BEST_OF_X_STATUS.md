# 🎮 Statut de l'Implémentation Best-of-X & Maps Pool

## ✅ Ce qui est TERMINÉ

### 1. Migration SQL (database_migrations.sql) ✅
**Fichier** : `database_migrations.sql`

**Ajouts** :
- ✅ Colonne `best_of` dans `tournaments` (INTEGER, default 1)
- ✅ Colonne `maps_pool` dans `tournaments` (JSONB array)
- ✅ Table `match_games` (pour les manches individuelles)
  - `match_id`, `game_number`, `map_name`, `team1_score`, `team2_score`, `winner_team_id`, `status`
- ✅ Table `match_vetos` (pour le système de veto)
  - `match_id`, `team_id`, `map_name`, `veto_phase`, `veto_order`
- ✅ RLS policies configurées
- ✅ Index pour performances

**Action requise** : Exécuter la migration dans Supabase SQL Editor

---

### 2. Configuration dans CreateTournament.jsx ✅
**Fichier** : `src/CreateTournament.jsx`

**Modifications** :
- ✅ Ajout du state `bestOf` (default: 1)
- ✅ Ajout du state `mapsPool` (string)
- ✅ Sélecteur Best-of-X (1, 3, 5, 7)
- ✅ Input pour Maps Pool (si bestOf > 1)
- ✅ Sauvegarde dans la base de données
- ✅ Conversion de mapsPool en JSON array

**Fonctionnalité** : Les organisateurs peuvent maintenant configurer Best-of-X et Maps Pool lors de la création

---

### 3. Utilitaires (bofUtils.js) ✅
**Fichier** : `src/bofUtils.js` (NOUVEAU)

**Fonctions créées** :
- ✅ `calculateMatchWinner(games, bestOf, team1Id, team2Id)` 
  - Calcule le gagnant d'un match Best-of-X
  - Retourne : `{ winner, team1Wins, team2Wins, isCompleted }`
  
- ✅ `generateVetoOrder(numMaps, bestOf)`
  - Génère l'ordre des phases de veto
  - Retourne : `['ban1', 'ban2', 'pick1', 'pick2', ...]`
  
- ✅ `getNextVetoTeam(vetos, vetoOrder, team1Id, team2Id)`
  - Détermine quelle équipe doit jouer le prochain veto
  - Retourne : `'team1'`, `'team2'`, ou `null`
  
- ✅ `getAvailableMaps(mapsPool, vetos)`
  - Récupère les cartes disponibles après les bans
  
- ✅ `getMapForGame(games, gameNumber, mapsPool, vetos)`
  - Récupère la carte assignée à une manche

---

## 🚧 Ce qui reste à FAIRE

### 4. MatchLobby.jsx - Interface des Manches ❌

**État actuel** : Infrastructure prête, mais UI pas encore implémentée

**À ajouter** :

1. **États** :
   ```javascript
   const [tournamentBestOf, setTournamentBestOf] = useState(1);
   const [tournamentMapsPool, setTournamentMapsPool] = useState([]);
   const [matchGames, setMatchGames] = useState([]);
   const [vetos, setVetos] = useState([]);
   ```

2. **Récupération des données** (dans `fetchMatchDetails`) :
   - Récupérer `best_of` et `maps_pool` du tournoi
   - Récupérer les `match_games` : `supabase.from('match_games').select('*').eq('match_id', id).order('game_number')`
   - Récupérer les `match_vetos` : `supabase.from('match_vetos').select('*').eq('match_id', id).order('veto_order')`

3. **UI Section Manches** (si `bestOf > 1`) :
   - Afficher chaque manche (1, 2, 3, etc.)
   - Pour chaque manche : carte, score, statut
   - Permettre de déclarer le score par manche
   - Afficher le score global (ex: 2-1)

4. **UI Section Veto** (si `mapsPool.length > 0` et match pas commencé) :
   - Afficher les cartes disponibles
   - Permettre de ban/pick selon l'ordre
   - Afficher quelle équipe doit jouer le prochain veto

5. **Fonction de déclaration par manche** :
   - Créer/mettre à jour `match_game`
   - Déterminer le gagnant de la manche
   - Calculer si le match est terminé
   - Mettre à jour le match principal si terminé

**Complexité** : Élevée (nécessite ~200-300 lignes de code)

---

### 5. Tournament.jsx - Affichage des Scores ❌

**À modifier** :

1. **Affichage dans les brackets** :
   - Si `best_of > 1`, afficher le score global (ex: "2-1") au lieu du score final uniquement
   - Indiquer le format (BO3, BO5, etc.)

2. **Récupération des données** :
   - Pour chaque match, récupérer les `match_games`
   - Calculer le score global avec `calculateMatchWinner`

**Complexité** : Moyenne (~50-100 lignes de code)

---

## 📊 Progression Globale

**Terminé** : ~60%
- ✅ Infrastructure SQL (100%)
- ✅ Configuration (100%)
- ✅ Utilitaires (100%)
- ❌ UI MatchLobby (0%)
- ❌ UI Tournament (0%)

---

## 🎯 Prochaines Étapes Recommandées

### Option 1 : Version Simplifiée (Recommandée)
1. Implémenter l'affichage des manches dans MatchLobby (sans veto pour commencer)
2. Permettre de déclarer les scores par manche
3. Calculer automatiquement le gagnant
4. Afficher le score global dans Tournament.jsx

**Temps estimé** : 3-4 heures de développement

### Option 2 : Version Complète
1. Tout ce qui est dans l'Option 1
2. + Système de veto complet
3. + Assignation automatique des cartes
4. + UI avancée

**Temps estimé** : 6-8 heures de développement

---

## 💡 Recommandation

**Je recommande de commencer par l'Option 1 (Version Simplifiée)** :
- Le système de veto peut être ajouté plus tard
- L'important est d'avoir le système de manches qui fonctionne
- On peut assigner les cartes manuellement ou aléatoirement au départ

Voulez-vous que je continue avec l'implémentation de la version simplifiée (affichage des manches + déclaration de scores) ?

