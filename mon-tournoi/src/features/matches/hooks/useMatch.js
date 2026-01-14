import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { useSupabaseSubscription } from '../../../shared/hooks';

/**
 * Hook personnalisé pour gérer un match
 * Simplifie la logique de chargement, mise à jour, et chat
 */
export const useMatch = (matchId, options = {}) => {
  const { enabled = true, subscribe = true } = options;
  
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isMountedRef = useRef(true);
  const fetchVersionRef = useRef(0);
  const fetchMatchRef = useRef(null);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Charger le match
  const fetchMatch = useCallback(async () => {
    if (!matchId || !enabled) {
      setLoading(false);
      setMatch(null);
      return;
    }

    const currentVersion = ++fetchVersionRef.current;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('matches')
        .select(`
          *,
          tournaments (
            id,
            name,
            game,
            format,
            owner_id,
            best_of,
            maps_pool
          ),
          player1:teams!matches_player1_id_fkey (
            id,
            name,
            tag,
            logo_url
          ),
          player2:teams!matches_player2_id_fkey (
            id,
            name,
            tag,
            logo_url
          )
        `)
        .eq('id', matchId)
        .single();

      if (fetchError) throw fetchError;

      if (currentVersion === fetchVersionRef.current) {
        setMatch(data);
        setError(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('Erreur chargement match:', err);
      if (currentVersion === fetchVersionRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [matchId, enabled]);

  // Garder une ref à fetchMatch pour l'utiliser dans le callback
  useEffect(() => {
    fetchMatchRef.current = fetchMatch;
  }, [fetchMatch]);

  // Charger au montage
  useEffect(() => {
    if (enabled && matchId) {
      fetchMatch();
    } else {
      setLoading(false);
      setMatch(null);
    }
  }, [enabled, matchId, fetchMatch]);

  // Subscription Realtime pour les mises à jour
  useSupabaseSubscription(
    `match-${matchId}`,
    subscribe ? [
      {
        table: 'matches',
        filter: `id=eq.${matchId}`,
        event: 'UPDATE',
        callback: (payload) => {
          console.log('🔄 Match mis à jour:', payload);
          if (payload.new && isMountedRef.current && fetchMatchRef.current) {
            // Recharger le match complet avec relations
            fetchMatchRef.current();
          }
        },
      },
    ] : [],
    { enabled: subscribe && !!matchId }
  );

  // Fonction pour mettre à jour le score
  const updateScore = useCallback(async (scoreP1, scoreP2) => {
    if (!matchId) return { error: 'No match ID' };

    try {
      const { data, error: updateError } = await supabase
        .from('matches')
        .update({
          score_p1: scoreP1,
          score_p2: scoreP2,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .select()
        .single();

      if (updateError) throw updateError;

      if (isMountedRef.current) {
        setMatch(data);
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur mise à jour score:', err);
      return { data: null, error: err };
    }
  }, [matchId]);

  // Fonction pour compléter le match
  const completeMatch = useCallback(async (winnerId) => {
    if (!matchId) return { error: 'No match ID' };

    try {
      const { data, error: completeError } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          winner_id: winnerId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .select()
        .single();

      if (completeError) throw completeError;

      if (isMountedRef.current) {
        setMatch(data);
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur complétion match:', err);
      return { data: null, error: err };
    }
  }, [matchId]);

  // Fonction pour forcer un refresh
  const refetch = useCallback(() => {
    fetchMatch();
  }, [fetchMatch]);

  // Helpers
  const isMyTeam1 = match?.player1_id === options.myTeamId;
  const isMyTeam2 = match?.player2_id === options.myTeamId;
  const isMyMatch = isMyTeam1 || isMyTeam2;
  const myTeam = isMyTeam1 ? match?.player1 : match?.player2;
  const opponentTeam = isMyTeam1 ? match?.player2 : match?.player1;
  const myScore = isMyTeam1 ? match?.score_p1 : match?.score_p2;
  const opponentScore = isMyTeam1 ? match?.score_p2 : match?.score_p1;

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
    tournament: match?.tournaments || null,
  };
};

export default useMatch;
