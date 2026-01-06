# 🔧 Configuration Vercel pour SPA React

## Problème

Vous obtenez une erreur 404 sur les routes comme `/tournament/:id/public` parce que Vercel ne sait pas qu'il doit servir `index.html` pour toutes les routes (Single Page Application).

## ✅ Solution

J'ai créé un fichier `vercel.json` avec la configuration nécessaire pour une SPA React.

### Configuration

Le fichier `vercel.json` contient :
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Cela dit à Vercel : "Pour toutes les routes, sert `index.html`" (et React Router gère le routage côté client).

## 📝 Étapes

1. **Commit et push le fichier `vercel.json`** :
   ```bash
   git add vercel.json
   git commit -m "Add Vercel config for SPA routing"
   git push
   ```

2. **Vercel va automatiquement redéployer**

3. **Tester** :
   - Allez sur : `https://mon-saas-esport.vercel.app/tournament/65acf74c-ec4d-4527-9291-51de5b67ca13/public`
   - Ça devrait maintenant fonctionner ✅

## 🔍 Pourquoi ça fonctionne ?

- **Sans `vercel.json`** : Vercel cherche un fichier physique `/tournament/.../public` qui n'existe pas → 404
- **Avec `vercel.json`** : Vercel sert `index.html` pour toutes les routes → React Router prend le relais → la route fonctionne

## 📌 Note

Les routes API (`/api/...`) ne sont PAS affectées par cette configuration car elles ont la priorité sur les rewrites.

