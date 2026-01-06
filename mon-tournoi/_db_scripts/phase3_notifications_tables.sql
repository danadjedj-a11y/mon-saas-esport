-- Phase 3 : Système de Notifications
-- Tables pour les notifications utilisateur avec protection anti-spam

-- Table pour les notifications
-- Vérifier si la table existe déjà et ajouter les colonnes manquantes
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'comment_like', 'comment_reply', 'tournament_update', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- URL vers la ressource concernée
    related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Utilisateur qui a déclenché la notification
    related_comment_id UUID REFERENCES tournament_comments(id) ON DELETE CASCADE,
    related_tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter la colonne is_read si elle n'existe pas (ou si read existe, on la renomme)
DO $$ 
BEGIN
    -- Vérifier si la colonne 'read' existe et la renommer en 'is_read'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'read'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN "read" TO is_read;
    END IF;
    
    -- Ajouter is_read si elle n'existe toujours pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Ajouter les nouvelles colonnes si elles n'existent pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'related_user_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'related_comment_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN related_comment_id UUID REFERENCES tournament_comments(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'related_tournament_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN related_tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Table pour éviter les notifications en double/spam
CREATE TABLE IF NOT EXISTS notification_deduplication (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    related_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    related_comment_id UUID REFERENCES tournament_comments(id) ON DELETE CASCADE,
    last_notification_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, type, related_user_id, related_comment_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_deduplication_user_type ON notification_deduplication(user_id, type, related_user_id, related_comment_id);

-- RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deduplication ENABLE ROW LEVEL SECURITY;

-- Policies pour notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies pour notification_deduplication (lecture/écriture système uniquement)
CREATE POLICY "Users can view their own deduplication records"
    ON notification_deduplication FOR SELECT
    USING (auth.uid() = user_id);

-- Fonction pour créer une notification avec protection anti-spam
-- Cooldown de 5 minutes pour éviter les notifications en double
CREATE OR REPLACE FUNCTION create_notification_with_deduplication(
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_link TEXT DEFAULT NULL,
    p_related_user_id UUID DEFAULT NULL,
    p_related_comment_id UUID DEFAULT NULL,
    p_related_tournament_id UUID DEFAULT NULL,
    p_cooldown_minutes INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_last_notification TIMESTAMP WITH TIME ZONE;
    v_should_create BOOLEAN := TRUE;
BEGIN
    -- Vérifier si une notification similaire a été créée récemment
    IF p_related_user_id IS NOT NULL AND p_related_comment_id IS NOT NULL THEN
        SELECT last_notification_at INTO v_last_notification
        FROM notification_deduplication
        WHERE user_id = p_user_id
        AND type = p_type
        AND related_user_id = p_related_user_id
        AND related_comment_id = p_related_comment_id;

        -- Si une notification existe et est récente (moins de cooldown_minutes), ne pas créer
        IF v_last_notification IS NOT NULL AND 
           v_last_notification > NOW() - (p_cooldown_minutes || ' minutes')::INTERVAL THEN
            v_should_create := FALSE;
        END IF;
    END IF;

    -- Créer la notification seulement si elle n'existe pas déjà récemment
    IF v_should_create THEN
        INSERT INTO notifications (
            user_id, type, title, message, link,
            related_user_id, related_comment_id, related_tournament_id
        )
        VALUES (
            p_user_id, p_type, p_title, p_message, p_link,
            p_related_user_id, p_related_comment_id, p_related_tournament_id
        )
        RETURNING id INTO v_notification_id;

        -- Mettre à jour ou créer l'enregistrement de déduplication
        IF p_related_user_id IS NOT NULL AND p_related_comment_id IS NOT NULL THEN
            INSERT INTO notification_deduplication (
                user_id, type, related_user_id, related_comment_id, last_notification_at
            )
            VALUES (
                p_user_id, p_type, p_related_user_id, p_related_comment_id, NOW()
            )
            ON CONFLICT (user_id, type, related_user_id, related_comment_id)
            DO UPDATE SET last_notification_at = NOW();
        END IF;

        RETURN v_notification_id;
    ELSE
        -- Retourner NULL si la notification n'a pas été créée (trop récente)
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le nombre de notifications non lues
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM notifications
        WHERE user_id = p_user_id
        AND is_read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour nettoyer les anciennes entrées de déduplication (plus de 24h)
CREATE OR REPLACE FUNCTION cleanup_old_deduplication()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_deduplication
    WHERE last_notification_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Nettoyer automatiquement toutes les heures (nécessite pg_cron ou un job externe)
-- Pour l'instant, on peut l'appeler manuellement ou via un trigger périodique

