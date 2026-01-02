# 🚀 Guide de Déploiement Vercel pour l'API

## ✅ Fichier créé

J'ai créé le fichier `api/tournament.js` qui est une Serverless Function Vercel.

## 📝 Étapes pour déployer

1. **Commit et push sur GitHub** (si vous utilisez GitHub) :
   ```bash
   git add api/tournament.js
   git commit -m "Add Vercel serverless function for API"
   git push
   ```

2. **Vercel va automatiquement redéployer** (si vous avez la connexion GitHub)

3. **OU redéployer manuellement sur Vercel** :
   - Allez sur Vercel Dashboard
   - Sélectionnez votre projet
   - Cliquez sur "Deployments" > "Redeploy"

## 🔧 Vérifier les Variables d'Environnement

1. Allez sur Vercel Dashboard
2. Sélectionnez votre projet
3. Settings > Environment Variables
4. Vérifiez que vous avez :
   - `VITE_SUPABASE_URL` = votre URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = votre clé anonyme Supabase

## 🧪 Tester l'API

Après le déploiement, testez cette URL :
```
https://mon-saas-esport.vercel.app/api/tournament/65acf74c-ec4d-4527-9291-51de5b67ca13/info
```

**Vous devriez voir du JSON** ✅

## 📌 Important

- Le fichier `api/tournament.js` sera automatiquement détecté par Vercel
- Il servira les routes `/api/tournament/{id}/{endpoint}`
- Les variables d'environnement doivent être configurées sur Vercel

## 🔍 Si ça ne fonctionne pas

1. Vérifiez les logs Vercel (Dashboard > Deployments > [Dernier déploiement] > Functions)
2. Vérifiez que les variables d'environnement sont bien configurées
3. Testez l'URL directement dans le navigateur

