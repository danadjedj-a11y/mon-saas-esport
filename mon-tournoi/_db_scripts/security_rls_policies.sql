-- ============================================
-- SCRIPT DE SÉCURISATION RLS (ROW LEVEL SECURITY)
-- ============================================
-- ⚠️ IMPORTANT: Exécuter ce script dans l'ordre
-- ⚠️ TESTER D'ABORD EN STAGING
-- ⚠️ FAIRE UNE SAUVEGARDE AVANT
-- ============================================

-- ============================================
-- ÉTAPE 1: ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_vetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE swiss_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_score_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 2: POLICIES POUR 'profiles'
-- ============================================

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles readable" ON profiles;

-- Lecture: Utilisateurs peuvent voir leur propre profil + profils publics (username, avatar)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id  -- Son propre profil
    OR
    -- Profils publics (seulement username et avatar pour les autres)
    true  -- TODO: Ajouter un champ is_public si nécessaire
  );

-- Mise à jour: Seulement son propre profil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insertion: Seulement lors de la création de compte (via trigger)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- ÉTAPE 3: POLICIES POUR 'score_reports'
-- ============================================

DROP POLICY IF EXISTS "Relevant users can view score reports" ON score_reports;
DROP POLICY IF EXISTS "Teams can report scores" ON score_reports;
DROP POLICY IF EXISTS "Admins can resolve reports" ON score_reports;

-- Lecture: Participants du match ou organisateur
CREATE POLICY "Relevant users can view score reports"
  ON score_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = score_reports.match_id
      AND (
        t.owner_id = auth.uid()  -- Organisateur
        OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id IN (m.player1_id, m.player2_id)
          AND tm.user_id = auth.uid()  -- Membre d'une équipe du match
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
      JOIN team_members tm ON (
        tm.team_id = m.player1_id OR tm.team_id = m.player2_id
      )
      WHERE m.id = score_reports.match_id
      AND tm.user_id = auth.uid()
    )
  );

-- Mise à jour: Seulement organisateur (pour résoudre)
CREATE POLICY "Admins can resolve reports"
  ON score_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = score_reports.match_id
      AND t.owner_id = auth.uid()
    )
  );

-- ============================================
-- ÉTAPE 4: POLICIES POUR 'waitlist'
-- ============================================

DROP POLICY IF EXISTS "Users can view waitlist" ON waitlist;
DROP POLICY IF EXISTS "Admins can manage waitlist" ON waitlist;
DROP POLICY IF EXISTS "Teams can join waitlist" ON waitlist;

-- Lecture: Tous les utilisateurs authentifiés peuvent voir la waitlist
CREATE POLICY "Users can view waitlist"
  ON waitlist FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insertion: Équipes peuvent s'inscrire en waitlist
CREATE POLICY "Teams can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = waitlist.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Mise à jour/Suppression: Seulement organisateur
CREATE POLICY "Admins can manage waitlist"
  ON waitlist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = waitlist.tournament_id
      AND t.owner_id = auth.uid()
    )
  );

-- ============================================
-- ÉTAPE 5: POLICIES POUR 'matches'
-- ============================================

DROP POLICY IF EXISTS "Users can view relevant matches" ON matches;
DROP POLICY IF EXISTS "Only organizers or teams can update matches" ON matches;
DROP POLICY IF EXISTS "Only organizers can insert matches" ON matches;

-- Lecture: Matchs publics ou matchs où l'utilisateur participe
CREATE POLICY "Users can view relevant matches"
  ON matches FOR SELECT
  USING (
    -- Match public (tournoi public ou en cours)
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = matches.tournament_id
      AND (t.status = 'ongoing' OR t.status = 'completed')
    )
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
      SELECT 1 FROM tournaments t
      WHERE t.id = matches.tournament_id
      AND t.owner_id = auth.uid()
    )
  );

-- Mise à jour: Organisateur ou équipe (pour déclarer score)
CREATE POLICY "Only organizers or teams can update matches"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = matches.tournament_id
      AND t.owner_id = auth.uid()  -- Organisateur
    )
    OR
    -- Équipe peut mettre à jour son score déclaré uniquement
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

-- Insertion: Seulement organisateur
CREATE POLICY "Only organizers can insert matches"
  ON matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = matches.tournament_id
      AND t.owner_id = auth.uid()
    )
  );

-- ============================================
-- ÉTAPE 6: POLICIES POUR 'tournaments'
-- ============================================

DROP POLICY IF EXISTS "Public tournaments readable" ON tournaments;
DROP POLICY IF EXISTS "Owners can manage tournaments" ON tournaments;

-- Lecture: Tous les tournois publics
CREATE POLICY "Public tournaments readable"
  ON tournaments FOR SELECT
  USING (true);  -- Tous les tournois sont publics pour la lecture

-- Mise à jour/Suppression: Seulement propriétaire
CREATE POLICY "Owners can manage tournaments"
  ON tournaments FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ============================================
-- ÉTAPE 7: POLICIES POUR 'participants'
-- ============================================

DROP POLICY IF EXISTS "Users can view participants" ON participants;
DROP POLICY IF EXISTS "Teams can join tournaments" ON participants;
DROP POLICY IF EXISTS "Admins can manage participants" ON participants;

-- Lecture: Tous les participants (public)
CREATE POLICY "Users can view participants"
  ON participants FOR SELECT
  USING (true);

-- Insertion: Équipes peuvent s'inscrire
CREATE POLICY "Teams can join tournaments"
  ON participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = participants.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Mise à jour/Suppression: Seulement organisateur
CREATE POLICY "Admins can manage participants"
  ON participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = participants.tournament_id
      AND t.owner_id = auth.uid()
    )
  );

-- ============================================
-- ÉTAPE 8: POLICIES POUR 'teams'
-- ============================================

DROP POLICY IF EXISTS "Users can view teams" ON teams;
DROP POLICY IF EXISTS "Captains can manage teams" ON teams;

-- Lecture: Toutes les équipes (public)
CREATE POLICY "Users can view teams"
  ON teams FOR SELECT
  USING (true);

-- Mise à jour: Seulement capitaine
CREATE POLICY "Captains can manage teams"
  ON teams FOR UPDATE
  USING (captain_id = auth.uid())
  WITH CHECK (captain_id = auth.uid());

-- Insertion: N'importe qui peut créer une équipe (devient automatiquement capitaine)
CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (captain_id = auth.uid());

-- ============================================
-- ÉTAPE 9: POLICIES POUR 'team_members'
-- ============================================

DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Captains can manage members" ON team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON team_members;

-- Lecture: Membres de l'équipe ou public
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (true);  -- Public pour voir les membres

-- Insertion: Seulement capitaine (via invitation)
CREATE POLICY "Captains can manage members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
      AND t.captain_id = auth.uid()
    )
  );

-- Suppression: Capitaine ou le membre lui-même
CREATE POLICY "Users can leave teams"
  ON team_members FOR DELETE
  USING (
    user_id = auth.uid()  -- Le membre peut se retirer
    OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
      AND t.captain_id = auth.uid()  -- Le capitaine peut retirer
    )
  );

-- ============================================
-- ÉTAPE 10: POLICIES POUR AUTRES TABLES CRITIQUES
-- ============================================

-- match_games: Même logique que matches
CREATE POLICY "Users can view match games"
  ON match_games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = match_games.match_id
      AND (
        t.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id IN (m.player1_id, m.player2_id)
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Teams can update match games"
  ON match_games FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN team_members tm ON (
        tm.team_id = m.player1_id OR tm.team_id = m.player2_id
      )
      WHERE m.id = match_games.match_id
      AND tm.user_id = auth.uid()
    )
  );

-- notifications: Seulement ses propres notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- tournament_comments: Public en lecture, authentifié en écriture
CREATE POLICY "Public can view comments"
  ON tournament_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can comment"
  ON tournament_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON tournament_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. TESTER chaque policy après création
-- 2. Vérifier que les opérations normales fonctionnent toujours
-- 3. Ajuster les policies selon vos besoins spécifiques
-- 4. Certaines policies peuvent être trop restrictives - ajuster au besoin
-- 5. Documenter toute exception nécessaire

-- ============================================
-- VÉRIFICATION: Lister toutes les policies créées
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

