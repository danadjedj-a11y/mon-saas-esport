# 🎮 Implémentation Best-of-X & Maps Pool

## ✅ Ce qui a été fait

### 1. Migration SQL ✅
- Colonne `best_of` dans `tournaments` (1, 3, 5, 7)
- Colonne `maps_pool` (JSON array) dans `tournaments`
- Table `match_games` pour les manches individuelles
- Table `match_vetos` pour le système de veto
- RLS policies configurées

### 2. Configuration dans CreateTournament ✅
- Sélecteur Best-of-X (1, 3, 5, 7)
- Input pour Maps Pool (liste séparée par virgules)
- Sauvegarde dans la base de données

### 3. Utilitaires (bofUtils.js) ✅
- `calculateMatchWinner()` : Calcule le gagnant d'un match Best-of-X
- `generateVetoOrder()` : Génère l'ordre des phases de veto
- `getNextVetoTeam()` : Détermine quelle équipe doit jouer le prochain veto
- `getAvailableMaps()` : Récupère les cartes disponibles après veto
- `getMapForGame()` : Récupère la carte pour une manche donnée

## 🚧 À implémenter

### 4. MatchLobby.jsx - Affichage des manches

#### États à ajouter :
```javascript
const [tournamentBestOf, setTournamentBestOf] = useState(1);
const [tournamentMapsPool, setTournamentMapsPool] = useState([]);
const [matchGames, setMatchGames] = useState([]);
const [vetos, setVetos] = useState([]);
```

#### Dans fetchMatchDetails :
- Récupérer `best_of` et `maps_pool` du tournoi
- Récupérer les `match_games` du match
- Récupérer les `match_vetos` du match

#### UI à créer :
1. **Section Veto** (si maps_pool non vide et match pas encore commencé)
   - Afficher les cartes disponibles
   - Permettre de ban/pick selon l'ordre
   - Afficher quelle équipe doit jouer le prochain veto

2. **Section Manches** (si best_of > 1)
   - Afficher chaque manche avec :
     - Numéro de manche
     - Carte jouée (si disponible)
     - Score de la manche
     - Statut (pending, in_progress, completed)
   - Permettre de déclarer le score par manche

3. **Score Global**
   - Afficher le score global (Team1 X - Y Team2)
   - Calculer automatiquement le gagnant

### 5. Logique de déclaration par manche

#### Fonction `submitGameScore(gameNumber, team1Score, team2Score)` :
1. Créer/mettre à jour le `match_game`
2. Déterminer le gagnant de la manche
3. Calculer si le match est terminé (premier à X victoires)
4. Si match terminé, mettre à jour le match principal

### 6. Tournament.jsx - Affichage

#### Afficher le score global dans les brackets :
- Si best_of > 1, afficher "2-1" au lieu de juste le score final
- Indiquer le format (BO3, BO5, etc.)

## 📋 Ordre d'implémentation recommandé

1. ✅ Migration SQL
2. ✅ Configuration CreateTournament
3. ✅ Utilitaires bofUtils
4. ⬜ Récupération des données dans MatchLobby
5. ⬜ UI des manches dans MatchLobby
6. ⬜ Système de veto (simplifié au départ)
7. ⬜ Logique de calcul du gagnant
8. ⬜ Affichage dans Tournament.jsx

## 🎯 Version Simplifiée (MVP)

Pour une première version fonctionnelle, on peut :
- Support Best-of-X (calcul du gagnant)
- Affichage des manches
- Déclaration de score par manche
- Système de veto basique (optionnel dans un premier temps)

Le système de veto complet peut être ajouté dans une version ultérieure.

## 💡 Notes

- Le système de veto est complexe et peut être simplifié
- Pour commencer, on peut juste assigner les cartes manuellement ou aléatoirement
- L'important est d'avoir le système de manches qui fonctionne

