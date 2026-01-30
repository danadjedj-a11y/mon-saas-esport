# 🔐 GUIDE AUTHENTIFICATION CLERK + CONVEX

## ✅ Ce qui a été configuré

1. ✅ **Clerk installé** (`@clerk/clerk-react`)
2. ✅ **ConvexProviderWithClerk** configuré dans `main.jsx`
3. ✅ **Queries/Mutations users** créées
4. ✅ **Composant de test** créé (`TestConvex.tsx`)

---

## 🚀 ÉTAPES POUR ACTIVER L'AUTHENTIFICATION

### Étape 1 : Créer un compte Clerk

1. Va sur **https://clerk.com**
2. Clique sur **"Start building for free"**
3. Crée un compte (GitHub, Google, ou email)

### Étape 2 : Créer une application Clerk

1. Dans le dashboard Clerk, clique sur **"Create application"**
2. Nom : **"Fluky Boys"** ou **"Mon Tournoi"**
3. Choisis les méthodes de connexion :
   - ✅ **Email** (recommandé)
   - ✅ **Google** (optionnel)
   - ✅ **GitHub** (optionnel)
4. Clique sur **"Create application"**

### Étape 3 : Récupérer la clé publique

1. Dans le dashboard Clerk, va dans **"API Keys"**
2. Copie la **"Publishable key"** (commence par `pk_test_...`)

### Étape 4 : Ajouter la clé dans .env.local

Ajoute dans ton fichier `.env.local` :

```env
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx_REMPLACE_PAR_TA_CLE
```

### Étape 5 : Configurer Convex dans Clerk

1. Dans le dashboard Clerk, va dans **"JWT Templates"**
2. Clique sur **"New template"**
3. Choisis **"Convex"**
4. Clique sur **"Apply"**

### Étape 6 : Configurer Clerk dans Convex

1. Va sur **https://dashboard.convex.dev**
2. Sélectionne ton projet **"fluky-boys"**
3. Va dans **"Settings" → "Environment Variables"**
4. Ajoute :
   - **Name** : `CLERK_ISSUER_URL`
   - **Value** : `https://clerk.xxx.clerk.accounts.dev` (trouve l'URL dans Clerk → Settings → Domains)

---

## 🧪 TESTER L'AUTHENTIFICATION

### 1. Ajoute le composant de test dans App.jsx

```jsx
// src/App.jsx
import { SignIn, SignUp, UserButton, useUser } from "@clerk/clerk-react";
import TestConvex from "./TestConvex";

function App() {
  const { isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-dark">
      {/* Header avec bouton de connexion */}
      <header className="p-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Fluky Boys</h1>
          
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <div className="space-x-4">
              <SignIn routing="hash" />
            </div>
          )}
        </div>
      </header>

      {/* Composant de test */}
      <main>
        <TestConvex />
      </main>
    </div>
  );
}

export default App;
```

### 2. Lance l'application

```bash
npm run dev
```

### 3. Teste la connexion

1. Ouvre **http://localhost:5173**
2. Clique sur **"Sign In"**
3. Crée un compte ou connecte-toi
4. Tu devrais voir :
   - ✅ Ton email affiché
   - ✅ Profil Convex créé automatiquement
   - ✅ Liste des tournois (vide pour l'instant)
   - ✅ Bouton pour créer un tournoi de test

---

## 🎯 SYNCHRONISATION AUTOMATIQUE CLERK ↔ CONVEX

### Comment ça marche ?

1. **Utilisateur se connecte** via Clerk
2. **Clerk génère un JWT** avec les infos utilisateur
3. **Convex vérifie le JWT** et récupère l'identité
4. **Mutation `upsert`** crée/met à jour l'utilisateur dans Convex
5. **Profil synchronisé** automatiquement

### Où se passe la synchronisation ?

Dans `convex/usersMutations.ts` :

```typescript
export const upsert = mutation({
  args: { email, username, avatarUrl },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // Crée ou met à jour l'utilisateur
  }
});
```

Tu peux appeler cette mutation depuis un composant React :

```tsx
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";

function SyncUser() {
  const { user } = useUser();
  const upsertUser = useMutation(api.usersMutations.upsert);

  useEffect(() => {
    if (user) {
      upsertUser({
        email: user.primaryEmailAddress.emailAddress,
        username: user.username || user.firstName || "User",
        avatarUrl: user.imageUrl,
      });
    }
  }, [user]);
}
```

---

## 🔒 SÉCURITÉ

### Vérification d'authentification dans les mutations

Toutes les mutations vérifient l'authentification :

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Non authentifié");
}
```

### Vérification des permissions

Exemple pour créer un tournoi (organizer only) :

```typescript
const user = await ctx.db
  .query("users")
  .withIndex("by_email", (q) => q.eq("email", identity.email!))
  .first();

if (user.role !== "organizer") {
  throw new Error("Seuls les organisateurs peuvent créer des tournois");
}
```

---

## 🎨 COMPOSANTS CLERK DISPONIBLES

### SignIn / SignUp

```tsx
import { SignIn, SignUp } from "@clerk/clerk-react";

<SignIn routing="hash" />
<SignUp routing="hash" />
```

### UserButton (profil dropdown)

```tsx
import { UserButton } from "@clerk/clerk-react";

<UserButton afterSignOutUrl="/" />
```

### useUser (hook)

```tsx
import { useUser } from "@clerk/clerk-react";

const { user, isSignedIn, isLoaded } = useUser();
```

---

## ✅ CHECKLIST

- [ ] Compte Clerk créé
- [ ] Application Clerk créée
- [ ] Clé publique copiée dans `.env.local`
- [ ] JWT Template "Convex" configuré dans Clerk
- [ ] `CLERK_ISSUER_URL` ajouté dans Convex
- [ ] Composant de test ajouté dans App.jsx
- [ ] Application lancée (`npm run dev`)
- [ ] Connexion testée
- [ ] Profil Convex créé automatiquement
- [ ] Tournoi de test créé

---

## 🆘 PROBLÈMES COURANTS

### "Non authentifié" lors de la création de tournoi

→ Vérifie que `CLERK_ISSUER_URL` est bien configuré dans Convex

### Profil Convex non créé

→ Appelle manuellement `upsertUser` après la connexion

### Erreur "Invalid JWT"

→ Vérifie que le JWT Template "Convex" est bien configuré dans Clerk

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Teste la connexion
2. ✅ Crée un tournoi de test
3. ✅ Vérifie dans le dashboard Convex que les données sont bien créées
4. Crée les autres queries/mutations (teams, matches, etc.)
5. Migre les composants existants vers Convex

**Dis-moi quand tu as fini de configurer Clerk ! 😊**
