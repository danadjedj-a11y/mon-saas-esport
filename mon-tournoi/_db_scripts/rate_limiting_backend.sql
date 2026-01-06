-- ============================================================
-- RATE LIMITING BACKEND - Protection contre les abus
-- Phase 1 : Sécurité & Stabilité (Priorité Critique)
-- ============================================================
-- IMPORTANT : Exécutez ce script dans Supabase SQL Editor
-- Ce système protège les opérations critiques contre les abus et attaques

-- ============================================================
-- 1. TABLE DE RATE LIMITING
-- ============================================================

-- Table pour stocker les compteurs de rate limiting par utilisateur et type d'opération
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL, -- 'tournament_create', 'team_create', 'comment_post', etc.
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte unique : un seul compteur par utilisateur et type d'opération
    UNIQUE(user_id, operation_type)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_operation ON rate_limits(user_id, operation_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Commentaires
COMMENT ON TABLE rate_limits IS 'Table de rate limiting pour protéger les opérations critiques contre les abus';
COMMENT ON COLUMN rate_limits.operation_type IS 'Type d''opération: tournament_create, team_create, comment_post, registration, template_create, follow_toggle';
COMMENT ON COLUMN rate_limits.request_count IS 'Nombre de requêtes dans la fenêtre de temps actuelle';
COMMENT ON COLUMN rate_limits.window_start IS 'Début de la fenêtre de temps pour le compteur';

-- ============================================================
-- 2. TABLE DE CONFIGURATION DES LIMITES
-- ============================================================

-- Table pour définir les limites par type d'opération
CREATE TABLE IF NOT EXISTS rate_limit_config (
    operation_type VARCHAR(50) PRIMARY KEY,
    max_requests INTEGER NOT NULL DEFAULT 10,
    window_minutes INTEGER NOT NULL DEFAULT 60, -- Fenêtre de temps en minutes
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les configurations par défaut
INSERT INTO rate_limit_config (operation_type, max_requests, window_minutes, description)
VALUES
    ('tournament_create', 5, 60, 'Maximum 5 tournois créés par heure'),
    ('team_create', 10, 60, 'Maximum 10 équipes créées par heure'),
    ('comment_post', 20, 60, 'Maximum 20 commentaires par heure'),
    ('registration', 10, 60, 'Maximum 10 inscriptions par heure'),
    ('template_create', 5, 60, 'Maximum 5 templates créés par heure'),
    ('follow_toggle', 50, 60, 'Maximum 50 follow/unfollow par heure'),
    ('score_report', 30, 60, 'Maximum 30 déclarations de scores par heure'),
    ('check_in', 20, 60, 'Maximum 20 check-ins par heure')
ON CONFLICT (operation_type) DO NOTHING;

-- Commentaires
COMMENT ON TABLE rate_limit_config IS 'Configuration des limites de rate limiting par type d''opération';

-- ============================================================
-- 3. FONCTION DE NETTOYAGE AUTOMATIQUE
-- ============================================================

-- Fonction pour nettoyer les anciennes entrées (appelée périodiquement)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    -- Supprimer les entrées plus anciennes que 24 heures
    DELETE FROM rate_limits
    WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. FONCTION PRINCIPALE DE RATE LIMITING
-- ============================================================

-- Fonction pour vérifier et incrémenter le compteur de rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_operation_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_config RECORD;
    v_rate_limit RECORD;
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_current_count INTEGER;
    v_max_requests INTEGER;
    v_window_minutes INTEGER;
BEGIN
    -- Récupérer la configuration pour ce type d'opération
    SELECT max_requests, window_minutes
    INTO v_max_requests, v_window_minutes
    FROM rate_limit_config
    WHERE operation_type = p_operation_type;
    
    -- Si pas de configuration, autoriser (fallback)
    IF v_max_requests IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Calculer le début de la fenêtre de temps actuelle
    v_window_start := date_trunc('hour', NOW()) + 
                      (EXTRACT(MINUTE FROM NOW())::INTEGER / v_window_minutes)::INTEGER * 
                      (v_window_minutes || ' minutes')::INTERVAL;
    
    -- Récupérer ou créer l'entrée de rate limiting
    SELECT * INTO v_rate_limit
    FROM rate_limits
    WHERE user_id = p_user_id
      AND operation_type = p_operation_type;
    
    IF v_rate_limit IS NULL THEN
        -- Première requête pour cet utilisateur et cette opération
        INSERT INTO rate_limits (user_id, operation_type, request_count, window_start)
        VALUES (p_user_id, p_operation_type, 1, v_window_start);
        RETURN TRUE;
    END IF;
    
    -- Vérifier si on est dans une nouvelle fenêtre de temps
    IF v_rate_limit.window_start < v_window_start THEN
        -- Nouvelle fenêtre, réinitialiser le compteur
        UPDATE rate_limits
        SET request_count = 1,
            window_start = v_window_start,
            updated_at = NOW()
        WHERE id = v_rate_limit.id;
        RETURN TRUE;
    END IF;
    
    -- Vérifier si la limite est atteinte
    IF v_rate_limit.request_count >= v_max_requests THEN
        -- Limite atteinte, refuser la requête
        RAISE EXCEPTION 'Rate limit exceeded: Maximum % requests per % minutes for operation %',
            v_max_requests, v_window_minutes, p_operation_type;
    END IF;
    
    -- Incrémenter le compteur
    UPDATE rate_limits
    SET request_count = request_count + 1,
        updated_at = NOW()
    WHERE id = v_rate_limit.id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION check_rate_limit IS 'Vérifie et incrémente le compteur de rate limiting. Retourne TRUE si autorisé, lève une exception si la limite est atteinte.';

-- ============================================================
-- 5. TRIGGERS POUR LES OPÉRATIONS CRITIQUES
-- ============================================================

-- ============================================================
-- 5.1. RATE LIMITING POUR LA CRÉATION DE TOURNOIS
-- ============================================================

-- Fonction trigger pour la création de tournois
CREATE OR REPLACE FUNCTION rate_limit_tournament_create()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier le rate limiting
    PERFORM check_rate_limit(NEW.owner_id, 'tournament_create');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger avant insertion
DROP TRIGGER IF EXISTS trigger_rate_limit_tournament_create ON tournaments;
CREATE TRIGGER trigger_rate_limit_tournament_create
    BEFORE INSERT ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION rate_limit_tournament_create();

-- ============================================================
-- 5.2. RATE LIMITING POUR LA CRÉATION D'ÉQUIPES
-- ============================================================

-- Fonction trigger pour la création d'équipes
CREATE OR REPLACE FUNCTION rate_limit_team_create()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier le rate limiting
    PERFORM check_rate_limit(NEW.captain_id, 'team_create');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger avant insertion
DROP TRIGGER IF EXISTS trigger_rate_limit_team_create ON teams;
CREATE TRIGGER trigger_rate_limit_team_create
    BEFORE INSERT ON teams
    FOR EACH ROW
    EXECUTE FUNCTION rate_limit_team_create();

-- ============================================================
-- 5.3. RATE LIMITING POUR LES COMMENTAIRES
-- ============================================================

-- Fonction trigger pour les commentaires
CREATE OR REPLACE FUNCTION rate_limit_comment_post()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier le rate limiting
    PERFORM check_rate_limit(NEW.user_id, 'comment_post');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger avant insertion
DROP TRIGGER IF EXISTS trigger_rate_limit_comment_post ON tournament_comments;
CREATE TRIGGER trigger_rate_limit_comment_post
    BEFORE INSERT ON tournament_comments
    FOR EACH ROW
    EXECUTE FUNCTION rate_limit_comment_post();

-- ============================================================
-- 5.4. RATE LIMITING POUR LES INSCRIPTIONS
-- ============================================================

-- Fonction trigger pour les inscriptions
CREATE OR REPLACE FUNCTION rate_limit_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur depuis l'équipe
    SELECT captain_id INTO v_user_id
    FROM teams
    WHERE id = NEW.team_id;
    
    -- Si pas de captain_id, essayer de récupérer depuis team_members
    IF v_user_id IS NULL THEN
        SELECT user_id INTO v_user_id
        FROM team_members
        WHERE team_id = NEW.team_id
        LIMIT 1;
    END IF;
    
    -- Si toujours pas d'utilisateur, autoriser (fallback)
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Vérifier le rate limiting
    PERFORM check_rate_limit(v_user_id, 'registration');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger avant insertion
DROP TRIGGER IF EXISTS trigger_rate_limit_registration ON participants;
CREATE TRIGGER trigger_rate_limit_registration
    BEFORE INSERT ON participants
    FOR EACH ROW
    EXECUTE FUNCTION rate_limit_registration();

-- ============================================================
-- 5.5. RATE LIMITING POUR LES TEMPLATES
-- ============================================================

-- Fonction trigger pour les templates
CREATE OR REPLACE FUNCTION rate_limit_template_create()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier le rate limiting
    PERFORM check_rate_limit(NEW.created_by, 'template_create');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger avant insertion
DROP TRIGGER IF EXISTS trigger_rate_limit_template_create ON tournament_templates;
CREATE TRIGGER trigger_rate_limit_template_create
    BEFORE INSERT ON tournament_templates
    FOR EACH ROW
    EXECUTE FUNCTION rate_limit_template_create();

-- ============================================================
-- 5.6. RATE LIMITING POUR LES FOLLOW/UNFOLLOW
-- ============================================================

-- Fonction trigger pour les follow/unfollow
CREATE OR REPLACE FUNCTION rate_limit_follow_toggle()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier le rate limiting
    PERFORM check_rate_limit(NEW.user_id, 'follow_toggle');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers avant insertion pour tournament_follows et team_follows
DROP TRIGGER IF EXISTS trigger_rate_limit_tournament_follow ON tournament_follows;
CREATE TRIGGER trigger_rate_limit_tournament_follow
    BEFORE INSERT ON tournament_follows
    FOR EACH ROW
    EXECUTE FUNCTION rate_limit_follow_toggle();

DROP TRIGGER IF EXISTS trigger_rate_limit_team_follow ON team_follows;
CREATE TRIGGER trigger_rate_limit_team_follow
    BEFORE INSERT ON team_follows
    FOR EACH ROW
    EXECUTE FUNCTION rate_limit_follow_toggle();

-- ============================================================
-- 5.7. RATE LIMITING POUR LES DÉCLARATIONS DE SCORES
-- ============================================================

-- Fonction trigger pour les déclarations de scores
CREATE OR REPLACE FUNCTION rate_limit_score_report()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur depuis reported_by
    v_user_id := NEW.reported_by;
    
    -- Vérifier le rate limiting
    PERFORM check_rate_limit(v_user_id, 'score_report');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger avant insertion (si la table score_reports existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'score_reports') THEN
        DROP TRIGGER IF EXISTS trigger_rate_limit_score_report ON score_reports;
        CREATE TRIGGER trigger_rate_limit_score_report
            BEFORE INSERT ON score_reports
            FOR EACH ROW
            EXECUTE FUNCTION rate_limit_score_report();
    END IF;
END $$;

-- ============================================================
-- 5.8. RATE LIMITING POUR LES CHECK-INS
-- ============================================================

-- Fonction trigger pour les check-ins
CREATE OR REPLACE FUNCTION rate_limit_check_in()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur depuis l'équipe
    SELECT captain_id INTO v_user_id
    FROM teams
    WHERE id = NEW.team_id;
    
    -- Si pas de captain_id, essayer de récupérer depuis team_members
    IF v_user_id IS NULL THEN
        SELECT user_id INTO v_user_id
        FROM team_members
        WHERE team_id = NEW.team_id
        LIMIT 1;
    END IF;
    
    -- Si toujours pas d'utilisateur, autoriser (fallback)
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Vérifier le rate limiting seulement si checked_in passe de FALSE à TRUE
    IF OLD.checked_in = FALSE AND NEW.checked_in = TRUE THEN
        PERFORM check_rate_limit(v_user_id, 'check_in');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger avant mise à jour
DROP TRIGGER IF EXISTS trigger_rate_limit_check_in ON participants;
CREATE TRIGGER trigger_rate_limit_check_in
    BEFORE UPDATE ON participants
    FOR EACH ROW
    WHEN (OLD.checked_in IS DISTINCT FROM NEW.checked_in)
    EXECUTE FUNCTION rate_limit_check_in();

-- ============================================================
-- 6. FONCTION POUR RÉCUPÉRER LES STATISTIQUES DE RATE LIMITING
-- ============================================================

-- Fonction pour obtenir les statistiques de rate limiting d'un utilisateur
CREATE OR REPLACE FUNCTION get_rate_limit_stats(p_user_id UUID)
RETURNS TABLE (
    operation_type VARCHAR(50),
    current_count INTEGER,
    max_requests INTEGER,
    window_minutes INTEGER,
    window_start TIMESTAMP WITH TIME ZONE,
    requests_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rl.operation_type,
        rl.request_count AS current_count,
        rlc.max_requests,
        rlc.window_minutes,
        rl.window_start,
        GREATEST(0, rlc.max_requests - rl.request_count) AS requests_remaining
    FROM rate_limits rl
    JOIN rate_limit_config rlc ON rl.operation_type = rlc.operation_type
    WHERE rl.user_id = p_user_id
      AND rl.window_start >= NOW() - (rlc.window_minutes || ' minutes')::INTERVAL
    ORDER BY rl.operation_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION get_rate_limit_stats IS 'Retourne les statistiques de rate limiting pour un utilisateur';

-- ============================================================
-- 7. RLS (Row Level Security) POUR LES TABLES
-- ============================================================

-- Activer RLS sur rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir leurs propres statistiques
DROP POLICY IF EXISTS "Users can view their own rate limits" ON rate_limits;
CREATE POLICY "Users can view their own rate limits"
ON rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Activer RLS sur rate_limit_config (lecture seule pour tous)
ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;

-- Politique : Tous les utilisateurs authentifiés peuvent lire la configuration
DROP POLICY IF EXISTS "Authenticated users can read rate limit config" ON rate_limit_config;
CREATE POLICY "Authenticated users can read rate limit config"
ON rate_limit_config
FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================================
-- 8. NETTOYAGE PÉRIODIQUE (Optionnel - à configurer dans Supabase)
-- ============================================================

-- Note : Pour automatiser le nettoyage, configurez un cron job dans Supabase
-- ou appelez cleanup_old_rate_limits() périodiquement via une Edge Function

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Rate limiting backend configuré avec succès !';
    RAISE NOTICE '📊 Tables créées: rate_limits, rate_limit_config';
    RAISE NOTICE '🔒 Triggers activés pour: tournaments, teams, comments, registrations, templates, follows, scores, check-ins';
    RAISE NOTICE '⚙️ Pour modifier les limites, utilisez: UPDATE rate_limit_config SET max_requests = X WHERE operation_type = ''...'';';
END $$;

