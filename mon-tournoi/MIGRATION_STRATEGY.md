# 🔄 STRATÉGIE DE MIGRATION SUPABASE → CONVEX

## 📊 Situation Actuelle

- ✅ **Convex configuré** : Schema, queries, mutations
- ✅ **Clerk configuré** : Authentification prête
- ❌ **Problème** : L'app utilise encore Supabase partout (~700+ références)

---

## 🎯 RECOMMANDATION : Migration Progressive

### Pourquoi ?

1. **Moins risqué** : L'app continue de fonctionner
2. **Testable** : Tu peux tester Convex sur de nouvelles features
3. **Flexible** : Tu peux revenir en arrière si besoin
4. **Pragmatique** : Pas besoin de tout réécrire d'un coup

### Comment ?

**Phase 1 : Coexistence (maintenant)**
```
Frontend
  ├── Supabase (ancien code, fonctionne)
  └── Convex (nouvelles features)
```

**Phase 2 : Migration progressive (plus tard)**
```
Frontend
  ├── Supabase (de moins en moins)
  └── Convex (de plus en plus)
```

**Phase 3 : Convex uniquement (futur)**
```
Frontend
  └── Convex (100%)
```

---

## ⚡ PLAN D'ACTION IMMÉDIAT

### Étape 1 : Ajouter les variables Supabase (FAIT ✅)

J'ai ajouté dans `.env.local` :
```env
# Supabase (ancien backend - temporaire)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Action requise :** Remplace par tes vraies clés Supabase

### Étape 2 : Tester l'app avec Supabase

```bash
npm run dev
```

L'app devrait fonctionner normalement avec Supabase.

### Étape 3 : Utiliser Convex pour les nouvelles features

Exemple : Créer un nouveau composant qui utilise Convex

```tsx
// src/pages/ConvexTournaments.tsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function ConvexTournaments() {
  const tournaments = useQuery(api.tournaments.listPublic, { limit: 20 });
  
  return (
    <div>
      <h1>Tournois (Convex)</h1>
      {tournaments?.map(t => (
        <div key={t._id}>{t.name}</div>
      ))}
    </div>
  );
}
```

---

## 🔀 MIGRATION PROGRESSIVE PAR MODULE

### Ordre recommandé :

1. **Authentification** (Clerk + Convex)
   - ✅ Déjà configuré
   - Remplace `supabase.auth` par Clerk

2. **Notifications** (Convex)
   - Crée `convex/notifications.ts`
   - Remplace les appels Supabase

3. **Chat** (Convex Real-time)
   - Parfait pour Convex (real-time natif)
   - Remplace `match_chat` Supabase

4. **Tournois** (Convex)
   - Utilise les queries/mutations déjà créées
   - Migre progressivement les composants

5. **Matchs** (Convex)
   - Crée les queries/mutations
   - Migre les composants

6. **Stats** (Convex)
   - Migre en dernier (moins critique)

---

## 📝 EXEMPLE DE MIGRATION D'UN COMPOSANT

### AVANT (Supabase)

```tsx
import { supabase } from './supabaseClient';

function TournamentList() {
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    async function fetchTournaments() {
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'ongoing');
      setTournaments(data);
    }
    fetchTournaments();
  }, []);

  return (
    <div>
      {tournaments.map(t => <div key={t.id}>{t.name}</div>)}
    </div>
  );
}
```

### APRÈS (Convex)

```tsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function TournamentList() {
  const tournaments = useQuery(api.tournaments.listPublic);

  if (!tournaments) return <div>Loading...</div>;

  return (
    <div>
      {tournaments.map(t => <div key={t._id}>{t.name}</div>)}
    </div>
  );
}
```

**Avantages :**
- ✅ Moins de code
- ✅ Real-time automatique
- ✅ Type-safety
- ✅ Pas de useEffect/useState

---

## 🚀 ALTERNATIVE : Migration Complète Immédiate

Si tu veux vraiment tout migrer maintenant :

### Étapes :

1. **Créer toutes les queries/mutations Convex**
   - Teams
   - Matches
   - Registrations
   - Chat
   - Notifications
   - Stats

2. **Remplacer tous les imports**
   ```bash
   # Rechercher/Remplacer dans tout le projet
   import { supabase } from './supabaseClient'
   → import { useQuery, useMutation } from "convex/react"
   ```

3. **Réécrire tous les composants**
   - ~50+ composants à modifier
   - ~700+ références Supabase

4. **Tester tout**
   - Authentification
   - Création de tournois
   - Inscription
   - Matchs
   - Chat
   - Notifications

**Temps estimé :** 2-3 jours de travail intensif

---

## 💡 MA RECOMMANDATION

### Pour toi, je recommande :

**1. Garde Supabase pour l'instant**
- Ajoute tes clés Supabase dans `.env.local`
- L'app fonctionne normalement

**2. Utilise Convex pour les nouvelles features**
- Nouvelles pages
- Nouveaux composants
- Améliorations

**3. Migre progressivement**
- 1 module par semaine
- Teste à chaque étape
- Pas de stress

---

## 🆘 BESOIN D'AIDE ?

**Option A : Coexistence (recommandé)**
→ Donne-moi tes clés Supabase, je les ajoute dans `.env.local`

**Option B : Migration complète**
→ Je crée toutes les queries/mutations Convex et je t'aide à migrer

**Option C : Nouveau projet**
→ On crée un nouveau projet from scratch avec Convex uniquement

**Quelle option préfères-tu ? 😊**
