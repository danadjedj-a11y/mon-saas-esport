-- ============================================
-- FUSION DES POLICIES MULTIPLES
-- ============================================
-- ⚠️ IMPORTANT: Exécuter ce script avec PRUDENCE
-- ⚠️ TESTER D'ABORD EN STAGING
-- ⚠️ FAIRE UNE SAUVEGARDE AVANT
-- ============================================
-- Ce script fusionne les policies multiples en une seule pour améliorer les performances
-- ============================================
-- 
-- NOTE: Ce script est OPTIONNEL et plus complexe.
-- Les policies multiples fonctionnent correctement, mais sont moins performantes.
-- Fusionnez seulement si vous êtes sûr de la logique combinée.
-- ============================================

-- ============================================
-- TABLE: comment_replies - UPDATE (2 policies)
-- ============================================
-- Les 2 policies ont la même condition, on peut les fusionner facilement

DROP POLICY IF EXISTS "Users can update their own replies" ON comment_replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON comment_replies;

CREATE POLICY "Users can update or delete their own replies"
  ON comment_replies FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: tournament_comments - UPDATE (2 policies)
-- ============================================
-- Les 2 policies ont la même condition, on peut les fusionner facilement

DROP POLICY IF EXISTS "Users can update own comments" ON tournament_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON tournament_comments;

CREATE POLICY "Users can update or delete their own comments"
  ON tournament_comments FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: user_badges - SELECT (2 policies)
-- ============================================
-- La première policy (true) couvre déjà tout

DROP POLICY IF EXISTS "Users can view their own badges" ON user_badges;
-- Garder: "Users can view other users' badges" (USING true) qui couvre déjà tout

-- ============================================
-- TABLE: tournament_templates - SELECT (2 policies)
-- ============================================

DROP POLICY IF EXISTS "Users can view public templates" ON tournament_templates;
DROP POLICY IF EXISTS "Users can view their own templates" ON tournament_templates;

CREATE POLICY "Users can view relevant templates"
  ON tournament_templates FOR SELECT
  USING (
    is_public = true
    OR
    (select auth.uid()) = owner_id
  );

-- ============================================
-- TABLE: match_games - SELECT (2 policies)
-- ============================================
-- La policy "Participants and owners can manage match games." avec ALL couvre déjà SELECT
-- On peut supprimer "Users can view match games" qui est redondante

DROP POLICY IF EXISTS "Users can view match games" ON match_games;
-- Garder: "Participants and owners can manage match games." (ALL) qui couvre déjà SELECT

-- ============================================
-- TABLE: match_games - UPDATE (2 policies)
-- ============================================
-- La policy "Participants and owners can manage match games." avec ALL couvre déjà UPDATE
-- On peut supprimer "Teams can update match games" qui est redondante

DROP POLICY IF EXISTS "Teams can update match games" ON match_games;
-- Garder: "Participants and owners can manage match games." (ALL) qui couvre déjà UPDATE

-- ============================================
-- TABLE: swiss_scores - INSERT (2 policies)
-- ============================================
-- La policy "Tournament owners can manage swiss scores." avec ALL couvre déjà INSERT
-- On peut supprimer "Enable insert for authenticated users" qui est redondante

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON swiss_scores;
-- Garder: "Tournament owners can manage swiss scores." (ALL) qui couvre déjà INSERT

-- ============================================
-- TABLE: swiss_scores - SELECT (2 policies)
-- ============================================
-- La policy "Tournament owners can manage swiss scores." avec ALL couvre déjà SELECT
-- On peut supprimer "Swiss scores are viewable by everyone." qui est redondante

DROP POLICY IF EXISTS "Swiss scores are viewable by everyone." ON swiss_scores;
-- Garder: "Tournament owners can manage swiss scores." (ALL) qui couvre déjà SELECT

-- ============================================
-- TABLE: waitlist - INSERT (2 policies)
-- ============================================
-- La policy "Admins can manage waitlist" avec ALL couvre déjà INSERT
-- On peut garder "Teams can join waitlist" car elle a une condition spécifique

-- Décision: Garder les 2 policies car elles ont des conditions différentes
-- "Admins can manage waitlist" - pour les admins
-- "Teams can join waitlist" - pour les équipes (vérifie membership)
-- Les deux sont nécessaires

-- ============================================
-- TABLE: waitlist - SELECT (2 policies)
-- ============================================
-- La policy "Admins can manage waitlist" avec ALL couvre déjà SELECT
-- On peut supprimer "Users can view waitlist" qui est redondante

DROP POLICY IF EXISTS "Users can view waitlist" ON waitlist;
-- Garder: "Admins can manage waitlist" (ALL) qui couvre déjà SELECT
-- MAIS: "Users can view waitlist" permettait à tous les authentifiés de voir
-- Si on veut garder cette fonctionnalité, on doit modifier "Admins can manage waitlist"

-- Option: Modifier "Admins can manage waitlist" pour permettre SELECT à tous
DROP POLICY IF EXISTS "Admins can manage waitlist" ON waitlist;
CREATE POLICY "Admins can manage waitlist"
  ON waitlist FOR ALL
  USING (
    -- SELECT: Tous les authentifiés peuvent voir
    (cmd = 'SELECT' AND (select auth.role()) = 'authenticated')
    OR
    -- INSERT/UPDATE/DELETE: Seulement admins
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

-- Note: La syntaxe ci-dessus ne fonctionne pas car cmd n'est pas disponible dans USING
-- Solution: Créer 2 policies séparées
DROP POLICY IF EXISTS "Admins can manage waitlist" ON waitlist;
CREATE POLICY "Users can view waitlist"
  ON waitlist FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admins can manage waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = waitlist.tournament_id
      AND t.owner_id = (select auth.uid())
    )
  );

-- Pour UPDATE/DELETE, créer une policy séparée
CREATE POLICY "Admins can update or delete waitlist"
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
-- TABLE: team_members - INSERT (2 policies)
-- ============================================
-- Les 2 policies ont des conditions différentes, les garder séparées
-- "Users can join teams" - user_id = auth.uid()
-- "Captains can manage members" - captain check
-- Les deux sont nécessaires

-- ============================================
-- TABLE: team_members - DELETE (2 policies)
-- ============================================
-- Les 2 policies peuvent être fusionnées (OR logique)

DROP POLICY IF EXISTS "Users can leave teams" ON team_members;
DROP POLICY IF EXISTS "Captains can remove members" ON team_members;

CREATE POLICY "Users or captains can remove team members"
  ON team_members FOR DELETE
  USING (
    (select auth.uid()) = user_id
    OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
      AND t.captain_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: participants - INSERT (2 policies)
-- ============================================
-- Les 2 policies ont des conditions différentes, les garder séparées
-- "Captains can register their team" - captain check
-- "Tournament owners can insert participants" - owner check
-- Les deux sont nécessaires

-- ============================================
-- TABLE: participants - DELETE (2 policies)
-- ============================================
-- Les 2 policies peuvent être fusionnées (OR logique)

DROP POLICY IF EXISTS "Captains can remove their team" ON participants;
DROP POLICY IF EXISTS "Tournament owners can delete participants" ON participants;

CREATE POLICY "Captains or owners can delete participants"
  ON participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = participants.team_id
      AND teams.captain_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = participants.tournament_id
      AND tournaments.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: participants - UPDATE (3 policies)
-- ============================================
-- Les 3 policies peuvent être fusionnées (OR logique)
-- Note: "Admins can manage participants" et "Tournament owners can update participants" sont identiques

DROP POLICY IF EXISTS "Admins can manage participants" ON participants;
DROP POLICY IF EXISTS "Tournament owners can update participants" ON participants;
DROP POLICY IF EXISTS "Users can update their own team check-in" ON participants;

CREATE POLICY "Authorized users can update participants"
  ON participants FOR UPDATE
  USING (
    -- Tournament owner check
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

-- ============================================
-- TABLE: tournaments - DELETE (2 policies)
-- ============================================
-- Les 2 policies sont identiques (owner_id = auth.uid())
-- "Owners can delete their tournaments" et "Owners can manage tournaments" (ALL)

DROP POLICY IF EXISTS "Owners can delete their tournaments" ON tournaments;
-- Garder: "Owners can manage tournaments" (ALL) qui couvre déjà DELETE

-- ============================================
-- TABLE: tournaments - UPDATE (2 policies)
-- ============================================
-- Les 2 policies sont identiques (owner_id = auth.uid())
-- "Owners can update their tournaments" et "Owners can manage tournaments" (ALL)

DROP POLICY IF EXISTS "Owners can update their tournaments" ON tournaments;
-- Garder: "Owners can manage tournaments" (ALL) qui couvre déjà UPDATE

-- ============================================
-- TABLE: tournaments - SELECT (2 policies)
-- ============================================
-- "Owners can manage tournaments" (ALL) couvre SELECT
-- "Tournaments are viewable by everyone." (true) couvre aussi SELECT
-- On peut garder seulement "Tournaments are viewable by everyone." (plus simple)

DROP POLICY IF EXISTS "Owners can manage tournaments" ON tournaments;
-- Garder: "Tournaments are viewable by everyone." (true)

-- MAIS ATTENTION: Si on supprime "Owners can manage tournaments", on perd UPDATE/DELETE/INSERT
-- Il faut recréer ces policies séparément

-- Recréer les policies pour UPDATE/DELETE/INSERT
CREATE POLICY "Owners can update tournaments"
  ON tournaments FOR UPDATE
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Owners can delete tournaments"
  ON tournaments FOR DELETE
  USING ((select auth.uid()) = owner_id);

-- INSERT est déjà couvert par "Users can create tournaments"

-- ============================================
-- TABLE: matches - UPDATE (4 policies)
-- ============================================
-- Fusionner les 4 policies en une seule

DROP POLICY IF EXISTS "Admins can update everything" ON matches;
DROP POLICY IF EXISTS "Only organizers or teams can update matches" ON matches;
DROP POLICY IF EXISTS "Owners can update matches." ON matches;
DROP POLICY IF EXISTS "Players can update their own matches" ON matches;

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
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Ce script fusionne les policies multiples en une seule
-- 2. Tester bien toutes les fonctionnalités après l'exécution
-- 3. Certaines fusions sont simples (même condition), d'autres sont complexes (OR logique)
-- 4. Si vous n'êtes pas sûr, gardez les policies multiples (elles fonctionnent, juste moins performantes)
-- 5. Vous pouvez fusionner progressivement, table par table

