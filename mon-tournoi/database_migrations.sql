-- Migration pour ajouter le champ seed_order à la table participants
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter la colonne seed_order (nullable, pour permettre les tournois sans seeding)
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS seed_order INTEGER;

-- Créer un index pour améliorer les performances lors du tri
CREATE INDEX IF NOT EXISTS idx_participants_seed_order 
ON participants(tournament_id, seed_order);

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN participants.seed_order IS 
'Ordre de seeding pour le placement dans l''arbre. Seed #1 = meilleur placement, seed #2 = deuxième meilleur, etc. NULL = pas de seeding défini.';

-- ============================================================
-- Migration pour le Self-Reporting de Scores
-- ============================================================

-- Ajouter des champs pour le système de déclaration de scores
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS score_p1_reported INTEGER,
ADD COLUMN IF NOT EXISTS score_p2_reported INTEGER,
ADD COLUMN IF NOT EXISTS reported_by_team1 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reported_by_team2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS score_status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'confirmed', 'disputed'

-- Créer une table pour l'historique des déclarations de scores
CREATE TABLE IF NOT EXISTS score_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    score_team INTEGER NOT NULL,
    score_opponent INTEGER NOT NULL,
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_score_reports_match_id ON score_reports(match_id);
CREATE INDEX IF NOT EXISTS idx_score_reports_team_id ON score_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_score_status ON matches(score_status);

-- Commentaires
COMMENT ON COLUMN matches.score_p1_reported IS 'Score déclaré par l''équipe 1 (player1_id)';
COMMENT ON COLUMN matches.score_p2_reported IS 'Score déclaré par l''équipe 2 (player2_id)';
COMMENT ON COLUMN matches.reported_by_team1 IS 'L''équipe 1 a-t-elle déclaré son score ?';
COMMENT ON COLUMN matches.reported_by_team2 IS 'L''équipe 2 a-t-elle déclaré son score ?';
COMMENT ON COLUMN matches.score_status IS 'Statut du score: pending (en attente), confirmed (confirmé automatiquement), disputed (conflit)';

-- ============================================================
-- Migration pour le Check-in Avancé
-- ============================================================

-- Ajouter des champs pour le check-in avancé dans tournaments
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS check_in_window_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS check_in_deadline TIMESTAMP WITH TIME ZONE;

-- Ajouter un champ pour marquer si une équipe a été disqualifiée
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS disqualified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_participants_disqualified ON participants(tournament_id, disqualified);
CREATE INDEX IF NOT EXISTS idx_tournaments_check_in_deadline ON tournaments(check_in_deadline);

-- Commentaires
COMMENT ON COLUMN tournaments.check_in_window_minutes IS 'Durée de la fenêtre de check-in en minutes avant le début (ex: 15 = check-in disponible 15 min avant)';
COMMENT ON COLUMN tournaments.check_in_deadline IS 'Date/heure limite pour le check-in (début du tournoi - check_in_window_minutes)';
COMMENT ON COLUMN participants.disqualified IS 'L''équipe a-t-elle été disqualifiée pour non check-in ?';

-- ============================================================
-- Migration pour Double Elimination
-- ============================================================

-- Ajouter un champ pour identifier le bracket (winners, losers, ou null pour single elimination/round robin)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS bracket_type VARCHAR(20); -- 'winners', 'losers', ou NULL

-- Ajouter un champ pour identifier si c'est un reset match (Grand Finals reset)
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS is_reset BOOLEAN DEFAULT FALSE;

-- Ajouter un champ pour référencer le match dans l'autre bracket (pour les transitions Winners -> Losers)
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS source_match_id UUID REFERENCES matches(id); -- Match source pour les transitions

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_matches_bracket_type ON matches(tournament_id, bracket_type);
CREATE INDEX IF NOT EXISTS idx_matches_is_reset ON matches(tournament_id, is_reset);

-- Commentaires
COMMENT ON COLUMN matches.bracket_type IS 'Type de bracket: winners, losers, ou NULL pour single elimination/round robin';
COMMENT ON COLUMN matches.is_reset IS 'Est-ce un match de reset (Grand Finals reset en Double Elimination) ?';
COMMENT ON COLUMN matches.source_match_id IS 'ID du match source pour les transitions entre brackets (Double Elimination)';

-- ============================================================
-- IMPORTANT : Exécutez aussi le fichier rls_policies.sql
-- pour créer les politiques RLS nécessaires au panneau admin
-- ============================================================

