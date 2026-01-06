// Utilitaires pour le monitoring des erreurs

/**
 * Configuration du monitoring
 * Support pour Sentry et console logging
 * 
 * Note: Sentry est optionnel. Si le package @sentry/react n'est pas installé,
 * le monitoring fonctionnera toujours mais sans l'intégration Sentry.
 */
class Monitoring {
  constructor() {
    this.sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    this.enabled = import.meta.env.VITE_MONITORING_ENABLED === 'true';
    this.initialized = false;
    this.sentryInitialized = false; // Flag spécifique pour Sentry
    this.errorQueue = [];
    this.sentryAvailable = false; // Flag pour savoir si Sentry est disponible
  }

  /**
   * Initialiser le monitoring
   */
  async init() {
    if (!this.enabled || this.initialized) return;

    // Sentry
    if (this.sentryDsn) {
      await this.initSentry();
    }

    // Écouter les erreurs globales
    this.setupErrorHandlers();

    this.initialized = true;

    // Envoyer les erreurs en queue
    this.flushErrorQueue();
  }

  /**
   * Initialiser Sentry
   */
  async initSentry() {
    // Protection contre la double initialisation
    if (this.sentryInitialized) {
      if (import.meta.env.DEV) {
        console.warn('[Monitoring] Sentry déjà initialisé, skip.');
      }
      return;
    }

    // Vérifier si Sentry est déjà initialisé globalement
    if (typeof window !== 'undefined' && window.Sentry && window.Sentry.getClient()) {
      if (import.meta.env.DEV) {
        console.warn('[Monitoring] Sentry déjà initialisé globalement, skip.');
      }
      this.sentryAvailable = true;
      this.sentryInitialized = true;
      return;
    }

    if (!this.sentryDsn) {
      if (import.meta.env.DEV) {
        console.info('[Monitoring] VITE_SENTRY_DSN non configuré. Sentry désactivé.');
      }
      return; // Pas de DSN configuré, on skip
    }

    try {
      // Charger Sentry dynamiquement (optionnel)
      // Charger Sentry via le loader qui gère l'import optionnel
      const { loadSentry } = await import('./sentryLoader.js');
      const Sentry = await loadSentry();
      
      if (!Sentry) {
        if (import.meta.env.DEV) {
          console.error('[Monitoring] ❌ Sentry package non trouvé.');
          console.error('[Monitoring] Vérifiez que @sentry/react est installé : npm install @sentry/react');
          console.error('[Monitoring] Vérifiez aussi que le serveur a été redémarré après l\'installation.');
        }
        return;
      }
      
      if (typeof Sentry.init !== 'function') {
        if (import.meta.env.DEV) {
          console.error('[Monitoring] ❌ Sentry.init n\'est pas une fonction.');
          console.error('[Monitoring] Structure du module:', Object.keys(Sentry));
          console.error('[Monitoring] Version incompatible ? Vérifiez la version de @sentry/react');
        }
        return;
      }
      
      // Vérifier une dernière fois avant d'initialiser
      if (Sentry.getClient && Sentry.getClient()) {
        if (import.meta.env.DEV) {
          console.warn('[Monitoring] Sentry client déjà existant, skip.');
        }
        this.sentryAvailable = true;
        this.sentryInitialized = true;
        return;
      }
      
      // Initialiser Sentry
      // Sentry v10 utilise des exports nommés
      const initConfig = {
        dsn: this.sentryDsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1, // 10% des transactions
        replaysSessionSampleRate: 0.1, // 10% des sessions
        replaysOnErrorSampleRate: 1.0, // 100% des erreurs
      };

      // Ajouter les intégrations si disponibles
      // En développement, désactiver replayIntegration pour éviter les conflits avec StrictMode
      if (Sentry.browserTracingIntegration) {
        initConfig.integrations = [
          Sentry.browserTracingIntegration()
        ];
        // Ajouter replayIntegration seulement si on n'est pas en mode développement strict
        if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_SENTRY_REPLAY === 'true') {
          initConfig.integrations.push(Sentry.replayIntegration());
        }
      } else if (Sentry.BrowserTracing && Sentry.Replay) {
        // Ancienne API (v7)
        initConfig.integrations = [
          new Sentry.BrowserTracing()
        ];
        if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_SENTRY_REPLAY === 'true') {
          initConfig.integrations.push(new Sentry.Replay());
        }
      }

      Sentry.init(initConfig);
      
      // Stocker Sentry globalement pour éviter les doubles initialisations
      if (typeof window !== 'undefined') {
        window.Sentry = Sentry;
      }
      
      this.sentryAvailable = true;
      this.sentryInitialized = true;
      if (import.meta.env.DEV) {
        console.info('[Monitoring] ✅ Sentry initialisé avec succès');
      }
    } catch (error) {
      // Erreur lors de l'initialisation
      if (import.meta.env.DEV) {
        console.error('[Monitoring] ❌ Erreur initialisation Sentry:', error);
      }
    }
  }

  /**
   * Configurer les handlers d'erreur
   */
  setupErrorHandlers() {
    // Erreurs JavaScript non capturées
    window.addEventListener('error', (event) => {
      this.captureError(event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Promesses rejetées non capturées
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        type: 'unhandledrejection'
      });
    });
  }

  /**
   * Capturer une erreur
   */
  captureError(error, context = {}) {
    const errorInfo = {
      message: error?.message || error,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Log en développement
    if (import.meta.env.DEV) {
      console.error('[Monitoring] Erreur capturée:', errorInfo);
    }

    // Sentry (si disponible)
    if (this.sentryDsn && this.sentryAvailable && window.Sentry) {
      try {
        window.Sentry.captureException(error, {
          contexts: {
            custom: context
          }
        });
      } catch (sentryError) {
        // Si Sentry échoue, on continue sans lui
        if (import.meta.env.DEV) {
          console.warn('[Monitoring] Erreur Sentry:', sentryError);
        }
      }
    } else if (this.sentryDsn && !this.sentryAvailable) {
      // Mettre en queue si Sentry n'est pas encore initialisé
      this.errorQueue.push(errorInfo);
    }

    // Envoyer à un endpoint personnalisé si nécessaire
    this.sendToCustomEndpoint(errorInfo);
  }

  /**
   * Envoyer les erreurs en queue
   */
  flushErrorQueue() {
    if (!this.sentryAvailable || this.errorQueue.length === 0) return;

    this.errorQueue.forEach(errorInfo => {
      if (window.Sentry) {
        window.Sentry.captureException(new Error(errorInfo.message), {
          contexts: {
            custom: errorInfo.context
          }
        });
      }
    });

    this.errorQueue = [];
  }

  /**
   * Envoyer à un endpoint personnalisé
   */
  async sendToCustomEndpoint(errorInfo) {
    const endpoint = import.meta.env.VITE_ERROR_ENDPOINT;
    if (!endpoint) return;

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorInfo)
      });
    } catch (error) {
      console.warn('Impossible d\'envoyer l\'erreur:', error);
    }
  }

  /**
   * Capturer un message d'information
   */
  captureMessage(message, level = 'info', context = {}) {
    if (import.meta.env.DEV) {
      console.log(`[Monitoring ${level}]`, message, context);
    }

    if (this.sentryDsn && this.sentryAvailable && window.Sentry) {
      window.Sentry.captureMessage(message, {
        level,
        contexts: {
          custom: context
        }
      });
    }
  }

  /**
   * Ajouter du contexte utilisateur
   */
  setUser(user) {
    // Si user est null ou undefined, on déconnecte l'utilisateur de Sentry
    if (!user) {
      if (this.sentryDsn && this.sentryAvailable && window.Sentry) {
        window.Sentry.setUser(null);
      }
      if (import.meta.env.DEV) {
        console.log('[Monitoring] User context cleared');
      }
      return;
    }

    // Vérifier que user a au moins un id
    if (!user.id) {
      if (import.meta.env.DEV) {
        console.warn('[Monitoring] setUser appelé avec un user sans id:', user);
      }
      return;
    }

    if (this.sentryDsn && this.sentryAvailable && window.Sentry) {
      window.Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username
      });
    }
    // Toujours logger en développement
    if (import.meta.env.DEV) {
      console.log('[Monitoring] User context:', user);
    }
  }

  /**
   * Ajouter du contexte personnalisé
   */
  setContext(name, context) {
    if (this.sentryDsn && this.sentryAvailable && window.Sentry) {
      window.Sentry.setContext(name, context);
    }
    // Toujours logger en développement
    if (import.meta.env.DEV) {
      console.log(`[Monitoring] Context ${name}:`, context);
    }
  }
}

// Instance singleton
const monitoring = new Monitoring();

// NE PAS initialiser automatiquement ici
// L'initialisation se fait dans App.jsx pour éviter les doubles initialisations
// avec React StrictMode

export default monitoring;
