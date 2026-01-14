# 📋 État des Lieux - Ce qui reste à faire

**Date:** 2025-01-27  
**Contexte:** Après Phase 1 (Fondations) et Phase 2 (Refactoring Core) - TERMINÉES

---

## ✅ CE QUI A ÉTÉ FAIT (Phase 1 + Phase 2)

### Phase 1 - Fondations ✅
- ✅ Architecture feature-based mise en place
- ✅ Design System complet (couleurs, spacing, typography, animations)
- ✅ Hooks de base (`useAuth`, `useSupabaseQuery`, `useSupabaseSubscription`, `useDebounce`)
- ✅ Composants UI réutilisables (12+ composants)
- ✅ Stores Zustand (authStore, tournamentStore, uiStore)
- ✅ Services API (tournaments, teams)

### Phase 2 - Refactoring Core ✅
- ✅ Migrations principales :
  - Tournament.jsx → useTournament
  - MatchLobby.jsx → useMatch
  - PublicTournament.jsx → useTournament
  - MyTeam.jsx → useTeam
  - HomePage, PlayerDashboard, OrganizerDashboard, Profile → Nouvelle architecture
- ✅ Améliorations :
  - CreateTournament → Validation Zod + validation temps réel
  - CreateTeam → Nouveaux composants + Validation Zod
- ✅ Schemas Zod créés (tournament, team)

### Bugs Critiques Corrigés ✅
- ✅ Dépendances useEffect corrigées
- ✅ Abonnements Supabase nettoyés
- ✅ Race conditions prévenues (AbortController, refs)
- ✅ window.location.href remplacé par navigate() (sauf cas spécifiques)
- ✅ Double authentification supprimée

---

## ❌ CE QUI RESTE À FAIRE

### 🔴 PRIORITÉ 1 - CRITIQUE

#### 1. Gestion d'Erreur Globale (P1.2 - NON FAIT)

**Statut actuel :**
- ✅ ErrorBoundary existe dans `src/components/ErrorBoundary.jsx` et est utilisé dans `App.jsx`
- ❌ Pas de page 404 personnalisée
- ❌ Pas de retry automatique sur les requêtes échouées
- ❌ Pas de gestion des erreurs réseau (offline mode)
- ❌ Pas de gestion d'erreur par route

**À faire :**
1. Créer une page 404 (`src/pages/NotFound.jsx`)
2. Créer un système de retry automatique pour les requêtes Supabase
3. Ajouter la gestion offline (détection + UI)
4. Ajouter des ErrorBoundary par route (optionnel mais recommandé)
5. Améliorer l'ErrorBoundary existant pour utiliser les nouveaux composants UI

**Estimation:** 2-3 jours (16-24h)

---

#### 2. Optimisations de Performance Manquantes (P2.4 - PARTIELLEMENT FAIT)

**Statut actuel :**
- ✅ useMemo/useCallback ajoutés dans les composants migrés
- ✅ useDebounce utilisé pour les validations
- ❌ Pas de React.memo sur les composants lourds
- ❌ Pas de code splitting avancé
- ❌ Pas de Suspense boundaries granulaires
- ❌ Optimisations manquantes dans certains composants non migrés

**Composants à optimiser :**
- `Leaderboard.jsx` - Pas de memoization, pas de pagination
- `StatsDashboard.jsx` - Pas de memoization
- `Chat.jsx` - Déjà optimisé (useCallback)
- `CheckInButton.jsx` - Déjà optimisé

**À faire :**
1. Ajouter React.memo sur les composants lourds
2. Améliorer le code splitting (chunking par route)
3. Ajouter Suspense boundaries granulaires
4. Optimiser les composants non migrés

**Estimation:** 2-3 jours (16-24h)

---

#### 3. Pagination (P2.7 - NON FAIT)

**Statut actuel :**
- ❌ Leaderboard.jsx charge toutes les données d'un coup
- ❌ OrganizerDashboard.jsx charge tous les tournois
- ❌ StatsDashboard.jsx charge toutes les stats
- ❌ Pas de pagination côté serveur

**À faire :**
1. Implémenter la pagination dans `Leaderboard.jsx`
2. Implémenter la pagination dans `OrganizerDashboard.jsx`
3. Ajouter un composant `Pagination` réutilisable
4. Utiliser `.range()` de Supabase pour la pagination

**Estimation:** 2-3 jours (16-24h)

---

### 🟡 PRIORITÉ 2 - IMPORTANT

#### 4. Refactoring des Gros Composants (P2.6 - PARTIELLEMENT FAIT)

**Statut actuel :**
- ✅ Tournament.jsx migré vers useTournament (code simplifié mais toujours gros)
- ✅ MatchLobby.jsx migré vers useMatch (code simplifié mais toujours gros)
- ❌ Tournament.jsx toujours monolithique (~871 lignes)
- ❌ MatchLobby.jsx toujours monolithique
- ❌ Pas de sous-composants extraits

**À faire :**
1. Diviser Tournament.jsx en sous-composants :
   - TournamentHeader.jsx
   - TournamentBracket.jsx
   - TournamentParticipants.jsx
   - TournamentAdminPanel.jsx
   - TournamentSwissTable.jsx
   
2. Diviser MatchLobby.jsx en sous-composants :
   - MatchHeader.jsx
   - MatchScore.jsx
   - MatchVeto.jsx
   - MatchProof.jsx
   - MatchGames.jsx

**Estimation:** 3-4 jours (24-32h)

---

#### 5. Validation Côté Client Complète (P3.9 - PARTIELLEMENT FAIT)

**Statut actuel :**
- ✅ CreateTournament → Validation Zod complète
- ✅ CreateTeam → Validation Zod complète
- ❌ Auth.jsx → Pas de validation Zod
- ❌ Chat.jsx → Validation basique (longueur max)
- ❌ Autres formulaires → Pas de validation Zod

**À faire :**
1. Créer un schéma Zod pour l'authentification
2. Ajouter validation Zod dans `Auth.jsx`
3. Améliorer la validation dans `Chat.jsx`
4. Ajouter validation dans d'autres formulaires si nécessaire

**Estimation:** 1-2 jours (8-16h)

---

### 🟢 PRIORITÉ 3 - AMÉLIORATION

#### 6. Tests (P3.8 - NON FAIT)

**Statut actuel :**
- ✅ Jest configuré
- ✅ Testing Library configuré
- ❌ Très peu de tests (3 fichiers dans `components/__tests__/`)
- ❌ Pas de tests pour les hooks personnalisés
- ❌ Pas de tests pour les composants critiques
- ❌ Pas de tests d'intégration
- ❌ Pas de tests E2E

**À faire :**
1. Tests unitaires pour les hooks (`useTournament`, `useMatch`, `useTeam`, etc.)
2. Tests unitaires pour les composants critiques
3. Tests d'intégration pour les flux principaux
4. Configuration E2E (Playwright ou Cypress)
5. Tests E2E pour les scénarios critiques

**Estimation:** 4-5 jours (32-40h)

---

#### 7. Accessibilité (a11y) (P3.10 - NON FAIT)

**Statut actuel :**
- ❌ Pas d'ARIA labels sur les boutons/inputs
- ❌ Pas de gestion du focus (tab order, focus trap)
- ❌ Pas de support clavier complet
- ❌ Pas de vérification de contraste
- ❌ Pas de tests avec lecteur d'écran

**À faire :**
1. Ajouter ARIA labels sur tous les éléments interactifs
2. Améliorer la gestion du focus (tab order, focus trap dans modales)
3. Support clavier complet (navigation, actions)
4. Vérifier et corriger le contraste des couleurs
5. Tests avec lecteur d'écran

**Estimation:** 2-3 jours (16-24h)

---

#### 8. Internationalisation Complète (P3.11 - PARTIELLEMENT FAIT)

**Statut actuel :**
- ✅ i18n configuré (i18next)
- ✅ 2 langues disponibles (fr, en)
- ❌ Pas toutes les chaînes traduites
- ❌ Pas de sélecteur de langue dans le header
- ❌ Détection automatique incomplète

**À faire :**
1. Traduire toutes les chaînes manquantes
2. Ajouter un sélecteur de langue dans le header
3. Améliorer la détection automatique de langue
4. Tester toutes les pages en FR et EN

**Estimation:** 1-2 jours (8-16h)

---

### 🔵 PRIORITÉ 4 - OPTIONAL

#### 9. Features Additionnelles (P4.12 - NON FAIT)

**À faire :**
- Dark/Light mode toggle
- Recherche/filtrage avancé (Leaderboard, OrganizerDashboard)
- Export de données amélioré (CSV, PDF)
- Notifications push (service worker)
- Mode offline amélioré

**Estimation:** Variable (selon les features)

---

## 📊 RÉCAPITULATIF PAR PRIORITÉ

| Priorité | Tâche | Statut | Estimation |
|----------|-------|--------|------------|
| **P1 - Critique** | 1. Gestion d'erreur globale | ❌ Non fait | 2-3 jours |
| **P1 - Critique** | 2. Optimisations performance | 🟡 Partiel | 2-3 jours |
| **P1 - Critique** | 3. Pagination | ❌ Non fait | 2-3 jours |
| **P2 - Important** | 4. Refactoring gros composants | 🟡 Partiel | 3-4 jours |
| **P2 - Important** | 5. Validation complète | 🟡 Partiel | 1-2 jours |
| **P3 - Amélioration** | 6. Tests | ❌ Non fait | 4-5 jours |
| **P3 - Amélioration** | 7. Accessibilité | ❌ Non fait | 2-3 jours |
| **P3 - Amélioration** | 8. i18n complète | 🟡 Partiel | 1-2 jours |
| **P4 - Optional** | 9. Features additionnelles | ❌ Non fait | Variable |

**TOTAL (P1-P3):** ~17-26 jours (136-208h)

---

## 🎯 RECOMMANDATIONS PAR ORDRE DE PRIORITÉ

### Court Terme (1-2 semaines) 🔴
1. **Gestion d'erreur globale** (P1.2) - Impact UX élevé
2. **Pagination** (P2.7) - Impact performance élevé
3. **Optimisations performance** (P2.4) - Compléter ce qui manque

### Moyen Terme (3-4 semaines) 🟡
4. **Refactoring gros composants** (P2.6) - Maintenabilité
5. **Validation complète** (P2.5) - Qualité
6. **Tests** (P3.8) - Robustesse

### Long Terme (1-2 mois+) 🟢
7. **Accessibilité** (P3.10) - Conformité
8. **i18n complète** (P3.11) - Accessibilité internationale
9. **Features additionnelles** (P4.12) - Améliorations UX

---

## 💡 NOTES IMPORTANTES

### Ce qui a été bien fait ✅
- Phase 1 et Phase 2 complétées avec succès
- Architecture solide mise en place
- Hooks et composants réutilisables créés
- Bugs critiques corrigés
- Code beaucoup plus maintenable

### Points d'attention ⚠️
- Certains composants restent monolithiques
- Pagination manquante = problème de scalabilité
- Tests insuffisants = risque de régression
- Accessibilité non conforme = problème légal potentiel

### Priorisation recommandée 🎯
1. **D'abord :** Gestion d'erreur + Pagination (impact immédiat sur UX)
2. **Ensuite :** Optimisations + Refactoring (maintenabilité)
3. **Enfin :** Tests + Accessibilité (qualité long terme)

---

**Dernière mise à jour:** 2025-01-27  
**Prochaines étapes recommandées:** Commencer par la gestion d'erreur globale (P1.2)
