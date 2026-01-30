/**
 * USE CONVEX QUERY - Remplacement de useSupabaseQuery
 * 
 * Ce hook est un wrapper pour maintenir la compatibilité avec le code existant
 * qui utilisait useSupabaseQuery. Redirige vers useQuery de Convex.
 * 
 * DEPRECATED: Utilisez directement useQuery de Convex pour les nouveaux composants
 */

import { useCallback, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { toast } from '../../utils/toast';

/**
 * Hook de compatibilité pour remplacer useSupabaseQuery
 * 
 * @param {Object} query - Query Convex (api.xxx.yyy)
 * @param {Object} args - Arguments de la query
 * @param {Object} options - Options (enabled, showToastOnError, onSuccess, onError)
 * @returns {Object} - { data, loading, error, refetch }
 * 
 * @example
 * // Ancien code avec Supabase:
 * const { data } = useSupabaseQuery(() => supabase.from('teams').select('*'));
 * 
 * // Nouveau code avec Convex:
 * const { data } = useConvexQuery(api.teams.list, { userId });
 */
export const useConvexQuery = (query, args = {}, options = {}) => {
  const {
    enabled = true,
    showToastOnError = false,
    onSuccess,
    onError,
  } = options;

  // Utiliser "skip" si pas enabled
  const queryArgs = enabled ? args : "skip";

  // Exécuter la query Convex
  const data = useQuery(query, queryArgs);

  // Détecter l'état de chargement
  const loading = data === undefined && enabled;

  // Pas d'erreurs dans Convex - les erreurs sont des exceptions
  const error = null;

  // Callback de succès
  useMemo(() => {
    if (data !== undefined && onSuccess) {
      onSuccess(data);
    }
  }, [data, onSuccess]);

  // Fonction refetch (Convex gère automatiquement le refetch via réactivité)
  const refetch = useCallback(() => {
    // Convex est réactif, pas besoin de refetch manuel
    // Mais on peut forcer en changeant les args
    console.log('[useConvexQuery] Convex est réactif - pas besoin de refetch manuel');
  }, []);

  return {
    data: data ?? null,
    loading,
    error,
    refetch,
    isSuccess: !loading && data !== undefined,
    isError: false,
  };
};

/**
 * Alias pour compatibilité - DÉPRÉCIÉ
 * Utilisez useConvexQuery ou useQuery directement
 */
export const useSupabaseQuery = (queryFn, options = {}) => {
  console.warn(
    '[MIGRATION] useSupabaseQuery est déprécié. ' +
    'Utilisez useQuery de Convex ou useConvexQuery pour la compatibilité.'
  );

  // Retourne un état vide pour éviter les erreurs
  return {
    data: null,
    loading: false,
    error: new Error('useSupabaseQuery est déprécié - Migrez vers Convex'),
    refetch: () => { },
    isSuccess: false,
    isError: true,
  };
};

export default useConvexQuery;
