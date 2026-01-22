-- Migration: Check-in par round
-- Date: 2026-01-22
-- Description: Permet aux participants de faire un check-in pour chaque round du tournoi

-- ============================================
-- 1. TABLE ROUND_CHECKINS
-- ============================================

-- Table pour stocker les check-ins par round
CREATE TABLE IF NOT EXISTS round_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_by UUID REFERENCES auth.users(id), -- NULL si auto check-in par le joueur
  
  -- Contrainte d'unicité: un participant ne peut check-in qu'une fois par round
  UNIQUE(tournament_id, participant_id, round_number)
);

-- ============================================
-- 2. COLONNE SETTINGS TOURNOI
-- ============================================

-- Ajouter une colonne pour activer le check-in par round
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS round_checkin_enabled BOOLEAN DEFAULT false;

-- Ajouter une colonne pour le délai de check-in (en minutes avant le début du round)
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS round_checkin_deadline_minutes INTEGER DEFAULT 15;

-- ============================================
-- 3. INDEX POUR LES PERFORMANCES
-- ============================================

-- Index pour récupérer rapidement les check-ins d'un round
CREATE INDEX IF NOT EXISTS idx_round_checkins_tournament_round 
ON round_checkins(tournament_id, round_number);

-- Index pour vérifier si un participant a fait son check-in
CREATE INDEX IF NOT EXISTS idx_round_checkins_participant 
ON round_checkins(participant_id, round_number);

-- ============================================
-- 4. RLS (Row Level Security)
-- ============================================

ALTER TABLE round_checkins ENABLE ROW LEVEL SECURITY;

-- Politique de lecture: tout le monde peut voir les check-ins de son tournoi
CREATE POLICY "round_checkins_select_policy" ON round_checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.tournament_id = round_checkins.tournament_id
    )
  );

-- Politique d'insertion: les joueurs peuvent check-in pour eux-mêmes
CREATE POLICY "round_checkins_insert_policy" ON round_checkins
  FOR INSERT WITH CHECK (
    -- L'utilisateur doit être membre de l'équipe du participant
    EXISTS (
      SELECT 1 FROM participants p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = round_checkins.participant_id
      AND tm.user_id = auth.uid()
    )
    OR
    -- Ou être le capitaine de l'équipe
    EXISTS (
      SELECT 1 FROM participants p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = round_checkins.participant_id
      AND t.captain_id = auth.uid()
    )
    OR
    -- Ou être l'organisateur du tournoi
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = round_checkins.tournament_id
      AND t.owner_id = auth.uid()
    )
  );

-- Politique de suppression: seul l'organisateur peut annuler un check-in
CREATE POLICY "round_checkins_delete_policy" ON round_checkins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = round_checkins.tournament_id
      AND t.owner_id = auth.uid()
    )
  );

-- ============================================
-- 5. FONCTION HELPER
-- ============================================

-- Fonction pour vérifier si un participant a fait son check-in pour un round
CREATE OR REPLACE FUNCTION has_round_checkin(
  p_tournament_id UUID,
  p_participant_id UUID,
  p_round_number INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM round_checkins
    WHERE tournament_id = p_tournament_id
    AND participant_id = p_participant_id
    AND round_number = p_round_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. COMMENTAIRES
-- ============================================

COMMENT ON TABLE round_checkins IS 'Stocke les check-ins des participants par round de tournoi';
COMMENT ON COLUMN round_checkins.checked_in_by IS 'NULL si le joueur a fait son propre check-in, sinon ID de l''admin';
COMMENT ON COLUMN tournaments.round_checkin_enabled IS 'Active le système de check-in par round';
COMMENT ON COLUMN tournaments.round_checkin_deadline_minutes IS 'Délai en minutes avant le début du round pour le check-in';
