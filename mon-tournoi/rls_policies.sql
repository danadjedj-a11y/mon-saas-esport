-- ============================================================
-- Politiques RLS pour le Panneau Admin
-- ============================================================
-- IMPORTANT : Exécutez ce script dans Supabase SQL Editor
-- Ces politiques permettent au propriétaire du tournoi de gérer les participants

-- Supprimer les anciennes politiques si elles existent (pour éviter les doublons)
DROP POLICY IF EXISTS "Tournament owners can update participants" ON participants;
DROP POLICY IF EXISTS "Users can update their own team check-in" ON participants;

-- Politique 1 : Permettre au propriétaire du tournoi de modifier tous les participants de son tournoi
CREATE POLICY "Tournament owners can update participants"
ON participants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tournaments
    WHERE tournaments.id = participants.tournament_id
    AND tournaments.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments
    WHERE tournaments.id = participants.tournament_id
    AND tournaments.owner_id = auth.uid()
  )
);

-- Politique 2 : Permettre aux utilisateurs de mettre à jour leur propre check-in
CREATE POLICY "Users can update their own team check-in"
ON participants
FOR UPDATE
USING (
  -- L'utilisateur est capitaine de l'équipe
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = participants.team_id
    AND teams.captain_id = auth.uid()
  )
  OR
  -- L'utilisateur est membre de l'équipe
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = participants.team_id
    AND team_members.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Même condition pour vérifier qu'on peut seulement modifier son propre check-in
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = participants.team_id
    AND teams.captain_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = participants.team_id
    AND team_members.user_id = auth.uid()
  )
);

-- Vérification : Voir toutes les politiques sur participants
-- SELECT * FROM pg_policies WHERE tablename = 'participants';



