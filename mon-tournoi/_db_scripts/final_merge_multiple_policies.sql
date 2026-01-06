-- ============================================
-- FUSION FINALE DES POLICIES MULTIPLES RESTANTES
-- ============================================
-- ⚠️ IMPORTANT: Exécuter ce script avec PRUDENCE
-- ⚠️ TESTER D'ABORD EN STAGING
-- ⚠️ FAIRE UNE SAUVEGARDE AVANT
-- ============================================
-- Ce script fusionne les dernières policies multiples restantes
-- ============================================

-- ============================================
-- TABLE: participants - INSERT (2 policies)
-- ============================================
-- Fusionner "Captains can register their team" et "Tournament owners can insert participants"

DROP POLICY IF EXISTS "Captains can register their team" ON participants;
DROP POLICY IF EXISTS "Tournament owners can insert participants" ON participants;

CREATE POLICY "Captains or owners can insert participants"
  ON participants FOR INSERT
  WITH CHECK (
    -- Captain check
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = participants.team_id
      AND t.captain_id = (select auth.uid())
    )
    OR
    -- Tournament owner check
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = participants.tournament_id
      AND tournaments.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: team_members - INSERT (2 policies)
-- ============================================
-- Fusionner "Captains can manage members" et "Users can join teams"

DROP POLICY IF EXISTS "Captains can manage members" ON team_members;
DROP POLICY IF EXISTS "Users can join teams" ON team_members;

CREATE POLICY "Users or captains can add team members"
  ON team_members FOR INSERT
  WITH CHECK (
    -- User joining their own team
    (select auth.uid()) = user_id
    OR
    -- Captain adding members
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.captain_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: waitlist - INSERT (3 policies)
-- ============================================
-- Fusionner "Admins can manage waitlist", "Teams can join waitlist", et "Tournament owners can manage waitlist"
-- Note: "Admins can manage waitlist" et "Tournament owners can manage waitlist" sont probablement identiques
-- (vérifiez dans votre base de données)

DROP POLICY IF EXISTS "Admins can manage waitlist" ON waitlist;
DROP POLICY IF EXISTS "Teams can join waitlist" ON waitlist;
DROP POLICY IF EXISTS "Tournament owners can manage waitlist" ON waitlist;

CREATE POLICY "Authorized users can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (
    -- Tournament owner check
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = waitlist.tournament_id
      AND t.owner_id = (select auth.uid())
    )
    OR
    -- Team member check
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = waitlist.team_id
      AND tm.user_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: waitlist - SELECT (2-3 policies selon les warnings)
-- ============================================
-- Fusionner les policies SELECT
-- Les warnings mentionnent différentes combinaisons selon le rôle

-- Pour anon: "Tournament owners can manage waitlist" et "Users can view waitlist"
-- Pour authenticated: "Authenticated can read waitlist", "Tournament owners can manage waitlist", "Users can view waitlist"

-- Supprimer toutes les policies SELECT existantes
DROP POLICY IF EXISTS "Users can view waitlist" ON waitlist;
DROP POLICY IF EXISTS "Authenticated can read waitlist" ON waitlist;
DROP POLICY IF EXISTS "Tournament owners can manage waitlist" ON waitlist;

-- Créer une seule policy SELECT qui couvre tous les cas
CREATE POLICY "Users can view waitlist"
  ON waitlist FOR SELECT
  USING (
    -- Tous les utilisateurs authentifiés peuvent voir
    (select auth.role()) = 'authenticated'
    OR
    -- Les propriétaires de tournoi peuvent voir
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = waitlist.tournament_id
      AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: waitlist - UPDATE (2 policies)
-- ============================================
-- Fusionner "Admins can update or delete waitlist" et "Tournament owners can manage waitlist"

DROP POLICY IF EXISTS "Admins can update or delete waitlist" ON waitlist;
DROP POLICY IF EXISTS "Tournament owners can manage waitlist" ON waitlist;

CREATE POLICY "Tournament owners can update waitlist"
  ON waitlist FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = waitlist.tournament_id
      AND t.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = waitlist.tournament_id
      AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Compter les policies par table et action
SELECT 
  tablename,
  cmd,
  COUNT(*) as policy_count,
  array_agg(policyname ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('participants', 'team_members', 'waitlist')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- Si cette requête ne retourne rien, toutes les policies multiples ont été fusionnées !

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Ce script fusionne les dernières policies multiples restantes
-- 2. Tester bien toutes les fonctionnalités après l'exécution:
--    - Inscription d'équipes aux tournois (participants INSERT)
--    - Ajout de membres aux équipes (team_members INSERT)
--    - Gestion de la liste d'attente (waitlist INSERT/SELECT/UPDATE)
-- 3. Si vous avez des policies avec des noms différents, ajustez les DROP POLICY
-- 4. Vérifiez que les conditions combinées (OR) sont correctes pour votre cas d'usage

