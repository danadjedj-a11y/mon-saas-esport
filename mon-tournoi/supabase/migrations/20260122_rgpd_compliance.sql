-- Migration: Add GDPR/RGPD compliance tables
-- Tables for managing user consents and data processing

-- Table pour stocker les consentements utilisateurs
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  -- Types de consentement:
  -- 'terms' = CGU
  -- 'privacy' = Politique de confidentialité
  -- 'marketing' = Communications marketing
  -- 'analytics' = Cookies analytiques
  -- 'newsletter' = Newsletter
  granted BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Un seul enregistrement actif par type de consentement par utilisateur
  UNIQUE(user_id, consent_type)
);

-- Index pour des requêtes rapides
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);

-- Historique des consentements (pour audit)
CREATE TABLE IF NOT EXISTS user_consents_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  version TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('granted', 'revoked', 'updated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_history_user_id ON user_consents_history(user_id);

-- Table pour les demandes de suppression de compte (RGPD - droit à l'effacement)
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON account_deletion_requests(status);

-- Table pour les exports de données (RGPD - droit à la portabilité)
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  expires_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_requests_user_id ON data_export_requests(user_id);

-- Enable RLS
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour user_consents
CREATE POLICY "Users can view own consents" ON user_consents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents" ON user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents" ON user_consents
  FOR UPDATE USING (auth.uid() = user_id);

-- Politiques RLS pour user_consents_history
CREATE POLICY "Users can view own consent history" ON user_consents_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent history" ON user_consents_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour account_deletion_requests
CREATE POLICY "Users can view own deletion requests" ON account_deletion_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deletion requests" ON account_deletion_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view and update all deletion requests
CREATE POLICY "Admins can view all deletion requests" ON account_deletion_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'organizer'))
  );

CREATE POLICY "Admins can update deletion requests" ON account_deletion_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'organizer'))
  );

-- Politiques RLS pour data_export_requests
CREATE POLICY "Users can view own export requests" ON data_export_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own export requests" ON data_export_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fonction pour enregistrer l'historique des consentements
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_consents_history (
    user_id,
    consent_type,
    granted,
    ip_address,
    user_agent,
    version,
    action
  ) VALUES (
    NEW.user_id,
    NEW.consent_type,
    NEW.granted,
    NEW.ip_address,
    NEW.user_agent,
    NEW.version,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'granted'
      WHEN TG_OP = 'UPDATE' AND NEW.granted = true THEN 'granted'
      WHEN TG_OP = 'UPDATE' AND NEW.granted = false THEN 'revoked'
      ELSE 'updated'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour enregistrer l'historique
DROP TRIGGER IF EXISTS consent_change_trigger ON user_consents;
CREATE TRIGGER consent_change_trigger
  AFTER INSERT OR UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION log_consent_change();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_user_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_consents_updated_at ON user_consents;
CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_user_consents_updated_at();

-- Ajouter une colonne pour l'acceptation des CGU dans profiles (si pas déjà présente)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN terms_accepted_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'privacy_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN privacy_accepted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE user_consents IS 'Stores current user consent status for GDPR compliance';
COMMENT ON TABLE user_consents_history IS 'Audit trail of all consent changes for GDPR compliance';
COMMENT ON TABLE account_deletion_requests IS 'Tracks user requests to delete their account (GDPR right to erasure)';
COMMENT ON TABLE data_export_requests IS 'Tracks user requests to export their data (GDPR right to data portability)';
