import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

/**
 * Hook pour gérer les notifications en temps réel avec toasts
 * Utilise Convex pour la réactivité native
 */
export function useRealtimeNotifications(session, options = {}) {
  const { 
    enabled = true,
    showToasts = true,
    playSound = true,
    maxToasts = 5 
  } = options;

  const [toasts, setToasts] = useState([]);
  const audioRef = useRef(null);
  const lastNotificationId = useRef(null);
  const previousNotifications = useRef([]);

  // Récupérer les notifications via Convex (temps réel automatique)
  const notifications = useQuery(
    api.notifications.listByUser,
    enabled && session?.user?.id ? { userId: session.user.id, limit: 20 } : "skip"
  ) || [];

  // Calculer le nombre de notifications non lues
  const unreadCount = notifications.filter(n => !n.read).length;

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

    const toastId = `toast-${notification._id || Date.now()}`;
    
    setToasts((prev) => {
      // Limiter le nombre de toasts
      const newToasts = [
        { 
          id: toastId, 
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          notificationId: notification._id
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

  // Détecter les nouvelles notifications et afficher les toasts
  useEffect(() => {
    if (!enabled || !session?.user?.id || notifications.length === 0) return;

    // Trouver les nouvelles notifications non lues
    const previousIds = new Set(previousNotifications.current.map(n => n._id));
    const newNotifications = notifications.filter(
      n => !n.read && !previousIds.has(n._id) && n._id !== lastNotificationId.current
    );

    // Afficher les toasts pour les nouvelles notifications
    newNotifications.forEach((notification) => {
      lastNotificationId.current = notification._id;
      addToast(notification);

      // Notification du navigateur si autorisé
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/Logo.png',
          tag: notification._id,
        });
      }
    });

    // Mettre à jour la référence des notifications précédentes
    previousNotifications.current = notifications;
  }, [notifications, enabled, session, addToast]);

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
    notifications,
    requestBrowserPermission,
  };
}

export default useRealtimeNotifications;
