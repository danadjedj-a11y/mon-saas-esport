import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabaseSubscription } from '../../../shared/hooks/useSupabaseSubscription';
import { getTournamentComplete } from '../../../shared/services/api/tournaments';
import useTournamentStore from '../../../stores/tournamentStore';

/**
 * Hook personnalisé pour gérer un tournoi
 * Simplifie la logique de chargement, mise à jour, et subscriptions
 */
export const useTournament = (tournamentId, options = {}) => {
  const { enabled = true, subscribe = true } = options;
  const { setActiveTournament, cacheTournament, getCachedTournament, invalidateCache } = useTournamentStore();
  
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [swissScores, setSwissScores] = useState([]);
  const [loading, setLoading] = useState(!!tournamentId && enabled);
  const [error, setError] = useState(null);
  
  const fetchVersionRef = useRef(0);

  // Charger les données du tournoi
  const fetchTournament = useCallback(async () => {
    if (!tournamentId || !enabled) {
      setLoading(false);
      setTournament(null);
      setParticipants([]);
      setMatches([]);
      setWaitlist([]);
      setSwissScores([]);
      return;
    }

    const currentVersion = ++fetchVersionRef.current;
    setLoading(true);
    setError(null);

    try {
      // Vérifier le cache d'abord
      const cached = getCachedTournament(tournamentId);
      if (cached) {
        if (currentVersion === fetchVersionRef.current) {
          setTournament(cached.tournament || cached.data?.tournament);
          setParticipants(cached.participants || cached.data?.participants || []);
          setMatches(cached.matches || cached.data?.matches || []);
          setWaitlist(cached.waitlist || cached.data?.waitlist || []);
          setSwissScores(cached.swissScores || cached.data?.swissScores || []);
          setLoading(false);
        }
        return;
      }

      // Charger les données complètes
      const data = await getTournamentComplete(tournamentId);

      // Vérifier si c'est toujours la requête la plus récente
      if (currentVersion !== fetchVersionRef.current) {
        return;
      }

      // Mettre en cache
      cacheTournament(tournamentId, {
        tournament: data.tournament,
        participants: data.participants,
        matches: data.matches,
        waitlist: data.waitlist,
        swissScores: data.swissScores,
      });

      setTournament(data.tournament);
      setParticipants(data.participants || []);
      setMatches(data.matches || []);
      setWaitlist(data.waitlist || []);
      setSwissScores(data.swissScores || []);
      setActiveTournament(tournamentId);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement tournoi:', err);
      if (currentVersion === fetchVersionRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [tournamentId, enabled, setActiveTournament, cacheTournament, getCachedTournament]);

  // Charger au montage
  useEffect(() => {
    if (enabled && tournamentId) {
      setLoading(true);
      fetchTournament();
    } else {
      setLoading(false);
      setTournament(null);
      setParticipants([]);
      setMatches([]);
      setWaitlist([]);
      setSwissScores([]);
    }
  }, [enabled, tournamentId, fetchTournament]);

  // Subscription Realtime pour les mises à jour
  useSupabaseSubscription(
    `tournament-${tournamentId}`,
    subscribe ? [
      {
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`,
        event: 'UPDATE',
        callback: (payload) => {
          console.log('🔄 Tournoi mis à jour:', payload);
          if (payload.new) {
            setTournament(payload.new);
            invalidateCache(tournamentId);
          }
        },
      },
      {
        table: 'participants',
        filter: `tournament_id=eq.${tournamentId}`,
        event: '*',
        callback: () => {
          console.log('🔄 Participants mis à jour');
          fetchTournament(); // Recharger pour avoir les données à jour
        },
      },
      {
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
        event: '*',
        callback: () => {
          console.log('🔄 Matchs mis à jour');
          fetchTournament();
        },
      },
    ] : [],
    { enabled: subscribe && !!tournamentId }
  );

  // Fonction pour forcer un refresh
  const refetch = useCallback(() => {
    invalidateCache(tournamentId);
    fetchTournament();
  }, [tournamentId, fetchTournament, invalidateCache]);

  return {
    tournament,
    participants,
    matches,
    waitlist,
    swissScores,
    loading,
    error,
    refetch,
    isOrganizer: tournament?.owner_id === options.currentUserId,
    isParticipant: participants.some(p => p.team_id === options.myTeamId),
  };
};

export default useTournament;
