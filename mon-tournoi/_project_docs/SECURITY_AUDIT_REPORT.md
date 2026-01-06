# 🔒 RAPPORT D'AUDIT DE SÉCURITÉ
**Date:** 2026-01-06  
**Scope:** Frontend Application + Supabase Database  
**Niveau de Sévérité:** ⚠️ **CRITIQUE** - Plusieurs vulnérabilités identifiées

---

## 🚨 PROBLÈMES CRITIQUES IDENTIFIÉS

### 1. **TABLES "UNRESTRICTED" - RLS DÉSACTIVÉ OU PERMISSIF**

**Tables concernées (identifiées dans Supabase Table Editor):**
- `profiles` - Tag "UNRESTRICTED" visible
- `score_reports` - Tag "UNRESTRICTED" visible  
- `waitlist` - Tag "UNRESTRICTED" visible

**Risque:** 🔴 **CRITIQUE**
- Ces tables sont accessibles sans restriction depuis le frontend
- N'importe quel utilisateur authentifié peut potentiellement :
  - Lire tous les profils (`profiles`)
  - Modifier/Supprimer des rapports de score (`score_reports`)
  - Manipuler la liste d'attente (`waitlist`)

**Impact:**
- **Données personnelles exposées** : Tous les profils utilisateurs accessibles
- **Manipulation de scores** : Possibilité de modifier/supprimer des rapports de dispute
- **Fraude aux tournois** : Manipulation de la liste d'attente

**Recommandation URGENTE:**
```sql
-- Activer RLS sur ces tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Créer des policies restrictives
-- Exemple pour profiles:
CREATE POLICY "Users can only view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can only update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

---

### 2. **VALIDATIONS ADMINISTRATEUR CÔTÉ CLIENT UNIQUEMENT**

**Problème identifié:**
Les vérifications d'administration sont faites **uniquement côté client** dans le code JavaScript.

**Exemples trouvés:**

```javascript
// MatchLobby.jsx ligne 479
const resolveConflict = async (scoreP1, scoreP2) => {
  if (!isAdmin) {  // ⚠️ Vérification côté client uniquement
    toast.error("Seul l'administrateur peut résoudre un conflit.");
    return;
  }
  // L'update se fait quand même si on contourne le check
  await supabase.from('matches').update({...}).eq('id', id);
}
```

**Risque:** 🔴 **CRITIQUE**
- Un utilisateur malveillant peut contourner ces vérifications en modifiant le code JavaScript
- Ou en appelant directement l'API Supabase depuis la console du navigateur
- **Aucune protection serveur** contre les actions non autorisées

**Impact:**
- Modification de scores par des non-admins
- Suppression de participants
- Modification de tournois
- Résolution de conflits par des joueurs

**Recommandation URGENTE:**
- Implémenter des **RLS Policies** sur toutes les tables critiques
- Utiliser des **Service Role Functions** (RPC) pour les actions admin
- Vérifier `owner_id` ou `user_roles` dans les policies, pas dans le code client

---

### 3. **ABSENCE DE VALIDATION SERVEUR SUR LES OPÉRATIONS CRITIQUES**

**Opérations à risque identifiées:**

#### A. Mise à jour de matchs (101 opérations UPDATE trouvées)
- **Fichiers concernés:** `MatchLobby.jsx`, `Tournament.jsx`, `AdminPanel.jsx`
- **Risque:** Modification de scores, statuts, participants par n'importe qui
- **Exemple vulnérable:**
```javascript
// Tournament.jsx - Ligne 772
await supabase.from('matches').update({player1_id: loserId}).eq('id', m.id);
// ⚠️ Aucune vérification que l'utilisateur est admin ou propriétaire du tournoi
```

#### B. Insertion/Suppression de participants
- **Fichiers concernés:** `Tournament.jsx`, `TeamJoinButton.jsx`
- **Risque:** Ajout/Suppression de participants sans autorisation
- **Exemple:**
```javascript
// Tournament.jsx - Ligne 487
const { error } = await supabase.from('participants').delete().eq('id', pid);
// ⚠️ Pas de vérification que l'utilisateur est admin
```

#### C. Mise à jour de profils
- **Fichier concerné:** `Profile.jsx`
- **Risque:** Modification de n'importe quel profil
- **Exemple:**
```javascript
// Profile.jsx - Ligne 116
await supabase.from('profiles').upsert({
  id: session.user.id,  // ⚠️ Mais rien n'empêche de changer l'ID dans la requête
  username,
  avatar_url: avatarUrl,
});
```

---

### 4. **EXPOSITION DE DONNÉES SENSIBLES**

**Tables accessibles sans filtrage approprié:**

1. **`profiles`** - Tous les profils lisibles
   - Usernames, avatars de tous les utilisateurs
   - Pas de restriction par utilisateur

2. **`score_reports`** - Tous les rapports de dispute
   - Historique complet des disputes
   - Informations sur les équipes en conflit

3. **`waitlist`** - Liste d'attente complète
   - Positions de toutes les équipes
   - Informations sur les tournois complets

**Recommandation:**
- Implémenter des policies RLS qui limitent l'accès aux données pertinentes uniquement
- Exemple: Un joueur ne devrait voir que les rapports de score de ses propres matchs

---

### 5. **CLÉS API EXPOSÉES DANS LE CODE CLIENT**

**Fichier:** `src/supabaseClient.js`
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

**Risque:** 🟡 **MOYEN**
- La clé ANON est exposée dans le code client (normal pour Supabase)
- **MAIS** si RLS n'est pas activé, cette clé peut accéder à tout
- Si quelqu'un vole cette clé, il peut accéder à toutes les données non protégées

**Recommandation:**
- S'assurer que RLS est activé sur TOUTES les tables
- La clé ANON ne devrait permettre que les opérations autorisées par les policies

---

## 📊 RÉSUMÉ DES VULNÉRABILITÉS

| Vulnérabilité | Sévérité | Tables Concernées | Impact |
|--------------|----------|-------------------|--------|
| RLS Désactivé | 🔴 CRITIQUE | `profiles`, `score_reports`, `waitlist` | Accès non autorisé aux données |
| Validation Client-Only | 🔴 CRITIQUE | `matches`, `participants`, `tournaments` | Actions admin contournables |
| Pas de Policies RLS | 🔴 CRITIQUE | Toutes les tables | Aucune protection serveur |
| Exposition Données | 🟡 MOYEN | `profiles`, `score_reports` | Données personnelles exposées |

---

## ✅ ACTIONS CORRECTIVES RECOMMANDÉES (PRIORITÉ)

### PRIORITÉ 1 - URGENT (À faire immédiatement)

1. **Activer RLS sur toutes les tables**
   ```sql
   -- Script à exécuter pour chaque table
   ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
   ```

2. **Créer des policies restrictives pour les tables UNRESTRICTED**
   - `profiles`: Lecture/Écriture uniquement pour son propre profil
   - `score_reports`: Lecture pour les participants du match, écriture pour les équipes concernées
   - `waitlist`: Lecture pour tous, écriture pour les organisateurs uniquement

3. **Sécuriser les opérations admin**
   - Créer des RPC functions pour les actions admin
   - Vérifier `owner_id` ou `user_roles` dans les policies, pas dans le code client

### PRIORITÉ 2 - IMPORTANT (Cette semaine)

4. **Auditer toutes les opérations UPDATE/INSERT/DELETE**
   - Identifier toutes les opérations qui nécessitent des permissions spéciales
   - Créer des policies RLS pour chacune

5. **Implémenter des validations serveur**
   - Utiliser des triggers PostgreSQL pour valider les données
   - Créer des fonctions RPC pour les opérations critiques

### PRIORITÉ 3 - RECOMMANDÉ (Ce mois)

6. **Audit de sécurité complet**
   - Tester toutes les routes API
   - Vérifier les permissions sur chaque table
   - Documenter les policies RLS

---

## 🛡️ EXEMPLE DE POLICIES RLS SÉCURISÉES

### Pour `profiles`:
```sql
-- Lecture: Seulement son propre profil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Mise à jour: Seulement son propre profil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### Pour `matches`:
```sql
-- Lecture: Tous les matchs publics ou matchs où l'utilisateur participe
CREATE POLICY "Users can view relevant matches"
  ON matches FOR SELECT
  USING (
    -- Match public (tournoi public)
    EXISTS (SELECT 1 FROM tournaments WHERE id = matches.tournament_id AND is_public = true)
    OR
    -- Utilisateur est participant
    EXISTS (
      SELECT 1 FROM participants p
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE p.tournament_id = matches.tournament_id
      AND tm.user_id = auth.uid()
      AND (p.team_id = matches.player1_id OR p.team_id = matches.player2_id)
    )
    OR
    -- Utilisateur est organisateur
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE id = matches.tournament_id
      AND owner_id = auth.uid()
    )
  );

-- Update: Seulement organisateur ou équipe concernée
CREATE POLICY "Only organizers or teams can update matches"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE id = matches.tournament_id
      AND owner_id = auth.uid()
    )
    OR
    -- Équipe peut mettre à jour son score déclaré
    (
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = matches.player1_id
        AND tm.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = matches.player2_id
        AND tm.user_id = auth.uid()
      )
    )
  );
```

### Pour `score_reports`:
```sql
-- Lecture: Participants du match ou organisateur
CREATE POLICY "Relevant users can view score reports"
  ON score_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = score_reports.match_id
      AND (
        t.owner_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id IN (m.player1_id, m.player2_id)
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Insertion: Seulement équipes concernées
CREATE POLICY "Teams can report scores"
  ON score_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN team_members tm ON tm.team_id IN (m.player1_id, m.player2_id)
      WHERE m.id = score_reports.match_id
      AND tm.user_id = auth.uid()
    )
  );
```

---

## 📝 CHECKLIST DE SÉCURITÉ

- [ ] RLS activé sur toutes les tables
- [ ] Policies créées pour `profiles` (lecture/écriture restreinte)
- [ ] Policies créées pour `score_reports` (accès restreint)
- [ ] Policies créées pour `waitlist` (écriture admin uniquement)
- [ ] Policies créées pour `matches` (update restreint)
- [ ] Policies créées pour `participants` (delete admin uniquement)
- [ ] Policies créées pour `tournaments` (update owner uniquement)
- [ ] RPC functions créées pour actions admin critiques
- [ ] Tests de sécurité effectués (tentative d'accès non autorisé)
- [ ] Documentation des policies RLS créée

---

## ⚠️ AVERTISSEMENT FINAL

**L'application est actuellement VULNÉRABLE** aux attaques suivantes:
1. Accès non autorisé aux données personnelles
2. Manipulation de scores et résultats
3. Modification de tournois par des non-admins
4. Suppression de participants
5. Fraude aux inscriptions (manipulation waitlist)

**Action immédiate requise:** Activer RLS et créer des policies restrictives avant la mise en production.

---

**Rapport généré:** 2026-01-06  
**Prochaine révision:** Après implémentation des corrections

