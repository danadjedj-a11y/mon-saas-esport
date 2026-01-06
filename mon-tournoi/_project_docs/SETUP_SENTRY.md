# Configuration Sentry - Guide Rapide

## ✅ Étape 1 : Créer un compte Sentry

1. Aller sur [https://sentry.io](https://sentry.io)
2. Créer un compte (gratuit)
3. Créer une nouvelle organisation (si nécessaire)
4. Créer un nouveau projet :
   - **Platform** : React
   - **Framework** : React
   - **Project Name** : Fluky Boys (ou autre nom)

## ✅ Étape 2 : Récupérer le DSN

Après la création du projet, Sentry vous donnera un **DSN** (Data Source Name).
Il ressemble à : `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

## ✅ Étape 3 : Configurer les variables d'environnement

Créer ou modifier le fichier `.env` à la racine du projet :

```env
# Monitoring
VITE_MONITORING_ENABLED=true
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**Important** : Remplacer `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx` par votre vrai DSN Sentry.

## ✅ Étape 4 : Redémarrer le serveur de développement

```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
npm run dev
```

## ✅ Étape 5 : Tester

1. Ouvrir l'application dans le navigateur
2. Ouvrir la console (F12)
3. Vous devriez voir : `[Monitoring] Sentry initialisé avec succès`
4. Pour tester une erreur, vous pouvez :
   - Créer une erreur intentionnelle dans le code
   - Ou utiliser la console : `throw new Error('Test Sentry')`
5. Vérifier dans le dashboard Sentry que l'erreur apparaît

## 📊 Vérification dans Sentry

1. Aller sur [https://sentry.io](https://sentry.io)
2. Sélectionner votre projet
3. Aller dans "Issues" pour voir les erreurs capturées
4. Aller dans "Performance" pour voir les métriques

## 🔧 Configuration Avancée (Optionnel)

Vous pouvez aussi configurer un endpoint personnalisé pour les erreurs :

```env
VITE_ERROR_ENDPOINT=https://votre-api.com/errors
```

## ✅ C'est tout !

Sentry est maintenant configuré et fonctionnel. Toutes les erreurs seront automatiquement capturées et envoyées à Sentry.

## 🐛 Dépannage

### Sentry ne s'initialise pas

- Vérifier que `VITE_MONITORING_ENABLED=true` dans `.env`
- Vérifier que `VITE_SENTRY_DSN` est correct
- Vérifier la console pour les erreurs
- Redémarrer le serveur de développement

### Les erreurs n'apparaissent pas dans Sentry

- Vérifier que le DSN est correct
- Vérifier la console pour les erreurs de connexion
- Vérifier que vous êtes bien connecté à Sentry
- Attendre quelques secondes (Sentry peut avoir un délai)

