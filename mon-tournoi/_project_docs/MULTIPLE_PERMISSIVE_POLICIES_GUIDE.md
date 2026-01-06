# 🔄 GUIDE: FUSION DES POLICIES MULTIPLES
**Date:** 2026-01-06  
**Problème:** Multiple Permissive Policies - Performance dégradée

---

## 📋 RÉSUMÉ DU PROBLÈME

Quand plusieurs policies permissives existent pour le même rôle et la même action, PostgreSQL doit exécuter **toutes** les policies pour déterminer l'accès. C'est sous-optimal pour les performances.

**Solution:** Fusionner les policies multiples en une seule policy avec des conditions combinées (OR).

---

## 🎯 TABLES CONCERNÉES

### Priorité 1 - HAUTE (Tables très utilisées)
- **`matches`** - 4 policies UPDATE
- **`participants`** - 3 policies UPDATE, 2 policies INSERT, 2 policies DELETE
- **`tournaments`** - 2 policies DELETE, 2 policies UPDATE, 2 policies SELECT, 2 policies INSERT

### Priorité 2 - MOYENNE (Tables modérément utilisées)
- **`match_games`** - 2 policies SELECT, 2 policies UPDATE
- **`team_members`** - 2 policies INSERT, 2 policies DELETE
- **`waitlist`** - 2 policies INSERT, 2 policies SELECT
- **`swiss_scores`** - 2 policies INSERT, 2 policies SELECT

### Priorité 3 - BASSE (Tables peu utilisées)
- **`comment_replies`** - 2 policies UPDATE
- **`tournament_comments`** - 2 policies UPDATE
- **`tournament_templates`** - 2 policies SELECT
- **`user_badges`** - 2 policies SELECT

---

## 🔧 EXEMPLES DE FUSION

### Exemple 1: Table `matches` - UPDATE (4 policies)

**AVANT (4 policies):**
```sql
-- Policy 1: Admins can update everything
CREATE POLICY "Admins can update everything" ON matches FOR UPDATE
  USING ((select auth.uid()) IN (
    SELECT profiles.id FROM profiles
    WHERE profiles.role = 'superadmin' OR profiles.role = 'organizer'
  ));

-- Policy 2: Only organizers or teams can update matches
CREATE POLICY "Only organizers or teams can update matches" ON matches FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = matches.tournament_id AND t.owner_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = matches.player1_id AND tm.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = matches.player2_id AND tm.user_id = (select auth.uid()))
  );

-- Policy 3: Owners can update matches.
CREATE POLICY "Owners can update matches." ON matches FOR UPDATE
  USING ((select auth.uid()) IN (
    SELECT tournaments.owner_id FROM tournaments WHERE tournaments.id = matches.tournament_id
  ));

-- Policy 4: Players can update their own matches
CREATE POLICY "Players can update their own matches" ON matches FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.user_id = (select auth.uid())
    AND (team_members.team_id = matches.player1_id OR team_members.team_id = matches.player2_id)
  ));
```

**APRÈS (1 policy fusionnée):**
```sql
-- Supprimer les 4 policies
DROP POLICY IF EXISTS "Admins can update everything" ON matches;
DROP POLICY IF EXISTS "Only organizers or teams can update matches" ON matches;
DROP POLICY IF EXISTS "Owners can update matches." ON matches;
DROP POLICY IF EXISTS "Players can update their own matches" ON matches;

-- Créer une seule policy combinée
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

---

### Exemple 2: Table `comment_replies` - UPDATE (2 policies)

**AVANT (2 policies):**
```sql
-- Policy 1: Users can update their own replies
CREATE POLICY "Users can update their own replies" ON comment_replies FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- Policy 2: Users can delete their own replies (soft delete via UPDATE)
CREATE POLICY "Users can delete their own replies" ON comment_replies FOR UPDATE
  USING ((select auth.uid()) = user_id);
```

**APRÈS (1 policy fusionnée):**
```sql
-- Supprimer les 2 policies
DROP POLICY IF EXISTS "Users can update their own replies" ON comment_replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON comment_replies;

-- Créer une seule policy (les deux avaient la même condition)
CREATE POLICY "Users can update or delete their own replies"
  ON comment_replies FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
```

---

### Exemple 3: Table `tournament_templates` - SELECT (2 policies)

**AVANT (2 policies):**
```sql
-- Policy 1: Users can view public templates
CREATE POLICY "Users can view public templates" ON tournament_templates FOR SELECT
  USING (is_public = true);

-- Policy 2: Users can view their own templates
CREATE POLICY "Users can view their own templates" ON tournament_templates FOR SELECT
  USING ((select auth.uid()) = owner_id);
```

**APRÈS (1 policy fusionnée):**
```sql
-- Supprimer les 2 policies
DROP POLICY IF EXISTS "Users can view public templates" ON tournament_templates;
DROP POLICY IF EXISTS "Users can view their own templates" ON tournament_templates;

-- Créer une seule policy combinée
CREATE POLICY "Users can view relevant templates"
  ON tournament_templates FOR SELECT
  USING (
    is_public = true
    OR
    (select auth.uid()) = owner_id
  );
```

---

### Exemple 4: Table `user_badges` - SELECT (2 policies)

**AVANT (2 policies):**
```sql
-- Policy 1: Users can view other users' badges
CREATE POLICY "Users can view other users' badges" ON user_badges FOR SELECT
  USING (true);

-- Policy 2: Users can view their own badges
CREATE POLICY "Users can view their own badges" ON user_badges FOR SELECT
  USING ((select auth.uid()) = user_id);
```

**APRÈS (1 policy fusionnée):**
```sql
-- Supprimer les 2 policies
DROP POLICY IF EXISTS "Users can view other users' badges" ON user_badges;
DROP POLICY IF EXISTS "Users can view their own badges" ON user_badges;

-- Créer une seule policy (la première couvre déjà tout)
CREATE POLICY "Users can view badges"
  ON user_badges FOR SELECT
  USING (true);
```

**Note:** Dans ce cas, la première policy (`true`) couvre déjà tout, donc on peut simplement garder celle-là.

---

### Exemple 5: Table `participants` - UPDATE (3 policies)

**AVANT (3 policies):**
```sql
-- Policy 1: Admins can manage participants
CREATE POLICY "Admins can manage participants" ON participants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = participants.tournament_id
    AND t.owner_id = (select auth.uid())
  ));

-- Policy 2: Tournament owners can update participants
CREATE POLICY "Tournament owners can update participants" ON participants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tournaments
    WHERE tournaments.id = participants.tournament_id
    AND tournaments.owner_id = (select auth.uid())
  ));

-- Policy 3: Users can update their own team check-in
CREATE POLICY "Users can update their own team check-in" ON participants FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = participants.team_id AND teams.captain_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = participants.team_id AND team_members.user_id = (select auth.uid()))
  );
```

**APRÈS (1 policy fusionnée):**
```sql
-- Supprimer les 3 policies
DROP POLICY IF EXISTS "Admins can manage participants" ON participants;
DROP POLICY IF EXISTS "Tournament owners can update participants" ON participants;
DROP POLICY IF EXISTS "Users can update their own team check-in" ON participants;

-- Créer une seule policy combinée
CREATE POLICY "Authorized users can update participants"
  ON participants FOR UPDATE
  USING (
    -- Tournament owner check (les 2 premières policies sont identiques)
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = participants.tournament_id
      AND t.owner_id = (select auth.uid())
    )
    OR
    -- Team member/captain check
    (
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = participants.team_id
        AND teams.captain_id = (select auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = participants.team_id
        AND team_members.user_id = (select auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = participants.tournament_id
      AND t.owner_id = (select auth.uid())
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = participants.team_id
        AND teams.captain_id = (select auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = participants.team_id
        AND team_members.user_id = (select auth.uid())
      )
    )
  );
```

---

## ⚠️ RÈGLES IMPORTANTES

### 1. **Vérifier la logique avant fusion**
- Assurez-vous que la logique combinée (OR) est correcte
- Testez chaque policy individuellement d'abord

### 2. **Garder les WITH CHECK si nécessaire**
- Pour INSERT/UPDATE, inclure `WITH CHECK` si les policies originales l'avaient

### 3. **Simplifier quand possible**
- Si une policy a `USING (true)`, elle couvre déjà tout
- Supprimer les autres policies redondantes

### 4. **Tester après fusion**
- Tester toutes les fonctionnalités concernées
- Vérifier que les permissions sont toujours correctes

---

## 📝 CHECKLIST DE FUSION

Pour chaque table avec policies multiples:

- [ ] Identifier toutes les policies pour le même rôle/action
- [ ] Analyser la logique de chaque policy
- [ ] Créer la condition combinée (OR)
- [ ] Supprimer les anciennes policies
- [ ] Créer la nouvelle policy fusionnée
- [ ] Tester les fonctionnalités
- [ ] Vérifier les performances

---

## 🎯 PRIORITÉS RECOMMANDÉES

### À fusionner en premier (impact élevé):
1. **`matches` UPDATE** - 4 policies → 1 policy
2. **`participants` UPDATE** - 3 policies → 1 policy
3. **`tournaments`** - Plusieurs actions (DELETE, UPDATE, SELECT, INSERT)

### À fusionner ensuite (impact modéré):
4. **`match_games`** - SELECT et UPDATE
5. **`team_members`** - INSERT et DELETE
6. **`waitlist`** - INSERT et SELECT

### À fusionner en dernier (impact faible):
7. **`comment_replies`** - UPDATE
8. **`tournament_comments`** - UPDATE
9. **`tournament_templates`** - SELECT
10. **`user_badges`** - SELECT

---

## ⚠️ AVERTISSEMENT

**La fusion des policies est une opération sensible.** 

- ✅ **Avantage:** Meilleures performances (1 policy au lieu de plusieurs)
- ⚠️ **Risque:** Si la logique est incorrecte, les permissions peuvent être cassées
- 📋 **Recommandation:** Fusionner progressivement, tester après chaque fusion

---

**Guide généré:** 2026-01-06  
**Status:** 📋 **GUIDE DE RÉFÉRENCE** - À utiliser pour fusionner les policies multiples

