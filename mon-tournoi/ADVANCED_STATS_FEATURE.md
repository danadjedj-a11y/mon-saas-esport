# 📊 Statistiques Avancées

## Description

Le système de statistiques avancées permet aux utilisateurs de visualiser leurs performances détaillées, celles de leurs équipes, et de consulter les classements globaux avec des graphiques interactifs.

## Fonctionnalités

### ✅ Page Statistiques (StatsDashboard)

**Graphiques et Visualisations** :
- **Graphique en secteurs** : Répartition des résultats (Victoires/Défaites/Matchs nuls)
- **Graphique en barres** : Performance par mois (derniers 12 mois)
- **Statistiques par jeu** : Performance détaillée pour chaque jeu

**Statistiques Affichées** :
- Matchs totaux
- Victoires / Défaites / Matchs nuls
- Win Rate (%)
- Différence de scores (score pour - score contre)
- Statistiques par tournoi (détail de chaque participation)
- Performance par jeu (Victoires, Défaites, Win Rate par jeu)

**Fonctionnalités** :
- Sélection d'équipe (si plusieurs équipes)
- Graphiques interactifs avec Recharts
- Navigation vers les tournois depuis les statistiques

### ✅ Classement Global (Leaderboard)

**Fonctionnalités** :
- Classement de toutes les équipes
- Tri par : Win Rate, Victoires, ou Matchs joués
- Filtre par jeu
- Mise en évidence du top 3 (Or, Argent, Bronze)
- Statistiques affichées :
  - Rang
  - Nom de l'équipe avec logo
  - Matchs joués
  - Victoires / Défaites
  - Win Rate
  - Différence de scores
  - Nombre de tournois

**Design** :
- Tableau responsive
- Hover effects
- Couleurs pour le top 3
- Style moderne et lisible

### ✅ Profil Joueur Amélioré (Profile)

**Nouveau** :
- **Section Paramètres** (gauche) :
  - Modification du pseudo
  - Modification de la photo de profil (URL)
  - Aperçu de la photo

- **Section Statistiques** (droite) :
  - Statistiques globales du joueur
  - Matchs joués (toutes équipes confondues)
  - Win Rate global
  - Victoires / Défaites totales
  - Nombre d'équipes
  - Nombre de tournois
  - Bouton vers les statistiques détaillées

## Structure des Données

### Statistiques d'Équipe

```javascript
{
  totalMatches: number,      // Nombre total de matchs
  wins: number,              // Victoires
  losses: number,            // Défaites
  draws: number,             // Matchs nuls
  winRate: number,           // Pourcentage de victoires
  avgScoreFor: number,       // Score moyen pour
  avgScoreAgainst: number,   // Score moyen contre
  scoreDifference: number    // Différence totale
}
```

### Statistiques Joueur

```javascript
{
  totalMatches: number,      // Matchs joués (toutes équipes)
  wins: number,              // Victoires totales
  losses: number,            // Défaites totales
  draws: number,             // Matchs nuls totaux
  winRate: number,           // Win Rate global
  tournamentsCount: number,  // Nombre de tournois
  teamsCount: number         // Nombre d'équipes
}
```

## Installation

### 1. Installation de Recharts

```bash
npm install recharts
```

✅ Déjà installé automatiquement

### 2. Routes

Les routes sont déjà configurées dans `App.jsx` :
- `/stats` : Page de statistiques détaillées
- `/leaderboard` : Classement global
- `/profile` : Profil avec statistiques

### 3. Navigation

- Bouton "📊 Statistiques" dans le Dashboard
- Bouton "🏆 Classement" dans le Dashboard
- Bouton "👤 Profil" dans le Dashboard

## Utilisation

### Pour les Joueurs

1. **Voir ses statistiques** :
   - Aller dans "📊 Statistiques"
   - Sélectionner une équipe
   - Consulter les graphiques et statistiques

2. **Voir le classement** :
   - Aller dans "🏆 Classement"
   - Filtrer par jeu si nécessaire
   - Trier par critère souhaité

3. **Voir son profil** :
   - Aller dans "👤 Profil"
   - Voir les statistiques rapides à droite
   - Modifier les paramètres à gauche

### Pour les Organisateurs

Les organisateurs peuvent aussi utiliser toutes ces fonctionnalités pour voir les statistiques de leurs équipes.

## Composants

### StatsDashboard.jsx
- Composant principal pour les statistiques d'équipe
- Utilise Recharts pour les graphiques
- Gère la sélection d'équipe
- Affiche les statistiques par tournoi

### Leaderboard.jsx
- Classement global de toutes les équipes
- Filtres et tri
- Design de tableau professionnel

### Profile.jsx (Amélioré)
- Paramètres du profil (gauche)
- Statistiques rapides (droite)
- Navigation vers les statistiques détaillées

## Graphiques

### Technologies Utilisées

- **Recharts** : Bibliothèque de graphiques React
  - PieChart : Graphique en secteurs
  - BarChart : Graphique en barres
  - ResponsiveContainer : Graphiques responsives

### Types de Graphiques

1. **Graphique en secteurs** (Pie Chart)
   - Répartition Victoires/Défaites/Matchs nuls
   - Couleurs distinctes par catégorie

2. **Graphique en barres** (Bar Chart)
   - Performance par mois
   - Victoires vs Défaites
   - Données des 12 derniers mois

## Améliorations Futures

- 📈 **Graphique de tendance** : Évolution du Win Rate dans le temps
- 🎮 **Statistiques par format** : Performance en Elimination vs Round Robin
- 📊 **Heatmap** : Activité par jour/semaine
- 🏆 **Badges/Achievements** : Récompenses basées sur les performances
- 📱 **Export PDF** : Télécharger ses statistiques
- 🔄 **Comparaison** : Comparer deux équipes
- 📅 **Calendrier de performance** : Vue calendrier avec matchs
- 💪 **Streaks** : Séries de victoires/défaites
- 🎯 **Statistiques avancées par jeu** : Stats spécifiques (K/D pour FPS, etc.)

## Notes Techniques

### Performance

- Les statistiques sont calculées côté client (React)
- Pas de table de cache (pour l'instant)
- Optimisation possible : créer une table `team_stats` pour cache

### Requêtes SQL

Les statistiques sont calculées en :
1. Récupérant tous les matchs terminés
2. Filtrant par équipe
3. Calculant les stats en JavaScript

**Optimisation future** : Créer des vues SQL ou des fonctions PostgreSQL pour calculer les stats côté serveur.

### Recharts

- Bibliothèque légère et performante
- Responsive par défaut
- Personnalisation facile des couleurs et styles
- Support TypeScript

## Exemples de Statistiques Affichées

### Statistiques Globales

```
Matchs totaux: 42
Victoires: 28
Défaites: 12
Matchs nuls: 2
Win Rate: 66.7%
Différence de scores: +156
```

### Par Tournoi

```
Tournoi: Weekly Cup #42
Matchs: 8
Victoires: 6
Défaites: 2
Win Rate: 75%
```

### Par Jeu

```
Valorant:
  Victoires: 15
  Défaites: 5
  Win Rate: 75%

CS2:
  Victoires: 8
  Défaites: 4
  Win Rate: 66.7%
```

## Sécurité

- Les statistiques sont basées sur les données publiques des matchs
- Aucune information privée n'est exposée
- Les classements sont publics (accessible à tous les utilisateurs connectés)

## Design

- **Thème dark** : Cohérent avec le reste de l'application
- **Couleurs** :
  - Bleu (#3498db) : Matchs, Info
  - Vert (#2ecc71) : Victoires
  - Rouge (#e74c3c) : Défaites
  - Orange (#f39c12) : Win Rate
  - Violet (#9b59b6) : Tournois
- **Responsive** : Compatible mobile/tablette/desktop
- **Animations** : Transitions fluides sur les graphiques

