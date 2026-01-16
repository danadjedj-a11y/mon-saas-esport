import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Skeleton from './components/Skeleton';
import { EmptyNotifications } from './components/EmptyState';
import useUIStore from './stores/uiStore';

export default function NotificationCenter({ session }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const lastNotificationIdRef = useRef(null);
  const notifiedIdsRef = useRef(new Set()); // IDs déjà notifiés (son/toast)
  const sessionStartRef = useRef(new Date().toISOString()); // Moment de connexion
  const addToast = useUIStore((state) => state.addToast);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
      
      // Marquer toutes les notifications existantes comme "déjà notifiées"
      // pour ne pas rejouer le son/toast au changement de page
      data.forEach(n => notifiedIdsRef.current.add(n.id));
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();

    console.log('🔔 Subscribing to notifications for user:', session.user.id);

    // Abonnement temps réel aux notifications - SANS filtre pour éviter les problèmes RLS
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('🔔 REALTIME event received:', payload);
          
          // Filtrer côté client pour ne traiter que nos notifications
          if (payload.eventType === 'INSERT' && payload.new?.user_id === session.user.id) {
            const newNotification = payload.new;
            
            // Éviter les doublons - vérifier si déjà notifié
            if (notifiedIdsRef.current.has(newNotification.id)) return;
            notifiedIdsRef.current.add(newNotification.id);
            
            // Ajouter la notification à la liste
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            
            // Afficher un toast en temps réel
            console.log('🔔 Showing toast...');
            addToast({
              message: `${getIconForType(newNotification.type)} ${newNotification.title}: ${newNotification.message}`,
              variant: getToastVariant(newNotification.type),
              duration: 6000,
            });

            // Jouer un son de notification
            console.log('🔔 Playing sound...');
            playNotificationSound();
            
            // Notification navigateur si autorisé
            showBrowserNotification(newNotification);
          } else if (payload.eventType === 'UPDATE' && payload.new?.user_id === session.user.id) {
            fetchNotifications();
          } else if (payload.eventType === 'DELETE' && payload.old?.user_id === session.user.id) {
            fetchNotifications();
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Channel subscription status:', status);
      });

    // FALLBACK: Polling toutes les 5 secondes si le Realtime ne marche pas
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_read', false)
        .gt('created_at', sessionStartRef.current) // Seulement les notifs créées APRÈS connexion
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data && data.length > 0) {
        for (const latestNotif of data) {
          // Vérifier si on n'a pas déjà notifié cette notification
          if (!notifiedIdsRef.current.has(latestNotif.id)) {
            console.log('🔔 New notification via polling:', latestNotif);
            notifiedIdsRef.current.add(latestNotif.id);
            
            setNotifications((prev) => {
              const exists = prev.some(n => n.id === latestNotif.id);
              if (exists) return prev;
              return [latestNotif, ...prev];
            });
            setUnreadCount((prev) => prev + 1);
            
            addToast({
              message: `${getIconForType(latestNotif.type)} ${latestNotif.title}: ${latestNotif.message}`,
              variant: getToastVariant(latestNotif.type),
              duration: 6000,
            });
            
            playNotificationSound();
            showBrowserNotification(latestNotif);
          }
        }
      }
    }, 5000); // Toutes les 5 secondes

    return () => {
      console.log('🔔 Unsubscribing from channel');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [session, fetchNotifications, addToast]);

  // Fonction pour obtenir l'icône selon le type
  const getIconForType = (type) => {
    switch (type) {
      case 'match_scheduled': return '📅';
      case 'match_upcoming': return '⏰';
      case 'match_result': return '🏆';
      case 'score_declared': return '📝';
      case 'score_dispute': return '⚠️';
      case 'admin_message': return '📢';
      case 'tournament_update': return '📊';
      case 'team_invite': return '👥';
      case 'team_invitation': return '👥';
      case 'comment_like': return '👍';
      case 'comment_reply': return '💬';
      default: return '🔔';
    }
  };

  // Fonction pour obtenir la variante du toast
  const getToastVariant = (type) => {
    switch (type) {
      case 'match_result': return 'success';
      case 'score_dispute': return 'error';
      case 'match_scheduled': return 'info';
      case 'match_upcoming': return 'warning';
      case 'score_declared': return 'warning';
      case 'team_invite': return 'info';
      case 'team_invitation': return 'info';
      default: return 'info';
    }
  };

  // Jouer un son de notification
  const playNotificationSound = () => {
    try {
      // Son de notification simple (beep)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Fréquence en Hz
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Could not play notification sound:', e);
    }
  };

  // Notification navigateur
  const showBrowserNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/Logo.png',
        tag: notification.id,
        requireInteraction: false,
      });
    }
  };

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', session.user.id);

    if (!error) {
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!session?.user) return;
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (!error) {
      const deleted = notifications.find(n => n.id === notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      if (deleted && !deleted.is_read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const getIcon = (type) => getIconForType(type);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (!session?.user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton avec badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-transparent border border-violet-500/30 rounded-lg px-3 py-2 text-white cursor-pointer text-xl flex items-center gap-2 hover:border-violet-400 hover:bg-violet-500/10 transition-all duration-300"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed top-16 left-4 lg:left-64 lg:ml-4 glass-card border-violet-500/30 w-[calc(100vw-2rem)] sm:w-96 max-h-[500px] overflow-y-auto shadow-glow-violet z-[100] animate-fadeIn">
          {/* Header */}
          <div className="p-4 border-b border-violet-500/20">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-display text-lg text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                🔔 Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="bg-transparent border-none text-cyan-400 cursor-pointer text-sm px-2 py-1 hover:text-cyan-300 transition-colors"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            {/* Bouton permission navigateur */}
            {'Notification' in window && Notification.permission === 'default' && (
              <button
                onClick={async () => {
                  const permission = await Notification.requestPermission();
                  if (permission === 'granted') {
                    addToast({
                      message: '✅ Notifications du navigateur activées !',
                      variant: 'success',
                    });
                  }
                }}
                className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 border border-violet-500/30 rounded-lg text-sm text-gray-300 hover:border-violet-400 transition-all flex items-center justify-center gap-2"
              >
                <span>🔔</span>
                Activer les notifications du navigateur
              </button>
            )}
            {'Notification' in window && Notification.permission === 'granted' && (
              <div className="mt-2 py-1.5 px-3 text-xs text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Notifications du navigateur activées
              </div>
            )}
          </div>

          {/* Liste des notifications */}
          <div>
            {loading ? (
              <div className="p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="mb-4">
                    <Skeleton variant="text" className="h-5 w-3/5 mb-2" />
                    <Skeleton variant="text" className="h-4 w-4/5 mb-1.5" />
                    <Skeleton variant="text" className="h-3 w-2/5" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-5">
                <EmptyNotifications />
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-violet-500/10 cursor-pointer relative transition-all duration-200 hover:bg-violet-500/10 ${
                    notification.is_read ? 'bg-transparent' : 'bg-violet-500/5'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <div className="text-2xl flex-shrink-0">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm mb-1 text-white ${notification.is_read ? 'font-normal' : 'font-bold'}`}>
                        {notification.title}
                      </div>
                      <div className="text-sm text-gray-400 mb-1.5 leading-relaxed">
                        {notification.message}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(notification.created_at)}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-1.5 animate-pulse" />
                    )}
                    <button
                      onClick={(e) => deleteNotification(notification.id, e)}
                      className="bg-transparent border-none text-gray-600 cursor-pointer text-base p-1 flex-shrink-0 hover:text-pink-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

