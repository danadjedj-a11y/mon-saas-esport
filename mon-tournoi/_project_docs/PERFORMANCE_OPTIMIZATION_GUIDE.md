# ⚡ GUIDE D'OPTIMISATION DES PERFORMANCES RLS
**Date:** 2026-01-06  
**Objectif:** Optimiser toutes les policies RLS pour améliorer les performances

---

## 📋 RÉSUMÉ

Ce guide explique comment optimiser les policies RLS restantes après l'exécution du script `fix_performance_warnings.sql`.

---

## 🔧 PATTERN D'OPTIMISATION

### Règle de base
**Remplacer:**
- `auth.uid()` → `(select auth.uid())`
- `auth.role()` → `(select auth.role())`

### Pourquoi?
- **Sans optimisation:** La fonction est appelée pour **chaque ligne** vérifiée
- **Avec optimisation:** La fonction est appelée **une seule fois** par requête
- **Gain:** Significatif sur les grandes tables (milliers de lignes)

---

## 📝 EXEMPLE DE TRANSFORMATION

### AVANT (Non optimisé)
```sql
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### APRÈS (Optimisé)
```sql
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ((select auth.uid()) = id);
```

---

## 🎯 POLICIES RESTANTES À OPTIMISER

### Table: `tournament_comments`
- `"Users can create their own comments"` - INSERT
- `"Users can update own comments"` - UPDATE
- `"Users can delete their own comments"` - UPDATE

**Pattern:**
```sql
DROP POLICY "Users can create their own comments" ON tournament_comments;
CREATE POLICY "Users can create their own comments"
  ON tournament_comments FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
```

### Table: `comment_replies`
- `"Users can create their own replies"` - INSERT
- `"Users can update their own replies"` - UPDATE
- `"Users can delete their own replies"` - UPDATE

### Table: `comment_votes`
- `"Users can create their own votes"` - INSERT
- `"Users can update their own votes"` - UPDATE
- `"Users can delete their own votes"` - DELETE

### Table: `tournament_templates`
- `"Users can create their own templates"` - INSERT
- `"Users can update their own templates"` - UPDATE
- `"Users can delete their own templates"` - DELETE
- `"Users can view their own templates"` - SELECT

### Table: `tournament_follows`
- `"Users can insert their own tournament follows"` - INSERT
- `"Users can view their own tournament follows"` - SELECT
- `"Users can delete their own tournament follows"` - DELETE

### Table: `team_follows`
- `"Users can insert their own team follows"` - INSERT
- `"Users can view their own team follows"` - SELECT
- `"Users can delete their own team follows"` - DELETE

### Table: `match_games`
- `"Participants and owners can manage match games."` - ALL
- `"Users can view match games"` - SELECT
- `"Teams can update match games"` - UPDATE

### Table: `match_vetos`
- `"Participants can create match vetos."` - INSERT

### Table: `game_score_reports`
- `"Participants can create game score reports."` - INSERT

### Table: `swiss_scores`
- `"Tournament owners can manage swiss scores."` - ALL
- `"Enable insert for authenticated users"` - INSERT

### Table: `notifications`
- `"Users can view own notifications"` - SELECT
- `"Users can update their own notifications"` - UPDATE

### Table: `notification_deduplication`
- `"Users can view their own deduplication records"` - SELECT

### Table: `rate_limits`
- `"Users can view their own rate limits"` - SELECT

### Table: `rate_limit_config`
- `"Authenticated users can read rate limit config"` - SELECT

### Table: `user_badges`
- `"Users can view their own badges"` - SELECT

---

## 🔄 SCRIPT GÉNÉRIQUE POUR OPTIMISER UNE POLICY

```sql
-- 1. Récupérer la définition actuelle
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'table_name'
  AND policyname = 'policy_name';

-- 2. Modifier la définition (remplacer auth.uid() par (select auth.uid()))
-- 3. Recréer la policy
DROP POLICY "policy_name" ON table_name;
CREATE POLICY "policy_name"
  ON table_name FOR action
  USING (/* définition modifiée avec (select auth.uid()) */)
  WITH CHECK (/* définition modifiée avec (select auth.uid()) */);
```

---

## ⚠️ PROBLÈME: MULTIPLE PERMISSIVE POLICIES

### Description
Plusieurs policies permissives pour le même rôle et la même action. PostgreSQL doit exécuter **toutes** les policies.

### Exemple problématique
**Table `matches` - UPDATE:**
- `"Admins can update everything"`
- `"Only organizers or teams can update matches"`
- `"Owners can update matches."`
- `"Players can update their own matches"`

**Impact:** Les 4 policies sont exécutées pour chaque UPDATE.

### Solution (Complexe)
Fusionner les policies en une seule avec des conditions combinées (OR).

**Exemple:**
```sql
-- AVANT (4 policies)
-- Policy 1: Admins can update everything
-- Policy 2: Only organizers or teams can update matches
-- Policy 3: Owners can update matches.
-- Policy 4: Players can update their own matches

-- APRÈS (1 policy combinée)
DROP POLICY "Admins can update everything" ON matches;
DROP POLICY "Only organizers or teams can update matches" ON matches;
DROP POLICY "Owners can update matches." ON matches;
DROP POLICY "Players can update their own matches" ON matches;

CREATE POLICY "Authorized users can update matches"
  ON matches FOR UPDATE
  USING (
    -- Admin check
    (select auth.uid()) IN (
      SELECT profiles.id FROM profiles
      WHERE profiles.role = 'superadmin' OR profiles.role = 'organizer'
    )
    OR
    -- Organizer check
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = matches.tournament_id
      AND t.owner_id = (select auth.uid())
    )
    OR
    -- Team member check
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = (select auth.uid())
      AND (tm.team_id = matches.player1_id OR tm.team_id = matches.player2_id)
    )
  );
```

### ⚠️ ATTENTION
Cette fusion nécessite une **analyse approfondie** pour s'assurer que la logique combinée est correcte. Il est recommandé de:
1. Tester chaque policy individuellement d'abord
2. Fusionner progressivement
3. Tester après chaque fusion

---

## 📊 PRIORITÉS D'OPTIMISATION

### Priorité 1 - HAUTE (Tables les plus utilisées)
✅ **Déjà optimisé dans le script:**
- `matches`
- `tournaments`
- `participants`
- `profiles`
- `teams`
- `team_members`
- `waitlist`
- `score_reports`
- `messages`

### Priorité 2 - MOYENNE (Tables modérément utilisées)
- `tournament_comments`
- `comment_replies`
- `comment_votes`
- `match_games`
- `notifications`

### Priorité 3 - BASSE (Tables peu utilisées)
- `tournament_templates`
- `tournament_follows`
- `team_follows`
- `match_vetos`
- `game_score_reports`
- `swiss_scores`
- `rate_limits`
- `rate_limit_config`
- `user_badges`

---

## ✅ CHECKLIST D'OPTIMISATION

- [x] Index dupliqué supprimé
- [x] Policies critiques optimisées (matches, tournaments, participants, etc.)
- [ ] Policies tournament_comments optimisées
- [ ] Policies comment_replies optimisées
- [ ] Policies comment_votes optimisées
- [ ] Policies tournament_templates optimisées
- [ ] Policies tournament_follows optimisées
- [ ] Policies team_follows optimisées
- [ ] Policies match_games optimisées
- [ ] Policies match_vetos optimisées
- [ ] Policies game_score_reports optimisées
- [ ] Policies swiss_scores optimisées
- [ ] Policies notifications optimisées
- [ ] Policies notification_deduplication optimisées
- [ ] Policies rate_limits optimisées
- [ ] Policies rate_limit_config optimisées
- [ ] Policies user_badges optimisées
- [ ] (Optionnel) Fusion des policies multiples

---

## 🧪 TEST APRÈS OPTIMISATION

### Tests à effectuer:
1. **Connexion/Déconnexion** - Vérifier que l'authentification fonctionne
2. **Création de tournoi** - Vérifier que les organisateurs peuvent créer
3. **Inscription équipe** - Vérifier que les capitaines peuvent s'inscrire
4. **Déclaration de score** - Vérifier que les équipes peuvent déclarer
5. **Commentaires** - Vérifier que les utilisateurs peuvent commenter
6. **Messages** - Vérifier que les messages fonctionnent
7. **Admin actions** - Vérifier que les admins peuvent gérer

### Vérification des performances:
```sql
-- Vérifier le plan d'exécution d'une requête
EXPLAIN ANALYZE
SELECT * FROM matches WHERE tournament_id = 'some-id';
```

---

## 📝 NOTES FINALES

1. **Impact réel:** Les gains sont surtout visibles sur les grandes tables (>1000 lignes)
2. **Compatibilité:** La syntaxe `(select auth.uid())` est compatible avec toutes les versions récentes de PostgreSQL
3. **Rollback:** Si problème, vous pouvez recréer les policies originales
4. **Progression:** Optimisez progressivement, testez après chaque batch

---

**Guide généré:** 2026-01-06  
**Status:** 📋 **GUIDE DE RÉFÉRENCE** - À utiliser pour optimiser les policies restantes

