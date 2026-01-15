-- Ajouter la colonne email à la table profiles
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Ajouter la colonne email si elle n'existe pas
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Créer un index pour améliorer les recherches par email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. Synchroniser les emails existants depuis auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;

-- 4. Créer un trigger pour synchroniser automatiquement l'email lors de la création d'un profil
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer l'email depuis auth.users si non fourni
  IF NEW.email IS NULL THEN
    SELECT email INTO NEW.email
    FROM auth.users
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS sync_email_on_profile_insert ON profiles;

-- Créer le trigger
CREATE TRIGGER sync_email_on_profile_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- 5. Vérification : voir les profils avec leurs emails
SELECT id, username, email FROM profiles LIMIT 10;
