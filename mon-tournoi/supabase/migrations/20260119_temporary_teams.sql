-- ============================================
-- Migration : Équipes Temporaires pour Inscription
-- Date : 19 janvier 2026
-- Description : Permet aux joueurs de créer une équipe "à la volée" 
--               lors de l'inscription à un tournoi, sans créer une 
--               équipe permanente dans le système.
-- ============================================

-- Table des équipes temporaires (liées à une inscription de tournoi)
CREATE TABLE IF NOT EXISTS temporary_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lien avec le tournoi
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  
  -- Informations de l'équipe
  name TEXT NOT NULL,
  tag VARCHAR(5), -- Tag court optionnel (ex: "FKB")
  logo_url TEXT,
  
  -- Capitaine (créateur de l'inscription)
  captain_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  captain_email TEXT, -- Email de contact du capitaine
  
  -- Informations de contact optionnelles
  discord_contact TEXT, -- Discord du capitaine ou serveur
  
  -- Statut de l'inscription
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected', 'checked_in')),
  
  -- Si l'équipe a été convertie en équipe permanente
  converted_to_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte d'unicité : un capitaine ne peut avoir qu'une équipe temp par tournoi
  UNIQUE(tournament_id, captain_id)
);

-- Table des joueurs d'une équipe temporaire
CREATE TABLE IF NOT EXISTS temporary_team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lien avec l'équipe temporaire
  temporary_team_id UUID NOT NULL REFERENCES temporary_teams(id) ON DELETE CASCADE,
  
  -- Informations du joueur
  player_name TEXT NOT NULL,
  player_email TEXT, -- Optionnel, pour contact
  
  -- Compte en jeu (ex: RiotID, Steam, etc.)
  game_account TEXT, -- Identifiant en jeu
  game_account_platform VARCHAR(50), -- Plateforme (riot, steam, epic, etc.)
  
  -- Lien optionnel avec un compte utilisateur existant
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Rôle dans l'équipe (optionnel, pour certains jeux)
  role VARCHAR(50), -- Ex: "Top", "Jungle", "Support", etc.
  
  -- Ordre d'affichage
  position INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte : un joueur ne peut être qu'une fois dans une équipe temp
  UNIQUE(temporary_team_id, player_name)
);

-- ============================================
-- INDEX pour performances
-- ============================================

CREATE INDEX IF NOT EXISTS idx_temporary_teams_tournament ON temporary_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_temporary_teams_captain ON temporary_teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_temporary_teams_status ON temporary_teams(status);
CREATE INDEX IF NOT EXISTS idx_temporary_team_players_team ON temporary_team_players(temporary_team_id);
CREATE INDEX IF NOT EXISTS idx_temporary_team_players_user ON temporary_team_players(user_id);

-- ============================================
-- TRIGGER pour updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_temporary_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_temporary_teams_updated_at ON temporary_teams;
CREATE TRIGGER trigger_temporary_teams_updated_at
  BEFORE UPDATE ON temporary_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_temporary_teams_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Activer RLS
ALTER TABLE temporary_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_team_players ENABLE ROW LEVEL SECURITY;

-- === TEMPORARY_TEAMS ===

-- Lecture : tout le monde peut voir les équipes temporaires d'un tournoi public
CREATE POLICY "Temporary teams are viewable by everyone"
  ON temporary_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = temporary_teams.tournament_id
      AND t.is_public = true
    )
  );

-- Insertion : tout utilisateur connecté peut créer une équipe temporaire
CREATE POLICY "Authenticated users can create temporary teams"
  ON temporary_teams FOR INSERT
  WITH CHECK (
    auth.uid() = captain_id
  );

-- Mise à jour : seul le capitaine ou l'owner du tournoi peut modifier
CREATE POLICY "Captain or tournament owner can update temporary teams"
  ON temporary_teams FOR UPDATE
  USING (
    auth.uid() = captain_id
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = temporary_teams.tournament_id
      AND t.owner_id = auth.uid()
    )
  );

-- Suppression : seul le capitaine ou l'owner du tournoi peut supprimer
CREATE POLICY "Captain or tournament owner can delete temporary teams"
  ON temporary_teams FOR DELETE
  USING (
    auth.uid() = captain_id
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = temporary_teams.tournament_id
      AND t.owner_id = auth.uid()
    )
  );

-- === TEMPORARY_TEAM_PLAYERS ===

-- Lecture : tout le monde peut voir les joueurs des équipes temporaires visibles
CREATE POLICY "Temporary team players are viewable by everyone"
  ON temporary_team_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM temporary_teams tt
      JOIN tournaments t ON t.id = tt.tournament_id
      WHERE tt.id = temporary_team_players.temporary_team_id
      AND t.is_public = true
    )
  );

-- Insertion : seul le capitaine de l'équipe temporaire peut ajouter des joueurs
CREATE POLICY "Team captain can add players"
  ON temporary_team_players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM temporary_teams tt
      WHERE tt.id = temporary_team_players.temporary_team_id
      AND tt.captain_id = auth.uid()
    )
  );

-- Mise à jour : capitaine ou owner du tournoi
CREATE POLICY "Captain or owner can update players"
  ON temporary_team_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM temporary_teams tt
      JOIN tournaments t ON t.id = tt.tournament_id
      WHERE tt.id = temporary_team_players.temporary_team_id
      AND (tt.captain_id = auth.uid() OR t.owner_id = auth.uid())
    )
  );

-- Suppression : capitaine ou owner du tournoi
CREATE POLICY "Captain or owner can delete players"
  ON temporary_team_players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM temporary_teams tt
      JOIN tournaments t ON t.id = tt.tournament_id
      WHERE tt.id = temporary_team_players.temporary_team_id
      AND (tt.captain_id = auth.uid() OR t.owner_id = auth.uid())
    )
  );

-- ============================================
-- FONCTION : Convertir équipe temporaire en équipe permanente
-- ============================================

CREATE OR REPLACE FUNCTION convert_temporary_team_to_permanent(
  p_temporary_team_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
  v_temp_team RECORD;
BEGIN
  -- Récupérer l'équipe temporaire
  SELECT * INTO v_temp_team
  FROM temporary_teams
  WHERE id = p_temporary_team_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Équipe temporaire non trouvée';
  END IF;
  
  -- Vérifier que l'utilisateur est le capitaine
  IF v_temp_team.captain_id != auth.uid() THEN
    RAISE EXCEPTION 'Seul le capitaine peut convertir l''équipe';
  END IF;
  
  -- Créer l'équipe permanente
  INSERT INTO teams (name, tag, logo_url, captain_id, discord_invite_link)
  VALUES (
    v_temp_team.name,
    v_temp_team.tag,
    v_temp_team.logo_url,
    v_temp_team.captain_id,
    v_temp_team.discord_contact
  )
  RETURNING id INTO v_team_id;
  
  -- Mettre à jour l'équipe temporaire avec le lien
  UPDATE temporary_teams
  SET converted_to_team_id = v_team_id
  WHERE id = p_temporary_team_id;
  
  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VUE : Équipes temporaires avec joueurs (pour faciliter les requêtes)
-- ============================================

CREATE OR REPLACE VIEW temporary_teams_with_players AS
SELECT 
  tt.*,
  t.name AS tournament_name,
  t.game AS tournament_game,
  COALESCE(
    json_agg(
      json_build_object(
        'id', ttp.id,
        'player_name', ttp.player_name,
        'player_email', ttp.player_email,
        'game_account', ttp.game_account,
        'game_account_platform', ttp.game_account_platform,
        'role', ttp.role,
        'position', ttp.position,
        'user_id', ttp.user_id
      ) ORDER BY ttp.position
    ) FILTER (WHERE ttp.id IS NOT NULL),
    '[]'::json
  ) AS players,
  COUNT(ttp.id) AS player_count
FROM temporary_teams tt
JOIN tournaments t ON t.id = tt.tournament_id
LEFT JOIN temporary_team_players ttp ON ttp.temporary_team_id = tt.id
GROUP BY tt.id, t.name, t.game;

-- ============================================
-- Modification de la table participants pour supporter les équipes temporaires
-- ============================================

-- Ajouter une colonne pour lier à une équipe temporaire
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS temporary_team_id UUID REFERENCES temporary_teams(id) ON DELETE CASCADE;

-- Index pour les requêtes
CREATE INDEX IF NOT EXISTS idx_participants_temporary_team ON participants(temporary_team_id);

-- Contrainte : un participant doit avoir soit team_id soit temporary_team_id
-- (mais pas les deux, et au moins un)
-- Note: Cette contrainte est commentée car elle peut poser des problèmes avec les données existantes
-- ALTER TABLE participants
-- ADD CONSTRAINT check_team_or_temporary_team
-- CHECK (
--   (team_id IS NOT NULL AND temporary_team_id IS NULL)
--   OR (team_id IS NULL AND temporary_team_id IS NOT NULL)
-- );

COMMENT ON TABLE temporary_teams IS 'Équipes créées à la volée lors de l''inscription à un tournoi';
COMMENT ON TABLE temporary_team_players IS 'Joueurs d''une équipe temporaire';
COMMENT ON COLUMN participants.temporary_team_id IS 'Référence vers une équipe temporaire (alternative à team_id)';

-- ============================================
-- MISE À JOUR DES POLICIES DE PARTICIPANTS
-- Pour supporter les équipes temporaires
-- ============================================

-- Supprimer l'ancienne policy INSERT
DROP POLICY IF EXISTS "Captains or owners can insert participants" ON participants;

-- Nouvelle policy INSERT qui accepte team_id OU temporary_team_id
CREATE POLICY "Captains or owners can insert participants"
  ON participants FOR INSERT
  WITH CHECK (
    -- Option 1: Équipe permanente - le capitaine peut inscrire
    (
      team_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM teams t
        WHERE t.id = participants.team_id
        AND t.captain_id = auth.uid()
      )
    )
    -- Option 2: Équipe temporaire - le capitaine peut inscrire
    OR (
      temporary_team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM temporary_teams tt
        WHERE tt.id = participants.temporary_team_id
        AND tt.captain_id = auth.uid()
      )
    )
    -- Option 3: L'owner du tournoi peut toujours inscrire
    OR EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = participants.tournament_id
      AND tournaments.owner_id = auth.uid()
    )
  );

-- Supprimer l'ancienne policy UPDATE
DROP POLICY IF EXISTS "Authorized users can update participants" ON participants;

-- Nouvelle policy UPDATE qui accepte team_id OU temporary_team_id
CREATE POLICY "Authorized users can update participants"
  ON participants FOR UPDATE
  USING (
    -- Owner du tournoi
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = participants.tournament_id
      AND t.owner_id = auth.uid()
    )
    -- Capitaine d'équipe permanente
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = participants.team_id
        AND teams.captain_id = auth.uid()
      )
    )
    -- Membre d'équipe permanente
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = participants.team_id
        AND team_members.user_id = auth.uid()
      )
    )
    -- Capitaine d'équipe temporaire
    OR (
      temporary_team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM temporary_teams tt
        WHERE tt.id = participants.temporary_team_id
        AND tt.captain_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Mêmes conditions
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = participants.tournament_id
      AND t.owner_id = auth.uid()
    )
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = participants.team_id
        AND teams.captain_id = auth.uid()
      )
    )
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = participants.team_id
        AND team_members.user_id = auth.uid()
      )
    )
    OR (
      temporary_team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM temporary_teams tt
        WHERE tt.id = participants.temporary_team_id
        AND tt.captain_id = auth.uid()
      )
    )
  );

-- Supprimer l'ancienne policy DELETE
DROP POLICY IF EXISTS "Captains or owners can delete participants" ON participants;

-- Nouvelle policy DELETE qui accepte team_id OU temporary_team_id
CREATE POLICY "Captains or owners can delete participants"
  ON participants FOR DELETE
  USING (
    -- Capitaine d'équipe permanente
    (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = participants.team_id
        AND teams.captain_id = auth.uid()
      )
    )
    -- Capitaine d'équipe temporaire
    OR (
      temporary_team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM temporary_teams tt
        WHERE tt.id = participants.temporary_team_id
        AND tt.captain_id = auth.uid()
      )
    )
    -- Owner du tournoi
    OR EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = participants.tournament_id
      AND tournaments.owner_id = auth.uid()
    )
  );
