import React from 'react';
import Toast from './Toast';
import useUIStore from '../../../stores/uiStore';

/**
 * Container pour afficher les toasts depuis le store
 * Utilise aria-live pour annoncer les notifications aux lecteurs d'écran
 */
const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();

  // Toujours rendre le container pour aria-live
  return (
    <div 
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions removals"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            id={toast.id}
            message={toast.message}
            variant={toast.variant || 'info'}
            duration={toast.duration}
            onClose={removeToast}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
