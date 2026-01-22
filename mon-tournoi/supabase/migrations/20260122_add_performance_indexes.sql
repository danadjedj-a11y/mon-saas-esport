-- Migration: Ajouter les index manquants pour les performances
-- Date: 2026-01-22
-- Description: Améliore les performances des requêtes fréquentes

-- ============================================
-- 1. INDEX SUR LA TABLE MATCHES
-- ============================================

-- Index sur le statut des matchs (filtrage fréquent)
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Index sur tournament_id + status (requêtes combinées)
CREATE INDEX IF NOT EXISTS idx_matches_tournament_status ON matches(tournament_id, status);

-- Index sur round_number pour le tri
CREATE INDEX IF NOT EXISTS idx_matches_round_number ON matches(tournament_id, round_number);

-- ============================================
-- 2. INDEX SUR LA TABLE SWISS_SCORES
-- ============================================

-- Index sur team_id pour les lookups
CREATE INDEX IF NOT EXISTS idx_swiss_scores_team_id ON swiss_scores(team_id);

-- Index composé pour le classement
CREATE INDEX IF NOT EXISTS idx_swiss_scores_ranking ON swiss_scores(tournament_id, wins DESC, buchholz_score DESC);

-- ============================================
-- 3. INDEX SUR LA TABLE WAITLIST
-- ============================================

-- Index sur position pour le tri
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist(tournament_id, position);

-- Index pour vérifier si une équipe est déjà en attente
CREATE INDEX IF NOT EXISTS idx_waitlist_team ON waitlist(tournament_id, team_id) WHERE team_id IS NOT NULL;

-- ============================================
-- 4. INDEX SUR LA TABLE PARTICIPANT_CUSTOM_DATA
-- ============================================

-- Index sur custom_field_id pour les jointures
CREATE INDEX IF NOT EXISTS idx_participant_custom_data_field ON participant_custom_data(custom_field_id);

-- Index composé participant + field
CREATE INDEX IF NOT EXISTS idx_participant_custom_data_participant_field ON participant_custom_data(participant_id, custom_field_id);

-- ============================================
-- 5. INDEX SUR LA TABLE PARTICIPANTS
-- ============================================

-- Index sur checked_in pour les filtres de check-in
CREATE INDEX IF NOT EXISTS idx_participants_checked_in ON participants(tournament_id, checked_in);

-- Index sur disqualified
CREATE INDEX IF NOT EXISTS idx_participants_disqualified ON participants(tournament_id, disqualified) WHERE disqualified = true;

-- ============================================
-- 6. INDEX SUR LA TABLE MESSAGES (CHAT)
-- ============================================

-- Index pour récupérer les messages récents d'un tournoi
CREATE INDEX IF NOT EXISTS idx_messages_tournament_created ON messages(tournament_id, created_at DESC);

-- ============================================
-- 7. COMMENTAIRES DE DOCUMENTATION
-- ============================================

COMMENT ON INDEX idx_matches_status IS 'Optimise les filtres par statut de match (pending, ongoing, completed)';
COMMENT ON INDEX idx_swiss_scores_ranking IS 'Optimise le calcul du classement Swiss (wins DESC, buchholz DESC)';
COMMENT ON INDEX idx_waitlist_position IS 'Optimise le tri de la liste d''attente par position';
