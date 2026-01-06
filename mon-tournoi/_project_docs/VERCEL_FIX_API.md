# 🔧 Correction du problème API sur Google Sites

## Problème

L'API retourne du HTML au lieu de JSON sur Google Sites, alors qu'elle fonctionne directement dans le navigateur.

## Cause

Le fichier `vercel.json` réécrivait TOUTES les routes (y compris `/api/*`) vers `index.html`, ce qui empêchait les Serverless Functions de fonctionner.

## ✅ Solution

J'ai modifié `vercel.json` pour exclure les routes `/api/*` de la réécriture.

**Avant :**
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

**Après :**
```json
{
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

Le pattern `((?!api).*)` signifie : "Toutes les routes SAUF celles qui commencent par `api`"

## 📝 Étapes

1. **Commit et push le fichier `vercel.json` modifié** :
   ```bash
   git add vercel.json
   git commit -m "Fix: Exclude API routes from SPA rewrite"
   git push
   ```

2. **Vercel va automatiquement redéployer**

3. **Tester après le redéploiement** :
   - L'API devrait maintenant fonctionner sur Google Sites ✅
   - Les routes React (`/tournament/.../public`) devraient toujours fonctionner ✅

## 🎯 Résultat

- ✅ Les routes `/api/*` sont servies par les Serverless Functions (JSON)
- ✅ Les autres routes sont servies par `index.html` (React Router)

