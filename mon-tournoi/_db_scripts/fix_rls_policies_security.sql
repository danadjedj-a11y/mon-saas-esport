-- ============================================
-- SCRIPT DE CORRECTION DES POLICIES RLS
-- ============================================
-- ⚠️ IMPORTANT: Exécuter ce script dans l'ordre
-- ⚠️ TESTER D'ABORD EN STAGING
-- ⚠️ FAIRE UNE SAUVEGARDE AVANT
-- ============================================
-- Ce script corrige les vulnérabilités identifiées dans l'audit
-- ============================================

-- ============================================
-- ÉTAPE 1: SUPPRIMER LES POLICIES TROP PERMISSIVES
-- ============================================

-- Supprimer la policy qui permet à n'importe qui de modifier n'importe quel match
DROP POLICY IF EXISTS "Allow players to update matches" ON matches;

-- Supprimer la policy qui permet à n'importe qui de modifier les scores suisses
DROP POLICY IF EXISTS "Enable update for authenticated users" ON swiss_scores;

-- ============================================
-- ÉTAPE 2: NETTOYER LES POLICIES DUPLIQUÉES
-- ============================================

-- Profiles: Supprimer les doublons, garder une seule policy SELECT publique
DROP POLICY IF EXISTS "Lecture publique des profils" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- Garder: "Public profiles are viewable by everyone."

-- Tournaments: Supprimer les doublons
DROP POLICY IF EXISTS "Public tournaments readable" ON tournaments;
DROP POLICY IF EXISTS "Public tournaments view" ON tournaments;
-- Garder: "Tournaments are viewable by everyone."

-- Participants: Supprimer les doublons
DROP POLICY IF EXISTS "Public participants are viewable by everyone" ON participants;
-- Garder: "Users can view participants"

-- Match games: Supprimer les doublons si nécessaire
-- (Garder les policies les plus restrictives)

-- ============================================
-- ÉTAPE 3: CORRIGER LES POLICIES INSERT SANS VÉRIFICATION
-- ============================================

-- Score reports: Ajouter vérification que l'utilisateur est dans le match
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

-- Participants: Vérifier que l'utilisateur est capitaine
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

-- ============================================
-- ÉTAPE 4: CRÉER DES POLICIES POUR LES TABLES MANQUANTES
-- ============================================

-- Waitlist: CRITIQUE - Table actuellement non protégée
-- Vérifier d'abord si RLS est activé
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'waitlist'
  ) THEN
    RAISE NOTICE 'Table waitlist does not exist, skipping policies';
  ELSE
    -- Activer RLS si pas déjà activé
    ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
    
    -- Supprimer les anciennes policies si elles existent
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
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM tournaments t
          WHERE t.id = waitlist.tournament_id
          AND t.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- User levels: Lecture publique (pour leaderboards), pas d'UPDATE direct
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_levels'
  ) THEN
    ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view levels" ON user_levels;
    
    -- Lecture: Public (pour leaderboards)
    CREATE POLICY "Users can view levels"
      ON user_levels FOR SELECT
      USING (true);
    
    -- Pas de policy UPDATE - doit passer par RPC (add_xp)
  END IF;
END $$;

-- User roles: Lecture publique, pas d'UPDATE direct
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles'
  ) THEN
    ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view roles" ON user_roles;
    
    -- Lecture: Public (pour vérifier les rôles)
    CREATE POLICY "Users can view roles"
      ON user_roles FOR SELECT
      USING (true);
    
    -- Pas de policy UPDATE - doit passer par backend/admin
  END IF;
END $$;

-- ============================================
-- ÉTAPE 5: RESTREINDRE L'ACCÈS AUX MESSAGES
-- ============================================

-- Messages: Limiter la lecture aux messages du match/tournoi concerné
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON messages;

-- Lecture: Utilisateurs peuvent voir les messages des matchs/tournois où ils participent
CREATE POLICY "Users can view relevant messages"
  ON messages FOR SELECT
  USING (
    -- Message de match: Utilisateur doit être dans une équipe du match
    (
      match_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM matches m
        JOIN team_members tm ON (
          tm.team_id = m.player1_id OR tm.team_id = m.player2_id
        )
        WHERE m.id = messages.match_id
        AND tm.user_id = auth.uid()
      )
    )
    OR
    -- Message de tournoi: Utilisateur doit être participant ou organisateur
    (
      tournament_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM tournaments t
          WHERE t.id = messages.tournament_id
          AND t.owner_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM participants p
          JOIN team_members tm ON p.team_id = tm.team_id
          WHERE p.tournament_id = messages.tournament_id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Insertion: Utilisateurs authentifiés peuvent envoyer des messages
CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      -- Vérifier que l'utilisateur peut accéder au match/tournoi
      (
        match_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM matches m
          JOIN team_members tm ON (
            tm.team_id = m.player1_id OR tm.team_id = m.player2_id
          )
          WHERE m.id = messages.match_id
          AND tm.user_id = auth.uid()
        )
      )
      OR
      (
        tournament_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM tournaments t
            WHERE t.id = messages.tournament_id
            AND t.owner_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM participants p
            JOIN team_members tm ON p.team_id = tm.team_id
            WHERE p.tournament_id = messages.tournament_id
            AND tm.user_id = auth.uid()
          )
        )
      )
    )
  );

-- ============================================
-- ÉTAPE 6: VÉRIFICATION FINALE
-- ============================================

-- Lister toutes les policies après correction
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'No restriction (NULL)'
    WHEN qual = 'true' THEN 'Public access (true)'
    ELSE 'Restricted'
  END as restriction_level
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Tester chaque fonctionnalité après l'exécution
-- 2. Vérifier que les opérations normales fonctionnent toujours
-- 3. Les policies UPDATE pour matches sont maintenant restrictives
-- 4. La table waitlist est maintenant protégée
-- 5. Les messages sont maintenant restreints aux participants

-- ============================================
-- ROLLBACK (En cas de problème)
-- ============================================
-- Si vous devez annuler ces changements, exécutez:
-- 
-- -- Réactiver les policies permissives (NON RECOMMANDÉ)
-- CREATE POLICY "Allow players to update matches"
--   ON matches FOR UPDATE
--   USING (auth.role() = 'authenticated');
--
-- -- Mais NE PAS faire cela en production!

