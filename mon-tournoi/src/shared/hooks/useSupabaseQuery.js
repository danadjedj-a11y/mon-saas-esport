import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '../../utils/toast';

/**
 * Hook personnalisé pour les requêtes Supabase
 * Gère loading, error, retry, cache automatiquement
 * 
 * @param {Function} queryFn - Fonction qui retourne la requête Supabase
 * @param {Object} options - Options (enabled, retry, cache, onSuccess, onError)
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useSupabaseQuery = (queryFn, options = {}) => {
  const {
    enabled = true,
    retry = 0,
    retryDelay = 1000,
    showToastOnError = false,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const queryVersionRef = useRef(0);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!enabled || !isMountedRef.current) return;

    // Incrémenter la version pour ignorer les anciennes requêtes
    const currentVersion = ++queryVersionRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();

      // Vérifier si c'est toujours la requête la plus récente
      if (currentVersion !== queryVersionRef.current || !isMountedRef.current) {
        return;
      }

      if (result.error) {
        throw result.error;
      }

      if (isMountedRef.current) {
        setData(result.data);
        setError(null);
        retryCountRef.current = 0;
        
        // Callback de succès
        if (onSuccess) {
          onSuccess(result.data);
        }
      }
    } catch (err) {
      console.error('Erreur requête Supabase:', err);
      
      // Vérifier si c'est toujours la requête la plus récente
      if (currentVersion !== queryVersionRef.current || !isMountedRef.current) {
        return;
      }

      // Retry si configuré
      if (retryCountRef.current < retry && isMountedRef.current) {
        retryCountRef.current++;
        console.log(`Retry ${retryCountRef.current}/${retry} après ${retryDelay}ms`);
        
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchData();
          }
        }, retryDelay);
        return;
      }

      if (isMountedRef.current) {
        setError(err);
        
        if (showToastOnError) {
          toast.error('Erreur de chargement: ' + err.message);
        }
        
        // Callback d'erreur
        if (onError) {
          onError(err);
        }
      }
    } finally {
      if (currentVersion === queryVersionRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [queryFn, enabled, retry, retryDelay, showToastOnError, onSuccess, onError]);

  // Exécuter la requête au montage si enabled
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // Fonction pour refetch manuellement
  const refetch = useCallback(() => {
    retryCountRef.current = 0;
    return fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    isSuccess: !loading && !error && data !== null,
    isError: !loading && !!error,
  };
};

export default useSupabaseQuery;
