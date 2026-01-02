# 📺 Documentation API Publique & Overlays Stream

## Vue d'ensemble

Ce système permet d'intégrer les données de tournois dans des streams OBS et des applications externes via une API REST publique.

---

## 🎬 Overlays Stream (OBS)

### URLs Disponibles

Les overlays sont accessibles via les URLs suivantes (remplacer `{id}` par l'ID du tournoi) :

1. **Overlay Bracket** (Arbre complet) :
   ```
   /stream/overlay/{id}?type=bracket
   ```

2. **Overlay Score** (Match actuel) :
   ```
   /stream/overlay/{id}?type=score
   ```

3. **Overlay Standings** (Classement) :
   ```
   /stream/overlay/{id}?type=standings
   ```

### Utilisation dans OBS

1. **Ajouter une Source Browser** :
   - Dans OBS, cliquer sur "+" dans la liste des Sources
   - Sélectionner "Browser" (ou "Source du navigateur")

2. **Configurer l'overlay** :
   - **URL** : Entrer l'URL complète (ex: `https://votre-site.com/stream/overlay/123?type=bracket`)
   - **Largeur** : 1920px (ou selon vos besoins)
   - **Hauteur** : 1080px (ou selon vos besoins)
   - **Fond transparent** : Cocher si nécessaire (les overlays ont un fond semi-transparent par défaut)
   - **Rafraîchissement** : Décocher "Shutdown source when not visible" pour les mises à jour en temps réel

3. **Positionner l'overlay** :
   - Redimensionner et positionner comme souhaité
   - Les overlays sont conçus pour être lisibles avec un fond transparent/semi-transparent

### Types d'Overlays

#### 1. Bracket Overlay (`type=bracket`)
- Affiche l'arbre complet du tournoi
- Organisé par rounds
- Met en évidence les matchs terminés (vert) et en cours (bleu)
- Support de tous les formats (Single/Double Elimination, Swiss, Round Robin)

#### 2. Score Overlay (`type=score`)
- Affiche uniquement le match actuel/en cours
- Design centré et grand format (idéal pour le stream)
- Affiche les scores, équipes, logos
- Support Best-of-X avec progression des manches
- Met à jour automatiquement quand un match change

#### 3. Standings Overlay (`type=standings`)
- Affiche le top 10 du classement
- Pour format Suisse : Affiche victoires, défaites, nuls, Buchholz
- Pour autres formats : Affiche victoires, défaites, nuls
- Design compact et lisible

---

## 📊 Dashboard Streamer

### URL

```
/stream/dashboard/{id}
```

### Fonctionnalités

Le Dashboard Streamer est une page complète pour les commentateurs et streamers avec :

1. **Onglet "Matchs à venir"** :
   - Liste tous les matchs en attente
   - Triés par date planifiée (si disponible)
   - Informations complètes : équipes, round, bracket type

2. **Onglet "Matchs récents"** :
   - Derniers 10 matchs terminés
   - Scores finaux
   - Historique rapide

3. **Onglet "Statistiques"** :
   - Vue d'ensemble du tournoi
   - Statistiques principales (participants, matchs, etc.)
   - Classement top 5 (si format Suisse)

4. **Liens rapides vers les overlays** :
   - Boutons pour ouvrir chaque type d'overlay dans un nouvel onglet

---

## 🔌 API REST Publique

### Endpoints Disponibles

Tous les endpoints retournent des données au format JSON.

#### 1. Informations du Tournoi
```
GET /api/tournament/{id}/info
```

**Réponse** :
```json
{
  "tournament": {
    "id": "uuid",
    "name": "Nom du tournoi",
    "game": "Valorant",
    "format": "elimination",
    "status": "ongoing",
    "start_date": "2024-01-01T00:00:00Z",
    "best_of": 3,
    "maps_pool": ["Map1", "Map2"]
  },
  "participants_count": 16,
  "matches_count": 15,
  "completed_matches": 7
}
```

#### 2. Bracket (Arbre)
```
GET /api/tournament/{id}/bracket
```

**Réponse** :
```json
{
  "tournament_id": "uuid",
  "format": "elimination",
  "matches": [
    {
      "id": "uuid",
      "match_number": 1,
      "round_number": 1,
      "bracket_type": null,
      "status": "completed",
      "score_p1": 2,
      "score_p2": 1,
      "scheduled_at": "2024-01-01T10:00:00Z",
      "team1": {
        "id": "uuid",
        "name": "Équipe Alpha",
        "tag": "ALPHA",
        "logo_url": "https://..."
      },
      "team2": {
        "id": "uuid",
        "name": "Équipe Beta",
        "tag": "BETA",
        "logo_url": "https://..."
      }
    }
  ],
  "rounds": [
    {
      "round_number": 1,
      "matches": [...]
    }
  ]
}
```

#### 3. Standings (Classement)
```
GET /api/tournament/{id}/standings
```

**Réponse (Format Suisse)** :
```json
{
  "tournament_id": "uuid",
  "format": "swiss",
  "standings": [
    {
      "rank": 1,
      "team": {
        "id": "uuid",
        "name": "Équipe Alpha",
        "tag": "ALPHA",
        "logo_url": "https://..."
      },
      "wins": 5,
      "losses": 0,
      "draws": 0,
      "buchholz_score": 12.5
    }
  ]
}
```

**Réponse (Autres formats)** :
```json
{
  "tournament_id": "uuid",
  "format": "elimination",
  "standings": [
    {
      "rank": 1,
      "team": {
        "id": "uuid",
        "name": "Équipe Alpha",
        "tag": "ALPHA",
        "logo_url": "https://..."
      },
      "wins": 3,
      "losses": 0,
      "draws": 0,
      "matches_played": 3
    }
  ]
}
```

#### 4. Results (Résultats)
```
GET /api/tournament/{id}/results
```

**Réponse** :
```json
{
  "tournament_id": "uuid",
  "total_results": 7,
  "results": [
    {
      "id": "uuid",
      "match_number": 1,
      "round_number": 1,
      "bracket_type": null,
      "score_p1": 2,
      "score_p2": 1,
      "scheduled_at": "2024-01-01T10:00:00Z",
      "team1": {
        "id": "uuid",
        "name": "Équipe Alpha",
        "tag": "ALPHA",
        "logo_url": "https://..."
      },
      "team2": {
        "id": "uuid",
        "name": "Équipe Beta",
        "tag": "BETA",
        "logo_url": "https://..."
      },
      "winner": "team1"
    }
  ]
}
```

---

## 🛠️ Utilisation dans une Application Externe

### Exemple JavaScript

```javascript
// Récupérer les informations du tournoi
async function getTournamentInfo(tournamentId) {
  const response = await fetch(`https://votre-site.com/api/tournament/${tournamentId}/info`);
  const data = await response.json();
  return data;
}

// Récupérer le bracket
async function getBracket(tournamentId) {
  const response = await fetch(`https://votre-site.com/api/tournament/${tournamentId}/bracket`);
  const data = await response.json();
  return data;
}

// Récupérer le classement
async function getStandings(tournamentId) {
  const response = await fetch(`https://votre-site.com/api/tournament/${tournamentId}/standings`);
  const data = await response.json();
  return data;
}

// Utilisation
const tournamentId = 'votre-tournament-id';
const info = await getTournamentInfo(tournamentId);
const bracket = await getBracket(tournamentId);
const standings = await getStandings(tournamentId);
```

### Exemple Python

```python
import requests

def get_tournament_info(tournament_id):
    url = f"https://votre-site.com/api/tournament/{tournament_id}/info"
    response = requests.get(url)
    return response.json()

def get_bracket(tournament_id):
    url = f"https://votre-site.com/api/tournament/{tournament_id}/bracket"
    response = requests.get(url)
    return response.json()

# Utilisation
tournament_id = "votre-tournament-id"
info = get_tournament_info(tournament_id)
bracket = get_bracket(tournament_id)
```

---

## 📝 Notes Techniques

### Temps Réel

- Les overlays utilisent Supabase Realtime pour les mises à jour automatiques
- Les données sont rafraîchies automatiquement quand un match change
- Pas besoin de recharger la page

### Authentification

- **Overlays** : Accessibles sans authentification (publiques)
- **API** : Accessible sans authentification (publique)
- **Dashboard Streamer** : Accessible sans authentification (public)

### Formats Supportés

- ✅ Single Elimination
- ✅ Double Elimination
- ✅ Round Robin
- ✅ Swiss System
- ✅ Best-of-X (dans les overlays et API)

### Limitations Actuelles

- L'API utilise des routes React (pas de vraie API REST backend)
- Pour une production à grande échelle, considérer Supabase Edge Functions
- Les overlays sont optimisés pour OBS Browser Source
- Pas de mode "obsurci" (masquer les résultats) pour l'instant

---

## 🚀 Prochaines Améliorations

- [ ] Mode obsurci (cacher les résultats pour éviter les spoilers)
- [ ] API avec authentification (clés API)
- [ ] Rate limiting sur l'API
- [ ] Cache pour améliorer les performances
- [ ] Documentation OpenAPI/Swagger
- [ ] Webhooks pour les événements (nouveau match, résultat, etc.)

---

## 💡 Astuces

1. **Pour OBS** : Utiliser des dimensions fixes (1920x1080) pour éviter les problèmes de redimensionnement
2. **Performance** : Les overlays sont légers, mais éviter d'en avoir trop en même temps
3. **Design** : Les overlays utilisent un fond semi-transparent, ajuster selon vos besoins
4. **Dashboard** : Garder ouvert dans un onglet séparé pour référence rapide

