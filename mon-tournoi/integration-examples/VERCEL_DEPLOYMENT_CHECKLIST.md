# ✅ Checklist Déploiement Vercel pour Google Sites

## 🔍 Problèmes Courants après Déploiement sur Vercel

### 1. ❌ Le widget ne s'affiche pas / Page blanche

**Vérifications :**
1. Ouvrez la console du navigateur (F12)
2. Regardez l'onglet "Console" pour les erreurs
3. Regardez l'onglet "Network" pour voir si les requêtes API fonctionnent

**Si vous voyez une erreur, copiez le message complet**

---

### 2. ❌ Erreur CORS

**Symptôme :**
```
Access to fetch at 'https://...' from origin 'sites.google.com' has been blocked by CORS policy
```

**Solution :** Le CORS est déjà configuré dans `server/api.js`, mais vérifiez que le middleware fonctionne sur Vercel.

---

### 3. ❌ API retourne 404

**Vérifications :**
1. Testez l'URL directement dans le navigateur :
   ```
   https://mon-saas-esport.vercel.app/api/tournament/65acf74c-ec4d-4527-9291-51de5b67ca13/info
   ```
2. Si ça retourne 404, c'est que les routes API ne sont pas servies correctement sur Vercel

**Problème probable :** Vercel ne sert pas les routes API du middleware Vite en production.

**Solution :** Il faut utiliser Vercel Serverless Functions à la place.

---

### 4. ❌ Variables d'environnement manquantes

**Vérifications :**
1. Allez sur Vercel Dashboard
2. Sélectionnez votre projet
3. Settings > Environment Variables
4. Vérifiez que vous avez :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

**Important :** Redéployez après avoir ajouté/modifié les variables.

---

### 5. ❌ Le code embed ne fonctionne pas sur Google Sites

**Cause :** Google Sites peut bloquer certains scripts JavaScript pour des raisons de sécurité.

**Solution Alternative :** Utiliser un iframe avec une page HTML hébergée.

---

## 🧪 Test Rapide

Pour tester si votre API fonctionne sur Vercel :

1. Ouvrez cette URL dans votre navigateur :
   ```
   https://mon-saas-esport.vercel.app/api/tournament/65acf74c-ec4d-4527-9291-51de5b67ca13/info
   ```

2. **Si vous voyez du JSON** → L'API fonctionne ✅
3. **Si vous voyez une erreur 404** → Le problème vient du routage
4. **Si vous voyez une erreur 500** → Vérifiez les logs Vercel

---

## 🔧 Solution : Utiliser Vercel Serverless Functions

Si l'API ne fonctionne pas sur Vercel, il faut créer des Serverless Functions.

Je peux vous aider à créer des fonctions serverless pour Vercel. Voulez-vous que je le fasse ?

