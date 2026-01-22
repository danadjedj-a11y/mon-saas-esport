-- Migration: Activer RLS sur la table notifications
-- Date: 2026-01-22
-- Description: Active Row Level Security sur la table notifications pour sécuriser les données

-- ============================================
-- 1. ACTIVER RLS SUR NOTIFICATIONS
-- ============================================

-- Note: Cette migration suppose que la table notifications existe déjà
-- Si RLS est déjà activé, la commande sera ignorée

ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CRÉER LES POLITIQUES RLS
-- ============================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

-- SELECT: Un utilisateur ne peut voir que ses propres notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Seul le système (via service_role) ou l'utilisateur peut créer des notifications pour lui-même
-- Note: En pratique, les notifications sont créées par des triggers ou des fonctions serveur
CREATE POLICY "notifications_insert_system" ON notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- UPDATE: Un utilisateur peut marquer ses notifications comme lues
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Un utilisateur peut supprimer ses propres notifications
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. CRÉER UN INDEX POUR LES PERFORMANCES
-- ============================================

-- Index sur user_id pour les requêtes filtrées par utilisateur
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Index sur created_at pour le tri chronologique
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Index composé pour les requêtes courantes (notifications non lues d'un utilisateur)
-- Note: Utilise is_read si la colonne existe, sinon ignorer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) 
      WHERE is_read = false;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'read'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) 
      WHERE read = false;
  END IF;
END $$;

-- ============================================
-- 4. COMMENTAIRE DE DOCUMENTATION
-- ============================================

COMMENT ON TABLE notifications IS 'Table des notifications utilisateur avec RLS activé. Chaque utilisateur ne peut voir/modifier que ses propres notifications.';
