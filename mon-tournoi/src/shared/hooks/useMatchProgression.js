/**
 * Hook personnalisé pour la progression des matchs dans les brackets
 * Gère l'avancement des équipes dans les tournois Single/Double Elimination
 */

import { useCallback } from 'react';
import { supabase } from '../../supabaseClient';

/**
 * Hook pour gérer la progression des brackets
 * @param {string} tournamentId - ID du tournoi
 * @param {Function} onUpdate - Callback après une mise à jour
 */
export function useMatchProgression(tournamentId, onUpdate) {
  
  /**
   * Récupère tous les matchs du tournoi
   */
  const getAllMatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: true })
      .order('match_number', { ascending: true });
    
    if (error) {
      console.error('[useMatchProgression] Erreur getAllMatches:', error);
      return [];
    }
    return data || [];
  }, [tournamentId]);

  /**
   * Avance le gagnant dans un bracket Single Elimination
   * @param {Object} matchData - Match terminé
   * @param {string} winnerTeamId - ID de l'équipe gagnante
   */
  const advanceWinner = useCallback(async (matchData, winnerTeamId) => {
    const allMatches = await getAllMatches();
    
    const roundNumber = matchData.round_number;
    const nextRound = roundNumber + 1;
    const nextRoundMatches = allMatches.filter(m => m.round_number === nextRound);
    
    if (nextRoundMatches.length === 0) {
      // Finale terminée, le tournoi est fini
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournamentId);
      
      if (error) {
        console.error('[useMatchProgression] Erreur completion tournoi:', error);
      }
      
      onUpdate?.();
      return;
    }
    
    // Trouver le prochain match
    const currentRoundMatches = allMatches
      .filter(m => m.round_number === roundNumber)
      .sort((a, b) => a.match_number - b.match_number);
    
    const myIndex = currentRoundMatches.findIndex(m => m.id === matchData.id);
    const nextMatchIndex = Math.floor(myIndex / 2);
    const nextMatch = nextRoundMatches.sort((a, b) => a.match_number - b.match_number)[nextMatchIndex];
    
    if (nextMatch) {
      const slot = (myIndex % 2 === 0) ? 'player1_id' : 'player2_id';
      const { error } = await supabase
        .from('matches')
        .update({ [slot]: winnerTeamId })
        .eq('id', nextMatch.id);
      
      if (error) {
        console.error('[useMatchProgression] Erreur advanceWinner:', error);
      }
    }
    
    onUpdate?.();
  }, [tournamentId, getAllMatches, onUpdate]);

  /**
   * Gère la progression dans un bracket Double Elimination
   * @param {Object} completedMatch - Match terminé
   * @param {string} winnerTeamId - ID de l'équipe gagnante
   * @param {string} loserTeamId - ID de l'équipe perdante
   */
  const handleDoubleEliminationProgression = useCallback(async (completedMatch, winnerTeamId, loserTeamId) => {
    const allMatches = await getAllMatches();
    const bracketType = completedMatch.bracket_type;
    const roundNumber = completedMatch.round_number;
    
    if (bracketType === 'winners') {
      // Le gagnant avance dans le Winners bracket
      const nextWinnersRound = roundNumber + 1;
      const currentWinnersMatches = allMatches
        .filter(m => m.bracket_type === 'winners' && m.round_number === roundNumber)
        .sort((a, b) => a.match_number - b.match_number);
      
      const myIndex = currentWinnersMatches.findIndex(m => m.id === completedMatch.id);
      
      // Avancer le gagnant
      const nextWinnersMatches = allMatches
        .filter(m => m.bracket_type === 'winners' && m.round_number === nextWinnersRound)
        .sort((a, b) => a.match_number - b.match_number);
      
      if (nextWinnersMatches.length > 0) {
        const nextMatchIndex = Math.floor(myIndex / 2);
        const nextMatch = nextWinnersMatches[nextMatchIndex];
        if (nextMatch) {
          const slot = (myIndex % 2 === 0) ? 'player1_id' : 'player2_id';
          const { error } = await supabase
            .from('matches')
            .update({ [slot]: winnerTeamId })
            .eq('id', nextMatch.id);
          
          if (error) {
            console.error('[useMatchProgression] Erreur winners progression:', error);
          }
        }
      } else {
        // Vainqueur Winners -> Grand Finals
        const grandFinals = allMatches.find(m => !m.bracket_type && !m.is_reset);
        if (grandFinals) {
          const { error } = await supabase
            .from('matches')
            .update({ player1_id: winnerTeamId })
            .eq('id', grandFinals.id);
          
          if (error) {
            console.error('[useMatchProgression] Erreur grand finals player1:', error);
          }
        }
      }
      
      // Faire descendre le perdant dans Losers
      if (roundNumber === 1) {
        // Round 1 Winners -> Round 1 Losers
        const losersRound1Matches = allMatches
          .filter(m => m.bracket_type === 'losers' && m.round_number === 1)
          .sort((a, b) => a.match_number - b.match_number);
        
        if (losersRound1Matches.length > 0) {
          const availableMatch = losersRound1Matches.find(m => !m.player1_id || !m.player2_id);
          if (availableMatch) {
            const slot = !availableMatch.player1_id ? 'player1_id' : 'player2_id';
            const { error } = await supabase
              .from('matches')
              .update({ [slot]: loserTeamId })
              .eq('id', availableMatch.id);
            
            if (error) {
              console.error('[useMatchProgression] Erreur losers placement:', error);
            }
          }
        }
      } else {
        // Round > 1 Winners -> Losers Round spécifique
        const losersRound = roundNumber * 2 - 1;
        const losersMatches = allMatches
          .filter(m => m.bracket_type === 'losers' && m.round_number === losersRound)
          .sort((a, b) => a.match_number - b.match_number);
        
        if (losersMatches.length > 0) {
          const availableMatch = losersMatches.find(m => !m.player1_id || !m.player2_id);
          if (availableMatch) {
            const slot = !availableMatch.player1_id ? 'player1_id' : 'player2_id';
            const { error } = await supabase
              .from('matches')
              .update({ [slot]: loserTeamId })
              .eq('id', availableMatch.id);
            
            if (error) {
              console.error('[useMatchProgression] Erreur losers drop:', error);
            }
          }
        }
      }
      
    } else if (bracketType === 'losers') {
      // Losers bracket : le gagnant avance dans Losers, le perdant est éliminé
      const nextLosersRound = roundNumber + 1;
      const nextLosersMatches = allMatches
        .filter(m => m.bracket_type === 'losers' && m.round_number === nextLosersRound)
        .sort((a, b) => a.match_number - b.match_number);
      
      if (nextLosersMatches.length > 0) {
        const availableMatch = nextLosersMatches.find(m => !m.player1_id || !m.player2_id);
        if (availableMatch) {
          const slot = !availableMatch.player1_id ? 'player1_id' : 'player2_id';
          const { error } = await supabase
            .from('matches')
            .update({ [slot]: winnerTeamId })
            .eq('id', availableMatch.id);
          
          if (error) {
            console.error('[useMatchProgression] Erreur losers progression:', error);
          }
        }
      } else {
        // Vainqueur Losers -> Grand Finals
        const grandFinals = allMatches.find(m => !m.bracket_type && !m.is_reset);
        if (grandFinals) {
          const { error } = await supabase
            .from('matches')
            .update({ player2_id: winnerTeamId })
            .eq('id', grandFinals.id);
          
          if (error) {
            console.error('[useMatchProgression] Erreur grand finals player2:', error);
          }
        }
      }
      
    } else if (completedMatch.is_reset) {
      // Reset Match terminé -> Tournoi fini
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournamentId);
      
      if (error) {
        console.error('[useMatchProgression] Erreur completion reset:', error);
      }
      
    } else {
      // Grand Finals terminé
      if (winnerTeamId === completedMatch.player1_id) {
        // Vainqueur Winners a gagné -> Fin
        const { error } = await supabase
          .from('tournaments')
          .update({ status: 'completed' })
          .eq('id', tournamentId);
        
        if (error) {
          console.error('[useMatchProgression] Erreur completion GF:', error);
        }
      } else {
        // Vainqueur Losers a gagné -> Reset
        const resetMatch = allMatches.find(m => m.is_reset);
        if (resetMatch) {
          const { error } = await supabase
            .from('matches')
            .update({
              player1_id: completedMatch.player1_id,
              player2_id: completedMatch.player2_id,
              score_p1: 0,
              score_p2: 0,
              status: 'pending'
            })
            .eq('id', resetMatch.id);
          
          if (error) {
            console.error('[useMatchProgression] Erreur reset setup:', error);
          }
        }
      }
    }
    
    onUpdate?.();
  }, [tournamentId, getAllMatches, onUpdate]);

  /**
   * Déclenche la mise à jour du bracket
   */
  const triggerBracketRefresh = useCallback((tId) => {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('tournament-match-updated', { 
        detail: { tournamentId: tId || tournamentId } 
      }));
    }, 1000);
  }, [tournamentId]);

  return {
    advanceWinner,
    handleDoubleEliminationProgression,
    triggerBracketRefresh,
    getAllMatches
  };
}

export default useMatchProgression;
