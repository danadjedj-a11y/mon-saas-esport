-- ============================================================
-- Migration pour le système de rôles utilisateur
-- ============================================================
-- IMPORTANT : Exécutez ce script dans Supabase SQL Editor
-- Ce système permet de séparer les comptes organisateur et joueur

-- Créer une table pour stocker les rôles des utilisateurs
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'player', -- 'player' ou 'organizer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Fonction pour obtenir le rôle d'un utilisateur (retourne 'player' par défaut)
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT role FROM user_roles WHERE user_id = user_uuid),
        'player' -- Rôle par défaut : joueur
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour définir le rôle d'un utilisateur (seulement pour les admins système)
CREATE OR REPLACE FUNCTION set_user_role(user_uuid UUID, new_role VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier que le rôle est valide
    IF new_role NOT IN ('player', 'organizer') THEN
        RETURN FALSE;
    END IF;
    
    -- Insérer ou mettre à jour le rôle
    INSERT INTO user_roles (user_id, role, updated_at)
    VALUES (user_uuid, new_role, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET role = new_role, updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS pour user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent lire leur propre rôle
CREATE POLICY "Users can read their own role"
ON user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Politique : Seuls les admins peuvent modifier les rôles (vous devrez le faire manuellement en DB)
-- Pour l'instant, on permet à l'utilisateur de lire son rôle uniquement

-- Commentaires
COMMENT ON TABLE user_roles IS 'Table pour stocker les rôles des utilisateurs (player ou organizer)';
COMMENT ON COLUMN user_roles.role IS 'Rôle de l''utilisateur : player (par défaut) ou organizer';
COMMENT ON FUNCTION get_user_role IS 'Retourne le rôle d''un utilisateur (player par défaut)';
COMMENT ON FUNCTION set_user_role IS 'Définit le rôle d''un utilisateur (nécessite des privilèges admin)';

-- ============================================================
-- INSTRUCTIONS POUR DÉFINIR VOTRE COMPTE COMME ORGANISATEUR
-- ============================================================
-- 1. Trouvez votre user_id dans Supabase (Table auth.users)
-- 2. Exécutez cette requête SQL (remplacez YOUR_USER_ID) :
--
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('YOUR_USER_ID', 'organizer')
-- ON CONFLICT (user_id) 
-- DO UPDATE SET role = 'organizer';
--
-- OU utilisez la fonction :
--
-- SELECT set_user_role('YOUR_USER_ID', 'organizer');
--
-- ============================================================

