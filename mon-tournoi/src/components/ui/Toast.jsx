import React, { useEffect, useState } from 'react';

/**
 * Composant Toast pour les notifications en temps réel
 */
export function Toast({ 
  id,
  type = 'info', 
  title, 
  message, 
  icon,
  duration = 5000, 
  onClose,
  onClick 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animation d'entrée
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss après duration
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose?.(id);
    }, 300);
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/50 bg-green-500/10';
      case 'error':
        return 'border-red-500/50 bg-red-500/10';
      case 'warning':
        return 'border-orange-500/50 bg-orange-500/10';
      case 'match_upcoming':
        return 'border-cyan-500/50 bg-cyan-500/10';
      case 'match_result':
        return 'border-yellow-500/50 bg-yellow-500/10';
      case 'team_invite':
        return 'border-violet-500/50 bg-violet-500/10';
      case 'tournament_update':
        return 'border-pink-500/50 bg-pink-500/10';
      default:
        return 'border-violet-500/50 bg-violet-500/10';
    }
  };

  const getDefaultIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'match_upcoming':
        return '⏰';
      case 'match_result':
        return '🏆';
      case 'team_invite':
        return '👥';
      case 'tournament_update':
        return '📊';
      case 'comment_like':
        return '👍';
      case 'comment_reply':
        return '💬';
      case 'score_dispute':
        return '⚠️';
      case 'admin_message':
        return '📢';
      default:
        return '🔔';
    }
  };

  return (
    <div
      onClick={() => {
        onClick?.();
        handleClose();
      }}
      className={`
        relative w-96 max-w-[calc(100vw-2rem)] p-4 rounded-xl border backdrop-blur-xl
        shadow-lg shadow-black/20 cursor-pointer
        transform transition-all duration-300 ease-out
        ${getTypeStyles()}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      {/* Barre de progression */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-xl overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
            style={{
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      )}

      {/* Contenu */}
      <div className="flex gap-3 items-start">
        <span className="text-2xl flex-shrink-0">
          {icon || getDefaultIcon()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm font-semibold text-white mb-1">
            {title}
          </div>
          <div className="text-sm text-gray-300 leading-relaxed line-clamp-2">
            {message}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="text-gray-500 hover:text-white transition-colors p-1 -mr-1 -mt-1"
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/**
 * Conteneur pour les toasts
 */
export function ToastContainer({ toasts, removeToast, onToastClick }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            {...toast}
            onClose={removeToast}
            onClick={() => onToastClick?.(toast)}
          />
        </div>
      ))}
    </div>
  );
}

export default Toast;
