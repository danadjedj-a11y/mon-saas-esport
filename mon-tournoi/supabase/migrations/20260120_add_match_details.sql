-- Migration pour ajouter les colonnes de gestion avancée des matchs
-- Date: 2026-01-20

-- Ajouter la colonne match_number si elle n'existe pas
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_number INTEGER DEFAULT 1;

-- Ajouter la colonne bracket_type si elle n'existe pas
ALTER TABLE matches ADD COLUMN IF NOT EXISTS bracket_type VARCHAR(50) DEFAULT 'winners';

-- Ajouter la colonne phase_id pour lier aux phases du tournoi
ALTER TABLE matches ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES tournament_phases(id) ON DELETE CASCADE;

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_matches_tournament_round ON matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_matches_bracket_type ON matches(bracket_type);
CREATE INDEX IF NOT EXISTS idx_matches_phase_id ON matches(phase_id);
