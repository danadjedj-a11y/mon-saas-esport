import { useEffect } from 'react';
import clsx from 'clsx';

/**
 * Composant Toast pour afficher des notifications
 * Variants: success, error, warning, info
 */
const Toast = ({ 
  id,
  message, 
  variant = 'info', 
  duration = 5000,
  onClose 
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const variantStyles = {
    success: {
      bg: 'bg-green-500/20',
      border: 'border-green-500',
      text: 'text-green-400',
      icon: '✅',
    },
    error: {
      bg: 'bg-red-500/20',
      border: 'border-red-500',
      text: 'text-red-400',
      icon: '❌',
    },
    warning: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500',
      text: 'text-yellow-400',
      icon: '⚠️',
    },
    info: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500',
      text: 'text-blue-400',
      icon: 'ℹ️',
    },
  };

  const styles = variantStyles[variant] || variantStyles.info;

  return (
    <div
      className={clsx(
        'min-w-[300px] max-w-md rounded-lg border-2 p-4 shadow-lg backdrop-blur-sm animate-pulse',
        styles.bg,
        styles.border,
        styles.text
      )}
      role="alert"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{styles.icon}</span>
          <p className="font-body text-sm">{message}</p>
        </div>
        <button
          onClick={() => onClose(id)}
          className="text-current hover:opacity-70 transition-opacity p-1 text-lg leading-none"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Toast;
