# Vérification Sentry - Guide de Diagnostic

## 🔍 Diagnostic

Si vous voyez dans la console : `[Monitoring] Sentry non installé`

### ✅ Vérification 1 : Package installé

Le package est installé (vous avez fait `npm install @sentry/react`), donc ce n'est pas le problème.

### ✅ Vérification 2 : Configuration .env

**Le problème est probablement la configuration !**

Vous devez créer un fichier `.env` à la racine du projet avec :

```env
# Activer le monitoring
VITE_MONITORING_ENABLED=true

# Votre DSN Sentry (obligatoire pour que Sentry fonctionne)
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**⚠️ Important** : 
- Remplacez `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx` par votre VRAI DSN Sentry
- Si vous n'avez pas encore de DSN, créez un compte sur [sentry.io](https://sentry.io) et créez un projet

### ✅ Vérification 3 : Redémarrer le serveur

Après avoir créé/modifié le `.env`, **redémarrer le serveur** :

```bash
# Arrêter (Ctrl+C)
# Puis redémarrer
npm run dev
```

## 📊 Messages de la Console

### ✅ Si ça fonctionne :
```
[Monitoring] ✅ Sentry initialisé avec succès
```

### ❌ Si le DSN n'est pas configuré :
```
[Monitoring] VITE_SENTRY_DSN non configuré. Sentry désactivé.
```

### ❌ Si le package n'est pas trouvé :
```
[Monitoring] Sentry package non trouvé. Vérifiez que @sentry/react est installé.
```

## 🎯 Étapes Rapides

1. **Créer le fichier `.env`** (s'il n'existe pas)
2. **Ajouter les variables** :
   ```env
   VITE_MONITORING_ENABLED=true
   VITE_SENTRY_DSN=votre_dsn_ici
   ```
3. **Redémarrer le serveur** (`npm run dev`)
4. **Vérifier la console** : Vous devriez voir `✅ Sentry initialisé avec succès`

## 🔗 Obtenir un DSN Sentry

1. Aller sur [https://sentry.io](https://sentry.io)
2. Créer un compte (gratuit)
3. Créer un projet React
4. Copier le DSN dans Settings > Projects > Votre Projet

## ❓ Besoin d'aide ?

Si après ces étapes vous voyez toujours le message, vérifiez :
- Le fichier `.env` est bien à la racine du projet
- Les variables commencent bien par `VITE_`
- Vous avez redémarré le serveur après modification du `.env`

