-- ============================================================
-- VALIDATION BACKEND - TRIGGERS SQL
-- Phase 1 : Sécurité & Stabilité
-- ============================================================
-- IMPORTANT : Exécutez ce script dans Supabase SQL Editor
-- Ces triggers ajoutent une validation backend pour compléter la validation côté client

-- ============================================================
-- 1. VALIDATION DES TOURNOIS
-- ============================================================

-- Fonction pour valider un tournoi avant insertion/mise à jour
CREATE OR REPLACE FUNCTION validate_tournament()
RETURNS TRIGGER AS $$
BEGIN
  -- Validation du nom
  IF NEW.name IS NULL OR LENGTH(TRIM(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Le nom du tournoi est requis';
  END IF;
  
  IF LENGTH(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Le nom du tournoi ne peut pas dépasser 100 caractères';
  END IF;

  -- Validation du format
  IF NEW.format NOT IN ('elimination', 'double_elimination', 'round_robin', 'swiss') THEN
    RAISE EXCEPTION 'Format de tournoi invalide';
  END IF;

  -- Validation du jeu (optionnel mais si présent, limiter la longueur)
  IF NEW.game IS NOT NULL AND LENGTH(NEW.game) > 50 THEN
    RAISE EXCEPTION 'Le nom du jeu ne peut pas dépasser 50 caractères';
  END IF;

  -- Validation du nombre max de participants
  IF NEW.max_participants IS NOT NULL THEN
    IF NEW.max_participants < 2 THEN
      RAISE EXCEPTION 'Le nombre minimum de participants est 2';
    END IF;
    
    IF NEW.max_participants > 1000 THEN
      RAISE EXCEPTION 'Le nombre maximum de participants est 1000';
    END IF;
  END IF;

  -- Validation des règles (si présentes)
  IF NEW.rules IS NOT NULL AND LENGTH(NEW.rules) > 5000 THEN
    RAISE EXCEPTION 'Le règlement ne peut pas dépasser 5000 caractères';
  END IF;

  -- Validation du best_of
  IF NEW.best_of IS NOT NULL THEN
    IF NEW.best_of < 1 OR NEW.best_of > 7 THEN
      RAISE EXCEPTION 'Le best_of doit être entre 1 et 7';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour valider les tournois
DROP TRIGGER IF EXISTS trigger_validate_tournament ON tournaments;
CREATE TRIGGER trigger_validate_tournament
  BEFORE INSERT OR UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION validate_tournament();

-- ============================================================
-- 2. VALIDATION DES ÉQUIPES
-- ============================================================

-- Fonction pour valider une équipe avant insertion/mise à jour
CREATE OR REPLACE FUNCTION validate_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Validation du nom
  IF NEW.name IS NULL OR LENGTH(TRIM(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Le nom de l''équipe est requis';
  END IF;
  
  IF LENGTH(NEW.name) > 50 THEN
    RAISE EXCEPTION 'Le nom de l''équipe ne peut pas dépasser 50 caractères';
  END IF;

  -- Validation du tag
  IF NEW.tag IS NULL OR LENGTH(TRIM(NEW.tag)) = 0 THEN
    RAISE EXCEPTION 'Le tag de l''équipe est requis';
  END IF;
  
  IF LENGTH(NEW.tag) < 2 THEN
    RAISE EXCEPTION 'Le tag doit contenir au moins 2 caractères';
  END IF;
  
  IF LENGTH(NEW.tag) > 5 THEN
    RAISE EXCEPTION 'Le tag ne peut pas dépasser 5 caractères';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour valider les équipes
DROP TRIGGER IF EXISTS trigger_validate_team ON teams;
CREATE TRIGGER trigger_validate_team
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION validate_team();

-- ============================================================
-- 3. VALIDATION DES MESSAGES (CHAT)
-- ============================================================

-- Fonction pour valider un message avant insertion
CREATE OR REPLACE FUNCTION validate_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Validation du contenu
  IF NEW.content IS NULL OR LENGTH(TRIM(NEW.content)) = 0 THEN
    RAISE EXCEPTION 'Le message ne peut pas être vide';
  END IF;
  
  IF LENGTH(NEW.content) > 500 THEN
    RAISE EXCEPTION 'Le message ne peut pas dépasser 500 caractères';
  END IF;

  -- Vérifier qu'au moins un des IDs (tournament_id ou match_id) est présent
  IF NEW.tournament_id IS NULL AND NEW.match_id IS NULL THEN
    RAISE EXCEPTION 'Un message doit être associé à un tournoi ou un match';
  END IF;

  -- Vérifier qu'ils ne sont pas tous les deux présents
  IF NEW.tournament_id IS NOT NULL AND NEW.match_id IS NOT NULL THEN
    RAISE EXCEPTION 'Un message ne peut pas être associé à la fois à un tournoi et un match';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour valider les messages
DROP TRIGGER IF EXISTS trigger_validate_message ON messages;
CREATE TRIGGER trigger_validate_message
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_message();

-- ============================================================
-- 4. VALIDATION DES SCORES
-- ============================================================

-- Fonction pour valider un score de match
CREATE OR REPLACE FUNCTION validate_match_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Validation des scores (doivent être >= 0)
  IF NEW.score_p1 IS NOT NULL AND NEW.score_p1 < 0 THEN
    RAISE EXCEPTION 'Le score ne peut pas être négatif';
  END IF;
  
  IF NEW.score_p2 IS NOT NULL AND NEW.score_p2 < 0 THEN
    RAISE EXCEPTION 'Le score ne peut pas être négatif';
  END IF;

  -- Limiter les scores à une valeur raisonnable (ex: 999)
  IF NEW.score_p1 IS NOT NULL AND NEW.score_p1 > 999 THEN
    RAISE EXCEPTION 'Le score est trop élevé (maximum 999)';
  END IF;
  
  IF NEW.score_p2 IS NOT NULL AND NEW.score_p2 > 999 THEN
    RAISE EXCEPTION 'Le score est trop élevé (maximum 999)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour valider les scores de matchs
DROP TRIGGER IF EXISTS trigger_validate_match_score ON matches;
CREATE TRIGGER trigger_validate_match_score
  BEFORE INSERT OR UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION validate_match_score();

-- ============================================================
-- 5. VALIDATION DES SCORES DE MANCHES (BEST-OF-X)
-- ============================================================

-- Fonction pour valider un score de manche
CREATE OR REPLACE FUNCTION validate_game_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Validation des scores de manche
  IF NEW.team1_score IS NOT NULL AND (NEW.team1_score < 0 OR NEW.team1_score > 999) THEN
    RAISE EXCEPTION 'Le score de l''équipe 1 doit être entre 0 et 999';
  END IF;
  
  IF NEW.team2_score IS NOT NULL AND (NEW.team2_score < 0 OR NEW.team2_score > 999) THEN
    RAISE EXCEPTION 'Le score de l''équipe 2 doit être entre 0 et 999';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour valider les scores de manches (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'match_games') THEN
    DROP TRIGGER IF EXISTS trigger_validate_game_score ON match_games;
    CREATE TRIGGER trigger_validate_game_score
      BEFORE INSERT OR UPDATE ON match_games
      FOR EACH ROW
      EXECUTE FUNCTION validate_game_score();
  END IF;
END $$;

-- ============================================================
-- 6. COMMENTAIRES ET DOCUMENTATION
-- ============================================================

COMMENT ON FUNCTION validate_tournament() IS 'Valide les données d''un tournoi avant insertion/mise à jour';
COMMENT ON FUNCTION validate_team() IS 'Valide les données d''une équipe avant insertion/mise à jour';
COMMENT ON FUNCTION validate_message() IS 'Valide un message de chat avant insertion';
COMMENT ON FUNCTION validate_match_score() IS 'Valide les scores d''un match avant insertion/mise à jour';
COMMENT ON FUNCTION validate_game_score() IS 'Valide les scores d''une manche (Best-of-X) avant insertion/mise à jour';

-- ============================================================
-- NOTES IMPORTANTES
-- ============================================================
-- 1. Ces triggers s'exécutent AVANT l'insertion/mise à jour
-- 2. Ils complètent (ne remplacent pas) la validation côté client
-- 3. Les erreurs levées par ces triggers sont capturées par Supabase et renvoyées au client
-- 4. Pour tester, essayez d'insérer des données invalides depuis l'interface ou SQL Editor
-- 5. Les erreurs seront automatiquement propagées aux composants React via les erreurs Supabase

