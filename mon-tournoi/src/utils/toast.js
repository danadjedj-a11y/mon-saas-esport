// Système de Toast simple et léger
class ToastManager {
  constructor() {
    this.toasts = [];
    this.listeners = [];
    this.container = null;
    this.init();
  }

  init() {
    // Créer le conteneur de toasts s'il n'existe pas
    if (typeof document !== 'undefined' && !this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.toasts));
  }

  show(message, type = 'info', duration = 5000) {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };

    this.toasts.push(toast);
    this.notify();
    this.renderToast(toast);

    // Supprimer automatiquement après la durée spécifiée
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  renderToast(toast) {
    if (!this.container) return;

    const toastElement = document.createElement('div');
    toastElement.id = `toast-${toast.id}`;
    
    const colors = {
      success: { bg: '#27ae60', icon: '✅' },
      error: { bg: '#e74c3c', icon: '❌' },
      warning: { bg: '#f39c12', icon: '⚠️' },
      info: { bg: '#3498db', icon: 'ℹ️' }
    };

    const style = colors[toast.type] || colors.info;

    toastElement.style.cssText = `
      background: ${style.bg};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      max-width: 500px;
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      font-family: Arial, sans-serif;
      font-size: 0.95rem;
    `;

    // Ajouter l'animation CSS si elle n'existe pas
    if (!document.getElementById('toast-animations')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'toast-animations';
      styleSheet.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }

    toastElement.innerHTML = `
      <span style="font-size: 1.2rem;">${style.icon}</span>
      <span style="flex: 1;">${this.escapeHtml(toast.message)}</span>
      <button 
        style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          line-height: 1;
        "
        onclick="this.parentElement.remove()"
      >×</button>
    `;

    this.container.appendChild(toastElement);
  }

  remove(id) {
    const toastElement = document.getElementById(`toast-${id}`);
    if (toastElement) {
      toastElement.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, 300);
    }

    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Instance singleton
const toastManager = new ToastManager();

// API simple pour utiliser dans les composants
export const toast = {
  success: (message, duration) => toastManager.success(message, duration),
  error: (message, duration) => toastManager.error(message, duration),
  warning: (message, duration) => toastManager.warning(message, duration),
  info: (message, duration) => toastManager.info(message, duration),
  show: (message, type, duration) => toastManager.show(message, type, duration),
};

export default toast;

