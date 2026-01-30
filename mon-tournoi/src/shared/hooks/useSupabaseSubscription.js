/**
 * USE REALTIME - Remplacement de useSupabaseSubscription
 * 
 * Avec Convex, les queries sont AUTOMATIQUEMENT temps réel !
 * Ce hook est maintenant un simple wrapper pour la compatibilité.
 * 
 * DEPRECATED: Utilisez directement useQuery de Convex - c'est déjà temps réel
 */

import { useEffect, useCallback } from 'react';

/**
 * Hook de compatibilité pour remplacer useSupabaseSubscription
 * 
 * IMPORTANT: Avec Convex, vous n'avez PAS BESOIN de ce hook !
 * useQuery() de Convex est automatiquement réactif et temps réel.
 * 
 * @param {string} channelName - Ignoré (Convex gère automatiquement)
 * @param {Array} subscriptions - Ignoré
 * @param {Object} options - Options (enabled)
 * @returns {Function} - unsubscribe function (no-op)
 * 
 * @example
 * // Ancien code avec Supabase:
 * useSupabaseSubscription('matches', [
 *   { table: 'matches', filter: `tournament_id=eq.${id}`, callback: refetch }
 * ]);
 * 
 * // Nouveau code avec Convex - PAS BESOIN !
 * const matches = useQuery(api.matches.listByTournament, { tournamentId });
 * // ↑ C'est automatiquement temps réel
 */
export const useSupabaseSubscription = (channelName, subscriptions = [], options = {}) => {
  const { enabled = true } = options;

  useEffect(() => {
    if (enabled && subscriptions.length > 0) {
      console.log(
        `[MIGRATION] useSupabaseSubscription("${channelName}") est déprécié. ` +
        `Convex useQuery() est automatiquement temps réel ! ` +
        `Tables: ${subscriptions.map(s => s.table).join(', ')}`
      );
    }
  }, [channelName, subscriptions, enabled]);

  // No-op unsubscribe (Convex gère automatiquement)
  const unsubscribe = useCallback(() => {
    // Rien à faire - Convex gère le cleanup automatiquement
  }, []);

  return unsubscribe;
};

/**
 * Hook pour écouter les changements Convex
 * C'est juste un alias pour clarifier que c'est temps réel
 */
export const useConvexRealtime = (query, args) => {
  // useQuery de Convex est DÉJÀ temps réel
  // Importez useQuery directement depuis convex/react
  console.log(
    '[useConvexRealtime] Info: useQuery de Convex est déjà temps réel. ' +
    'Utilisez directement useQuery(api.xxx.yyy, args)'
  );
  return null;
};

export default useSupabaseSubscription;
