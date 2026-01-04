import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function NotificationCenter({ session }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications();

    // Abonnement temps réel aux notifications
    const channel = supabase
      .channel(`notifications-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

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

  const fetchNotifications = async () => {
    if (!session?.user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erreur chargement notifications:', error);
    } else {
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    }
    setLoading(false);
  };

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

  const getIcon = (type) => {
    switch (type) {
      case 'match_upcoming':
        return '⏰';
      case 'match_result':
        return '🏆';
      case 'admin_message':
        return '📢';
      case 'tournament_update':
        return '📊';
      case 'team_invite':
        return '👥';
      case 'score_dispute':
        return '⚠️';
      case 'comment_like':
        return '👍';
      case 'comment_reply':
        return '💬';
      default:
        return '🔔';
    }
  };

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
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bouton avec badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'transparent',
          border: '1px solid #444',
          borderRadius: '8px',
          padding: '8px 12px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#e74c3c',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '10px',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            width: '400px',
            maxHeight: '500px',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 1000
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '15px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>🔔 Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#3498db',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: '5px 10px'
                }}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Liste des notifications */}
          <div>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                Aucune notification
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '15px',
                    borderBottom: '1px solid #2a2a2a',
                    cursor: 'pointer',
                    background: notification.is_read ? 'transparent' : '#2a2a2a',
                    position: 'relative',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (notification.is_read) {
                      e.currentTarget.style.background = '#222';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (notification.is_read) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                      {getIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: notification.is_read ? 'normal' : 'bold',
                          fontSize: '0.95rem',
                          marginBottom: '5px',
                          color: 'white'
                        }}
                      >
                        {notification.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: '#aaa',
                          marginBottom: '5px',
                          lineHeight: '1.4'
                        }}
                      >
                        {notification.message}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#666'
                        }}
                      >
                        {formatTime(notification.created_at)}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          background: '#3498db',
                          borderRadius: '50%',
                          flexShrink: 0,
                          marginTop: '5px'
                        }}
                      />
                    )}
                    <button
                      onClick={(e) => deleteNotification(notification.id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '5px',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => e.target.style.color = '#e74c3c'}
                      onMouseLeave={(e) => e.target.style.color = '#666'}
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

