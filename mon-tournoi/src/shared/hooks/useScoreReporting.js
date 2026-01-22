/**
 * Hook personnalisé pour la déclaration et validation des scores
 * Gère les score_reports, les conflits, et la progression du tournoi
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from '../../utils/toast';
import { notifyMatchResult, notifyScoreDispute, notifyOpponentScoreDeclared } from '../../notificationUtils';
import { updateSwissScores } from '../../swissUtils';
import { calculateMatchWinner } from '../../bofUtils';

/**
 * Hook pour gérer la déclaration de scores
 * @param {Object} options - Configuration
 * @param {string} options.matchId - ID du match
 * @param {Object} options.match - Données du match
 * @param {string} options.myTeamId - ID de mon équipe
 * @param {Object} options.session - Session utilisateur
 * @param {string} options.tournamentFormat - Format du tournoi
 * @param {number} options.tournamentBestOf - Nombre de manches (Best-of-X)
 * @param {Function} options.onScoreSubmitted - Callback après soumission
 * @param {Function} options.onAdvanceWinner - Callback pour avancer le gagnant
 * @param {Function} options.onDoubleElimProgression - Callback pour double elim
 * @param {Function} options.onRefresh - Callback pour rafraîchir les données
 */
export function useScoreReporting({
  matchId,
  match,
  myTeamId,
  session,
  tournamentFormat,
  tournamentBestOf,
  onScoreSubmitted,
  onAdvanceWinner,
  onDoubleElimProgression,
  onRefresh
}) {
  const [submitting, setSubmitting] = useState(false);

  const isTeam1 = myTeamId === match?.player1_id;

  /**
   * Soumet un rapport de score (mode single game)
   * @param {number} myScore - Mon score
   * @param {number} opponentScore - Score adverse
   */
  const submitScoreReport = useCallback(async (myScore, opponentScore) => {
    if (!myTeamId || !session) {
      toast.error("Tu dois être connecté et membre d'une équipe pour déclarer un score.");
      return false;
    }
    if (myScore < 0 || opponentScore < 0) {
      toast.error("Les scores ne peuvent pas être négatifs.");
      return false;
    }

    setSubmitting(true);

    const scoreForTeam1 = isTeam1 ? myScore : opponentScore;
    const scoreForTeam2 = isTeam1 ? opponentScore : myScore;
    
    try {
      // 1. Enregistrer dans score_reports
      const { error: reportError } = await supabase
        .from('score_reports')
        .insert([{
          match_id: matchId,
          team_id: myTeamId,
          score_team: myScore,
          score_opponent: opponentScore,
          reported_by: session.user.id
        }]);

      if (reportError) throw reportError;

      // 2. Mettre à jour le match avec les scores déclarés
      const updateData = isTeam1
        ? { score_p1_reported: scoreForTeam1, score_p2_reported: scoreForTeam2, reported_by_team1: true }
        : { score_p1_reported: scoreForTeam1, score_p2_reported: scoreForTeam2, reported_by_team2: true };

      const { error: matchError } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (matchError) throw matchError;

      // 3. Vérifier concordance
      const { data: currentMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      // Notifier l'équipe adverse
      const opponentTeamId = isTeam1 ? match.player2_id : match.player1_id;
      const myTeamName = isTeam1 ? (match.team1?.name || 'Équipe 1') : (match.team2?.name || 'Équipe 2');
      
      const otherTeamAlreadyReported = isTeam1 ? currentMatch?.reported_by_team2 : currentMatch?.reported_by_team1;
      if (!otherTeamAlreadyReported && opponentTeamId) {
        await notifyOpponentScoreDeclared(matchId, myTeamId, opponentTeamId, myTeamName, `${myScore} - ${opponentScore}`);
      }

      // 4. Si les deux équipes ont déclaré, vérifier la concordance
      if (currentMatch?.reported_by_team1 && currentMatch?.reported_by_team2) {
        await validateScoreConcordance(currentMatch);
      } else {
        toast.success('Score déclaré ! En attente de la déclaration de l\'adversaire.');
      }

      onScoreSubmitted?.();
      onRefresh?.();
      return true;
      
    } catch (error) {
      console.error('[useScoreReporting] Erreur submitScoreReport:', error);
      toast.error("Erreur : " + error.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [matchId, match, myTeamId, session, isTeam1, onScoreSubmitted, onRefresh]);

  /**
   * Valide la concordance des scores entre les deux équipes
   */
  const validateScoreConcordance = useCallback(async (currentMatch) => {
    const { data: reports } = await supabase
      .from('score_reports')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(2);

    if (!reports || reports.length !== 2) return;

    const team1Report = reports.find(r => r.team_id === match.player1_id);
    const team2Report = reports.find(r => r.team_id === match.player2_id);

    if (!team1Report || !team2Report) return;

    const scoresConcord = 
      team1Report.score_team === team2Report.score_opponent &&
      team1Report.score_opponent === team2Report.score_team;
    
    if (scoresConcord) {
      // ✅ Scores concordent
      await finalizeMatchScore(team1Report.score_team, team1Report.score_opponent, reports);
    } else {
      // ❌ Conflit
      await supabase
        .from('matches')
        .update({ score_status: 'disputed' })
        .eq('id', matchId);
      
      if (match.player1_id && match.player2_id) {
        await notifyScoreDispute(matchId, match.player1_id, match.player2_id);
      }
      
      toast.warning('Conflit : Les scores ne correspondent pas. Un admin doit intervenir.');
    }
  }, [matchId, match]);

  /**
   * Finalise le score d'un match et avance le bracket
   */
  const finalizeMatchScore = useCallback(async (scoreP1, scoreP2, reports) => {
    // A. Mettre à jour le match comme TERMINÉ
    const { error } = await supabase
      .from('matches')
      .update({
        score_p1: scoreP1,
        score_p2: scoreP2,
        score_status: 'confirmed',
        status: 'completed'
      })
      .eq('id', matchId);

    if (error) {
      console.error('[useScoreReporting] Erreur finalizeMatchScore:', error);
      return;
    }

    // B. Résoudre les tickets
    if (reports?.length > 0) {
      const reportIds = reports.map(r => r.id);
      await supabase
        .from('score_reports')
        .update({ is_resolved: true })
        .in('id', reportIds);
    }

    toast.success('Scores concordent ! Le match est validé.');
    
    // C. Récupérer le match mis à jour
    const { data: updatedMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!updatedMatch) return;

    // D. Traitement spécial pour les formats
    if (tournamentFormat === 'swiss') {
      await updateSwissScores(supabase, updatedMatch.tournament_id, updatedMatch);
    }

    // E. Avancer le bracket si nécessaire
    if (scoreP1 !== scoreP2) {
      const winnerTeamId = scoreP1 > scoreP2 ? updatedMatch.player1_id : updatedMatch.player2_id;
      const loserTeamId = scoreP1 > scoreP2 ? updatedMatch.player2_id : updatedMatch.player1_id;
      
      await notifyMatchResult(matchId, winnerTeamId, loserTeamId, scoreP1, scoreP2);
      
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('format, id')
        .eq('id', updatedMatch.tournament_id)
        .single();
      
      if (tournament) {
        if (tournament.format === 'double_elimination') {
          await onDoubleElimProgression?.(updatedMatch, winnerTeamId, loserTeamId);
        } else if (tournament.format === 'elimination') {
          await onAdvanceWinner?.(updatedMatch, winnerTeamId);
        }
      }
    }
  }, [matchId, tournamentFormat, onAdvanceWinner, onDoubleElimProgression]);

  /**
   * Soumet un score pour une manche (mode Best-of-X)
   * @param {number} gameNumber - Numéro de la manche
   * @param {number} myTeamScore - Mon score
   * @param {number} opponentScore - Score adverse
   */
  const submitGameScore = useCallback(async (gameNumber, myTeamScore, opponentScore) => {
    if (!myTeamId || !session) {
      toast.error("Tu dois être connecté et membre d'une équipe pour déclarer un score.");
      return false;
    }
    if (myTeamScore < 0 || opponentScore < 0) {
      toast.error("Les scores ne peuvent pas être négatifs.");
      return false;
    }
    
    setSubmitting(true);
    
    const scoreForTeam1 = isTeam1 ? myTeamScore : opponentScore;
    const scoreForTeam2 = isTeam1 ? opponentScore : myTeamScore;
    
    try {
      // Chercher ou créer la manche
      let { data: existingGame } = await supabase
        .from('match_games')
        .select('*')
        .eq('match_id', matchId)
        .eq('game_number', gameNumber)
        .single();
      
      if (!existingGame) {
        const { data: newGame } = await supabase
          .from('match_games')
          .insert([{ match_id: matchId, game_number: gameNumber, status: 'pending' }])
          .select()
          .single();
        existingGame = newGame;
      }
      
      if (!existingGame) {
        toast.error('Erreur : Impossible de créer/récupérer la manche.');
        return false;
      }
      
      // 1. Enregistrer dans game_score_reports
      const { error: reportError } = await supabase
        .from('game_score_reports')
        .insert([{
          game_id: existingGame.id,
          team_id: myTeamId,
          score_team: myTeamScore,
          score_opponent: opponentScore,
          reported_by: session.user.id
        }]);

      if (reportError) throw reportError;

      // 2. Mettre à jour la manche
      const updateData = isTeam1
        ? { team1_score_reported: scoreForTeam1, team2_score_reported: scoreForTeam2, reported_by_team1: true }
        : { team1_score_reported: scoreForTeam1, team2_score_reported: scoreForTeam2, reported_by_team2: true };

      await supabase.from('match_games').update(updateData).eq('id', existingGame.id);

      // 3. Vérifier concordance
      const { data: currentGame } = await supabase
        .from('match_games')
        .select('*')
        .eq('id', existingGame.id)
        .single();

      if (currentGame?.reported_by_team1 && currentGame?.reported_by_team2) {
        await validateGameConcordance(existingGame.id, currentGame);
      } else {
        toast.success('Score déclaré ! En attente de la déclaration de l\'adversaire.');
      }
      
      onRefresh?.();
      return true;
      
    } catch (error) {
      console.error('[useScoreReporting] Erreur submitGameScore:', error);
      toast.error('Erreur : ' + error.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [matchId, match, myTeamId, session, isTeam1, onRefresh]);

  /**
   * Valide la concordance des scores d'une manche
   */
  const validateGameConcordance = useCallback(async (gameId, currentGame) => {
    const { data: reports } = await supabase
      .from('game_score_reports')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(2);

    if (!reports || reports.length !== 2) return;

    const team1Report = reports.find(r => r.team_id === match.player1_id);
    const team2Report = reports.find(r => r.team_id === match.player2_id);

    if (!team1Report || !team2Report) return;

    const scoresConcord = 
      team1Report.score_team === team2Report.score_opponent &&
      team1Report.score_opponent === team2Report.score_team;
    
    if (scoresConcord) {
      await finalizeGameScore(gameId, team1Report.score_team, team1Report.score_opponent, reports);
    } else {
      await supabase.from('match_games').update({ score_status: 'disputed' }).eq('id', gameId);
      toast.warning('Conflit : Les scores ne correspondent pas. Un admin doit intervenir.');
    }
  }, [match]);

  /**
   * Finalise le score d'une manche et vérifie si le match est terminé
   */
  const finalizeGameScore = useCallback(async (gameId, team1Score, team2Score, reports) => {
    const winnerTeamId = team1Score > team2Score 
      ? match.player1_id 
      : (team2Score > team1Score ? match.player2_id : null);
    
    // A. Mettre à jour la manche
    await supabase.from('match_games').update({
      team1_score: team1Score,
      team2_score: team2Score,
      winner_team_id: winnerTeamId,
      score_status: 'confirmed',
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', gameId);

    // B. Résoudre les rapports
    if (reports?.length > 0) {
      const reportIds = reports.map(r => r.id);
      await supabase.from('game_score_reports').update({ is_resolved: true }).in('id', reportIds);
    }

    // C. Vérifier si le match est terminé
    const { data: allGames } = await supabase
      .from('match_games')
      .select('*')
      .eq('match_id', matchId)
      .order('game_number', { ascending: true });
    
    if (allGames) {
      const matchResult = calculateMatchWinner(allGames, tournamentBestOf, match.player1_id, match.player2_id);
      
      if (matchResult.isCompleted && matchResult.winner) {
        await finalizeMatchFromGames(matchResult);
      } else {
        toast.success('Manche validée ! Les scores concordent.');
      }
    }
  }, [matchId, match, tournamentBestOf]);

  /**
   * Finalise le match à partir des résultats des manches
   */
  const finalizeMatchFromGames = useCallback(async (matchResult) => {
    const finalScore1 = matchResult.team1Wins;
    const finalScore2 = matchResult.team2Wins;
    
    await supabase.from('matches').update({
      score_p1: finalScore1,
      score_p2: finalScore2,
      status: 'completed',
      score_status: 'confirmed'
    }).eq('id', matchId);
    
    const { data: updatedMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    if (updatedMatch && tournamentFormat) {
      if (tournamentFormat === 'swiss') {
        await updateSwissScores(supabase, updatedMatch.tournament_id, updatedMatch);
      } else if (tournamentFormat === 'double_elimination') {
        const loserTeamId = matchResult.winner === match.player1_id ? match.player2_id : match.player1_id;
        await onDoubleElimProgression?.(updatedMatch, matchResult.winner, loserTeamId);
      } else if (tournamentFormat === 'elimination') {
        await onAdvanceWinner?.(updatedMatch, matchResult.winner);
      }
    }
    
    toast.success(`Match terminé ! ${finalScore1} - ${finalScore2}`);
  }, [matchId, match, tournamentFormat, onAdvanceWinner, onDoubleElimProgression]);

  /**
   * Résout un conflit de score (Admin uniquement)
   * @param {number} scoreP1 - Score équipe 1
   * @param {number} scoreP2 - Score équipe 2
   */
  const resolveConflict = useCallback(async (scoreP1, scoreP2) => {
    setSubmitting(true);
    
    try {
      // 1. Update Match
      await supabase.from('matches').update({ 
        score_p1: scoreP1, 
        score_p2: scoreP2, 
        score_p1_reported: scoreP1, 
        score_p2_reported: scoreP2,
        score_status: 'confirmed', 
        status: 'completed', 
        reported_by_team1: true, 
        reported_by_team2: true
      }).eq('id', matchId);

      // 2. Resolve reports
      await supabase.from('score_reports').update({ is_resolved: true }).eq('match_id', matchId);

      toast.success("Conflit résolu !");
      
      // 3. Avancer Bracket / Calculer Points
      const { data: updatedMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      
      if (updatedMatch) {
        if (tournamentFormat === 'swiss') {
          await updateSwissScores(supabase, updatedMatch.tournament_id, updatedMatch);
        }

        const winnerTeamId = scoreP1 > scoreP2 ? updatedMatch.player1_id : updatedMatch.player2_id;
        const loserTeamId = scoreP1 > scoreP2 ? updatedMatch.player2_id : updatedMatch.player1_id;

        const { data: tournament } = await supabase
          .from('tournaments')
          .select('format, id')
          .eq('id', updatedMatch.tournament_id)
          .single();
        
        if (tournament) {
          if (tournament.format === 'double_elimination') {
            await onDoubleElimProgression?.(updatedMatch, winnerTeamId, loserTeamId);
          } else if (tournament.format === 'elimination') {
            await onAdvanceWinner?.(updatedMatch, winnerTeamId);
          }
        }
      }
      
      onRefresh?.();
      return true;
      
    } catch (error) {
      console.error('[useScoreReporting] Erreur resolveConflict:', error);
      toast.error('Erreur lors de la résolution: ' + error.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [matchId, tournamentFormat, onAdvanceWinner, onDoubleElimProgression, onRefresh]);

  /**
   * Résout un conflit de score pour une manche (Admin uniquement)
   * @param {string} gameId - ID de la manche
   * @param {number} scoreTeam1 - Score équipe 1
   * @param {number} scoreTeam2 - Score équipe 2
   */
  const resolveGameConflict = useCallback(async (gameId, scoreTeam1, scoreTeam2) => {
    setSubmitting(true);
    
    try {
      const winnerTeamId = scoreTeam1 > scoreTeam2 
        ? match.player1_id 
        : (scoreTeam2 > scoreTeam1 ? match.player2_id : null);
      
      // 1. Update Game
      await supabase.from('match_games').update({ 
        team1_score: scoreTeam1, 
        team2_score: scoreTeam2,
        team1_score_reported: scoreTeam1,
        team2_score_reported: scoreTeam2,
        winner_team_id: winnerTeamId,
        score_status: 'confirmed', 
        status: 'completed',
        reported_by_team1: true, 
        reported_by_team2: true,
        completed_at: new Date().toISOString()
      }).eq('id', gameId);

      // 2. Resolve reports
      await supabase.from('game_score_reports').update({ is_resolved: true }).eq('game_id', gameId);

      toast.success("Conflit résolu !");
      
      // 3. Vérifier si le match est terminé
      const { data: allGames } = await supabase
        .from('match_games')
        .select('*')
        .eq('match_id', matchId)
        .order('game_number', { ascending: true });
      
      if (allGames) {
        const matchResult = calculateMatchWinner(allGames, tournamentBestOf, match.player1_id, match.player2_id);
        
        if (matchResult.isCompleted && matchResult.winner) {
          await finalizeMatchFromGames(matchResult);
        }
      }
      
      onRefresh?.();
      return true;
      
    } catch (error) {
      console.error('[useScoreReporting] Erreur resolveGameConflict:', error);
      toast.error('Erreur lors de la résolution: ' + error.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [matchId, match, tournamentBestOf, finalizeMatchFromGames, onRefresh]);

  return {
    submitting,
    submitScoreReport,
    submitGameScore,
    resolveConflict,
    resolveGameConflict
  };
}

export default useScoreReporting;
