# 🧪 Guide de Test de l'API (JSON Pur)

## ✅ Nouvelle API REST avec JSON Pur

L'API a été convertie pour retourner du **JSON pur** avec les headers HTTP appropriés (`Content-Type: application/json`).

---

## 🚀 Test Rapide dans le Navigateur

### Étapes :

1. **Démarrer le serveur de développement** :
   ```bash
   npm run dev
   ```

2. **Récupérer l'ID d'un tournoi** :
   - Ouvrir votre application : `http://localhost:5173`
   - Aller sur un tournoi
   - L'ID du tournoi est dans l'URL : `/tournament/{id}`

3. **Tester les endpoints directement dans le navigateur** :

   Ouvrez simplement les URLs suivantes (remplacez `{id}` par l'ID de votre tournoi) :

   ```
   http://localhost:5173/api/tournament/{id}/info
   http://localhost:5173/api/tournament/{id}/bracket
   http://localhost:5173/api/tournament/{id}/standings
   http://localhost:5173/api/tournament/{id}/results
   ```

   **Exemple concret** :
   ```
   http://localhost:5173/api/tournament/123e4567-e89b-12d3-a456-426614174000/info
   ```

4. **Résultat** :
   - ✅ Vous verrez du **JSON pur** (pas de HTML)
   - ✅ Le navigateur peut même proposer de le formater automatiquement
   - ✅ Headers HTTP corrects : `Content-Type: application/json`

---

## 🧪 Test avec la Console du Navigateur

### Test simple avec `fetch` :

```javascript
// Remplacer {id} par l'ID de votre tournoi
const tournamentId = '123e4567-e89b-12d3-a456-426614174000';

// Test endpoint info
fetch(`http://localhost:5173/api/tournament/${tournamentId}/info`)
  .then(response => response.json()) // ✅ Maintenant ça fonctionne car c'est du JSON pur !
  .then(data => console.log('Info:', data))
  .catch(error => console.error('Erreur:', error));

// Test endpoint bracket
fetch(`http://localhost:5173/api/tournament/${tournamentId}/bracket`)
  .then(response => response.json())
  .then(data => console.log('Bracket:', data));

// Test endpoint standings
fetch(`http://localhost:5173/api/tournament/${tournamentId}/standings`)
  .then(response => response.json())
  .then(data => console.log('Standings:', data));

// Test endpoint results
fetch(`http://localhost:5173/api/tournament/${tournamentId}/results`)
  .then(response => response.json())
  .then(data => console.log('Results:', data));
```

### Fonction helper pour tester tous les endpoints :

```javascript
async function testAPI(tournamentId) {
  const endpoints = ['info', 'bracket', 'standings', 'results'];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🧪 Test ${endpoint}...`);
      const response = await fetch(`http://localhost:5173/api/tournament/${tournamentId}/${endpoint}`);
      
      if (!response.ok) {
        console.error(`❌ ${endpoint}:`, response.status, response.statusText);
        continue;
      }
      
      const data = await response.json();
      console.log(`✅ ${endpoint}:`, data);
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    } catch (error) {
      console.error(`❌ ${endpoint}:`, error);
    }
  }
}

// Utilisation
testAPI('votre-tournament-id');
```

---

## 🔧 Test avec curl (Ligne de Commande)

### Windows (PowerShell) :

```powershell
# Test endpoint info
curl http://localhost:5173/api/tournament/{id}/info

# Test avec formatage JSON (nécessite jq)
curl http://localhost:5173/api/tournament/{id}/info | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Linux/Mac :

```bash
# Test endpoint info
curl http://localhost:5173/api/tournament/{id}/info

# Afficher seulement le JSON formaté (nécessite jq)
curl http://localhost:5173/api/tournament/{id}/info | jq

# Afficher les headers HTTP
curl -i http://localhost:5173/api/tournament/{id}/info
```

---

## 📬 Test avec Postman ou Insomnia

### Étapes :

1. **Installer Postman** (ou utiliser Insomnia)
   - Postman : https://www.postman.com/downloads/
   - Insomnia : https://insomnia.rest/download

2. **Créer une nouvelle requête GET** :

   - **Method** : `GET`
   - **URL** : `http://localhost:5173/api/tournament/{id}/info`
   - Remplacez `{id}` par l'ID de votre tournoi

3. **Envoyer la requête** :
   - Cliquez sur "Send"
   - ✅ Vous verrez maintenant du **JSON pur** (pas de HTML)
   - ✅ Le Content-Type sera `application/json`

4. **Vérifier les Headers** :
   - Dans l'onglet "Headers" de la réponse
   - Vérifiez que `Content-Type: application/json` est présent

---

## ✅ Vérification des Headers HTTP

Pour vérifier que l'API retourne bien du JSON avec les bons headers :

### Dans le Navigateur (DevTools) :

1. Ouvrir DevTools (F12)
2. Aller dans l'onglet "Network"
3. Faire une requête à l'API
4. Cliquer sur la requête
5. Vérifier dans l'onglet "Headers" de la réponse :
   - ✅ `Content-Type: application/json`
   - ✅ Status: `200 OK`

### Avec curl :

```bash
# Afficher les headers
curl -i http://localhost:5173/api/tournament/{id}/info

# Résultat attendu :
# HTTP/1.1 200 OK
# Content-Type: application/json
# ...
# {"tournament": {...}, ...}
```

---

## 📋 Checklist de Vérification

Pour chaque endpoint, vérifiez :

- [ ] L'URL s'ouvre correctement dans le navigateur
- [ ] Le JSON s'affiche (pas de HTML)
- [ ] Le header `Content-Type: application/json` est présent
- [ ] Les données sont correctes (vérifier quelques valeurs)
- [ ] Pas d'erreurs dans la console du navigateur
- [ ] `fetch().json()` fonctionne sans erreur
- [ ] Les données se mettent à jour si vous changez quelque chose dans le tournoi

---

## 🔍 Vérification des Données

### Endpoint `/info` :
- ✅ `tournament.name` : Nom du tournoi
- ✅ `participants_count` : Nombre de participants
- ✅ `matches_count` : Nombre de matchs

### Endpoint `/bracket` :
- ✅ `matches` : Tableau avec tous les matchs
- ✅ `rounds` : Tableau organisé par rounds
- ✅ Chaque match a `team1` et `team2` avec leurs infos

### Endpoint `/standings` :
- ✅ `standings` : Tableau trié par classement
- ✅ Pour format Suisse : présence de `buchholz_score`
- ✅ Chaque équipe a ses statistiques (wins, losses, draws)

### Endpoint `/results` :
- ✅ `results` : Tableau avec tous les matchs terminés
- ✅ Chaque résultat a un `winner` (team1 ou team2)
- ✅ Les scores sont présents

---

## 🎯 Exemple d'Utilisation Réelle

### Dans une Application Externe (JavaScript) :

```javascript
// Récupérer les informations du tournoi
async function getTournamentInfo(tournamentId) {
  const response = await fetch(`http://localhost:5173/api/tournament/${tournamentId}/info`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

// Récupérer le bracket
async function getBracket(tournamentId) {
  const response = await fetch(`http://localhost:5173/api/tournament/${tournamentId}/bracket`);
  return await response.json();
}

// Utilisation
const tournamentId = 'votre-tournament-id';
const info = await getTournamentInfo(tournamentId);
console.log(`Tournoi: ${info.tournament.name}`);
console.log(`Participants: ${info.participants_count}`);
```

### Dans une Application Python :

```python
import requests

def get_tournament_info(tournament_id):
    url = f"http://localhost:5173/api/tournament/{tournament_id}/info"
    response = requests.get(url)
    response.raise_for_status()  # Lève une exception si erreur HTTP
    return response.json()  # ✅ Fonctionne maintenant car c'est du JSON pur

# Utilisation
tournament_id = "votre-tournament-id"
info = get_tournament_info(tournament_id)
print(f"Tournoi: {info['tournament']['name']}")
print(f"Participants: {info['participants_count']}")
```

---

## ⚠️ Note sur les Variables d'Environnement

L'API utilise les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

Assurez-vous qu'elles sont définies :
- Dans un fichier `.env` à la racine du projet
- Ou dans les variables d'environnement système

Format du fichier `.env` :
```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
```

---

## 🐛 Dépannage

### Erreur "Supabase non configuré" :
- Vérifiez que les variables d'environnement sont définies
- Redémarrez le serveur de développement après modification du `.env`

### Erreur 404 :
- Vérifiez que l'URL est correcte : `/api/tournament/{id}/{endpoint}`
- Vérifiez que l'ID du tournoi est correct
- Vérifiez que l'endpoint est l'un des suivants : `info`, `bracket`, `standings`, `results`

### Erreur 500 :
- Vérifiez la console du serveur pour voir l'erreur détaillée
- Vérifiez que Supabase est accessible
- Vérifiez que le tournoi existe dans la base de données

---

## 🎉 Félicitations !

Votre API retourne maintenant du **JSON pur** avec les headers HTTP corrects, ce qui permet une intégration facile avec n'importe quelle application externe !
