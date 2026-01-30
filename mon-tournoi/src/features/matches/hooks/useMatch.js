import { useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

/**
 * Hook personnalisé pour gérer un match
 * Utilise Convex pour la réactivité temps réel
 */
export const useMatch = (matchId, options = {}) => {
  const { enabled = true, myTeamId } = options;

  // Récupérer le match via Convex (temps réel automatique)
  const match = useQuery(
    api.matches.getById,
    enabled && matchId ? { matchId } : "skip"
  );

  // Loading state
  const loading = enabled && matchId && match === undefined;
  const error = null; // Convex gère les erreurs internement

  // Mutations Convex
  const updateScoreMutation = useMutation(api.matchesMutations.updateScore);
  const completeMatchMutation = useMutation(api.matchesMutations.handleProgression);

  // Fonction pour mettre à jour le score
  const updateScore = useCallback(async (scoreP1, scoreP2) => {
    if (!matchId) return { error: 'No match ID' };

    try {
      const data = await updateScoreMutation({
        matchId,
        scoreTeam1: scoreP1,
        scoreTeam2: scoreP2,
      });
      return { data, error: null };
    } catch (err) {
      console.error('Erreur mise à jour score:', err);
      return { data: null, error: err };
    }
  }, [matchId, updateScoreMutation]);

  // Fonction pour compléter le match
  const completeMatch = useCallback(async (winnerId) => {
    if (!matchId) return { error: 'No match ID' };

    try {
      // D'abord mettre à jour le score avec le gagnant
      await updateScoreMutation({
        matchId,
        winnerId,
        scoreTeam1: match?.scoreTeam1 || 0,
        scoreTeam2: match?.scoreTeam2 || 0,
      });

      // Puis gérer la progression dans le bracket
      const data = await completeMatchMutation({ matchId });
      return { data, error: null };
    } catch (err) {
      console.error('Erreur complétion match:', err);
      return { data: null, error: err };
    }
  }, [matchId, match, updateScoreMutation, completeMatchMutation]);

  // Fonction pour forcer un refresh (no-op avec Convex car réactif)
  const refetch = useCallback(() => {
    // No-op: Convex queries are automatically reactive
  }, []);

  // Helpers
  const isMyTeam1 = match?.team1?._id === myTeamId;
  const isMyTeam2 = match?.team2?._id === myTeamId;
  const isMyMatch = isMyTeam1 || isMyTeam2;
  const myTeam = isMyTeam1 ? match?.team1 : (isMyTeam2 ? match?.team2 : null);
  const opponentTeam = isMyTeam1 ? match?.team2 : (isMyTeam2 ? match?.team1 : null);
  const myScore = isMyTeam1 ? match?.scoreTeam1 : (isMyTeam2 ? match?.scoreTeam2 : null);
  const opponentScore = isMyTeam1 ? match?.scoreTeam2 : (isMyTeam2 ? match?.scoreTeam1 : null);

  return {
    match,
    loading,
    error,
    refetch,
    updateScore,
    completeMatch,
    // Helpers
    isMyMatch,
    isMyTeam1,
    isMyTeam2,
    myTeam,
    opponentTeam,
    myScore,
    opponentScore,
    tournament: match?.tournament || null,
  };
};

export default useMatch;
