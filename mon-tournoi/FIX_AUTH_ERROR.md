# 🔧 CORRECTION ERREUR "NON AUTHENTIFIÉ"

## 🐛 Problème

L'erreur "Non authentifié" apparaît car Convex ne reconnaît pas le JWT de Clerk.

![Erreur](C:/Users/Dan/.gemini/antigravity/brain/d2e10d4b-8d0d-4b84-843f-ce7d26fc984e/uploaded_media_1769736073658.png)

---

## ✅ SOLUTION

### Étape 1 : Créer auth.config.js (FAIT ✅)

J'ai créé `convex/auth.config.js` avec ta configuration Clerk.

### Étape 2 : Configurer le JWT Template dans Clerk

1. Va sur **https://dashboard.clerk.com**
2. Sélectionne ton application **"bursting-mastodon-40"**
3. Dans le menu de gauche, clique sur **"JWT Templates"**
4. Clique sur **"+ New template"**
5. Choisis **"Convex"** dans la liste
6. Clique sur **"Apply"**

### Étape 3 : Vérifier le domaine Clerk

Dans `convex/auth.config.js`, j'ai mis :
```javascript
domain: "https://bursting-mastodon-40.clerk.accounts.dev"
```

**Vérifie que c'est le bon domaine :**
1. Va sur **Clerk Dashboard**
2. Clique sur **"Configure"** → **"Domains"**
3. Copie le **"Frontend API"** (devrait être `https://bursting-mastodon-40.clerk.accounts.dev`)
4. Si c'est différent, modifie `convex/auth.config.js`

### Étape 4 : Redéployer Convex

```bash
npx convex dev
```

Convex va détecter le nouveau fichier `auth.config.js` et reconfigurer l'authentification.

---

## 🧪 TESTER À NOUVEAU

1. **Recharge la page** (F5)
2. **Connecte-toi** via Clerk
3. **Clique sur "Synchroniser le profil"**
4. Ça devrait fonctionner ! ✅

---

## 🔍 SI ÇA NE FONCTIONNE TOUJOURS PAS

### Vérifier que le JWT Template est bien configuré

1. Clerk Dashboard → JWT Templates
2. Tu devrais voir un template **"Convex"** avec un ✅
3. Clique dessus pour voir les détails
4. Vérifie que **"Token Lifetime"** est au moins 60 secondes

### Vérifier les logs Convex

1. Va sur **https://dashboard.convex.dev**
2. Sélectionne ton projet **"fluky-boys"**
3. Clique sur **"Logs"**
4. Regarde s'il y a des erreurs d'authentification

### Vérifier la clé Clerk

Dans `.env.local`, vérifie que la clé commence bien par `pk_test_` :
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YnVyc3RpbmctbWFzdG9kb24tNDAuY2xlcmsuYWNjb3VudHMuZGV2JA
```

---

## 📝 ALTERNATIVE : Utiliser l'issuer URL

Si le problème persiste, tu peux aussi configurer l'issuer URL dans Convex Dashboard :

1. Va sur **https://dashboard.convex.dev**
2. Sélectionne **"fluky-boys"**
3. Va dans **"Settings"** → **"Environment Variables"**
4. Ajoute :
   - **Name** : `CLERK_ISSUER_URL`
   - **Value** : `https://bursting-mastodon-40.clerk.accounts.dev`

---

**Essaie maintenant et dis-moi si ça fonctionne ! 😊**
