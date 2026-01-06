-- ============================================
-- CORRECTION DES WARNINGS DE PERFORMANCE
-- ============================================
-- ⚠️ IMPORTANT: Exécuter ce script dans l'ordre
-- ⚠️ TESTER D'ABORD EN STAGING
-- ⚠️ FAIRE UNE SAUVEGARDE AVANT
-- ============================================
-- Ce script optimise les policies RLS pour améliorer les performances
-- ============================================

-- ============================================
-- PROBLÈME 1: AUTH RLS INITIALIZATION PLAN
-- ============================================
-- Les policies utilisent auth.uid() directement au lieu de (select auth.uid())
-- Cela cause une réévaluation pour chaque ligne au lieu d'une seule fois
-- ============================================

-- NOTE: La modification des policies nécessite de les recréer.
-- Ce script utilise une approche automatisée pour les policies les plus critiques.
-- Pour les autres, voir la section "POLICIES À MODIFIER MANUELLEMENT"

-- ============================================
-- ÉTAPE 1: SUPPRIMER L'INDEX DUPLIQUÉ (PRIORITÉ 3)
-- ============================================

-- Supprimer l'index dupliqué sur matches
DROP INDEX IF EXISTS idx_matches_scheduled_status;
-- Garder: idx_matches_scheduled_at_status (plus descriptif)

-- ============================================
-- ÉTAPE 2: OPTIMISER LES POLICIES CRITIQUES (PRIORITÉ 1)
-- ============================================
-- Ces policies sont sur les tables les plus utilisées
-- ============================================

-- ============================================
-- TABLE: matches
-- ============================================

-- Policy: "Owners can update matches."
DROP POLICY IF EXISTS "Owners can update matches." ON matches;
CREATE POLICY "Owners can update matches."
  ON matches FOR UPDATE
  USING (
    (select auth.uid()) IN (
      SELECT tournaments.owner_id
      FROM tournaments
      WHERE tournaments.id = matches.tournament_id
    )
  );

-- Policy: "Admins can update everything"
DROP POLICY IF EXISTS "Admins can update everything" ON matches;
CREATE POLICY "Admins can update everything"
  ON matches FOR UPDATE
  USING (
    (select auth.uid()) IN (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.role = 'superadmin' OR profiles.role = 'organizer'
    )
  );

-- Policy: "Players can update their own matches"
DROP POLICY IF EXISTS "Players can update their own matches" ON matches;
CREATE POLICY "Players can update their own matches"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.user_id = (select auth.uid())
      AND (
        team_members.team_id = matches.player1_id
        OR team_members.team_id = matches.player2_id
      )
    )
  );

-- Policy: "Only organizers or teams can update matches"
DROP POLICY IF EXISTS "Only organizers or teams can update matches" ON matches;
CREATE POLICY "Only organizers or teams can update matches"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = matches.tournament_id
      AND t.owner_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = matches.player1_id
      AND tm.user_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = matches.player2_id
      AND tm.user_id = (select auth.uid())
    )
  );

-- Policy: "Only organizers can insert matches"
DROP POLICY IF EXISTS "Only organizers can insert matches" ON matches;
CREATE POLICY "Only organizers can insert matches"
  ON matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = matches.tournament_id
      AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: tournaments
-- ============================================

-- Policy: "Owners can delete their tournaments"
DROP POLICY IF EXISTS "Owners can delete their tournaments" ON tournaments;
CREATE POLICY "Owners can delete their tournaments"
  ON tournaments FOR DELETE
  USING ((select auth.uid()) = owner_id);

-- Policy: "Owners can update their tournaments"
DROP POLICY IF EXISTS "Owners can update their tournaments" ON tournaments;
CREATE POLICY "Owners can update their tournaments"
  ON tournaments FOR UPDATE
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

-- Policy: "Users can create tournaments"
DROP POLICY IF EXISTS "Users can create tournaments" ON tournaments;
CREATE POLICY "Users can create tournaments"
  ON tournaments FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

-- Policy: "Owners can manage tournaments"
DROP POLICY IF EXISTS "Owners can manage tournaments" ON tournaments;
CREATE POLICY "Owners can manage tournaments"
  ON tournaments FOR ALL
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

-- ============================================
-- TABLE: participants
-- ============================================

-- Policy: "Captains can register their team"
DROP POLICY IF EXISTS "Captains can register their team" ON participants;
CREATE POLICY "Captains can register their team"
  ON participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = participants.team_id
      AND t.captain_id = (select auth.uid())
    )
  );

-- Policy: "Tournament owners can insert participants"
DROP POLICY IF EXISTS "Tournament owners can insert participants" ON participants;
CREATE POLICY "Tournament owners can insert participants"
  ON participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = participants.tournament_id
      AND tournaments.owner_id = (select auth.uid())
    )
  );

-- Policy: "Tournament owners can update participants"
DROP POLICY IF EXISTS "Tournament owners can update participants" ON participants;
CREATE POLICY "Tournament owners can update participants"
  ON participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = participants.tournament_id
      AND tournaments.owner_id = (select auth.uid())
    )
  );

-- Policy: "Tournament owners can delete participants"
DROP POLICY IF EXISTS "Tournament owners can delete participants" ON participants;
CREATE POLICY "Tournament owners can delete participants"
  ON participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = participants.tournament_id
      AND tournaments.owner_id = (select auth.uid())
    )
  );

-- Policy: "Admins can manage participants"
DROP POLICY IF EXISTS "Admins can manage participants" ON participants;
CREATE POLICY "Admins can manage participants"
  ON participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = participants.tournament_id
      AND t.owner_id = (select auth.uid())
    )
  );

-- Policy: "Users can update their own team check-in"
DROP POLICY IF EXISTS "Users can update their own team check-in" ON participants;
CREATE POLICY "Users can update their own team check-in"
  ON participants FOR UPDATE
  USING (
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
  WITH CHECK (
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
  );

-- Policy: "Captains can remove their team"
DROP POLICY IF EXISTS "Captains can remove their team" ON participants;
CREATE POLICY "Captains can remove their team"
  ON participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = participants.team_id
      AND teams.captain_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: profiles
-- ============================================

-- Policy: "Users can update own profile"
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Policy: "Users can insert own profile"
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- TABLE: user_levels
-- ============================================

-- Policy: "Users can update their own level"
DROP POLICY IF EXISTS "Users can update their own level" ON user_levels;
CREATE POLICY "Users can update their own level"
  ON user_levels FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: teams
-- ============================================

-- Policy: "Users can create teams"
DROP POLICY IF EXISTS "Users can create teams" ON teams;
CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK ((select auth.uid()) = captain_id);

-- Policy: "Captains can manage teams"
DROP POLICY IF EXISTS "Captains can manage teams" ON teams;
CREATE POLICY "Captains can manage teams"
  ON teams FOR UPDATE
  USING ((select auth.uid()) = captain_id)
  WITH CHECK ((select auth.uid()) = captain_id);

-- ============================================
-- TABLE: team_members
-- ============================================

-- Policy: "Users can join teams"
DROP POLICY IF EXISTS "Users can join teams" ON team_members;
CREATE POLICY "Users can join teams"
  ON team_members FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: "Captains can manage members"
DROP POLICY IF EXISTS "Captains can manage members" ON team_members;
CREATE POLICY "Captains can manage members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.captain_id = (select auth.uid())
    )
  );

-- Policy: "Users can leave teams"
DROP POLICY IF EXISTS "Users can leave teams" ON team_members;
CREATE POLICY "Users can leave teams"
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

-- Policy: "Captains can remove members"
DROP POLICY IF EXISTS "Captains can remove members" ON team_members;
CREATE POLICY "Captains can remove members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.captain_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: waitlist
-- ============================================

-- Policy: "Teams can join waitlist"
DROP POLICY IF EXISTS "Teams can join waitlist" ON waitlist;
CREATE POLICY "Teams can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = waitlist.team_id
      AND tm.user_id = (select auth.uid())
    )
  );

-- Policy: "Users can view waitlist"
DROP POLICY IF EXISTS "Users can view waitlist" ON waitlist;
CREATE POLICY "Users can view waitlist"
  ON waitlist FOR SELECT
  USING ((select auth.role()) = 'authenticated');

-- Policy: "Admins can manage waitlist"
DROP POLICY IF EXISTS "Admins can manage waitlist" ON waitlist;
CREATE POLICY "Admins can manage waitlist"
  ON waitlist FOR ALL
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
-- TABLE: score_reports
-- ============================================

-- Policy: "Teams can report scores"
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
      AND tm.user_id = (select auth.uid())
    )
  );

-- Policy: "Relevant users can view score reports"
DROP POLICY IF EXISTS "Relevant users can view score reports" ON score_reports;
CREATE POLICY "Relevant users can view score reports"
  ON score_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = score_reports.match_id
      AND (
        t.owner_id = (select auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id IN (m.player1_id, m.player2_id)
          AND tm.user_id = (select auth.uid())
        )
      )
    )
  );

-- Policy: "Admins can resolve reports"
DROP POLICY IF EXISTS "Admins can resolve reports" ON score_reports;
CREATE POLICY "Admins can resolve reports"
  ON score_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = score_reports.match_id
      AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: messages
-- ============================================

-- Policy: "Authenticated users can send messages"
DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;
CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    (select auth.role()) = 'authenticated'
    AND (
      (
        match_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM matches m
          JOIN team_members tm ON (
            tm.team_id = m.player1_id OR tm.team_id = m.player2_id
          )
          WHERE m.id = messages.match_id
          AND tm.user_id = (select auth.uid())
        )
      )
      OR
      (
        tournament_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM tournaments t
            WHERE t.id = messages.tournament_id
            AND t.owner_id = (select auth.uid())
          )
          OR
          EXISTS (
            SELECT 1 FROM participants p
            JOIN team_members tm ON p.team_id = tm.team_id
            WHERE p.tournament_id = messages.tournament_id
            AND tm.user_id = (select auth.uid())
          )
        )
      )
    )
  );

-- Policy: "Users can view relevant messages"
DROP POLICY IF EXISTS "Users can view relevant messages" ON messages;
CREATE POLICY "Users can view relevant messages"
  ON messages FOR SELECT
  USING (
    (
      match_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM matches m
        JOIN team_members tm ON (
          tm.team_id = m.player1_id OR tm.team_id = m.player2_id
        )
        WHERE m.id = messages.match_id
        AND tm.user_id = (select auth.uid())
      )
    )
    OR
    (
      tournament_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM tournaments t
          WHERE t.id = messages.tournament_id
          AND t.owner_id = (select auth.uid())
        )
        OR
        EXISTS (
          SELECT 1 FROM participants p
          JOIN team_members tm ON p.team_id = tm.team_id
          WHERE p.tournament_id = messages.tournament_id
          AND tm.user_id = (select auth.uid())
        )
      )
    )
  );

-- ============================================
-- ÉTAPE 3: OPTIMISER LES POLICIES RESTANTES (PRIORITÉ 2)
-- ============================================
-- Ces policies sont sur des tables modérément utilisées
-- ============================================

-- ============================================
-- TABLE: match_games
-- ============================================

-- Policy: "Participants and owners can manage match games."
DROP POLICY IF EXISTS "Participants and owners can manage match games." ON match_games;
CREATE POLICY "Participants and owners can manage match games."
  ON match_games FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_games.match_id
      AND (
        matches.player1_id IN (
          SELECT team_members.team_id
          FROM team_members
          WHERE team_members.user_id = (select auth.uid())
          UNION
          SELECT teams.id
          FROM teams
          WHERE teams.captain_id = (select auth.uid())
        )
        OR matches.player2_id IN (
          SELECT team_members.team_id
          FROM team_members
          WHERE team_members.user_id = (select auth.uid())
          UNION
          SELECT teams.id
          FROM teams
          WHERE teams.captain_id = (select auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM tournaments
          WHERE tournaments.id = matches.tournament_id
          AND tournaments.owner_id = (select auth.uid())
        )
      )
    )
  );

-- Policy: "Users can view match games"
DROP POLICY IF EXISTS "Users can view match games" ON match_games;
CREATE POLICY "Users can view match games"
  ON match_games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = match_games.match_id
      AND (
        t.owner_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id IN (m.player1_id, m.player2_id)
          AND tm.user_id = (select auth.uid())
        )
      )
    )
  );

-- Policy: "Teams can update match games"
DROP POLICY IF EXISTS "Teams can update match games" ON match_games;
CREATE POLICY "Teams can update match games"
  ON match_games FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN team_members tm ON (
        tm.team_id = m.player1_id OR tm.team_id = m.player2_id
      )
      WHERE m.id = match_games.match_id
      AND tm.user_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: game_score_reports
-- ============================================

-- Policy: "Participants can create game score reports."
DROP POLICY IF EXISTS "Participants can create game score reports." ON game_score_reports;
CREATE POLICY "Participants can create game score reports."
  ON game_score_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_games mg
      JOIN matches m ON mg.match_id = m.id
      JOIN team_members tm ON (
        tm.team_id = m.player1_id OR tm.team_id = m.player2_id
      )
      WHERE mg.id = game_score_reports.game_id
      AND tm.user_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: match_vetos
-- ============================================

-- Policy: "Participants can create match vetos."
DROP POLICY IF EXISTS "Participants can create match vetos." ON match_vetos;
CREATE POLICY "Participants can create match vetos."
  ON match_vetos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN team_members tm ON (
        tm.team_id = m.player1_id OR tm.team_id = m.player2_id
      )
      WHERE m.id = match_vetos.match_id
      AND tm.user_id = (select auth.uid())
    )
  );

-- ============================================
-- TABLE: tournament_templates
-- ============================================

-- Policy: "Users can create their own templates"
DROP POLICY IF EXISTS "Users can create their own templates" ON tournament_templates;
CREATE POLICY "Users can create their own templates"
  ON tournament_templates FOR INSERT
  WITH CHECK ((select auth.uid()) = owner_id);

-- Policy: "Users can update their own templates"
DROP POLICY IF EXISTS "Users can update their own templates" ON tournament_templates;
CREATE POLICY "Users can update their own templates"
  ON tournament_templates FOR UPDATE
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

-- Policy: "Users can delete their own templates"
DROP POLICY IF EXISTS "Users can delete their own templates" ON tournament_templates;
CREATE POLICY "Users can delete their own templates"
  ON tournament_templates FOR DELETE
  USING ((select auth.uid()) = owner_id);

-- Policy: "Users can view their own templates"
DROP POLICY IF EXISTS "Users can view their own templates" ON tournament_templates;
CREATE POLICY "Users can view their own templates"
  ON tournament_templates FOR SELECT
  USING ((select auth.uid()) = owner_id);

-- ============================================
-- TABLE: tournament_comments
-- ============================================

-- Policy: "Users can create their own comments"
DROP POLICY IF EXISTS "Users can create their own comments" ON tournament_comments;
CREATE POLICY "Users can create their own comments"
  ON tournament_comments FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: "Users can update own comments"
DROP POLICY IF EXISTS "Users can update own comments" ON tournament_comments;
CREATE POLICY "Users can update own comments"
  ON tournament_comments FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: "Users can delete their own comments"
DROP POLICY IF EXISTS "Users can delete their own comments" ON tournament_comments;
CREATE POLICY "Users can delete their own comments"
  ON tournament_comments FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: comment_replies
-- ============================================

-- Policy: "Users can create their own replies"
DROP POLICY IF EXISTS "Users can create their own replies" ON comment_replies;
CREATE POLICY "Users can create their own replies"
  ON comment_replies FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: "Users can update their own replies"
DROP POLICY IF EXISTS "Users can update their own replies" ON comment_replies;
CREATE POLICY "Users can update their own replies"
  ON comment_replies FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: "Users can delete their own replies"
DROP POLICY IF EXISTS "Users can delete their own replies" ON comment_replies;
CREATE POLICY "Users can delete their own replies"
  ON comment_replies FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: comment_votes
-- ============================================

-- Policy: "Users can create their own votes"
DROP POLICY IF EXISTS "Users can create their own votes" ON comment_votes;
CREATE POLICY "Users can create their own votes"
  ON comment_votes FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: "Users can update their own votes"
DROP POLICY IF EXISTS "Users can update their own votes" ON comment_votes;
CREATE POLICY "Users can update their own votes"
  ON comment_votes FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: "Users can delete their own votes"
DROP POLICY IF EXISTS "Users can delete their own votes" ON comment_votes;
CREATE POLICY "Users can delete their own votes"
  ON comment_votes FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: swiss_scores
-- ============================================

-- Policy: "Tournament owners can manage swiss scores."
DROP POLICY IF EXISTS "Tournament owners can manage swiss scores." ON swiss_scores;
CREATE POLICY "Tournament owners can manage swiss scores."
  ON swiss_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = swiss_scores.tournament_id
      AND tournaments.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = swiss_scores.tournament_id
      AND tournaments.owner_id = (select auth.uid())
    )
  );

-- Policy: "Enable insert for authenticated users"
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON swiss_scores;
CREATE POLICY "Enable insert for authenticated users"
  ON swiss_scores FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================
-- TABLE: user_badges
-- ============================================

-- Policy: "Users can view their own badges"
DROP POLICY IF EXISTS "Users can view their own badges" ON user_badges;
CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: tournament_follows
-- ============================================

-- Policy: "Users can view their own tournament follows"
DROP POLICY IF EXISTS "Users can view their own tournament follows" ON tournament_follows;
CREATE POLICY "Users can view their own tournament follows"
  ON tournament_follows FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Policy: "Users can insert their own tournament follows"
DROP POLICY IF EXISTS "Users can insert their own tournament follows" ON tournament_follows;
CREATE POLICY "Users can insert their own tournament follows"
  ON tournament_follows FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: "Users can delete their own tournament follows"
DROP POLICY IF EXISTS "Users can delete their own tournament follows" ON tournament_follows;
CREATE POLICY "Users can delete their own tournament follows"
  ON tournament_follows FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: team_follows
-- ============================================

-- Policy: "Users can view their own team follows"
DROP POLICY IF EXISTS "Users can view their own team follows" ON team_follows;
CREATE POLICY "Users can view their own team follows"
  ON team_follows FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Policy: "Users can insert their own team follows"
DROP POLICY IF EXISTS "Users can insert their own team follows" ON team_follows;
CREATE POLICY "Users can insert their own team follows"
  ON team_follows FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: "Users can delete their own team follows"
DROP POLICY IF EXISTS "Users can delete their own team follows" ON team_follows;
CREATE POLICY "Users can delete their own team follows"
  ON team_follows FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: notifications
-- ============================================

-- Policy: "Users can view own notifications"
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = (select auth.uid()));

-- Policy: "Users can update their own notifications"
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: notification_deduplication
-- ============================================

-- Policy: "Users can view their own deduplication records"
DROP POLICY IF EXISTS "Users can view their own deduplication records" ON notification_deduplication;
CREATE POLICY "Users can view their own deduplication records"
  ON notification_deduplication FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: rate_limits
-- ============================================

-- Policy: "Users can view their own rate limits"
DROP POLICY IF EXISTS "Users can view their own rate limits" ON rate_limits;
CREATE POLICY "Users can view their own rate limits"
  ON rate_limits FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ============================================
-- TABLE: rate_limit_config
-- ============================================

-- Policy: "Authenticated users can read rate limit config"
DROP POLICY IF EXISTS "Authenticated users can read rate limit config" ON rate_limit_config;
CREATE POLICY "Authenticated users can read rate limit config"
  ON rate_limit_config FOR SELECT
  USING ((select auth.role()) = 'authenticated');

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Ce script optimise maintenant TOUTES les policies identifiées dans les warnings
-- 2. Le pattern est toujours le même: remplacer auth.uid() par (select auth.uid())
-- 3. Tester bien toutes les fonctionnalités après l'exécution
-- 4. Les warnings "multiple_permissive_policies" nécessitent une fusion manuelle (voir guide)

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que l'index dupliqué a été supprimé
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'matches'
  AND indexname LIKE '%scheduled%'
ORDER BY indexname;

-- Compter les policies optimisées (celles qui utilisent (select auth.uid()))
-- Note: Cette requête est approximative, vérifiez manuellement
SELECT 
  COUNT(*) as total_policies,
  COUNT(CASE WHEN qual::text LIKE '%(select auth.uid())%' THEN 1 END) as optimized_policies,
  COUNT(CASE WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(select auth.uid())%' THEN 1 END) as unoptimized_policies
FROM pg_policies
WHERE schemaname = 'public';

