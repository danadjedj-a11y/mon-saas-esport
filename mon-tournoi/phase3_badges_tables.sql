-- Phase 3 : Système de Badges/Achievements
-- Tables pour la gamification et les achievements

-- Table pour les badges disponibles
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL, -- Emoji ou code d'icône
    category VARCHAR(50) NOT NULL, -- 'participation', 'victory', 'tournament', 'team', 'special'
    requirement_type VARCHAR(50) NOT NULL, -- 'tournaments_played', 'tournaments_won', 'matches_won', 'team_created', etc.
    requirement_value INTEGER NOT NULL, -- Valeur requise pour obtenir le badge
    rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les badges obtenus par les utilisateurs
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Table pour les niveaux et XP des utilisateurs
CREATE TABLE IF NOT EXISTS user_levels (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0, -- XP total accumulé (pour les classements)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_requirement_type ON badges(requirement_type);
CREATE INDEX IF NOT EXISTS idx_user_levels_level ON user_levels(level);
CREATE INDEX IF NOT EXISTS idx_user_levels_total_xp ON user_levels(total_xp);

-- RLS (Row Level Security)
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;

-- Policies pour badges (lecture publique)
CREATE POLICY "Anyone can view badges"
    ON badges FOR SELECT
    USING (TRUE);

-- Policies pour user_badges
CREATE POLICY "Users can view their own badges"
    ON user_badges FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view other users' badges"
    ON user_badges FOR SELECT
    USING (TRUE); -- Les badges sont publics

-- Policies pour user_levels
CREATE POLICY "Users can view all levels"
    ON user_levels FOR SELECT
    USING (TRUE); -- Les niveaux sont publics

CREATE POLICY "Users can update their own level"
    ON user_levels FOR UPDATE
    USING (auth.uid() = user_id);

-- Fonction pour calculer le niveau à partir de l'XP
-- Formule : level = floor(sqrt(total_xp / 100)) + 1
CREATE OR REPLACE FUNCTION calculate_level(p_total_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN FLOOR(SQRT(p_total_xp / 100.0))::INTEGER + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour ajouter de l'XP à un utilisateur
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_xp_amount INTEGER)
RETURNS void AS $$
DECLARE
    v_current_total_xp INTEGER;
    v_new_total_xp INTEGER;
    v_new_level INTEGER;
BEGIN
    -- Récupérer l'XP actuel
    SELECT COALESCE(total_xp, 0) INTO v_current_total_xp
    FROM user_levels
    WHERE user_id = p_user_id;
    
    -- Si l'utilisateur n'existe pas dans user_levels, l'insérer
    IF v_current_total_xp IS NULL THEN
        INSERT INTO user_levels (user_id, xp, total_xp, level)
        VALUES (p_user_id, p_xp_amount, p_xp_amount, calculate_level(p_xp_amount))
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        -- Calculer le nouvel XP total
        v_new_total_xp := v_current_total_xp + p_xp_amount;
        v_new_level := calculate_level(v_new_total_xp);
        
        -- Mettre à jour
        UPDATE user_levels
        SET 
            total_xp = v_new_total_xp,
            xp = p_xp_amount, -- XP gagné dans cette action
            level = v_new_level,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier et attribuer automatiquement les badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_tournaments_played INTEGER;
    v_tournaments_won INTEGER;
    v_matches_won INTEGER;
    v_teams_created INTEGER;
    v_badge_record RECORD;
BEGIN
    -- Calculer les statistiques de l'utilisateur
    SELECT 
        COUNT(DISTINCT p.tournament_id) INTO v_tournaments_played
    FROM participants p
    JOIN teams t ON p.team_id = t.id
    WHERE t.captain_id = p_user_id OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = t.id AND tm.user_id = p_user_id
    );
    
    SELECT 
        COUNT(DISTINCT t.id) INTO v_tournaments_won
    FROM tournaments t
    WHERE t.owner_id = p_user_id AND t.status = 'completed';
    
    -- Pour les matchs gagnés, on compte les matchs où l'équipe de l'utilisateur a gagné
    SELECT 
        COUNT(*) INTO v_matches_won
    FROM matches m
    JOIN participants p1 ON m.player1_id = p1.team_id
    JOIN participants p2 ON m.player2_id = p2.team_id
    JOIN teams t ON (t.id = p1.team_id OR t.id = p2.team_id)
    WHERE m.status = 'completed'
    AND (
        (m.score_p1 > m.score_p2 AND t.id = p1.team_id) OR
        (m.score_p2 > m.score_p1 AND t.id = p2.team_id)
    )
    AND (t.captain_id = p_user_id OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = t.id AND tm.user_id = p_user_id
    ));
    
    SELECT 
        COUNT(*) INTO v_teams_created
    FROM teams
    WHERE captain_id = p_user_id;
    
    -- Vérifier chaque badge et l'attribuer si les conditions sont remplies
    FOR v_badge_record IN 
        SELECT * FROM badges
        WHERE id NOT IN (
            SELECT badge_id FROM user_badges WHERE user_id = p_user_id
        )
    LOOP
        CASE v_badge_record.requirement_type
            WHEN 'tournaments_played' THEN
                IF v_tournaments_played >= v_badge_record.requirement_value THEN
                    INSERT INTO user_badges (user_id, badge_id)
                    VALUES (p_user_id, v_badge_record.id)
                    ON CONFLICT DO NOTHING;
                END IF;
            WHEN 'tournaments_won' THEN
                IF v_tournaments_won >= v_badge_record.requirement_value THEN
                    INSERT INTO user_badges (user_id, badge_id)
                    VALUES (p_user_id, v_badge_record.id)
                    ON CONFLICT DO NOTHING;
                END IF;
            WHEN 'matches_won' THEN
                IF v_matches_won >= v_badge_record.requirement_value THEN
                    INSERT INTO user_badges (user_id, badge_id)
                    VALUES (p_user_id, v_badge_record.id)
                    ON CONFLICT DO NOTHING;
                END IF;
            WHEN 'team_created' THEN
                IF v_teams_created >= v_badge_record.requirement_value THEN
                    INSERT INTO user_badges (user_id, badge_id)
                    VALUES (p_user_id, v_badge_record.id)
                    ON CONFLICT DO NOTHING;
                END IF;
        END CASE;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insérer des badges prédéfinis
INSERT INTO badges (name, description, icon, category, requirement_type, requirement_value, rarity) VALUES
('Premier Pas', 'Participer à votre premier tournoi', '🎯', 'participation', 'tournaments_played', 1, 'common'),
('Vétéran', 'Participer à 10 tournois', '🎖️', 'participation', 'tournaments_played', 10, 'rare'),
('Légende', 'Participer à 50 tournois', '👑', 'participation', 'tournaments_played', 50, 'legendary'),
('Première Victoire', 'Gagner votre premier tournoi', '🏆', 'victory', 'tournaments_won', 1, 'common'),
('Champion', 'Gagner 5 tournois', '🥇', 'victory', 'tournaments_won', 5, 'epic'),
('Dynastie', 'Gagner 20 tournois', '💎', 'victory', 'tournaments_won', 20, 'legendary'),
('Guerrier', 'Gagner 10 matchs', '⚔️', 'victory', 'matches_won', 10, 'common'),
('Guerrier Élite', 'Gagner 50 matchs', '🗡️', 'victory', 'matches_won', 50, 'rare'),
('Maître du Combat', 'Gagner 200 matchs', '⚡', 'victory', 'matches_won', 200, 'legendary'),
('Créateur', 'Créer votre première équipe', '🛡️', 'team', 'team_created', 1, 'common'),
('Leader', 'Créer 5 équipes', '👔', 'team', 'team_created', 5, 'rare')
ON CONFLICT DO NOTHING;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_user_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_levels_updated_at
    BEFORE UPDATE ON user_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_user_levels_updated_at();

