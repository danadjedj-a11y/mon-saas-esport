-- Phase 3 : Système de Favoris/Abonnements
-- Tables pour suivre les tournois et équipes

-- Table pour suivre les tournois
CREATE TABLE IF NOT EXISTS tournament_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tournament_id)
);

-- Table pour suivre les équipes
CREATE TABLE IF NOT EXISTS team_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, team_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tournament_follows_user_id ON tournament_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_follows_tournament_id ON tournament_follows(tournament_id);
CREATE INDEX IF NOT EXISTS idx_team_follows_user_id ON team_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_team_follows_team_id ON team_follows(team_id);

-- RLS (Row Level Security)
ALTER TABLE tournament_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_follows ENABLE ROW LEVEL SECURITY;

-- Policies pour tournament_follows
CREATE POLICY "Users can view their own tournament follows"
    ON tournament_follows FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tournament follows"
    ON tournament_follows FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tournament follows"
    ON tournament_follows FOR DELETE
    USING (auth.uid() = user_id);

-- Policies pour team_follows
CREATE POLICY "Users can view their own team follows"
    ON team_follows FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own team follows"
    ON team_follows FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own team follows"
    ON team_follows FOR DELETE
    USING (auth.uid() = user_id);

-- Fonction pour vérifier si un utilisateur suit un tournoi
CREATE OR REPLACE FUNCTION is_following_tournament(p_user_id UUID, p_tournament_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tournament_follows
        WHERE user_id = p_user_id AND tournament_id = p_tournament_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si un utilisateur suit une équipe
CREATE OR REPLACE FUNCTION is_following_team(p_user_id UUID, p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_follows
        WHERE user_id = p_user_id AND team_id = p_team_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

