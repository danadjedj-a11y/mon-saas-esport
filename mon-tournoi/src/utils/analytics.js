// Utilitaires pour l'analytics et le monitoring

/**
 * Configuration de l'analytics
 * Support pour Google Analytics et Plausible
 */
class Analytics {
  constructor() {
    this.gaId = import.meta.env.VITE_GA_ID;
    this.plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
    this.enabled = import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
    this.initialized = false;
  }

  /**
   * Initialiser l'analytics
   */
  init() {
    if (!this.enabled || this.initialized) return;

    // Google Analytics
    if (this.gaId) {
      this.initGoogleAnalytics();
    }

    // Plausible
    if (this.plausibleDomain) {
      this.initPlausible();
    }

    this.initialized = true;
  }

  /**
   * Initialiser Google Analytics
   */
  initGoogleAnalytics() {
    if (typeof window === 'undefined' || !window.gtag) {
      // Charger le script Google Analytics
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.gaId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', this.gaId, {
        page_path: window.location.pathname
      });
    }
  }

  /**
   * Initialiser Plausible
   */
  initPlausible() {
    if (typeof window === 'undefined' || window.plausible) return;

    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = this.plausibleDomain;
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
  }

  /**
   * Envoyer un événement
   */
  trackEvent(eventName, eventData = {}) {
    if (!this.enabled) return;

    // Google Analytics
    if (this.gaId && window.gtag) {
      window.gtag('event', eventName, eventData);
    }

    // Plausible
    if (this.plausibleDomain && window.plausible) {
      window.plausible(eventName, { props: eventData });
    }

    // Log en développement
    if (import.meta.env.DEV) {
      console.log('[Analytics]', eventName, eventData);
    }
  }

  /**
   * Suivre une page vue
   */
  trackPageView(path) {
    if (!this.enabled) return;

    // Google Analytics
    if (this.gaId && window.gtag) {
      window.gtag('config', this.gaId, {
        page_path: path
      });
    }

    // Plausible suit automatiquement les pages
  }

  /**
   * Événements prédéfinis
   */
  trackTournamentCreated(tournamentId, tournamentName) {
    this.trackEvent('tournament_created', {
      tournament_id: tournamentId,
      tournament_name: tournamentName
    });
  }

  trackTournamentJoined(tournamentId) {
    this.trackEvent('tournament_joined', {
      tournament_id: tournamentId
    });
  }

  trackMatchCompleted(matchId, tournamentId) {
    this.trackEvent('match_completed', {
      match_id: matchId,
      tournament_id: tournamentId
    });
  }

  trackCommentAdded(tournamentId) {
    this.trackEvent('comment_added', {
      tournament_id: tournamentId
    });
  }

  trackBadgeEarned(badgeId, badgeName) {
    this.trackEvent('badge_earned', {
      badge_id: badgeId,
      badge_name: badgeName
    });
  }
}

// Instance singleton
const analytics = new Analytics();

// Initialiser au chargement
if (typeof window !== 'undefined') {
  analytics.init();
}

export default analytics;

