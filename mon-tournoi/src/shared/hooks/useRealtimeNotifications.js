import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';

/**
 * Hook pour gérer les notifications en temps réel avec toasts
 */
export function useRealtimeNotifications(session, options = {}) {
  const { 
    enabled = true,
    showToasts = true,
    playSound = true,
    maxToasts = 5 
  } = options;

  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef(null);
  const lastNotificationId = useRef(null);

  // Créer l'élément audio pour le son de notification
  useEffect(() => {
    if (playSound && typeof window !== 'undefined') {
      // Son de notification simple (base64 encoded beep)
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8teleCV8=');
      audioRef.current.volume = 0.3;
    }
  }, [playSound]);

  // Ajouter un toast
  const addToast = useCallback((notification) => {
    if (!showToasts) return;

    const toastId = `toast-${notification.id || Date.now()}`;
    
    setToasts((prev) => {
      // Limiter le nombre de toasts
      const newToasts = [
        { 
          id: toastId, 
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          notificationId: notification.id
        },
        ...prev
      ].slice(0, maxToasts);
      return newToasts;
    });

    // Jouer le son
    if (playSound && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignorer les erreurs (ex: autoplay bloqué)
      });
    }
  }, [showToasts, playSound, maxToasts]);

  // Supprimer un toast
  const removeToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  // Écouter les nouvelles notifications
  useEffect(() => {
    if (!enabled || !session?.user) return;

    // Récupérer le nombre de notifications non lues
    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // S'abonner aux nouvelles notifications en temps réel
    const channel = supabase
      .channel(`realtime-notifications-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const notification = payload.new;
          
          // Éviter les doublons
          if (lastNotificationId.current === notification.id) return;
          lastNotificationId.current = notification.id;

          // Afficher le toast
          addToast(notification);
          
          // Mettre à jour le compteur
          setUnreadCount((prev) => prev + 1);

          // Notification du navigateur si autorisé
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/Logo.png',
              tag: notification.id,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          // Si marqué comme lu, décrémenter le compteur
          if (payload.new.is_read && !payload.old.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          // Si la notification supprimée n'était pas lue
          if (!payload.old.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, session, addToast]);

  // Demander la permission pour les notifications navigateur
  const requestBrowserPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  return {
    toasts,
    removeToast,
    addToast,
    unreadCount,
    setUnreadCount,
    requestBrowserPermission,
  };
}

export default useRealtimeNotifications;
