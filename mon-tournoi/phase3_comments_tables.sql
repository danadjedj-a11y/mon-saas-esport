-- Phase 3 : Système de Commentaires/Reviews
-- Tables pour les commentaires et évaluations de tournois

-- Table pour les commentaires sur les tournois
CREATE TABLE IF NOT EXISTS tournament_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Note de 1 à 5 étoiles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Table pour les réponses aux commentaires (threading)
CREATE TABLE IF NOT EXISTS comment_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES tournament_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Table pour les votes sur les commentaires (like/dislike)
CREATE TABLE IF NOT EXISTS comment_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES tournament_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id) -- Un utilisateur ne peut voter qu'une fois par commentaire
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tournament_comments_tournament_id ON tournament_comments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_comments_user_id ON tournament_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_comments_created_at ON tournament_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_user_id ON comment_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON comment_votes(user_id);

-- RLS (Row Level Security)
ALTER TABLE tournament_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- Policies pour tournament_comments
CREATE POLICY "Anyone can view non-deleted comments"
    ON tournament_comments FOR SELECT
    USING (is_deleted = FALSE);

CREATE POLICY "Users can create their own comments"
    ON tournament_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
    ON tournament_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
    ON tournament_comments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies pour comment_replies
CREATE POLICY "Anyone can view non-deleted replies"
    ON comment_replies FOR SELECT
    USING (is_deleted = FALSE);

CREATE POLICY "Users can create their own replies"
    ON comment_replies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies"
    ON comment_replies FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
    ON comment_replies FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies pour comment_votes
CREATE POLICY "Anyone can view votes"
    ON comment_votes FOR SELECT
    USING (TRUE);

CREATE POLICY "Users can create their own votes"
    ON comment_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
    ON comment_votes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
    ON comment_votes FOR DELETE
    USING (auth.uid() = user_id);

-- Fonction pour calculer la note moyenne d'un tournoi
CREATE OR REPLACE FUNCTION get_tournament_rating(p_tournament_id UUID)
RETURNS TABLE (
    average_rating NUMERIC,
    total_ratings INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0) as average_rating,
        COUNT(*)::INTEGER as total_ratings
    FROM tournament_comments
    WHERE tournament_id = p_tournament_id
    AND rating IS NOT NULL
    AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_tournament_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.is_edited = TRUE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tournament_comments_updated_at
    BEFORE UPDATE ON tournament_comments
    FOR EACH ROW
    WHEN (OLD.content IS DISTINCT FROM NEW.content)
    EXECUTE FUNCTION update_tournament_comments_updated_at();

CREATE OR REPLACE FUNCTION update_comment_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.is_edited = TRUE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_replies_updated_at
    BEFORE UPDATE ON comment_replies
    FOR EACH ROW
    WHEN (OLD.content IS DISTINCT FROM NEW.content)
    EXECUTE FUNCTION update_comment_replies_updated_at();

