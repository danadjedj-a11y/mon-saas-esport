import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';

/**
 * Hook personnalisé pour les abonnements Supabase Realtime
 * Gère automatiquement le cleanup et évite les fuites mémoire
 * 
 * @param {string} channelName - Nom unique du canal
 * @param {Array} subscriptions - Array de config [{table, filter, event, callback}]
 * @param {Object} options - Options (enabled)
 * @returns {Function} - unsubscribe function
 */
export const useSupabaseSubscription = (channelName, subscriptions = [], options = {}) => {
  const { enabled = true } = options;
  const channelRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) {
      unsubscribe();
      return;
    }

    isMountedRef.current = true;

    // Créer le canal
    let channel = supabase.channel(channelName);

    // Ajouter tous les abonnements
    subscriptions.forEach(({ table, filter, event = '*', callback }) => {
      channel = channel.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        (payload) => {
          if (isMountedRef.current) {
            callback(payload);
          }
        }
      );
    });

    // S'abonner
    channel.subscribe();
    channelRef.current = channel;

    // Cleanup
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [channelName, subscriptions, enabled, unsubscribe]);

  return unsubscribe;
};

export default useSupabaseSubscription;
