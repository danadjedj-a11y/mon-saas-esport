-- ============================================
-- CORRECTION DES WARNINGS DE SÉCURITÉ
-- ============================================
-- ⚠️ IMPORTANT: Exécuter ce script dans l'ordre
-- ⚠️ TESTER D'ABORD EN STAGING
-- ⚠️ FAIRE UNE SAUVEGARDE AVANT
-- ============================================
-- Ce script corrige le problème "Function Search Path Mutable"
-- en définissant un search_path fixe pour toutes les fonctions
-- ============================================

-- ============================================
-- PROBLÈME: Function Search Path Mutable
-- ============================================
-- Les fonctions PostgreSQL sans search_path défini sont vulnérables
-- à des attaques de manipulation de search_path (SQL injection).
-- 
-- SOLUTION: Définir un search_path fixe pour chaque fonction
-- ============================================

-- ============================================
-- ÉTAPE 1: CORRIGER LES FONCTIONS DE VALIDATION
-- ============================================

-- Fonctions de validation
ALTER FUNCTION public.validate_match_score SET search_path = public, pg_catalog;
ALTER FUNCTION public.validate_game_score SET search_path = public, pg_catalog;
ALTER FUNCTION public.validate_tournament SET search_path = public, pg_catalog;
ALTER FUNCTION public.validate_team SET search_path = public, pg_catalog;
ALTER FUNCTION public.validate_message SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 2: CORRIGER LES FONCTIONS DE GESTION DES RÔLES
-- ============================================

ALTER FUNCTION public.get_user_role SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_user_role SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 3: CORRIGER LES FONCTIONS DE GESTION DES ÉQUIPES
-- ============================================

ALTER FUNCTION public.add_creator_to_team SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 4: CORRIGER LES FONCTIONS DE SUISSE
-- ============================================

ALTER FUNCTION public.update_swiss_scores_updated_at SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 5: CORRIGER LES FONCTIONS DE FOLLOW
-- ============================================

ALTER FUNCTION public.is_following_tournament SET search_path = public, pg_catalog;
ALTER FUNCTION public.is_following_team SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 6: CORRIGER LES FONCTIONS DE TEMPLATES
-- ============================================

ALTER FUNCTION public.increment_template_usage SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_tournament_templates_updated_at SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 7: CORRIGER LES FONCTIONS DE SYSTÈME XP/BADGES
-- ============================================

ALTER FUNCTION public.calculate_level SET search_path = public, pg_catalog;
ALTER FUNCTION public.add_xp SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_and_award_badges SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_user_levels_updated_at SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 8: CORRIGER LES FONCTIONS DE RATINGS
-- ============================================

ALTER FUNCTION public.get_tournament_rating SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 9: CORRIGER LES FONCTIONS DE COMMENTS
-- ============================================

ALTER FUNCTION public.update_tournament_comments_updated_at SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_comment_replies_updated_at SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 10: CORRIGER LES FONCTIONS DE NOTIFICATIONS
-- ============================================

ALTER FUNCTION public.create_notification_with_deduplication SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_unread_notifications_count SET search_path = public, pg_catalog;
ALTER FUNCTION public.cleanup_old_deduplication SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 11: CORRIGER LES FONCTIONS DE RATE LIMITING
-- ============================================

ALTER FUNCTION public.cleanup_old_rate_limits SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_rate_limit SET search_path = public, pg_catalog;
ALTER FUNCTION public.rate_limit_tournament_create SET search_path = public, pg_catalog;
ALTER FUNCTION public.rate_limit_team_create SET search_path = public, pg_catalog;
ALTER FUNCTION public.rate_limit_comment_post SET search_path = public, pg_catalog;
ALTER FUNCTION public.rate_limit_registration SET search_path = public, pg_catalog;
ALTER FUNCTION public.rate_limit_template_create SET search_path = public, pg_catalog;
ALTER FUNCTION public.rate_limit_follow_toggle SET search_path = public, pg_catalog;
ALTER FUNCTION public.rate_limit_score_report SET search_path = public, pg_catalog;
ALTER FUNCTION public.rate_limit_check_in SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_rate_limit_stats SET search_path = public, pg_catalog;

-- ============================================
-- ÉTAPE 12: CORRIGER LES FONCTIONS D'AUTHENTIFICATION
-- ============================================

ALTER FUNCTION public.handle_new_user SET search_path = public, pg_catalog;

-- ============================================
-- VÉRIFICATION: Lister toutes les fonctions avec leur search_path
-- ============================================

SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proconfig IS NULL THEN '⚠️ No search_path set'
    WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN '✅ search_path set'
    ELSE '⚠️ No search_path in config'
  END as search_path_status,
  array_to_string(p.proconfig, ', ') as current_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_swiss_scores_updated_at',
    'get_user_role',
    'set_user_role',
    'add_creator_to_team',
    'validate_match_score',
    'validate_game_score',
    'validate_tournament',
    'validate_team',
    'validate_message',
    'is_following_tournament',
    'is_following_team',
    'increment_template_usage',
    'update_tournament_templates_updated_at',
    'calculate_level',
    'add_xp',
    'check_and_award_badges',
    'update_user_levels_updated_at',
    'get_tournament_rating',
    'update_tournament_comments_updated_at',
    'update_comment_replies_updated_at',
    'create_notification_with_deduplication',
    'get_unread_notifications_count',
    'cleanup_old_deduplication',
    'cleanup_old_rate_limits',
    'check_rate_limit',
    'rate_limit_tournament_create',
    'rate_limit_team_create',
    'rate_limit_comment_post',
    'rate_limit_registration',
    'rate_limit_template_create',
    'rate_limit_follow_toggle',
    'rate_limit_score_report',
    'rate_limit_check_in',
    'get_rate_limit_stats',
    'handle_new_user'
  )
ORDER BY p.proname;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Le search_path = 'public, pg_catalog' permet d'accéder aux:
--    - Tables/fonctions du schéma 'public' (votre schéma)
--    - Types/fonctions de 'pg_catalog' (PostgreSQL standard)
-- 
-- 2. Si vous voulez être plus strict, vous pouvez utiliser:
--    SET search_path = '' (vide) et qualifier explicitement tous les objets
--    Mais cela nécessite de modifier le code des fonctions.
-- 
-- 3. Cette correction protège contre les attaques de manipulation de search_path
--    où un attaquant pourrait créer des objets dans un schéma malveillant
--    et les faire référencer par vos fonctions.
-- 
-- 4. Testez bien toutes vos fonctions après l'exécution de ce script.

-- ============================================
-- PROBLÈME 2: Leaked Password Protection Disabled
-- ============================================
-- Ce problème ne peut pas être corrigé via SQL.
-- Il doit être activé dans l'interface Supabase Dashboard:
-- 
-- 1. Allez dans: Authentication > Settings > Password
-- 2. Activez "Leaked Password Protection"
-- 3. Cette fonctionnalité vérifie les mots de passe contre HaveIBeenPwned.org
-- 
-- Documentation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
-- ============================================

