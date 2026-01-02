# 🔧 Solution pour l'erreur NetworkError sur Google Sites

## Problème

L'erreur "NetworkError when attempting to fetch resource" signifie que Google Sites ne peut pas accéder à votre API sur Vercel.

**Cause :** Vercel ne sert pas les routes API créées avec le middleware Vite. Il faut utiliser des Serverless Functions Vercel.

## ✅ Solution

J'ai créé un fichier Serverless Function pour Vercel : `api/tournament.js`

### Étapes pour corriger :

1. **Pousser les nouveaux fichiers sur Vercel** :
   - Le fichier `api/tournament.js` doit être dans votre repository
   - Pousser vers GitHub (si vous utilisez GitHub avec Vercel)
   - Vercel va automatiquement détecter le fichier et créer la fonction

2. **Vérifier que les variables d'environnement sont configurées** :
   - Allez sur Vercel Dashboard
   - Sélectionnez votre projet
   - Settings > Environment Variables
   - Vérifiez que vous avez :
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

3. **Redéployer sur Vercel** :
   - Si vous utilisez GitHub, faites un commit et push
   - Ou allez sur Vercel Dashboard > Deployments > Redeploy

4. **Tester l'API** :
   ```
   https://mon-saas-esport.vercel.app/api/tournament/65acf74c-ec4d-4527-9291-51de5b67ca13/info
   ```
   Vous devriez voir du JSON.

5. **Mettre à jour le code sur Google Sites** :
   - Le code embed devrait maintenant fonctionner
   - Si l'erreur persiste, vérifiez les logs Vercel

## 📝 Note

Le fichier `api/tournament.js` utilise la syntaxe Vercel Serverless Functions standard. Il sera automatiquement détecté par Vercel et servira les routes `/api/tournament/{id}/{endpoint}`.

## 🔍 Vérifications

Si ça ne fonctionne toujours pas :

1. Vérifiez les logs Vercel pour voir les erreurs
2. Testez l'URL de l'API directement dans le navigateur
3. Vérifiez que les variables d'environnement sont bien configurées
4. Vérifiez que le fichier `api/tournament.js` est bien dans votre repository

