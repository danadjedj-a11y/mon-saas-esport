import { create } from 'zustand';

/**
 * Store pour la gestion des tournois
 * Cache les tournois, participants, matchs pour éviter les requêtes répétées
 */
const useTournamentStore = create((set, get) => ({
  // État
  tournaments: new Map(), // Map<tournamentId, tournament>
  activeTournamentId: null,
  cache: {
    tournaments: new Map(), // Cache des tournois avec timestamp
    participants: new Map(), // Cache des participants par tournamentId
    matches: new Map(), // Cache des matchs par tournamentId
    swissScores: new Map(), // Cache des scores suisses par tournamentId
  },
  cacheExpiry: 5 * 60 * 1000, // 5 minutes

  // Actions
  setActiveTournament: (tournamentId) => {
    set({ activeTournamentId: tournamentId });
  },

  /**
   * Ajouter/Mettre à jour un tournoi dans le cache
   */
  cacheTournament: (tournamentId, tournamentData) => {
    const { cache } = get();
    const newCache = new Map(cache.tournaments);
    newCache.set(tournamentId, {
      data: tournamentData,
      timestamp: Date.now(),
    });
    set({ cache: { ...cache, tournaments: newCache } });
  },

  /**
   * Récupérer un tournoi du cache (si non expiré)
   */
  getCachedTournament: (tournamentId) => {
    const { cache, cacheExpiry } = get();
    const cached = cache.tournaments.get(tournamentId);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > cacheExpiry;
    if (isExpired) {
      // Supprimer du cache si expiré
      const newCache = new Map(cache.tournaments);
      newCache.delete(tournamentId);
      set({ cache: { ...cache, tournaments: newCache } });
      return null;
    }
    
    return cached.data;
  },

  /**
   * Mettre en cache les participants d'un tournoi
   */
  cacheParticipants: (tournamentId, participants) => {
    const { cache } = get();
    const newCache = new Map(cache.participants);
    newCache.set(tournamentId, {
      data: participants,
      timestamp: Date.now(),
    });
    set({ cache: { ...cache, participants: newCache } });
  },

  /**
   * Récupérer les participants du cache
   */
  getCachedParticipants: (tournamentId) => {
    const { cache, cacheExpiry } = get();
    const cached = cache.participants.get(tournamentId);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > cacheExpiry;
    if (isExpired) {
      const newCache = new Map(cache.participants);
      newCache.delete(tournamentId);
      set({ cache: { ...cache, participants: newCache } });
      return null;
    }
    
    return cached.data;
  },

  /**
   * Mettre en cache les matchs d'un tournoi
   */
  cacheMatches: (tournamentId, matches) => {
    const { cache } = get();
    const newCache = new Map(cache.matches);
    newCache.set(tournamentId, {
      data: matches,
      timestamp: Date.now(),
    });
    set({ cache: { ...cache, matches: newCache } });
  },

  /**
   * Récupérer les matchs du cache
   */
  getCachedMatches: (tournamentId) => {
    const { cache, cacheExpiry } = get();
    const cached = cache.matches.get(tournamentId);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > cacheExpiry;
    if (isExpired) {
      const newCache = new Map(cache.matches);
      newCache.delete(tournamentId);
      set({ cache: { ...cache, matches: newCache } });
      return null;
    }
    
    return cached.data;
  },

  /**
   * Invalider le cache d'un tournoi (après une mise à jour)
   */
  invalidateCache: (tournamentId) => {
    const { cache } = get();
    const newTournamentsCache = new Map(cache.tournaments);
    const newParticipantsCache = new Map(cache.participants);
    const newMatchesCache = new Map(cache.matches);
    const newSwissCache = new Map(cache.swissScores);
    
    newTournamentsCache.delete(tournamentId);
    newParticipantsCache.delete(tournamentId);
    newMatchesCache.delete(tournamentId);
    newSwissCache.delete(tournamentId);
    
    set({ 
      cache: { 
        tournaments: newTournamentsCache,
        participants: newParticipantsCache,
        matches: newMatchesCache,
        swissScores: newSwissCache,
      } 
    });
  },

  /**
   * Nettoyer tout le cache
   */
  clearCache: () => {
    set({ 
      cache: {
        tournaments: new Map(),
        participants: new Map(),
        matches: new Map(),
        swissScores: new Map(),
      }
    });
  },

  /**
   * Réinitialiser le store
   */
  reset: () => {
    set({ 
      tournaments: new Map(),
      activeTournamentId: null,
      cache: {
        tournaments: new Map(),
        participants: new Map(),
        matches: new Map(),
        swissScores: new Map(),
      }
    });
  },
}));

export default useTournamentStore;
