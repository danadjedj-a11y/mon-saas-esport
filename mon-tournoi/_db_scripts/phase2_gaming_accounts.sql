-- ============================================================
-- Phase 2: Gaming Accounts & Public Profiles
-- Migration SQL Script
-- ============================================================

-- 1. Create player_game_accounts table
CREATE TABLE IF NOT EXISTS player_game_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'riot_games', 'epic_games', 'ubisoft', 'steam', 'battlenet'
    game_username VARCHAR(100) NOT NULL,
    game_tag VARCHAR(20), -- Pour RIOT: le #TAG, Battle.net aussi
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform) -- Un seul compte par plateforme par utilisateur
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_player_game_accounts_user_id ON player_game_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_player_game_accounts_platform ON player_game_accounts(platform);

-- Commentaires
COMMENT ON TABLE player_game_accounts IS 'Comptes de jeu des joueurs (Riot, Epic, Ubisoft, Steam, Battle.net)';
COMMENT ON COLUMN player_game_accounts.platform IS 'Identifiant de la plateforme: riot_games, epic_games, ubisoft, steam, battlenet';
COMMENT ON COLUMN player_game_accounts.game_username IS 'Nom d''utilisateur sur la plateforme de jeu';
COMMENT ON COLUMN player_game_accounts.game_tag IS 'Tag pour Riot Games (#TAG) et Battle.net (#1234)';
COMMENT ON COLUMN player_game_accounts.verified IS 'Compte vérifié (pour future implémentation)';

-- 2. Add columns to profiles table for public profile customization
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Commentaires
COMMENT ON COLUMN profiles.banner_url IS 'URL de la bannière du profil public';
COMMENT ON COLUMN profiles.is_public IS 'Le profil est-il public ? (par défaut: oui)';

-- 3. RLS Policies for player_game_accounts

-- Enable RLS
ALTER TABLE player_game_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own gaming accounts
CREATE POLICY "Users can view own gaming accounts"
    ON player_game_accounts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own gaming accounts
CREATE POLICY "Users can insert own gaming accounts"
    ON player_game_accounts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own gaming accounts
CREATE POLICY "Users can update own gaming accounts"
    ON player_game_accounts
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own gaming accounts
CREATE POLICY "Users can delete own gaming accounts"
    ON player_game_accounts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Anyone can view gaming accounts (for public profiles and match lobbies)
CREATE POLICY "Anyone can view gaming accounts for public display"
    ON player_game_accounts
    FOR SELECT
    USING (true);

-- 4. Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_player_game_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on player_game_accounts
DROP TRIGGER IF EXISTS trigger_update_player_game_accounts_updated_at ON player_game_accounts;
CREATE TRIGGER trigger_update_player_game_accounts_updated_at
    BEFORE UPDATE ON player_game_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_player_game_accounts_updated_at();

-- ============================================================
-- End of migration
-- ============================================================

-- Verification queries (optional, for testing)
-- SELECT * FROM player_game_accounts;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'player_game_accounts';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('banner_url', 'is_public');
