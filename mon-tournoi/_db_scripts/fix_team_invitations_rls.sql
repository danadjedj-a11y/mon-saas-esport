-- Script pour corriger les politiques RLS de team_invitations
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Activer RLS si ce n'est pas déjà fait
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "team_invitations_select_policy" ON team_invitations;
DROP POLICY IF EXISTS "team_invitations_insert_policy" ON team_invitations;
DROP POLICY IF EXISTS "team_invitations_update_policy" ON team_invitations;
DROP POLICY IF EXISTS "team_invitations_delete_policy" ON team_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team captains can view team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team captains can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can respond to their invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team captains can delete invitations" ON team_invitations;

-- 3. Créer les nouvelles politiques

-- SELECT: Utilisateurs peuvent voir les invitations où ils sont invités OU les invitations de leurs équipes
CREATE POLICY "team_invitations_select_policy" ON team_invitations
FOR SELECT USING (
  auth.uid() = invited_user_id  -- L'utilisateur est celui qui est invité
  OR auth.uid() = invited_by    -- L'utilisateur est celui qui a envoyé l'invitation
  OR EXISTS (                   -- L'utilisateur est capitaine/manager de l'équipe
    SELECT 1 FROM teams t 
    WHERE t.id = team_invitations.team_id 
    AND t.captain_id = auth.uid()
  )
  OR EXISTS (                   -- L'utilisateur est membre avec rôle de gestion
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = team_invitations.team_id 
    AND tm.user_id = auth.uid()
    AND tm.role IN ('captain', 'manager', 'coach')
  )
);

-- INSERT: Seuls les capitaines/managers peuvent inviter des joueurs
CREATE POLICY "team_invitations_insert_policy" ON team_invitations
FOR INSERT WITH CHECK (
  auth.uid() = invited_by  -- L'utilisateur connecté doit être celui qui invite
  AND (
    EXISTS (  -- L'utilisateur est le capitaine de l'équipe
      SELECT 1 FROM teams t 
      WHERE t.id = team_invitations.team_id 
      AND t.captain_id = auth.uid()
    )
    OR EXISTS (  -- L'utilisateur est membre avec rôle de gestion
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_invitations.team_id 
      AND tm.user_id = auth.uid()
      AND tm.role IN ('captain', 'manager', 'coach')
    )
  )
);

-- UPDATE: L'utilisateur invité peut accepter/refuser, ou le capitaine peut annuler
CREATE POLICY "team_invitations_update_policy" ON team_invitations
FOR UPDATE USING (
  auth.uid() = invited_user_id  -- L'utilisateur peut répondre à son invitation
  OR EXISTS (                   -- Le capitaine peut modifier
    SELECT 1 FROM teams t 
    WHERE t.id = team_invitations.team_id 
    AND t.captain_id = auth.uid()
  )
);

-- DELETE: Le capitaine peut supprimer les invitations
CREATE POLICY "team_invitations_delete_policy" ON team_invitations
FOR DELETE USING (
  auth.uid() = invited_by  -- Celui qui a invité peut annuler
  OR EXISTS (              -- Le capitaine peut supprimer
    SELECT 1 FROM teams t 
    WHERE t.id = team_invitations.team_id 
    AND t.captain_id = auth.uid()
  )
);

-- 4. Vérification
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'team_invitations';
