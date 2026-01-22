-- ============================================
-- Migration: Fix RLS Performance Warnings
-- Date: 2026-01-20
-- Description: 
--   1. Replace auth.uid() with (select auth.uid()) for better performance
--   2. Combine multiple permissive SELECT policies into single policies
--   3. Remove duplicate indexes
-- ============================================

-- ============================================
-- 1. FIX: player_game_accounts
-- ============================================
DROP POLICY IF EXISTS "Users can manage their own game accounts" ON public.player_game_accounts;

CREATE POLICY "Users can manage their own game accounts" ON public.player_game_accounts
  FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- 2. FIX: messages
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;

CREATE POLICY "Authenticated users can send messages" ON public.messages
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================
-- 3. FIX: tournament_phases
-- ============================================
DROP POLICY IF EXISTS "Phases are editable by tournament owner" ON public.tournament_phases;
DROP POLICY IF EXISTS "Phases are viewable by everyone" ON public.tournament_phases;

-- Single SELECT policy (combines both)
CREATE POLICY "Phases are viewable by everyone" ON public.tournament_phases
  FOR SELECT
  USING (true);

-- Separate policies for INSERT, UPDATE, DELETE
CREATE POLICY "Phases are insertable by tournament owner" ON public.tournament_phases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Phases are updatable by tournament owner" ON public.tournament_phases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Phases are deletable by tournament owner" ON public.tournament_phases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- 4. FIX: bracket_slots
-- ============================================
DROP POLICY IF EXISTS "Bracket slots are editable by tournament owner" ON public.bracket_slots;
DROP POLICY IF EXISTS "Bracket slots are viewable by everyone" ON public.bracket_slots;

CREATE POLICY "Bracket slots are viewable by everyone" ON public.bracket_slots
  FOR SELECT
  USING (true);

CREATE POLICY "Bracket slots are insertable by tournament owner" ON public.bracket_slots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournament_phases tp
      JOIN public.tournaments t ON t.id = tp.tournament_id
      WHERE tp.id = phase_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Bracket slots are updatable by tournament owner" ON public.bracket_slots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_phases tp
      JOIN public.tournaments t ON t.id = tp.tournament_id
      WHERE tp.id = phase_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Bracket slots are deletable by tournament owner" ON public.bracket_slots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_phases tp
      JOIN public.tournaments t ON t.id = tp.tournament_id
      WHERE tp.id = phase_id AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- 5. FIX: news_articles
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view all news articles" ON public.news_articles;
DROP POLICY IF EXISTS "Public can view published news articles" ON public.news_articles;
DROP POLICY IF EXISTS "Organizers can create news articles" ON public.news_articles;
DROP POLICY IF EXISTS "Organizers can update their own news articles" ON public.news_articles;
DROP POLICY IF EXISTS "Organizers can delete their own news articles" ON public.news_articles;

-- Single SELECT policy (news_articles is a global table, no tournament_id)
CREATE POLICY "News articles are viewable" ON public.news_articles
  FOR SELECT
  USING (
    published = true 
    OR author_id = (select auth.uid())
  );

CREATE POLICY "Authenticated users can create news articles" ON public.news_articles
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Authors can update their own news articles" ON public.news_articles
  FOR UPDATE
  USING (author_id = (select auth.uid()));

CREATE POLICY "Authors can delete their own news articles" ON public.news_articles
  FOR DELETE
  USING (author_id = (select auth.uid()));

-- ============================================
-- 6. FIX: team_invitations
-- ============================================
DROP POLICY IF EXISTS "team_invitations_select_policy" ON public.team_invitations;
DROP POLICY IF EXISTS "team_invitations_insert_policy" ON public.team_invitations;
DROP POLICY IF EXISTS "team_invitations_update_policy" ON public.team_invitations;
DROP POLICY IF EXISTS "team_invitations_delete_policy" ON public.team_invitations;

CREATE POLICY "team_invitations_select_policy" ON public.team_invitations
  FOR SELECT
  USING (
    invited_user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.teams t 
      WHERE t.id = team_id AND t.captain_id = (select auth.uid())
    )
  );

CREATE POLICY "team_invitations_insert_policy" ON public.team_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t 
      WHERE t.id = team_id AND t.captain_id = (select auth.uid())
    )
  );

CREATE POLICY "team_invitations_update_policy" ON public.team_invitations
  FOR UPDATE
  USING (
    invited_user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.teams t 
      WHERE t.id = team_id AND t.captain_id = (select auth.uid())
    )
  );

CREATE POLICY "team_invitations_delete_policy" ON public.team_invitations
  FOR DELETE
  USING (
    invited_user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.teams t 
      WHERE t.id = team_id AND t.captain_id = (select auth.uid())
    )
  );

-- ============================================
-- 7. FIX: tournament_custom_fields
-- ============================================
DROP POLICY IF EXISTS "Custom fields are editable by tournament owner" ON public.tournament_custom_fields;
DROP POLICY IF EXISTS "Custom fields are viewable by everyone" ON public.tournament_custom_fields;

CREATE POLICY "Custom fields are viewable by everyone" ON public.tournament_custom_fields
  FOR SELECT
  USING (true);

CREATE POLICY "Custom fields are insertable by tournament owner" ON public.tournament_custom_fields
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Custom fields are updatable by tournament owner" ON public.tournament_custom_fields
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Custom fields are deletable by tournament owner" ON public.tournament_custom_fields
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- 8. FIX: participant_custom_data
-- ============================================
DROP POLICY IF EXISTS "Custom data is viewable by team captain or owner" ON public.participant_custom_data;
DROP POLICY IF EXISTS "Custom data is editable by team captain or owner" ON public.participant_custom_data;

CREATE POLICY "Custom data is viewable by team captain or owner" ON public.participant_custom_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      JOIN public.tournaments t ON t.id = p.tournament_id
      WHERE p.id = participant_id 
      AND (
        t.owner_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.teams tm 
          WHERE tm.id = p.team_id AND tm.captain_id = (select auth.uid())
        )
      )
    )
  );

CREATE POLICY "Custom data is insertable by team captain or owner" ON public.participant_custom_data
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participants p
      JOIN public.tournaments t ON t.id = p.tournament_id
      WHERE p.id = participant_id 
      AND (
        t.owner_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.teams tm 
          WHERE tm.id = p.team_id AND tm.captain_id = (select auth.uid())
        )
      )
    )
  );

CREATE POLICY "Custom data is updatable by team captain or owner" ON public.participant_custom_data
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      JOIN public.tournaments t ON t.id = p.tournament_id
      WHERE p.id = participant_id 
      AND (
        t.owner_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.teams tm 
          WHERE tm.id = p.team_id AND tm.captain_id = (select auth.uid())
        )
      )
    )
  );

CREATE POLICY "Custom data is deletable by team captain or owner" ON public.participant_custom_data
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      JOIN public.tournaments t ON t.id = p.tournament_id
      WHERE p.id = participant_id 
      AND (
        t.owner_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.teams tm 
          WHERE tm.id = p.team_id AND tm.captain_id = (select auth.uid())
        )
      )
    )
  );

-- ============================================
-- 9. FIX: match_locations
-- ============================================
DROP POLICY IF EXISTS "Locations are editable by tournament owner" ON public.match_locations;
DROP POLICY IF EXISTS "Locations are viewable by everyone" ON public.match_locations;

CREATE POLICY "Locations are viewable by everyone" ON public.match_locations
  FOR SELECT
  USING (true);

CREATE POLICY "Locations are insertable by tournament owner" ON public.match_locations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Locations are updatable by tournament owner" ON public.match_locations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Locations are deletable by tournament owner" ON public.match_locations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- 10. FIX: tournament_roles
-- ============================================
DROP POLICY IF EXISTS "Roles are viewable by tournament members" ON public.tournament_roles;
DROP POLICY IF EXISTS "Roles are editable by tournament owner" ON public.tournament_roles;

CREATE POLICY "Roles are viewable by tournament members" ON public.tournament_roles
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Roles are insertable by tournament owner" ON public.tournament_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Roles are updatable by tournament owner" ON public.tournament_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Roles are deletable by tournament owner" ON public.tournament_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- 11. FIX: tournament_widgets
-- ============================================
DROP POLICY IF EXISTS "Widgets are editable by tournament owner" ON public.tournament_widgets;
DROP POLICY IF EXISTS "Widgets are viewable by everyone" ON public.tournament_widgets;

CREATE POLICY "Widgets are viewable by everyone" ON public.tournament_widgets
  FOR SELECT
  USING (true);

CREATE POLICY "Widgets are insertable by tournament owner" ON public.tournament_widgets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Widgets are updatable by tournament owner" ON public.tournament_widgets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Widgets are deletable by tournament owner" ON public.tournament_widgets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- 12. FIX: temporary_teams
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can create temporary teams" ON public.temporary_teams;
DROP POLICY IF EXISTS "Captain or tournament owner can update temporary teams" ON public.temporary_teams;
DROP POLICY IF EXISTS "Captain or tournament owner can delete temporary teams" ON public.temporary_teams;

-- Keep existing SELECT policy if any, or create one
DROP POLICY IF EXISTS "Anyone can view temporary teams" ON public.temporary_teams;
CREATE POLICY "Anyone can view temporary teams" ON public.temporary_teams
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create temporary teams" ON public.temporary_teams
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Captain or tournament owner can update temporary teams" ON public.temporary_teams
  FOR UPDATE
  USING (
    captain_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Captain or tournament owner can delete temporary teams" ON public.temporary_teams
  FOR DELETE
  USING (
    captain_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- 13. FIX: temporary_team_players
-- ============================================
DROP POLICY IF EXISTS "Team captain can add players" ON public.temporary_team_players;
DROP POLICY IF EXISTS "Captain or owner can update players" ON public.temporary_team_players;
DROP POLICY IF EXISTS "Captain or owner can delete players" ON public.temporary_team_players;

-- SELECT policy
DROP POLICY IF EXISTS "Anyone can view temporary team players" ON public.temporary_team_players;
CREATE POLICY "Anyone can view temporary team players" ON public.temporary_team_players
  FOR SELECT
  USING (true);

CREATE POLICY "Team captain can add players" ON public.temporary_team_players
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.temporary_teams tt 
      WHERE tt.id = temporary_team_id AND tt.captain_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.temporary_teams tt
      JOIN public.tournaments t ON t.id = tt.tournament_id
      WHERE tt.id = temporary_team_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Captain or owner can update players" ON public.temporary_team_players
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.temporary_teams tt 
      WHERE tt.id = temporary_team_id AND tt.captain_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.temporary_teams tt
      JOIN public.tournaments t ON t.id = tt.tournament_id
      WHERE tt.id = temporary_team_id AND t.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Captain or owner can delete players" ON public.temporary_team_players
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.temporary_teams tt 
      WHERE tt.id = temporary_team_id AND tt.captain_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.temporary_teams tt
      JOIN public.tournaments t ON t.id = tt.tournament_id
      WHERE tt.id = temporary_team_id AND t.owner_id = (select auth.uid())
    )
  );

-- ============================================
-- 14. FIX: participants
-- ============================================
DROP POLICY IF EXISTS "Captains or owners can insert participants" ON public.participants;
DROP POLICY IF EXISTS "Authorized users can update participants" ON public.participants;
DROP POLICY IF EXISTS "Captains or owners can delete participants" ON public.participants;

CREATE POLICY "Captains or owners can insert participants" ON public.participants
  FOR INSERT
  WITH CHECK (
    (select auth.role()) = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.tournaments t 
        WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.teams tm 
        WHERE tm.id = team_id AND tm.captain_id = (select auth.uid())
      )
      OR team_id IS NULL -- Allow self-registration
    )
  );

CREATE POLICY "Authorized users can update participants" ON public.participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.teams tm 
      WHERE tm.id = team_id AND tm.captain_id = (select auth.uid())
    )
  );

CREATE POLICY "Captains or owners can delete participants" ON public.participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t 
      WHERE t.id = tournament_id AND t.owner_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.teams tm 
      WHERE tm.id = team_id AND tm.captain_id = (select auth.uid())
    )
  );

-- ============================================
-- 15. FIX: Duplicate Index on matches
-- ============================================
-- Drop one of the duplicate indexes (keep idx_matches_phase_id as it's more descriptive)
DROP INDEX IF EXISTS idx_matches_phase;

-- ============================================
-- 16. FIX: Multiple permissive SELECT policies on temporary_teams
-- ============================================
-- Drop the old duplicate policy (we already created "Anyone can view temporary teams")
DROP POLICY IF EXISTS "Temporary teams are viewable by everyone" ON public.temporary_teams;

-- ============================================
-- 17. FIX: Multiple permissive SELECT policies on temporary_team_players
-- ============================================
-- Drop the old duplicate policy (we already created "Anyone can view temporary team players")
DROP POLICY IF EXISTS "Temporary team players are viewable by everyone" ON public.temporary_team_players;

-- ============================================
-- 18. FIX: notifications table - Remove orphan policies (RLS disabled intentionally)
-- ============================================
-- User wants RLS disabled on notifications, so we remove the orphan policies
DROP POLICY IF EXISTS "allow_delete" ON public.notifications;
DROP POLICY IF EXISTS "allow_insert" ON public.notifications;
DROP POLICY IF EXISTS "allow_select_all" ON public.notifications;
DROP POLICY IF EXISTS "allow_update" ON public.notifications;

-- ============================================
-- 19. FIX: temporary_teams_with_players view - Change from SECURITY DEFINER to INVOKER
-- ============================================
-- First, get the view definition and recreate it with SECURITY INVOKER
-- We need to drop and recreate the view
DROP VIEW IF EXISTS public.temporary_teams_with_players;

CREATE VIEW public.temporary_teams_with_players 
WITH (security_invoker = true)
AS
SELECT 
  tt.id,
  tt.tournament_id,
  tt.name,
  tt.captain_id,
  tt.created_at,
  tt.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', ttp.id,
        'user_id', ttp.user_id,
        'player_name', ttp.player_name,
        'player_email', ttp.player_email,
        'game_account', ttp.game_account
      )
    ) FILTER (WHERE ttp.id IS NOT NULL),
    '[]'::json
  ) as players
FROM public.temporary_teams tt
LEFT JOIN public.temporary_team_players ttp ON ttp.temporary_team_id = tt.id
GROUP BY tt.id, tt.tournament_id, tt.name, tt.captain_id, tt.created_at, tt.updated_at;

-- ============================================
-- 20. FIX: Functions with mutable search_path
-- ============================================

-- Fix update_temporary_teams_updated_at
CREATE OR REPLACE FUNCTION public.update_temporary_teams_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix convert_temporary_team_to_permanent
CREATE OR REPLACE FUNCTION public.convert_temporary_team_to_permanent(
  p_temporary_team_id UUID,
  p_permanent_team_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tournament_id UUID;
BEGIN
  -- Get the tournament_id from the temporary team
  SELECT tournament_id INTO v_tournament_id
  FROM public.temporary_teams
  WHERE id = p_temporary_team_id;

  -- Update the participant to link to the permanent team
  UPDATE public.participants
  SET team_id = p_permanent_team_id
  WHERE tournament_id = v_tournament_id
    AND team_id IS NULL
    AND id IN (
      SELECT p.id FROM public.participants p
      JOIN public.temporary_team_players ttp ON ttp.user_id = p.user_id
      WHERE ttp.temporary_team_id = p_temporary_team_id
    );

  -- Delete the temporary team (cascade will delete players)
  DELETE FROM public.temporary_teams WHERE id = p_temporary_team_id;
END;
$$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- DONE! All performance and security warnings should be resolved.
-- (Except auth_leaked_password_protection which is a Supabase Auth setting)
-- ============================================
