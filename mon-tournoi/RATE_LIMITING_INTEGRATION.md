# 🔗 Intégration du Rate Limiting dans les Composants React

## 📋 Vue d'ensemble

Le système de rate limiting backend est maintenant intégré dans tous les composants critiques de l'application React. Les utilisateurs recevront des messages d'erreur clairs et informatifs lorsqu'ils atteignent les limites.

## ✅ Composants Mis à Jour

### 1. CreateTournament.jsx
- **Opération protégée** : Création de tournois
- **Message d'erreur** : "Vous avez créé X tournois dans les dernières Y minutes. Veuillez attendre avant d'en créer un nouveau."
- **Limite** : 5 tournois par heure

### 2. CreateTeam.jsx
- **Opération protégée** : Création d'équipes
- **Message d'erreur** : "Vous avez créé X équipes dans les dernières Y minutes. Veuillez attendre avant d'en créer une nouvelle."
- **Limite** : 10 équipes par heure

### 3. CommentSection.jsx
- **Opération protégée** : Post de commentaires
- **Message d'erreur** : "Vous avez posté X commentaires dans les dernières Y minutes. Veuillez attendre avant d'en poster un nouveau."
- **Limite** : 20 commentaires par heure

### 4. FollowButton.jsx
- **Opération protégée** : Follow/Unfollow
- **Message d'erreur** : "Vous avez effectué X actions de suivi dans les dernières Y minutes. Veuillez attendre avant d'en effectuer une autre."
- **Limite** : 50 actions par heure

### 5. TeamJoinButton.jsx
- **Opération protégée** : Inscriptions aux tournois
- **Message d'erreur** : "Vous vous êtes inscrit à X tournois dans les dernières Y minutes. Veuillez attendre avant de vous inscrire à un autre."
- **Limite** : 10 inscriptions par heure

### 6. JoinButton.jsx
- **Opération protégée** : Inscriptions aux tournois (version simple)
- **Message d'erreur** : Message générique pour les inscriptions
- **Limite** : 10 inscriptions par heure

## 🛠️ Utilitaire : rateLimitHandler.js

Un utilitaire centralisé a été créé pour gérer les erreurs de rate limiting :

### Fonctions disponibles

#### `isRateLimitError(error)`
Vérifie si une erreur est liée au rate limiting.

```javascript
import { isRateLimitError } from './utils/rateLimitHandler';

if (isRateLimitError(error)) {
  // C'est une erreur de rate limiting
}
```

#### `extractRateLimitInfo(error)`
Extrait les informations du rate limiting depuis l'erreur.

```javascript
import { extractRateLimitInfo } from './utils/rateLimitHandler';

const info = extractRateLimitInfo(error);
// { max_requests: 5, window_minutes: 60, operation_type: 'tournament_create' }
```

#### `getRateLimitMessage(error, operationName)`
Génère un message d'erreur utilisateur-friendly.

```javascript
import { getRateLimitMessage } from './utils/rateLimitHandler';

const message = getRateLimitMessage(error, 'créations de tournois');
// "Vous avez créé 5 tournois dans les dernières 60 minutes..."
```

#### `handleRateLimitError(error, operationName)`
Fonction principale qui gère toutes les erreurs et retourne un message approprié.

```javascript
import { handleRateLimitError } from './utils/rateLimitHandler';

try {
  // Opération qui peut échouer
} catch (error) {
  const errorMessage = handleRateLimitError(error, 'créations de tournois');
  toast.error(errorMessage);
}
```

## 📝 Messages d'Erreur par Type d'Opération

| Type d'Opération | Message |
|------------------|---------|
| `tournament_create` | "Vous avez créé X tournois dans les dernières Y minutes. Veuillez attendre avant d'en créer un nouveau." |
| `team_create` | "Vous avez créé X équipes dans les dernières Y minutes. Veuillez attendre avant d'en créer une nouvelle." |
| `comment_post` | "Vous avez posté X commentaires dans les dernières Y minutes. Veuillez attendre avant d'en poster un nouveau." |
| `registration` | "Vous vous êtes inscrit à X tournois dans les dernières Y minutes. Veuillez attendre avant de vous inscrire à un autre." |
| `template_create` | "Vous avez créé X templates dans les dernières Y minutes. Veuillez attendre avant d'en créer un nouveau." |
| `follow_toggle` | "Vous avez effectué X actions de suivi dans les dernières Y minutes. Veuillez attendre avant d'en effectuer une autre." |
| `score_report` | "Vous avez déclaré X scores dans les dernières Y minutes. Veuillez attendre avant d'en déclarer un autre." |
| `check_in` | "Vous avez effectué X check-ins dans les dernières Y minutes. Veuillez attendre avant d'en effectuer un autre." |

## 🔄 Flux d'Erreur

1. **Backend** : Le trigger PostgreSQL détecte que la limite est atteinte et lève une exception
2. **Supabase Client** : L'erreur est retournée dans le champ `error` de la réponse
3. **Composant React** : L'erreur est capturée dans un `try/catch` ou vérifiée via `if (error)`
4. **rateLimitHandler** : La fonction `handleRateLimitError()` analyse l'erreur et génère un message approprié
5. **Toast** : Le message est affiché à l'utilisateur via `toast.error()`

## 🎨 Exemple d'Utilisation

```javascript
import { toast } from './utils/toast';
import { handleRateLimitError } from './utils/rateLimitHandler';

const handleCreateTournament = async () => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .insert([{ name: 'Mon Tournoi', ... }]);
    
    if (error) {
      const errorMessage = handleRateLimitError(error, 'créations de tournois');
      toast.error(errorMessage);
      return;
    }
    
    toast.success('Tournoi créé avec succès !');
  } catch (err) {
    const errorMessage = handleRateLimitError(err, 'créations de tournois');
    toast.error(errorMessage);
  }
};
```

## ✅ Avantages

1. **Messages clairs** : Les utilisateurs comprennent exactement pourquoi leur action a échoué
2. **Informations utiles** : Les messages indiquent la limite et la fenêtre de temps
3. **Centralisé** : Un seul utilitaire gère tous les messages d'erreur
4. **Extensible** : Facile d'ajouter de nouveaux types d'opérations
5. **Cohérent** : Tous les composants utilisent le même système

## 🔧 Personnalisation

Pour personnaliser les messages d'erreur, modifiez le fichier `src/utils/rateLimitHandler.js` :

```javascript
const operationMessages = {
  'tournament_create': `Votre message personnalisé ici...`,
  // ...
};
```

## 📚 Voir Aussi

- `rate_limiting_backend.sql` - Script SQL pour le backend
- `RATE_LIMITING_GUIDE.md` - Guide complet du système de rate limiting

