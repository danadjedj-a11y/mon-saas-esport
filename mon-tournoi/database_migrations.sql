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
-- Migration pour le Système de Notifications
-- ============================================================

-- Créer la table notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'match_upcoming', 'match_result', 'admin_message', 'tournament_update', 'team_invite', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- URL vers la page concernée (ex: /match/123, /tournament/456)
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- Pour stocker des données supplémentaires (ex: match_id, tournament_id, etc.)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Commentaires
COMMENT ON TABLE notifications IS 'Système de notifications pour les utilisateurs';
COMMENT ON COLUMN notifications.type IS 'Type de notification: match_upcoming, match_result, admin_message, tournament_update, team_invite, etc.';
COMMENT ON COLUMN notifications.link IS 'URL relative vers la page concernée (ex: /match/123)';
COMMENT ON COLUMN notifications.metadata IS 'Données supplémentaires au format JSON (ex: {match_id: uuid, tournament_id: uuid})';

-- ============================================================
-- Migration pour le Système Suisse (Swiss System)
-- ============================================================

-- Créer la table swiss_scores pour tracker les scores suisses
CREATE TABLE IF NOT EXISTS swiss_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    buchholz_score DECIMAL(10, 2) DEFAULT 0, -- Score des adversaires (somme des victoires des adversaires)
    opp_wins DECIMAL(10, 2) DEFAULT 0, -- Victoires des adversaires (pour tie-breaks avancés)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, team_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_swiss_scores_tournament_id ON swiss_scores(tournament_id);
CREATE INDEX IF NOT EXISTS idx_swiss_scores_team_id ON swiss_scores(team_id);

-- RLS pour swiss_scores
ALTER TABLE swiss_scores ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous (pour classements publics)
DROP POLICY IF EXISTS "Swiss scores are viewable by everyone." ON swiss_scores;
CREATE POLICY "Swiss scores are viewable by everyone."
ON swiss_scores FOR SELECT
USING (true);

-- Politique pour permettre aux organisateurs de gérer les scores
DROP POLICY IF EXISTS "Tournament owners can manage swiss scores." ON swiss_scores;
CREATE POLICY "Tournament owners can manage swiss scores."
ON swiss_scores FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM tournaments
        WHERE tournaments.id = swiss_scores.tournament_id
        AND tournaments.owner_id = auth.uid()
    )
);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_swiss_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_swiss_scores_updated_at ON swiss_scores;
CREATE TRIGGER trigger_update_swiss_scores_updated_at
    BEFORE UPDATE ON swiss_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_swiss_scores_updated_at();

-- ============================================================
-- Migration pour Best-of-X & Maps Pool
-- ============================================================

-- Ajouter la colonne best_of dans tournaments (1 = single game, 3 = BO3, 5 = BO5, 7 = BO7)
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS best_of INTEGER DEFAULT 1;

-- Ajouter la colonne maps_pool dans tournaments (JSON array de cartes disponibles)
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS maps_pool JSONB DEFAULT '[]'::jsonb;

-- Créer la table match_games pour les manches individuelles d'un match
CREATE TABLE IF NOT EXISTS match_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    game_number INTEGER NOT NULL, -- Numéro de la manche (1, 2, 3, etc.)
    map_name VARCHAR(255), -- Nom de la carte jouée (après veto)
    team1_score INTEGER DEFAULT 0, -- Score final de l'équipe 1 pour cette manche (après validation)
    team2_score INTEGER DEFAULT 0, -- Score final de l'équipe 2 pour cette manche (après validation)
    team1_score_reported INTEGER, -- Score déclaré par l'équipe 1
    team2_score_reported INTEGER, -- Score déclaré par l'équipe 2
    reported_by_team1 BOOLEAN DEFAULT FALSE, -- L'équipe 1 a-t-elle déclaré son score ?
    reported_by_team2 BOOLEAN DEFAULT FALSE, -- L'équipe 2 a-t-elle déclaré son score ?
    score_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'disputed'
    winner_team_id UUID REFERENCES teams(id), -- Équipe gagnante de cette manche (NULL si pas encore joué)
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(match_id, game_number)
);

-- Ajouter les colonnes de déclaration de scores aux match_games (si elles n'existent pas déjà)
ALTER TABLE match_games 
ADD COLUMN IF NOT EXISTS team1_score_reported INTEGER,
ADD COLUMN IF NOT EXISTS team2_score_reported INTEGER,
ADD COLUMN IF NOT EXISTS reported_by_team1 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reported_by_team2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS score_status VARCHAR(20) DEFAULT 'pending';

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_match_games_match_id ON match_games(match_id);
CREATE INDEX IF NOT EXISTS idx_match_games_status ON match_games(status);
CREATE INDEX IF NOT EXISTS idx_match_games_match_game_number ON match_games(match_id, game_number);
CREATE INDEX IF NOT EXISTS idx_match_games_score_status ON match_games(score_status);

-- Créer une table pour l'historique des déclarations de scores par manche
CREATE TABLE IF NOT EXISTS game_score_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES match_games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    score_team INTEGER NOT NULL,
    score_opponent INTEGER NOT NULL,
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_game_score_reports_game_id ON game_score_reports(game_id);
CREATE INDEX IF NOT EXISTS idx_game_score_reports_team_id ON game_score_reports(team_id);

-- Créer la table match_vetos pour le système de veto
CREATE TABLE IF NOT EXISTS match_vetos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    map_name VARCHAR(255) NOT NULL, -- Carte bannie
    veto_phase VARCHAR(20) NOT NULL, -- 'ban1', 'ban2', 'pick1', 'pick2', etc.
    veto_order INTEGER NOT NULL, -- Ordre du veto (1, 2, 3, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, map_name) -- Une carte ne peut être bannie qu'une fois
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_match_vetos_match_id ON match_vetos(match_id);
CREATE INDEX IF NOT EXISTS idx_match_vetos_team_id ON match_vetos(team_id);
CREATE INDEX IF NOT EXISTS idx_match_vetos_veto_order ON match_vetos(match_id, veto_order);

-- RLS pour match_games
ALTER TABLE match_games ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous (pour affichage public)
DROP POLICY IF EXISTS "Match games are viewable by everyone." ON match_games;
CREATE POLICY "Match games are viewable by everyone."
ON match_games FOR SELECT
USING (true);

-- Politique pour permettre aux participants et organisateurs de modifier
DROP POLICY IF EXISTS "Participants and owners can manage match games." ON match_games;
CREATE POLICY "Participants and owners can manage match games."
ON match_games FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM matches
        WHERE matches.id = match_games.match_id
        AND (
            matches.player1_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()
                UNION
                SELECT id FROM teams WHERE captain_id = auth.uid()
            )
            OR matches.player2_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()
                UNION
                SELECT id FROM teams WHERE captain_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM tournaments
                WHERE tournaments.id = matches.tournament_id
                AND tournaments.owner_id = auth.uid()
            )
        )
    )
);

-- RLS pour game_score_reports
ALTER TABLE game_score_reports ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous
DROP POLICY IF EXISTS "Game score reports are viewable by everyone." ON game_score_reports;
CREATE POLICY "Game score reports are viewable by everyone."
ON game_score_reports FOR SELECT
USING (true);

-- Politique pour permettre aux participants de créer des rapports
DROP POLICY IF EXISTS "Participants can create game score reports." ON game_score_reports;
CREATE POLICY "Participants can create game score reports."
ON game_score_reports FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM match_games
        JOIN matches ON matches.id = match_games.match_id
        WHERE match_games.id = game_score_reports.game_id
        AND (
            matches.player1_id = game_score_reports.team_id
            OR matches.player2_id = game_score_reports.team_id
        )
        AND (
            game_score_reports.team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()
                UNION
                SELECT id FROM teams WHERE captain_id = auth.uid()
            )
        )
    )
);

-- RLS pour match_vetos
ALTER TABLE match_vetos ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous
DROP POLICY IF EXISTS "Match vetos are viewable by everyone." ON match_vetos;
CREATE POLICY "Match vetos are viewable by everyone."
ON match_vetos FOR SELECT
USING (true);

-- Politique pour permettre aux participants de créer des vetos
DROP POLICY IF EXISTS "Participants can create match vetos." ON match_vetos;
CREATE POLICY "Participants can create match vetos."
ON match_vetos FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM matches
        WHERE matches.id = match_vetos.match_id
        AND (
            matches.player1_id = match_vetos.team_id
            OR matches.player2_id = match_vetos.team_id
        )
        AND (
            match_vetos.team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()
                UNION
                SELECT id FROM teams WHERE captain_id = auth.uid()
            )
        )
    )
);

-- Commentaires
COMMENT ON COLUMN tournaments.best_of IS 'Format Best-of-X : 1 = single game, 3 = BO3, 5 = BO5, 7 = BO7';
COMMENT ON COLUMN tournaments.maps_pool IS 'Liste des cartes disponibles pour le tournoi (JSON array: ["Map1", "Map2", ...])';
COMMENT ON TABLE match_games IS 'Manches individuelles d''un match (pour Best-of-X)';
COMMENT ON COLUMN match_games.game_number IS 'Numéro de la manche (1, 2, 3, etc.)';
COMMENT ON COLUMN match_games.map_name IS 'Carte jouée pour cette manche (après veto)';
COMMENT ON COLUMN match_games.team1_score_reported IS 'Score déclaré par l''équipe 1 pour cette manche';
COMMENT ON COLUMN match_games.team2_score_reported IS 'Score déclaré par l''équipe 2 pour cette manche';
COMMENT ON COLUMN match_games.reported_by_team1 IS 'L''équipe 1 a-t-elle déclaré son score pour cette manche ?';
COMMENT ON COLUMN match_games.reported_by_team2 IS 'L''équipe 2 a-t-elle déclaré son score pour cette manche ?';
COMMENT ON COLUMN match_games.score_status IS 'Statut du score de la manche: pending, confirmed, disputed';
COMMENT ON TABLE match_vetos IS 'Système de veto/bannissement de cartes';
COMMENT ON COLUMN match_vetos.veto_phase IS 'Phase du veto: ban1, ban2, pick1, pick2, etc.';
COMMENT ON COLUMN match_vetos.veto_order IS 'Ordre du veto (1 = premier veto, 2 = deuxième, etc.)';
COMMENT ON TABLE game_score_reports IS 'Historique des déclarations de scores par manche';

-- ============================================================
-- IMPORTANT : Exécutez aussi le fichier rls_policies.sql
-- pour créer les politiques RLS nécessaires au panneau admin
-- ============================================================

