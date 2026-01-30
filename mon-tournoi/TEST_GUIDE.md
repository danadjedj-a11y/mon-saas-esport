# 🧪 TEST CLERK + CONVEX

## ✅ Configuration terminée !

**Fichiers modifiés :**
- ✅ `.env.local` : Clé Clerk corrigée (VITE_CLERK_PUBLISHABLE_KEY)
- ✅ `src/App.jsx` : Version simplifiée pour tester
- ✅ `src/TestAuth.tsx` : Page de test complète
- ✅ `src/App.backup.jsx` : Sauvegarde de l'ancien App.jsx

---

## 🚀 TESTER MAINTENANT

### 1. Ouvre l'application

L'app devrait déjà tourner sur **http://localhost:5173**

Si ce n'est pas le cas :
```bash
npm run dev
```

### 2. Que vas-tu voir ?

Une page de test avec :
- 🔐 **Bouton "Se connecter"** en haut à droite
- 📊 **Section Authentification** (statut de connexion)
- 🏆 **Section Tournois** (liste vide pour l'instant)
- ⚡ **Section Actions** (créer un tournoi de test)

### 3. Teste la connexion

1. Clique sur **"Se connecter"**
2. Crée un compte ou connecte-toi
3. Une fois connecté, tu verras :
   - ✅ Ton profil Clerk
   - ⚠️ "Profil Convex non trouvé" (normal)
4. Clique sur **"Synchroniser le profil"**
5. Tu devrais voir :
   - ✅ Profil Convex synchronisé
   - Ton ID, username, email, rôle

### 4. Teste la création de tournoi

1. Clique sur **"Créer un tournoi de test"**
2. Un tournoi devrait apparaître dans la liste
3. Vérifie dans le **Dashboard Convex** que les données sont bien créées

---

## 🔍 VÉRIFICATIONS

### Dans le navigateur

- [ ] La page se charge sans erreur
- [ ] Le bouton "Se connecter" fonctionne
- [ ] La connexion Clerk fonctionne
- [ ] Le profil se synchronise
- [ ] Un tournoi peut être créé
- [ ] Le tournoi apparaît dans la liste

### Dans la console

- [ ] Pas d'erreur "supabaseClient"
- [ ] Pas d'erreur "Non authentifié"
- [ ] Pas d'erreur de connexion Convex

### Dans le Dashboard Convex

1. Va sur **https://dashboard.convex.dev**
2. Sélectionne ton projet **"fluky-boys"**
3. Va dans **"Data"**
4. Vérifie que les tables sont créées :
   - `users` (ton profil)
   - `tournaments` (ton tournoi de test)

---

## 🐛 SI ÇA NE FONCTIONNE PAS

### Erreur "Invalid JWT"

**Solution :**
1. Va dans **Clerk Dashboard** → JWT Templates
2. Vérifie que le template "Convex" est bien appliqué
3. Va dans **Convex Dashboard** → Settings → Environment Variables
4. Vérifie que `CLERK_ISSUER_URL` est bien configuré

### Erreur "Non authentifié"

**Solution :**
- Vérifie que tu es bien connecté via Clerk
- Clique sur "Synchroniser le profil"
- Recharge la page

### Erreur "Cannot find module"

**Solution :**
```bash
npm install
```

### L'app ne se lance pas

**Solution :**
```bash
# Arrête le serveur (Ctrl+C)
# Relance
npm run dev
```

---

## 📝 PROCHAINES ÉTAPES

Une fois que tout fonctionne :

1. **Migrer HomePage.jsx** (liste des tournois)
2. **Migrer Auth.jsx** (remplacer Supabase par Clerk)
3. **Migrer CreateTournament.jsx** (utiliser Convex)
4. **Progressivement migrer les autres composants**

---

## 🔄 REVENIR À L'ANCIEN APP.JSX

Si tu veux revenir en arrière :

```bash
# Restaure l'ancien App.jsx
Copy-Item -Path "src\App.backup.jsx" -Destination "src\App.jsx" -Force
```

---

**Teste maintenant et dis-moi ce que tu vois ! 🚀**
