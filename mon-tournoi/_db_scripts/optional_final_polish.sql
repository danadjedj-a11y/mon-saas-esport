-- ============================================
-- NETTOYAGE FINAL OPTIONNEL DES POLICIES RLS
-- ============================================
-- ⚠️ IMPORTANT: Ce script est OPTIONNEL
-- ⚠️ Lisez les commentaires avant d'exécuter
-- ⚠️ TESTER D'ABORD EN STAGING
-- ============================================
-- Ce script corrige 2 points mineurs identifiés dans l'audit final
-- ============================================

-- ============================================
-- ACTION 1: SUPPRIMER LA POLICY REDONDANTE SUR swiss_scores
-- ============================================
-- Problème: Il y a 2 policies pour INSERT sur swiss_scores
-- - "Enable insert for authenticated users" (redondante)
-- - "Tournament owners can manage swiss scores." (ALL - couvre tout)
-- 
-- Impact: FAIBLE - La policy ALL couvre déjà INSERT, UPDATE, DELETE, SELECT
-- 
-- Décision: Si vous êtes sûr que seuls les organisateurs doivent gérer les scores suisses,
--            supprimez la policy permissive.

-- DÉCOMMENTER LA LIGNE CI-DESSOUS POUR SUPPRIMER LA POLICY REDONDANTE:
-- DROP POLICY IF EXISTS "Enable insert for authenticated users" ON swiss_scores;

-- ============================================
-- ACTION 2: SUPPRIMER LA POLICY UPDATE SUR user_levels
-- ============================================
-- Problème: Policy "Users can update their own level" permet aux utilisateurs
--           de modifier directement leur niveau.
-- 
-- Impact: MOYEN - Les niveaux devraient être mis à jour uniquement via RPC (add_xp)
-- 
-- Décision: 
--   - Si les niveaux doivent être mis à jour UNIQUEMENT via RPC/backend → SUPPRIMER
--   - Si les utilisateurs peuvent modifier leur niveau directement → GARDER
-- 
-- ⚠️ ATTENTION: Si vous supprimez cette policy, les utilisateurs ne pourront plus
--               mettre à jour leur niveau directement depuis le frontend. Assurez-vous
--               que votre système utilise bien la RPC function add_xp().

-- DÉCOMMENTER LA LIGNE CI-DESSOUS POUR SUPPRIMER LA POLICY UPDATE:
-- DROP POLICY IF EXISTS "Users can update their own level" ON user_levels;

-- ============================================
-- VÉRIFICATION APRÈS MODIFICATIONS
-- ============================================

-- Lister les policies restantes sur swiss_scores
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'No USING clause'
    WHEN qual = 'true' THEN 'Public'
    ELSE 'Restricted'
  END as restriction_level
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'swiss_scores'
ORDER BY cmd, policyname;

-- Lister les policies restantes sur user_levels
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'No USING clause'
    WHEN qual = 'true' THEN 'Public'
    ELSE 'Restricted'
  END as restriction_level
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_levels'
ORDER BY cmd, policyname;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Ces actions sont OPTIONNELLES - votre sécurité est déjà excellente
-- 2. Testez bien après chaque modification
-- 3. Si vous n'êtes pas sûr, gardez les policies actuelles
-- 4. Vous pouvez toujours les supprimer plus tard si nécessaire

-- ============================================
-- ROLLBACK (En cas de problème)
-- ============================================
-- Si vous devez réactiver les policies supprimées:

-- Pour swiss_scores (si vous avez besoin que les utilisateurs authentifiés puissent insérer):
-- CREATE POLICY "Enable insert for authenticated users"
--   ON swiss_scores FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');

-- Pour user_levels (si vous avez besoin que les utilisateurs puissent mettre à jour leur niveau):
-- CREATE POLICY "Users can update their own level"
--   ON user_levels FOR UPDATE
--   USING (user_id = auth.uid())
--   WITH CHECK (user_id = auth.uid());

