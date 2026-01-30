# 🚀 GUIDE DE MIGRATION COMPLÈTE SUPABASE → CONVEX

## ✅ CE QUI EST FAIT

### Backend Convex Complet
- ✅ **Schema** : 17 tables avec indexes optimisés
- ✅ **Users** : getCurrent, getById, upsert, updateProfile
- ✅ **Tournaments** : listPublic, getById, create, update, updateStatus
- ✅ **Teams** : listByUser, getById, create, invite, removeMember
- ✅ **Matches** : listByTournament, getById, updateScore, updateStatus, veto
- ✅ **Registrations** : listByTournament, register, checkIn, unregister
- ✅ **Chat** : listByMatch, send
- ✅ **Notifications** : listByUser, markAsRead, create

### Configuration
- ✅ **Clerk** : Installé et configuré
- ✅ **ConvexProviderWithClerk** : Synchronisation auth
- ✅ **Composant de test** : TestConvex.tsx

---

## 📋 PLAN DE MIGRATION

### Phase 1 : Configuration Clerk (PRIORITÉ)

**1. Créer un compte Clerk**
- Va sur https://clerk.com
- Crée un compte
- Crée une application "Fluky Boys"
- Choisis les méthodes de connexion (Email + Google recommandé)

**2. Récupérer la clé**
- Dans Clerk Dashboard → API Keys
- Copie la "Publishable key" (commence par `pk_test_...`)

**3. Mettre à jour `.env.local`**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx_TA_VRAIE_CLE
```

**4. Configurer Convex dans Clerk**
- Clerk Dashboard → JWT Templates → New template → Convex
- Apply

**5. Configurer Clerk dans Convex**
- Convex Dashboard → Settings → Environment Variables
- Ajoute : `CLERK_ISSUER_URL` = `https://clerk.xxx.clerk.accounts.dev`
  (Trouve l'URL dans Clerk → Settings → Domains)

---

### Phase 2 : Créer un Wrapper Temporaire

Pour ne pas tout casser d'un coup, on va créer un wrapper qui simule Supabase mais utilise Convex.

**Créer `src/convexAdapter.ts`** :

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Adapter temporaire pour faciliter la migration
 * Simule l'API Supabase mais utilise Convex
 */

export const useConvexAdapter = () => {
  return {
    // Tournaments
    tournaments: {
      select: (fields: string) => ({
        eq: (column: string, value: any) => {
          // Utilise useQuery au lieu de Supabase
          const data = useQuery(api.tournaments.listPublic);
          return { data, error: null };
        },
      }),
    },
    
    // Teams
    teams: {
      select: (fields: string) => ({
        eq: (column: string, value: any) => {
          const data = useQuery(api.teams.listByUser, { userId: value });
          return { data, error: null };
        },
      }),
    },
    
    // Etc...
  };
};
```

---

### Phase 3 : Migrer les Composants Progressivement

#### Ordre de migration recommandé :

**1. Authentification (Priorité 1)**
- Remplacer `supabase.auth` par Clerk
- Fichiers à modifier :
  - `src/Auth.jsx`
  - `src/App.jsx`

**2. Profil Utilisateur (Priorité 2)**
- Fichiers :
  - `src/Profile.jsx`
  - `src/pages/PublicProfile.jsx`

**3. Tournois (Priorité 3)**
- Fichiers :
  - `src/HomePage.jsx` (liste des tournois)
  - `src/CreateTournament.jsx`
  - `src/Tournament.jsx`
  - `src/PublicTournament.jsx`

**4. Équipes (Priorité 4)**
- Fichiers :
  - `src/CreateTeam.jsx`
  - `src/MyTeam.jsx`
  - `src/JoinTeam.jsx`

**5. Matchs (Priorité 5)**
- Fichiers :
  - `src/MatchLobby.jsx`
  - `src/pages/MatchDetails.jsx`

**6. Chat (Priorité 6)**
- Fichiers :
  - Composants de chat dans `MatchLobby.jsx`

**7. Notifications (Priorité 7)**
- Fichiers :
  - Composants de notifications

---

## 🔄 EXEMPLE DE MIGRATION D'UN COMPOSANT

### AVANT (Supabase) - HomePage.jsx

```jsx
import { supabase } from './supabaseClient';

function HomePage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'ongoing')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(error);
      } else {
        setTournaments(data);
      }
      setLoading(false);
    }
    fetchTournaments();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {tournaments.map(t => (
        <div key={t.id}>{t.name}</div>
      ))}
    </div>
  );
}
```

### APRÈS (Convex) - HomePage.jsx

```jsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function HomePage() {
  const tournaments = useQuery(api.tournaments.listPublic, { limit: 50 });

  if (tournaments === undefined) return <div>Loading...</div>;

  return (
    <div>
      {tournaments.map(t => (
        <div key={t._id}>{t.name}</div>
      ))}
    </div>
  );
}
```

**Changements :**
- ✅ Supprime `useState` et `useEffect`
- ✅ Utilise `useQuery` au lieu de `supabase.from()`
- ✅ `t.id` → `t._id` (Convex utilise `_id`)
- ✅ Loading automatique avec `undefined`

---

## 🛠️ MODIFICATIONS GLOBALES À FAIRE

### 1. Supprimer `supabaseClient.js`

**Après** avoir migré tous les composants, supprime :
```
src/supabaseClient.js
```

### 2. Mettre à jour `App.jsx`

**AVANT** :
```jsx
import { supabase } from './supabaseClient';

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
  });
}, []);
```

**APRÈS** :
```jsx
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const { isSignedIn, user } = useUser();
const currentUser = useQuery(api.users.getCurrent);
```

### 3. Remplacer les IDs

**Rechercher/Remplacer dans tout le projet :**
- `t.id` → `t._id`
- `m.id` → `m._id`
- `u.id` → `u._id`

### 4. Remplacer les appels Supabase

**Rechercher :**
```javascript
supabase.from('table').select('*')
```

**Remplacer par :**
```javascript
useQuery(api.table.list)
```

---

## 📊 CHECKLIST DE MIGRATION

### Configuration
- [ ] Compte Clerk créé
- [ ] Clé Clerk ajoutée dans `.env.local`
- [ ] JWT Template Convex configuré dans Clerk
- [ ] `CLERK_ISSUER_URL` ajouté dans Convex

### Composants Prioritaires
- [ ] `Auth.jsx` → Clerk
- [ ] `App.jsx` → Clerk + Convex
- [ ] `HomePage.jsx` → Convex
- [ ] `Profile.jsx` → Convex
- [ ] `CreateTournament.jsx` → Convex

### Composants Secondaires
- [ ] `Tournament.jsx` → Convex
- [ ] `CreateTeam.jsx` → Convex
- [ ] `MyTeam.jsx` → Convex
- [ ] `MatchLobby.jsx` → Convex

### Nettoyage
- [ ] Supprimer `supabaseClient.js`
- [ ] Supprimer les imports Supabase
- [ ] Tester toutes les fonctionnalités
- [ ] Vérifier les erreurs console

---

## 🚨 PROBLÈMES COURANTS

### "Non authentifié" dans les mutations

**Solution :** Configure Clerk correctement (JWT Template + CLERK_ISSUER_URL)

### "Property '_id' does not exist"

**Solution :** Remplace `t.id` par `t._id` partout

### "useQuery is not a function"

**Solution :** Vérifie que `ConvexProvider` est bien dans `main.jsx`

### Real-time ne fonctionne pas

**Solution :** Avec Convex, c'est automatique ! Pas besoin de subscriptions manuelles.

---

## 💡 CONSEILS

1. **Migre un composant à la fois** : Ne touche pas à tout d'un coup
2. **Teste après chaque migration** : Vérifie que ça fonctionne
3. **Garde une branche Git** : Pour revenir en arrière si besoin
4. **Utilise le composant de test** : `TestConvex.tsx` pour vérifier que Convex fonctionne

---

## 🆘 BESOIN D'AIDE ?

**Je peux t'aider à :**
1. Migrer un composant spécifique
2. Débugger des erreurs
3. Créer des queries/mutations manquantes
4. Optimiser les performances

**Dis-moi par où tu veux commencer ! 😊**
