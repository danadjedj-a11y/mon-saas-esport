# 🔍 ANALYSE DES POLICIES RLS EXISTANTES
**Date:** 2026-01-06  
**Tables analysées:** 27 tables  
**Policies trouvées:** 100+ policies

---

## 🚨 PROBLÈMES CRITIQUES IDENTIFIÉS

### 1. **POLICIES TROP PERMISSIVES (Vulnérabilités)**

#### A. Table `matches` - UPDATE TROP PERMISSIF
**Problème:** Policy `"Allow players to update matches"` avec `auth.role() = 'authenticated'`
```sql
UPDATE | (auth.role() = 'authenticated'::text)
```
**Risque:** 🔴 **CRITIQUE** - N'importe quel utilisateur authentifié peut modifier N'IMPORTE QUEL match, même ceux auxquels il ne participe pas.

**Impact:**
- Modification de scores par des joueurs non concernés
- Manipulation de brackets
- Sabotage de tournois

**Recommandation:** SUPPRIMER cette policy. Utiliser uniquement les policies restrictives existantes.

---

#### B. Table `swiss_scores` - UPDATE TROP PERMISSIF
**Problème:** Policy `"Enable update for authenticated users"` avec `auth.role() = 'authenticated'`
```sql
UPDATE | (auth.role() = 'authenticated'::text)
```
**Risque:** 🔴 **CRITIQUE** - N'importe qui peut modifier les scores suisses.

**Impact:**
- Manipulation des classements
- Fraude aux tournois suisses

**Recommandation:** SUPPRIMER cette policy. Garder uniquement `"Tournament owners can manage swiss scores"`.

---

#### C. Table `score_reports` - INSERT SANS VÉRIFICATION
**Problème:** Policy `"Teams can report scores"` avec `INSERT | null`
```sql
INSERT | null
```
**Risque:** 🟡 **MOYEN** - N'importe qui peut créer un rapport de score pour n'importe quel match.

**Impact:**
- Spam de rapports de score
- Rapports frauduleux

**Recommandation:** Ajouter une vérification que l'utilisateur est membre d'une équipe du match.

---

#### D. Table `participants` - INSERT SANS VÉRIFICATION
**Problème:** Policies `"Captains can register their team"` et `"Teams can join tournaments"` avec `INSERT | null`
```sql
INSERT | null
```
**Risque:** 🟡 **MOYEN** - N'importe qui peut s'inscrire à n'importe quel tournoi.

**Impact:**
- Inscriptions frauduleuses
- Spam d'inscriptions

**Recommandation:** Ajouter une vérification que l'utilisateur est capitaine de l'équipe.

---

#### E. Table `messages` - TRÈS PERMISSIF
**Problème:** 
- `SELECT | true` - Tous les messages lisibles par tous
- `INSERT | null` - N'importe qui peut envoyer des messages

**Risque:** 🟡 **MOYEN** - Pas de restriction sur les messages.

**Recommandation:** Limiter la lecture aux messages du tournoi/match concerné.

---

### 2. **POLICIES DUPLIQUÉES (Conflits potentiels)**

#### A. Table `profiles` - SELECT dupliquées
**Policies dupliquées:**
- `"Lecture publique des profils"` → `SELECT | true`
- `"Public profiles are viewable by everyone."` → `SELECT | true`
- `"Users can view own profile"` → `SELECT | ((auth.uid() = id) OR true)`

**Problème:** 3 policies qui font la même chose (lecture publique). La dernière avec `OR true` rend la condition `auth.uid() = id` inutile.

**Recommandation:** Garder UNE SEULE policy: `SELECT | true` (profils publics).

---

#### B. Table `matches` - UPDATE multiples et conflictuelles
**Policies UPDATE trouvées:**
1. `"Admins can update everything"` - Basé sur `profiles.role`
2. `"Allow players to update matches"` - `auth.role() = 'authenticated'` ⚠️ TROP PERMISSIF
3. `"Only organizers or teams can update matches"` - ✅ BONNE
4. `"Owners can update matches."` - ✅ BONNE
5. `"Players can update their own matches"` - ✅ BONNE

**Problème:** La policy #2 (`"Allow players to update matches"`) est trop permissive et entre en conflit avec les autres.

**Recommandation:** SUPPRIMER la policy #2. Les autres sont suffisantes.

---

#### C. Table `tournaments` - SELECT dupliquées
**Policies dupliquées:**
- `"Public tournaments readable"` → `SELECT | true`
- `"Public tournaments view"` → `SELECT | true`
- `"Tournaments are viewable by everyone."` → `SELECT | true`

**Recommandation:** Garder UNE SEULE policy.

---

#### D. Table `participants` - SELECT dupliquées
**Policies dupliquées:**
- `"Public participants are viewable by everyone"` → `SELECT | true`
- `"Users can view participants"` → `SELECT | true`

**Recommandation:** Garder UNE SEULE policy.

---

### 3. **TABLES SANS POLICIES (RLS activé mais pas de protection)**

#### A. Table `waitlist` - ⚠️ AUCUNE POLICY TROUVÉE
**Risque:** 🔴 **CRITIQUE** - Table marquée "UNRESTRICTED" dans Supabase, aucune policy listée.

**Recommandation:** Créer des policies immédiatement:
```sql
-- Lecture: Public
CREATE POLICY "Users can view waitlist"
  ON waitlist FOR SELECT
  USING (true);

-- Insertion: Équipes concernées uniquement
CREATE POLICY "Teams can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = waitlist.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Update/Delete: Organisateur uniquement
CREATE POLICY "Admins can manage waitlist"
  ON waitlist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = waitlist.tournament_id
      AND t.owner_id = auth.uid()
    )
  );
```

---

#### B. Table `user_levels` - ⚠️ AUCUNE POLICY TROUVÉE
**Risque:** 🟡 **MOYEN** - Données de niveau utilisateur non protégées.

**Recommandation:** Créer des policies:
```sql
-- Lecture: Public (pour leaderboards)
CREATE POLICY "Users can view levels"
  ON user_levels FOR SELECT
  USING (true);

-- Update: Seulement via RPC (add_xp)
-- Pas d'UPDATE direct depuis le frontend
```

---

#### C. Table `user_roles` - ⚠️ AUCUNE POLICY TROUVÉE
**Risque:** 🟡 **MOYEN** - Rôles utilisateurs non protégés.

**Recommandation:** Créer des policies:
```sql
-- Lecture: Public (pour vérifier les rôles)
CREATE POLICY "Users can view roles"
  ON user_levels FOR SELECT
  USING (true);

-- Update: Seulement superadmin (via RPC ou backend)
-- Pas d'UPDATE direct depuis le frontend
```

---

### 4. **POLICIES AVEC LOGIQUE INUTILE**

#### A. Table `profiles` - Condition inutile
**Policy:** `"Users can view own profile"` → `SELECT | ((auth.uid() = id) OR true)`

**Problème:** Le `OR true` rend la condition `auth.uid() = id` complètement inutile. Cette policy permet à TOUS de voir TOUS les profils.

**Recommandation:** Soit supprimer cette policy (déjà couverte par les autres), soit la corriger si on veut vraiment restreindre:
```sql
SELECT | (auth.uid() = id)  -- Sans le OR true
```

---

## ✅ POLICIES BIEN CONFIGURÉES

### Tables avec sécurité adéquate:
1. **`badges`** - Lecture publique ✅
2. **`comment_replies`** - Bonnes restrictions ✅
3. **`comment_votes`** - Bonnes restrictions ✅
4. **`notifications`** - Seulement ses propres notifications ✅
5. **`team_follows`** - Seulement ses propres follows ✅
6. **`tournament_follows`** - Seulement ses propres follows ✅
7. **`tournament_templates`** - Bonnes restrictions (public/owner) ✅
8. **`tournaments`** - UPDATE/DELETE restreint au owner ✅

---

## 📊 RÉSUMÉ DES PROBLÈMES

| Problème | Sévérité | Tables Concernées | Action Requise |
|----------|----------|-------------------|----------------|
| UPDATE trop permissif | 🔴 CRITIQUE | `matches`, `swiss_scores` | Supprimer policies permissives |
| INSERT sans vérification | 🟡 MOYEN | `score_reports`, `participants` | Ajouter vérifications |
| Pas de policies | 🔴 CRITIQUE | `waitlist` | Créer policies |
| Pas de policies | 🟡 MOYEN | `user_levels`, `user_roles` | Créer policies |
| Policies dupliquées | 🟡 MOYEN | `profiles`, `matches`, `tournaments` | Nettoyer doublons |
| SELECT trop permissif | 🟡 MOYEN | `messages` | Restreindre accès |

---

## 🛠️ ACTIONS CORRECTIVES RECOMMANDÉES

### PRIORITÉ 1 - URGENT (À faire immédiatement)

1. **Supprimer les policies trop permissives:**
   ```sql
   DROP POLICY IF EXISTS "Allow players to update matches" ON matches;
   DROP POLICY IF EXISTS "Enable update for authenticated users" ON swiss_scores;
   ```

2. **Créer des policies pour `waitlist`:**
   ```sql
   -- Voir le script security_rls_policies.sql section waitlist
   ```

3. **Corriger la policy `profiles` SELECT:**
   ```sql
   DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
   -- Garder seulement "Public profiles are viewable by everyone"
   ```

### PRIORITÉ 2 - IMPORTANT (Cette semaine)

4. **Nettoyer les policies dupliquées:**
   - `profiles`: Garder 1 policy SELECT
   - `matches`: Supprimer les doublons UPDATE
   - `tournaments`: Garder 1 policy SELECT
   - `participants`: Garder 1 policy SELECT

5. **Ajouter des vérifications aux INSERT:**
   - `score_reports`: Vérifier que l'utilisateur est dans le match
   - `participants`: Vérifier que l'utilisateur est capitaine

6. **Créer des policies pour `user_levels` et `user_roles`**

### PRIORITÉ 3 - RECOMMANDÉ (Ce mois)

7. **Restreindre l'accès aux `messages`**
8. **Audit complet des policies**
9. **Documentation des policies**

---

## 📝 SCRIPT DE NETTOYAGE RECOMMANDÉ

```sql
-- ============================================
-- NETTOYAGE DES POLICIES PROBLÉMATIQUES
-- ============================================

-- 1. Supprimer policies trop permissives
DROP POLICY IF EXISTS "Allow players to update matches" ON matches;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON swiss_scores;

-- 2. Supprimer policies dupliquées profiles
DROP POLICY IF EXISTS "Lecture publique des profils" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- Garder: "Public profiles are viewable by everyone."

-- 3. Supprimer policies dupliquées tournaments
DROP POLICY IF EXISTS "Public tournaments readable" ON tournaments;
DROP POLICY IF EXISTS "Public tournaments view" ON tournaments;
-- Garder: "Tournaments are viewable by everyone."

-- 4. Supprimer policies dupliquées participants
DROP POLICY IF EXISTS "Public participants are viewable by everyone" ON participants;
-- Garder: "Users can view participants"

-- 5. Corriger score_reports INSERT
DROP POLICY IF EXISTS "Teams can report scores" ON score_reports;
CREATE POLICY "Teams can report scores"
  ON score_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN team_members tm ON (
        tm.team_id = m.player1_id OR tm.team_id = m.player2_id
      )
      WHERE m.id = score_reports.match_id
      AND tm.user_id = auth.uid()
    )
  );

-- 6. Corriger participants INSERT
DROP POLICY IF EXISTS "Captains can register their team" ON participants;
DROP POLICY IF EXISTS "Teams can join tournaments" ON participants;
CREATE POLICY "Captains can register their team"
  ON participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = participants.team_id
      AND t.captain_id = auth.uid()
    )
  );
```

---

## ⚠️ AVERTISSEMENT

**Les policies actuelles présentent des vulnérabilités critiques:**
- N'importe qui peut modifier n'importe quel match
- N'importe qui peut modifier les scores suisses
- La table `waitlist` est complètement non protégée

**Action immédiate requise avant mise en production.**

---

**Rapport généré:** 2026-01-06

