-- ============================================
-- SUPABASE DATABASE CLEANUP CHECK SCRIPT
-- ============================================
-- This script checks for potentially unused tables
-- DO NOT DELETE ANYTHING - This is a READ-ONLY audit
-- ============================================

-- ============================================
-- PART 1: CHECK FOR COMMON "GHOST" TABLES
-- ============================================
-- These are tables that might exist but are not used in the frontend

SELECT 'test' as table_name, COUNT(*) as row_count FROM test;
SELECT 'todos' as table_name, COUNT(*) as row_count FROM todos;
SELECT 'examples' as table_name, COUNT(*) as row_count FROM examples;
SELECT 'demo' as table_name, COUNT(*) as row_count FROM demo;
SELECT 'sample' as table_name, COUNT(*) as row_count FROM sample;
SELECT 'users' as table_name, COUNT(*) as row_count FROM users; -- Check if 'users' exists (we use 'profiles' instead)

-- ============================================
-- PART 2: CHECK FOR BACKEND-ONLY TABLES (Not used in frontend)
-- ============================================
-- These tables are used by backend/triggers but not directly queried in frontend

SELECT 'notification_deduplication' as table_name, COUNT(*) as row_count FROM notification_deduplication;
SELECT 'rate_limit_config' as table_name, COUNT(*) as row_count FROM rate_limit_config;
SELECT 'rate_limits' as table_name, COUNT(*) as row_count FROM rate_limits;

-- ============================================
-- PART 2B: CHECK FOR POTENTIALLY UNUSED FEATURE TABLES
-- ============================================
-- These might be from old features or experiments (likely don't exist)

SELECT 'old_tournaments' as table_name, COUNT(*) as row_count FROM old_tournaments;
SELECT 'tournament_backup' as table_name, COUNT(*) as row_count FROM tournament_backup;
SELECT 'match_history' as table_name, COUNT(*) as row_count FROM match_history;
SELECT 'player_stats' as table_name, COUNT(*) as row_count FROM player_stats;
SELECT 'team_invitations' as table_name, COUNT(*) as row_count FROM team_invitations;
SELECT 'tournament_invitations' as table_name, COUNT(*) as row_count FROM tournament_invitations;

-- ============================================
-- PART 3: CHECK FOR EMPTY TABLES (Potential cleanup candidates)
-- ============================================
-- These tables are used but might be empty

SELECT 'tournament_templates' as table_name, COUNT(*) as row_count FROM tournament_templates;
SELECT 'ratings' as table_name, COUNT(*) as row_count FROM ratings;
SELECT 'comment_votes' as table_name, COUNT(*) as row_count FROM comment_votes;
SELECT 'game_score_reports' as table_name, COUNT(*) as row_count FROM game_score_reports;
SELECT 'score_reports' as table_name, COUNT(*) as row_count FROM score_reports;
SELECT 'match_vetos' as table_name, COUNT(*) as row_count FROM match_vetos;
SELECT 'waitlist' as table_name, COUNT(*) as row_count FROM waitlist;

-- ============================================
-- PART 4: VERIFY ACTIVE TABLES HAVE DATA
-- ============================================
-- These tables SHOULD have data - if they're empty, something is wrong

SELECT 'tournaments' as table_name, COUNT(*) as row_count FROM tournaments;
SELECT 'matches' as table_name, COUNT(*) as row_count FROM matches;
SELECT 'teams' as table_name, COUNT(*) as row_count FROM teams;
SELECT 'participants' as table_name, COUNT(*) as row_count FROM participants;
SELECT 'team_members' as table_name, COUNT(*) as row_count FROM team_members;
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles;
SELECT 'match_games' as table_name, COUNT(*) as row_count FROM match_games;
SELECT 'messages' as table_name, COUNT(*) as row_count FROM messages;
SELECT 'notifications' as table_name, COUNT(*) as row_count FROM notifications;
SELECT 'tournament_comments' as table_name, COUNT(*) as row_count FROM tournament_comments;
SELECT 'comment_replies' as table_name, COUNT(*) as row_count FROM comment_replies;
SELECT 'comment_votes' as table_name, COUNT(*) as row_count FROM comment_votes;
SELECT 'tournament_follows' as table_name, COUNT(*) as row_count FROM tournament_follows;
SELECT 'team_follows' as table_name, COUNT(*) as row_count FROM team_follows;
SELECT 'swiss_scores' as table_name, COUNT(*) as row_count FROM swiss_scores;
SELECT 'user_levels' as table_name, COUNT(*) as row_count FROM user_levels;
SELECT 'user_badges' as table_name, COUNT(*) as row_count FROM user_badges;
SELECT 'badges' as table_name, COUNT(*) as row_count FROM badges;
SELECT 'user_roles' as table_name, COUNT(*) as row_count FROM user_roles;
SELECT 'match_vetos' as table_name, COUNT(*) as row_count FROM match_vetos;
SELECT 'waitlist' as table_name, COUNT(*) as row_count FROM waitlist;
SELECT 'tournament_templates' as table_name, COUNT(*) as row_count FROM tournament_templates;

-- ============================================
-- PART 5: CHECK FOR ORPHANED RECORDS
-- ============================================
-- These queries help identify data integrity issues

-- Matches without valid tournament
SELECT 'matches_orphaned' as check_type, COUNT(*) as count 
FROM matches m 
LEFT JOIN tournaments t ON m.tournament_id = t.id 
WHERE t.id IS NULL;

-- Participants without valid tournament
SELECT 'participants_orphaned_tournament' as check_type, COUNT(*) as count 
FROM participants p 
LEFT JOIN tournaments t ON p.tournament_id = t.id 
WHERE t.id IS NULL;

-- Participants without valid team
SELECT 'participants_orphaned_team' as check_type, COUNT(*) as count 
FROM participants p 
LEFT JOIN teams t ON p.team_id = t.id 
WHERE p.team_id IS NOT NULL AND t.id IS NULL;

-- Team members without valid team
SELECT 'team_members_orphaned' as check_type, COUNT(*) as count 
FROM team_members tm 
LEFT JOIN teams t ON tm.team_id = t.id 
WHERE t.id IS NULL;

-- Match games without valid match
SELECT 'match_games_orphaned' as check_type, COUNT(*) as count 
FROM match_games mg 
LEFT JOIN matches m ON mg.match_id = m.id 
WHERE m.id IS NULL;

-- Match vetos without valid match
SELECT 'match_vetos_orphaned' as check_type, COUNT(*) as count 
FROM match_vetos mv 
LEFT JOIN matches m ON mv.match_id = m.id 
WHERE m.id IS NULL;

-- Waitlist entries without valid tournament
SELECT 'waitlist_orphaned' as check_type, COUNT(*) as count 
FROM waitlist w 
LEFT JOIN tournaments t ON w.tournament_id = t.id 
WHERE t.id IS NULL;

-- Comment replies without valid comment
SELECT 'comment_replies_orphaned' as check_type, COUNT(*) as count 
FROM comment_replies cr 
LEFT JOIN tournament_comments tc ON cr.comment_id = tc.id 
WHERE tc.id IS NULL;

-- Comment votes without valid comment
SELECT 'comment_votes_orphaned' as check_type, COUNT(*) as count 
FROM comment_votes cv 
LEFT JOIN tournament_comments tc ON cv.comment_id = tc.id 
WHERE tc.id IS NULL;

-- ============================================
-- PART 6: CHECK FOR RPC FUNCTIONS
-- ============================================
-- Verify these functions exist (manual check in Supabase dashboard)
-- Expected RPC functions:
-- - create_notification_with_deduplication
-- - get_unread_notifications_count
-- - get_tournament_rating
-- - add_xp
-- - check_and_award_badges
-- - increment_template_usage

-- ============================================
-- NOTES:
-- ============================================
-- 1. If a table returns "relation does not exist", it means it was never created - safe to ignore
-- 2. If a table returns 0 rows, it might be safe to drop (but verify with team first)
-- 3. Orphaned records should be cleaned up before dropping any tables
-- 4. Always backup your database before running any DELETE or DROP commands

