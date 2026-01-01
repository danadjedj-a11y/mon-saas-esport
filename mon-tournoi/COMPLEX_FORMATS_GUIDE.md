# 🏆 Guide d'Implémentation des Formats Complexes

## Double Elimination

### Concept
Le Double Elimination consiste en deux brackets :
- **Winners Bracket** : Les équipes commencent ici. Une défaite les envoie dans le Losers Bracket.
- **Losers Bracket** : Les équipes éliminées s'y retrouvent. Une nouvelle défaite = élimination définitive.
- **Grand Finals** : Le gagnant du Winners Bracket affronte le gagnant du Losers Bracket. Si le gagnant des Losers gagne, il y a un Reset (match de plus).

### Structure de Données

```sql
-- Ajouter un champ pour identifier le bracket
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS bracket_type VARCHAR(20); -- 'winners' ou 'losers'

-- Ajouter un champ pour identifier si c'est un reset match
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS is_reset BOOLEAN DEFAULT FALSE;
```

### Logique de Génération

1. **Winners Bracket Round 1** : Toutes les équipes (comme Single Elimination)
2. **Winners Bracket suivants** : Les gagnants avancent
3. **Losers Bracket Round 1** : Les perdants du Round 1 des Winners
4. **Losers Bracket Round 2** : Les perdants du Round 2 des Winners + gagnants du Round 1 des Losers
5. **Losers Bracket suivants** : Paires alternées (perdants Winners + gagnants Losers)
6. **Grand Finals** : Gagnant Winners vs Gagnant Losers
7. **Reset (si nécessaire)** : Si le gagnant des Losers gagne le Grand Finals

### Algorithme Pseudocode

```
FONCTION generateDoubleElimination(participants):
  winnersBracket = []
  losersBracket = []
  
  // Round 1 Winners
  winnersRound1 = pairParticipants(participants)
  
  // Générer tous les rounds des Winners
  currentRound = winnersRound1
  roundNumber = 1
  TOUJOURS:
    winnersRound = []
    losersFromRound = []
    
    POUR CHAQUE paire dans currentRound:
      winnersRound.ajouter(winner)
      losersFromRound.ajouter(loser)
    
    SI winnersRound.length == 1:
      winnersChampion = winnersRound[0]
      BREAK
    
    // Les perdants vont dans Losers
    SI roundNumber == 1:
      losersBracket.ajouter(losersFromRound)
    SINON:
      losersBracket.ajouter(losersFromRound + gagnantsLosersPrécédent)
    
    currentRound = pairParticipants(winnersRound)
    roundNumber++
  
  // Générer Losers Bracket (plus complexe, nécessite tracking)
  // Grand Finals
  // Reset si nécessaire
```

### Points d'Attention
- Les équipes du Losers Bracket jouent plus de matchs
- Nécessite un tracking précis de qui joue contre qui
- L'UI doit afficher deux brackets côte à côte
- Complexité algorithmique élevée pour les transitions

## Swiss System

### Concept
- Chaque équipe joue un nombre fixe de rounds (généralement log2(nombre d'équipes))
- À chaque round, les équipes sont appariées avec des adversaires de score similaire
- Pas d'élimination : toutes les équipes jouent tous les rounds
- Classement final basé sur : Victoires > Tie-breaks (Buchholz, etc.)

### Structure de Données

```sql
-- Table pour tracker les scores suisses
CREATE TABLE IF NOT EXISTS swiss_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  buchholz_score DECIMAL DEFAULT 0, -- Score des adversaires
  opp_wins DECIMAL DEFAULT 0, -- Victoires des adversaires
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

-- Modifier matches pour avoir un champ round_number (déjà existe)
-- Ajouter un champ pour le type de pairing
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS pairing_round INTEGER;
```

### Algorithme de Pairing Suisse

```
FONCTION swissPairing(teams, roundNumber):
  // Trier par score (wins desc, buchholz desc)
  sortedTeams = trierParScore(teams)
  
  paired = []
  used = []
  
  POUR i = 0 à sortedTeams.length:
    SI sortedTeams[i] dans used:
      CONTINUER
    
    team1 = sortedTeams[i]
    bestOpponent = null
    bestScoreDiff = INFINI
    
    POUR j = i+1 à sortedTeams.length:
      SI sortedTeams[j] dans used:
        CONTINUER
      SI déjàJoué(team1, sortedTeams[j]):
        CONTINUER
      
      scoreDiff = abs(score(team1) - score(sortedTeams[j]))
      SI scoreDiff < bestScoreDiff:
        bestScoreDiff = scoreDiff
        bestOpponent = sortedTeams[j]
    
    SI bestOpponent:
      paired.ajouter([team1, bestOpponent])
      used.ajouter(team1)
      used.ajouter(bestOpponent)
    SINON:
      // Bye (équipe qui passe automatiquement)
      // Rare, mais peut arriver avec nombre impair d'équipes
  
  RETOURNER paired

FONCTION calculerBuchholz(team, allMatches):
  score = 0
  POUR CHAQUE adversaire dans adversairesDe(team):
    score += wins(adversaire)
  RETOURNER score
```

### Calcul des Tie-Breaks

1. **Victoires** : Nombre de victoires
2. **Buchholz** : Somme des victoires de tous les adversaires
3. **Opponent's Opponent Wins** : Victoires des adversaires des adversaires
4. **Head-to-Head** : Résultat direct si applicable

### Points d'Attention
- Algorithme de pairing complexe (doit éviter les matchs déjà joués)
- Calcul des tie-breaks nécessite plusieurs passes
- Gestion des byes (nombre impair d'équipes)
- UI complexe pour afficher tous les rounds et le classement

## Recommandations d'Implémentation

### Ordre Suggéré
1. **D'abord** : Améliorer l'UI existante et corriger les bugs
2. **Ensuite** : Implémenter Double Elimination (plus simple que Swiss)
3. **Enfin** : Implémenter Swiss System (le plus complexe)

### Tests Requis
- Tests unitaires pour les algorithmes de pairing
- Tests d'intégration pour la génération complète
- Tests UI pour l'affichage des brackets multiples

### Estimation de Temps
- **Double Elimination** : 6-8 heures de développement
- **Swiss System** : 10-12 heures de développement
- **Tests et débogage** : +4-6 heures



