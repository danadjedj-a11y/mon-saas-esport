-- Phase 3 : Système de Templates de Tournois
-- Tables pour créer et réutiliser des configurations de tournois

-- Table pour les templates de tournois
CREATE TABLE IF NOT EXISTS tournament_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE, -- Permet de partager des templates
    game VARCHAR(100),
    format VARCHAR(50), -- 'elimination', 'double_elimination', 'round_robin', 'swiss'
    max_participants INTEGER,
    best_of INTEGER DEFAULT 1,
    check_in_window_minutes INTEGER DEFAULT 15,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    rules TEXT,
    prize_pool DECIMAL(10, 2),
    entry_fee DECIMAL(10, 2),
    maps_pool JSONB, -- Pour les jeux avec maps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0 -- Nombre de fois que le template a été utilisé
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tournament_templates_owner_id ON tournament_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_tournament_templates_is_public ON tournament_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_tournament_templates_game ON tournament_templates(game);
CREATE INDEX IF NOT EXISTS idx_tournament_templates_format ON tournament_templates(format);

-- RLS (Row Level Security)
ALTER TABLE tournament_templates ENABLE ROW LEVEL SECURITY;

-- Policies pour tournament_templates
CREATE POLICY "Users can view public templates"
    ON tournament_templates FOR SELECT
    USING (is_public = TRUE);

CREATE POLICY "Users can view their own templates"
    ON tournament_templates FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own templates"
    ON tournament_templates FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own templates"
    ON tournament_templates FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own templates"
    ON tournament_templates FOR DELETE
    USING (auth.uid() = owner_id);

-- Fonction pour incrémenter le compteur d'utilisation
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE tournament_templates
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_tournament_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tournament_templates_updated_at
    BEFORE UPDATE ON tournament_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_templates_updated_at();

-- Insérer quelques templates prédéfinis (si l'utilisateur système existe)
-- Ces templates seront publics et utilisables par tous
INSERT INTO tournament_templates (name, description, owner_id, is_public, game, format, max_participants, best_of, check_in_window_minutes)
SELECT 
    'Weekly Cup - Élimination Directe',
    'Template pour un tournoi hebdomadaire en élimination directe',
    (SELECT id FROM auth.users LIMIT 1),
    TRUE,
    'Universal',
    'elimination',
    16,
    1,
    15
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_templates (name, description, owner_id, is_public, game, format, max_participants, best_of, check_in_window_minutes)
SELECT 
    'Major Tournament - Double Elimination',
    'Template pour un tournoi majeur en double élimination',
    (SELECT id FROM auth.users LIMIT 1),
    TRUE,
    'Universal',
    'double_elimination',
    32,
    3,
    30
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_templates (name, description, owner_id, is_public, game, format, max_participants, best_of, check_in_window_minutes)
SELECT 
    'Championnat - Round Robin',
    'Template pour un championnat en round robin',
    (SELECT id FROM auth.users LIMIT 1),
    TRUE,
    'Universal',
    'round_robin',
    8,
    1,
    15
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO tournament_templates (name, description, owner_id, is_public, game, format, max_participants, best_of, check_in_window_minutes)
SELECT 
    'Swiss Tournament',
    'Template pour un tournoi en système suisse',
    (SELECT id FROM auth.users LIMIT 1),
    TRUE,
    'Universal',
    'swiss',
    16,
    1,
    15
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

