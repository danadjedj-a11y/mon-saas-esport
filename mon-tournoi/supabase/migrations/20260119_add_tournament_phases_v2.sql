-- =====================================================
-- Migration: Système de Phases pour Mon-Tournoi
-- Inspiré de Toornament Organizer
-- Compatible avec le schéma existant (participants.team_id → teams.captain_id)
-- =====================================================

-- 1. Table tournament_phases
-- Gère les phases multiples d'un tournoi (Qualifications, Playoffs, etc.)
CREATE TABLE IF NOT EXISTS tournament_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  format TEXT NOT NULL, -- 'elimination', 'double_elimination', 'round_robin', 'swiss', 'gauntlet', 'groups', 'custom', 'league'
  match_type TEXT DEFAULT 'duel', -- 'duel' or 'ffa'
  status TEXT DEFAULT 'draft', -- 'draft', 'ready', 'ongoing', 'completed'
  config JSONB DEFAULT '{}', -- Configuration spécifique (size, grand_final, skip_first_round, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, phase_order)
);

-- Index pour les phases
CREATE INDEX IF NOT EXISTS idx_tournament_phases_tournament ON tournament_phases(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_phases_order ON tournament_phases(tournament_id, phase_order);
CREATE INDEX IF NOT EXISTS idx_tournament_phases_status ON tournament_phases(status);

-- 2. Ajouter phase_id aux matchs existants (SET NULL au lieu de CASCADE pour éviter de supprimer les matchs)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES tournament_phases(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase_id);

-- 3. Table bracket_slots (placement pré-tournoi)
-- Permet de placer les équipes dans le bracket avant de lancer le tournoi
CREATE TABLE IF NOT EXISTS bracket_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES tournament_phases(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL, -- Position dans l'arbre (1 = Seed #1, etc.)
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phase_id, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_bracket_slots_phase ON bracket_slots(phase_id);
CREATE INDEX IF NOT EXISTS idx_bracket_slots_team ON bracket_slots(team_id);

-- 4. Table tournament_custom_fields (champs personnalisés)
CREATE TABLE IF NOT EXISTS tournament_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'text', 'number', 'select', 'checkbox', 'date', 'url'
  field_options JSONB, -- Pour les selects (liste des options)
  required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_tournament ON tournament_custom_fields(tournament_id);

-- 5. Table participant_custom_data (données des champs personnalisés)
CREATE TABLE IF NOT EXISTS participant_custom_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES tournament_custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  UNIQUE(participant_id, custom_field_id)
);

-- 6. Table match_locations (emplacements de match)
CREATE TABLE IF NOT EXISTS match_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL, -- 'physical', 'server', 'online'
  capacity INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_locations_tournament ON match_locations(tournament_id);

-- Ajouter location_id aux matchs
ALTER TABLE matches ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES match_locations(id) ON DELETE SET NULL;

-- 7. Table tournament_roles (permissions et rôles)
-- Note: user_id n'est PAS une FK vers auth.users car ce n'est pas accessible directement
CREATE TABLE IF NOT EXISTS tournament_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- UUID de l'utilisateur (pas de FK pour éviter les problèmes)
  role TEXT NOT NULL, -- 'owner', 'admin', 'moderator', 'referee', 'caster'
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_roles_tournament ON tournament_roles(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_roles_user ON tournament_roles(user_id);

-- 8. Table tournament_widgets (widgets embarquables)
CREATE TABLE IF NOT EXISTS tournament_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL, -- 'bracket', 'standings', 'upcoming_matches', 'results', 'schedule'
  config JSONB DEFAULT '{}',
  embed_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_widgets_tournament ON tournament_widgets(tournament_id);

-- =====================================================
-- RLS Policies (Row Level Security)
-- =====================================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE tournament_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_custom_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_widgets ENABLE ROW LEVEL SECURITY;

-- Policies pour tournament_phases
CREATE POLICY "Phases are viewable by everyone" ON tournament_phases
  FOR SELECT USING (true);

CREATE POLICY "Phases are editable by tournament owner" ON tournament_phases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t 
      WHERE t.id = tournament_phases.tournament_id 
      AND t.owner_id = auth.uid()
    )
  );

-- Policies pour bracket_slots
CREATE POLICY "Bracket slots are viewable by everyone" ON bracket_slots
  FOR SELECT USING (true);

CREATE POLICY "Bracket slots are editable by tournament owner" ON bracket_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournament_phases ph
      JOIN tournaments t ON t.id = ph.tournament_id
      WHERE ph.id = bracket_slots.phase_id 
      AND t.owner_id = auth.uid()
    )
  );

-- Policies pour tournament_custom_fields
CREATE POLICY "Custom fields are viewable by everyone" ON tournament_custom_fields
  FOR SELECT USING (true);

CREATE POLICY "Custom fields are editable by tournament owner" ON tournament_custom_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t 
      WHERE t.id = tournament_custom_fields.tournament_id 
      AND t.owner_id = auth.uid()
    )
  );

-- Policies pour participant_custom_data
-- Accès via participant → team → captain_id (pas de user_id dans participants!)
CREATE POLICY "Custom data is viewable by team captain or owner" ON participant_custom_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM participants p
      JOIN tournaments t ON t.id = p.tournament_id
      LEFT JOIN teams tm ON tm.id = p.team_id
      WHERE p.id = participant_custom_data.participant_id
      AND (tm.captain_id = auth.uid() OR t.owner_id = auth.uid())
    )
  );

CREATE POLICY "Custom data is editable by team captain or owner" ON participant_custom_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM participants p
      JOIN tournaments t ON t.id = p.tournament_id
      LEFT JOIN teams tm ON tm.id = p.team_id
      WHERE p.id = participant_custom_data.participant_id
      AND (tm.captain_id = auth.uid() OR t.owner_id = auth.uid())
    )
  );

-- Policies pour match_locations
CREATE POLICY "Locations are viewable by everyone" ON match_locations
  FOR SELECT USING (true);

CREATE POLICY "Locations are editable by tournament owner" ON match_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t 
      WHERE t.id = match_locations.tournament_id 
      AND t.owner_id = auth.uid()
    )
  );

-- Policies pour tournament_roles
CREATE POLICY "Roles are viewable by tournament members" ON tournament_roles
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tournaments t 
      WHERE t.id = tournament_roles.tournament_id 
      AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "Roles are editable by tournament owner" ON tournament_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t 
      WHERE t.id = tournament_roles.tournament_id 
      AND t.owner_id = auth.uid()
    )
  );

-- Policies pour tournament_widgets
CREATE POLICY "Widgets are viewable by everyone" ON tournament_widgets
  FOR SELECT USING (true);

CREATE POLICY "Widgets are editable by tournament owner" ON tournament_widgets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t 
      WHERE t.id = tournament_widgets.tournament_id 
      AND t.owner_id = auth.uid()
    )
  );

-- =====================================================
-- Triggers pour updated_at
-- =====================================================

-- Fonction helper pour mettre à jour updated_at (si n'existe pas déjà)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers (avec DROP IF EXISTS pour éviter les erreurs)
DROP TRIGGER IF EXISTS update_tournament_phases_updated_at ON tournament_phases;
CREATE TRIGGER update_tournament_phases_updated_at
    BEFORE UPDATE ON tournament_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bracket_slots_updated_at ON bracket_slots;
CREATE TRIGGER update_bracket_slots_updated_at
    BEFORE UPDATE ON bracket_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Commentaires
-- =====================================================
COMMENT ON TABLE tournament_phases IS 'Phases multiples d''un tournoi (Qualifications, Playoffs, etc.)';
COMMENT ON TABLE bracket_slots IS 'Placement des équipes dans le bracket avant le début du tournoi';
COMMENT ON TABLE tournament_custom_fields IS 'Champs personnalisés pour l''inscription aux tournois';
COMMENT ON TABLE participant_custom_data IS 'Données des champs personnalisés des participants';
COMMENT ON TABLE match_locations IS 'Emplacements physiques ou serveurs pour les matchs';
COMMENT ON TABLE tournament_roles IS 'Rôles et permissions des co-organisateurs';
COMMENT ON TABLE tournament_widgets IS 'Widgets embarquables pour afficher le tournoi sur d''autres sites';
