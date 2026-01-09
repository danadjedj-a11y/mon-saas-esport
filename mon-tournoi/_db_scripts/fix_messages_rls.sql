-- ============================================
-- CORRECTION RLS POUR LA TABLE messages
-- ============================================
-- Problème: "new row violates row-level security policy for table messages"
-- Solution: Corriger la politique RLS pour permettre l'insertion de messages dans les matchs
-- ============================================

-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;

-- Créer une nouvelle politique plus permissive pour les messages de match
CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      -- Pour les messages de match : vérifier que l'utilisateur est membre d'une équipe du match
      (
        match_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM matches m
          WHERE m.id = messages.match_id
          AND (
            -- L'utilisateur est membre de l'équipe player1_id
            EXISTS (
              SELECT 1 FROM team_members tm
              WHERE tm.team_id = m.player1_id
              AND tm.user_id = (select auth.uid())
            )
            OR
            -- L'utilisateur est capitaine de l'équipe player1_id
            EXISTS (
              SELECT 1 FROM teams t
              WHERE t.id = m.player1_id
              AND t.captain_id = (select auth.uid())
            )
            OR
            -- L'utilisateur est membre de l'équipe player2_id
            EXISTS (
              SELECT 1 FROM team_members tm
              WHERE tm.team_id = m.player2_id
              AND tm.user_id = (select auth.uid())
            )
            OR
            -- L'utilisateur est capitaine de l'équipe player2_id
            EXISTS (
              SELECT 1 FROM teams t
              WHERE t.id = m.player2_id
              AND t.captain_id = (select auth.uid())
            )
            OR
            -- L'utilisateur est propriétaire du tournoi (organisateur)
            EXISTS (
              SELECT 1 FROM tournaments t
              WHERE t.id = m.tournament_id
              AND t.owner_id = (select auth.uid())
            )
          )
        )
      )
      OR
      -- Pour les messages de tournoi : vérifier que l'utilisateur participe au tournoi
      (
        tournament_id IS NOT NULL
        AND (
          -- L'utilisateur est propriétaire du tournoi
          EXISTS (
            SELECT 1 FROM tournaments t
            WHERE t.id = messages.tournament_id
            AND t.owner_id = (select auth.uid())
          )
          OR
          -- L'utilisateur est membre d'une équipe qui participe au tournoi
          EXISTS (
            SELECT 1 FROM participants p
            JOIN team_members tm ON p.team_id = tm.team_id
            WHERE p.tournament_id = messages.tournament_id
            AND tm.user_id = (select auth.uid())
          )
          OR
          -- L'utilisateur est capitaine d'une équipe qui participe au tournoi
          EXISTS (
            SELECT 1 FROM participants p
            JOIN teams t ON p.team_id = t.id
            WHERE p.tournament_id = messages.tournament_id
            AND t.captain_id = (select auth.uid())
          )
        )
      )
    )
  );

-- Vérifier que la politique SELECT existe aussi (pour lire les messages)
DROP POLICY IF EXISTS "Users can view relevant messages" ON messages;

CREATE POLICY "Users can view relevant messages"
  ON messages FOR SELECT
  USING (
    -- Messages publics (pas de match_id ni tournament_id) - tous peuvent voir
    (match_id IS NULL AND tournament_id IS NULL)
    OR
    -- Messages de match : voir si l'utilisateur participe au match ou au tournoi
    (
      match_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM matches m
        WHERE m.id = messages.match_id
        AND (
          -- L'utilisateur est membre/capitaine d'une équipe du match
          EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id IN (m.player1_id, m.player2_id)
            AND tm.user_id = (select auth.uid())
          )
          OR
          EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id IN (m.player1_id, m.player2_id)
            AND t.captain_id = (select auth.uid())
          )
          OR
          -- L'utilisateur est propriétaire du tournoi
          EXISTS (
            SELECT 1 FROM tournaments t
            WHERE t.id = m.tournament_id
            AND t.owner_id = (select auth.uid())
          )
        )
      )
    )
    OR
    -- Messages de tournoi : voir si l'utilisateur participe au tournoi
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
        OR
        EXISTS (
          SELECT 1 FROM participants p
          JOIN teams t ON p.team_id = t.id
          WHERE p.tournament_id = messages.tournament_id
          AND t.captain_id = (select auth.uid())
        )
      )
    )
  );

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- ✅ Les politiques RLS pour messages sont maintenant corrigées
-- ✅ L'insertion de messages dans les matchs devrait maintenant fonctionner
-- ============================================
