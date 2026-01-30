/**
 * HOOK useTournament - Version Convex
 * 
 * Hook personnalisé pour gérer un tournoi
 * Utilise Convex useQuery avec réactivité native (plus besoin de subscriptions manuelles)
 */

import { useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

/**
 * Hook personnalisé pour gérer un tournoi
 * La réactivité est gérée automatiquement par Convex useQuery
 * 
 * @param {string} tournamentId - ID du tournoi Convex
 * @param {Object} options - Options du hook
 * @param {boolean} options.enabled - Activer le chargement (défaut: true)
 * @param {string} options.currentUserId - ID de l'utilisateur courant (Convex Id)
 * @returns {Object} Données et état du tournoi
 */
export const useTournament = (tournamentId, options = {}) => {
  const { enabled = true, currentUserId } = options;

  // Query principale - récupère le tournoi avec toutes ses relations
  const tournament = useQuery(
    api.tournaments.getById,
    enabled && tournamentId ? { tournamentId } : "skip"
  );

  // Participants (inscriptions confirmées)
  const participants = useQuery(
    api.tournamentRegistrations.listByTournament,
    enabled && tournamentId ? { tournamentId } : "skip"
  );

  // Matchs du tournoi
  const matches = useQuery(
    api.matches.listByTournament,
    enabled && tournamentId ? { tournamentId } : "skip"
  );

  // Waitlist (si implémentée)
  // const waitlist = useQuery(
  //   api.tournamentWaitlist.listByTournament,
  //   enabled && tournamentId ? { tournamentId } : "skip"
  // );

  // Swiss scores (si format suisse)
  // const swissScores = useQuery(
  //   api.swissScores.getByTournament,
  //   enabled && tournamentId && tournament?.format === 'swiss' ? { tournamentId } : "skip"
  // );

  // Déterminer l'état de chargement
  const loading = useMemo(() => {
    if (!enabled || !tournamentId) return false;
    return tournament === undefined || participants === undefined || matches === undefined;
  }, [enabled, tournamentId, tournament, participants, matches]);

  // Déterminer si l'utilisateur est l'organisateur
  const isOrganizer = useMemo(() => {
    if (!tournament || !currentUserId) return false;
    return tournament.organizerId === currentUserId;
  }, [tournament, currentUserId]);

  // Déterminer si l'utilisateur est participant
  const isParticipant = useMemo(() => {
    if (!participants || !options.myTeamId) return false;
    return participants.some(p => p.teamId === options.myTeamId || p.userId === currentUserId);
  }, [participants, options.myTeamId, currentUserId]);

  // Fonction refetch (Convex le fait automatiquement, mais on laisse pour compatibilité API)
  const refetch = () => {
    // Avec Convex, les données sont automatiquement mises à jour
    // Cette fonction est gardée pour la compatibilité API
    console.log('📡 Convex auto-syncs, refetch is automatic');
  };

  return {
    tournament,
    participants: participants || [],
    matches: matches || [],
    waitlist: [], // À implémenter si nécessaire
    swissScores: [], // À implémenter si nécessaire
    loading,
    error: null, // Convex gère les erreurs via les query states
    refetch,
    isOrganizer,
    isParticipant,
  };
};

export default useTournament;
