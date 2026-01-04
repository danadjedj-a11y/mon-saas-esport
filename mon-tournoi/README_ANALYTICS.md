# Guide Analytics & Monitoring - Fluky Boys

## 📋 Vue d'ensemble

Fluky Boys intègre des outils d'analytics et de monitoring pour suivre l'utilisation et détecter les erreurs.

## 🔧 Configuration

### Variables d'Environnement

Créer un fichier `.env` à la racine du projet (s'il n'existe pas déjà) et ajouter :

```env
# Analytics
VITE_ANALYTICS_ENABLED=true
VITE_GA_ID=G-XXXXXXXXXX  # Google Analytics ID (optionnel)
VITE_PLAUSIBLE_DOMAIN=flukyboys.com  # Plausible Domain (optionnel)

# Monitoring
VITE_MONITORING_ENABLED=true
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx  # Sentry DSN (optionnel)
VITE_ERROR_ENDPOINT=https://api.example.com/errors  # Endpoint personnalisé (optionnel)
```

## 📊 Analytics

### Google Analytics

1. Créer un compte Google Analytics
2. Créer une propriété pour le site
3. Récupérer l'ID de mesure (G-XXXXXXXXXX)
4. Ajouter `VITE_GA_ID` dans `.env`

### Plausible

1. Créer un compte sur [Plausible.io](https://plausible.io)
2. Ajouter votre domaine
3. Ajouter `VITE_PLAUSIBLE_DOMAIN` dans `.env`

### Utilisation dans le Code

```javascript
import analytics from './utils/analytics';

// Événement personnalisé
analytics.trackEvent('button_clicked', {
  button_name: 'create_tournament',
  page: 'homepage'
});

// Événements prédéfinis
analytics.trackTournamentCreated(tournamentId, tournamentName);
analytics.trackTournamentJoined(tournamentId);
analytics.trackMatchCompleted(matchId, tournamentId);
analytics.trackCommentAdded(tournamentId);
analytics.trackBadgeEarned(badgeId, badgeName);

// Page vue
analytics.trackPageView('/tournament/123');
```

## 🚨 Monitoring

### Sentry

1. Créer un compte sur [Sentry.io](https://sentry.io)
2. Créer un projet React
3. Récupérer le DSN
4. Ajouter `VITE_SENTRY_DSN` dans `.env`
5. Installer le package :
   ```bash
   npm install @sentry/react
   ```
6. Redémarrer le serveur de développement après l'installation
   
   **Note** : Le monitoring fonctionnera même sans Sentry installé. Les erreurs seront simplement loggées dans la console et envoyées à l'endpoint personnalisé si configuré.
   
   **Chargement dynamique** : Sentry est chargé dynamiquement via `sentryLoader.js`, ce qui permet au code de fonctionner même si le package n'est pas installé. Vite est configuré pour gérer automatiquement la conversion CommonJS/ESM.

### Utilisation dans le Code

```javascript
import monitoring from './utils/monitoring';

// Capturer une erreur
try {
  // Code qui peut échouer
} catch (error) {
  monitoring.captureError(error, {
    context: 'tournament_creation',
    tournamentId: tournamentId
  });
}

// Capturer un message
monitoring.captureMessage('Tournament created successfully', 'info', {
  tournamentId: tournamentId
});

// Ajouter du contexte utilisateur
monitoring.setUser({
  id: user.id,
  email: user.email,
  username: user.username
});

// Ajouter du contexte personnalisé
monitoring.setContext('tournament', {
  id: tournamentId,
  name: tournamentName,
  format: 'elimination'
});
```

## 📈 Événements Suivis

### Événements Automatiques

- **Page views** : Toutes les navigations
- **User login/logout** : Connexions et déconnexions
- **Errors** : Toutes les erreurs JavaScript

### Événements Personnalisés

- `tournament_created` : Création d'un tournoi
- `tournament_joined` : Inscription à un tournoi
- `match_completed` : Fin d'un match
- `comment_added` : Ajout d'un commentaire
- `badge_earned` : Obtention d'un badge

## 🔍 Dépannage

### Analytics ne fonctionne pas

1. Vérifier que `VITE_ANALYTICS_ENABLED=true`
2. Vérifier les IDs dans `.env`
3. Vérifier la console pour les erreurs
4. Utiliser les DevTools pour vérifier les requêtes réseau

### Monitoring ne fonctionne pas

1. Vérifier que `VITE_MONITORING_ENABLED=true`
2. Vérifier le DSN Sentry dans `.env`
3. Vérifier que `@sentry/react` est installé : `npm install @sentry/react`
4. Redémarrer le serveur après l'installation
5. Vérifier la console pour les erreurs
6. Vérifier que Sentry est bien initialisé (message `[Monitoring] ✅ Sentry initialisé avec succès`)

#### Erreurs courantes

**"require is not defined"** :
- Solution : Vérifier que `vite.config.js` contient la configuration pour gérer les modules CommonJS/ESM
- Redémarrer le serveur et vider le cache : `rm -rf node_modules/.vite`

**"Multiple Sentry Session Replay instances"** :
- Solution : Cette erreur est normalement évitée par les protections intégrées. Si elle persiste, ajouter `VITE_ENABLE_SENTRY_REPLAY=false` dans `.env` pour désactiver Session Replay en développement.

## 📚 Ressources

- [Google Analytics](https://analytics.google.com)
- [Plausible Analytics](https://plausible.io)
- [Sentry Documentation](https://docs.sentry.io/platforms/javascript/react/)

