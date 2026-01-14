# 📘 INSTRUCTIONS DE MIGRATION - Nouveau Système

**Date:** 2025-01-27  
**Pour:** Développeur / Équipe

---

## 🎯 OBJECTIF

Migrer progressivement l'application vers la nouvelle architecture sans casser l'existant.

---

## 📋 ÉTAPES DE MIGRATION

### ÉTAPE 1: Tester le nouveau système (MAINTENANT)

1. **Renommer les fichiers:**
   ```bash
   # Sauvegarder l'ancien App.jsx
   mv src/App.jsx src/App.OLD.jsx
   
   # Activer le nouveau App.jsx
   mv src/AppNew.jsx src/App.jsx
   ```

2. **Tester la connexion:**
   - Ouvrir http://localhost:5173
   - Tester connexion/déconnexion
   - Vérifier que les routes fonctionnent
   - Vérifier la console (pas d'erreurs)

3. **Si ça fonctionne:**
   - ✅ Continuer avec la migration
   - ✅ Supprimer `App.OLD.jsx` plus tard

4. **Si ça ne fonctionne pas:**
   - ❌ Revenir à l'ancien système
   - ❌ Débugger le problème
   - ❌ Réessayer

---

### ÉTAPE 2: Migrer HomePage (APRÈS TEST)

1. **Créer HomePage améliorée:**
   - Utiliser `useAuth()` au lieu de props
   - Utiliser `useSupabaseQuery()` pour charger tournois
   - Utiliser nouveaux composants UI (Button, Card)
   - Utiliser Design System (colors, spacing)

2. **Exemple de migration:**

**Avant (HomePage.jsx actuel):**
```javascript
export default function HomePage() {
  const [session, setSession] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    // ... code complexe
  }, []);
  
  // ... 400+ lignes
}
```

**Après (HomePage.jsx nouveau):**
```javascript
import { useAuth } from './shared/hooks';
import { useSupabaseQuery } from './shared/hooks';
import { getAllTournaments } from './shared/services/api';
import { Button, Card } from './shared/components/ui';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  
  const { data: tournaments, loading } = useSupabaseQuery(
    () => getAllTournaments({ status: ['draft', 'ongoing'] }),
    { retry: 2, showToastOnError: true }
  );
  
  // ... code simplifié (200 lignes max)
}
```

---

### ÉTAPE 3: Migrer les autres pages

**Ordre recommandé:**
1. ✅ App.jsx → AppNew.jsx (FAIT)
2. ⏳ HomePage
3. ⏳ PlayerDashboard
4. ⏳ OrganizerDashboard
5. ⏳ Profile
6. ⏳ CreateTournament
7. ⏳ Tournament page (gros refactoring)
8. ⏳ MatchLobby
9. ⏳ Autres pages...

---

## 🛠️ GUIDE D'UTILISATION

### Comment utiliser useAuth
```javascript
import { useAuth } from './shared/hooks';

function MyComponent() {
  const { 
    user,              // Utilisateur actuel
    session,           // Session Supabase
    userRole,          // 'player' | 'organizer' | 'admin'
    loading,           // État de chargement
    isAuthenticated,   // Booléen: connecté ou non
    isOrganizer,       // Booléen: est organisateur
    isAdmin,           // Booléen: est admin
    signIn,            // Fonction: se connecter
    signUp,            // Fonction: s'inscrire
    signOut,           // Fonction: se déconnecter
  } = useAuth();
  
  // Plus besoin de props session, supabase !
}
```

### Comment utiliser useSupabaseQuery
```javascript
import { useSupabaseQuery } from './shared/hooks';
import { getTournamentById } from './shared/services/api';

function TournamentView({ tournamentId }) {
  const { 
    data,       // Données retournées
    loading,    // État de chargement
    error,      // Erreur si échec
    refetch,    // Fonction pour recharger
    isSuccess,  // Booléen: succès
    isError,    // Booléen: erreur
  } = useSupabaseQuery(
    () => getTournamentById(tournamentId),
    { 
      enabled: !!tournamentId,  // Activer si tournamentId existe
      retry: 2,                 // Réessayer 2 fois si échec
      showToastOnError: true,   // Afficher toast si erreur
    }
  );
  
  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  
  return <div>{data.name}</div>;
}
```

### Comment utiliser useSupabaseSubscription
```javascript
import { useSupabaseSubscription } from './shared/hooks';

function TournamentLive({ tournamentId }) {
  const [matches, setMatches] = useState([]);
  
  // S'abonner aux changements de matchs
  useSupabaseSubscription(
    `tournament-matches-${tournamentId}`,
    [
      {
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
        event: '*',
        callback: (payload) => {
          console.log('Match mis à jour:', payload);
          // Recharger les matchs
          refetchMatches();
        },
      },
    ],
    { enabled: !!tournamentId }
  );
  
  // Cleanup automatique au démontage !
}
```

### Comment utiliser les nouveaux composants UI
```javascript
import { Button, Input, Card } from './shared/components/ui';

function MyForm() {
  return (
    <Card variant="glass" padding="lg" hover>
      <Input 
        label="Nom"
        placeholder="Entrez votre nom..."
        required
        error={hasError}
        errorMessage="Ce champ est requis"
      />
      
      <Button 
        variant="primary" 
        size="lg" 
        fullWidth
        loading={isSubmitting}
        onClick={handleSubmit}
      >
        Enregistrer
      </Button>
    </Card>
  );
}
```

### Comment utiliser le Design System
```javascript
import { colors, spacing, fonts } from './shared/constants';

function MyComponent() {
  return (
    <div style={{
      backgroundColor: colors.background.primary,
      padding: spacing[6],
      fontFamily: fonts.display,
      color: colors.text.primary,
    }}>
      Contenu
    </div>
  );
}

// Ou avec Tailwind (après configuration)
function MyComponent() {
  return (
    <div className="bg-fluky-bg p-6 font-display text-fluky-text">
      Contenu
    </div>
  );
}
```

---

## ⚠️ POINTS D'ATTENTION

### Pendant la migration
1. **Ne pas tout casser d'un coup**
   - Migrer page par page
   - Tester après chaque migration
   - Garder l'ancien code en backup

2. **Compatibilité**
   - Les anciens composants peuvent coexister avec les nouveaux
   - Utiliser progressivement les nouveaux hooks
   - Pas besoin de tout migrer en même temps

3. **Tests**
   - Tester chaque page migrée
   - Vérifier que les fonctionnalités marchent
   - Vérifier la console (pas d'erreurs)

---

## 🆘 EN CAS DE PROBLÈME

### Si App.jsx ne fonctionne pas
1. Revenir à l'ancien: `mv src/App.OLD.jsx src/App.jsx`
2. Vérifier les imports dans AppNew.jsx
3. Vérifier que les stores sont bien créés
4. Vérifier la console pour les erreurs

### Si les hooks ne fonctionnent pas
1. Vérifier que Zustand est installé: `npm list zustand`
2. Vérifier les imports
3. Vérifier la console

### Si les composants UI ne s'affichent pas
1. Vérifier que clsx est installé: `npm list clsx`
2. Vérifier les classes Tailwind
3. Vérifier que tailwind.config.js inclut les nouveaux fichiers

---

## ✅ CHECKLIST DE VALIDATION

Après chaque migration de page:
- [ ] La page s'affiche correctement
- [ ] Les fonctionnalités marchent
- [ ] Pas d'erreurs dans la console
- [ ] Pas de warnings React
- [ ] Performance OK (pas de lag)
- [ ] Responsive OK (mobile/desktop)

---

**Bonne migration !** 🚀
