-- Migration: Ajouter la table match_veto pour le système de ban/pick de maps
-- Date: 2026-01-20

-- Table pour stocker les actions de veto
CREATE TABLE IF NOT EXISTS match_veto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  map_name VARCHAR(100) NOT NULL,
  action_type VARCHAR(10) NOT NULL CHECK (action_type IN ('ban', 'pick')),
  step INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte unique pour éviter les doublons
  UNIQUE(match_id, step)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_match_veto_match_id ON match_veto(match_id);
CREATE INDEX IF NOT EXISTS idx_match_veto_team_id ON match_veto(team_id);

-- Activer RLS
ALTER TABLE match_veto ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut lire les vetos
CREATE POLICY "match_veto_select_policy" ON match_veto
  FOR SELECT USING (true);

-- Politique: Les participants au match peuvent insérer des vetos
CREATE POLICY "match_veto_insert_policy" ON match_veto
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN participants p ON (p.team_id = m.player1_id OR p.team_id = m.player2_id)
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE m.id = match_veto.match_id
      AND tm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      WHERE m.id = match_veto.match_id
      AND t.organizer_id = auth.uid()
    )
  );

-- Politique: Seuls les organisateurs peuvent supprimer
CREATE POLICY "match_veto_delete_policy" ON match_veto
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      WHERE m.id = match_veto.match_id
      AND t.organizer_id = auth.uid()
    )
  );

-- Activer le realtime pour cette table
ALTER PUBLICATION supabase_realtime ADD TABLE match_veto;

-- Commentaires
COMMENT ON TABLE match_veto IS 'Stocke les actions de ban/pick de maps pour chaque match';
COMMENT ON COLUMN match_veto.step IS 'Ordre de l''action dans le processus de veto (0, 1, 2...)';
COMMENT ON COLUMN match_veto.action_type IS 'Type d''action: ban (exclure) ou pick (sélectionner)';
