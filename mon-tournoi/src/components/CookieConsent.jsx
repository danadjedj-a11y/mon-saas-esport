import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Fonction pour réouvrir le bandeau de cookies
 */
// eslint-disable-next-line react-refresh/only-export-components
export function openCookieSettings() {
  localStorage.removeItem('cookie_consent');
  window.location.reload();
}

/**
 * Hook pour vérifier si un type de cookie est accepté
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCookieConsent() {
  const [consent, setConsent] = useState({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem('cookie_consent');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConsent(data.preferences || {
          essential: true,
          analytics: false,
          marketing: false,
        });
      } catch (_e) {
        console.error('Erreur lecture consentement:', _e);
      }
    }
  }, []);

  return consent;
}

/**
 * CookieConsent - Bandeau de consentement cookies RGPD
 * 
 * Ce composant gère le consentement aux cookies conformément au RGPD.
 * Il doit être affiché sur toutes les pages jusqu'à ce que l'utilisateur fasse un choix.
 */
export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Toujours actif, ne peut pas être désactivé
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Vérifier si le consentement a déjà été donné
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Attendre un peu avant d'afficher le bandeau
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Charger les préférences existantes
      try {
        const savedPrefs = JSON.parse(consent);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreferences(savedPrefs.preferences || {
          essential: true,
          analytics: false,
          marketing: false,
        });
      } catch (_e) {
        console.error('Erreur lecture consentement:', _e);
      }
    }
  }, []);

  const saveConsent = (prefs) => {
    const consentData = {
      preferences: prefs,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    localStorage.setItem('cookie_consent', JSON.stringify(consentData));
    setIsVisible(false);

    // Appliquer les préférences (activer/désactiver les scripts analytics, etc.)
    applyPreferences(prefs);
  };

  const applyPreferences = (prefs) => {
    // Ici vous pouvez activer/désactiver vos scripts analytics
    if (prefs.analytics) {
      // Activer analytics (ex: Google Analytics, Plausible, etc.)
      console.log('Analytics activé');
    } else {
      // Désactiver analytics
      console.log('Analytics désactivé');
    }

    if (prefs.marketing) {
      // Activer cookies marketing
      console.log('Marketing activé');
    } else {
      console.log('Marketing désactivé');
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyEssential = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    setPreferences(onlyEssential);
    saveConsent(onlyEssential);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" />

      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6">
        <div className="max-w-4xl mx-auto bg-[#161b22] rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
          {/* Main content */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🍪</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  Nous respectons votre vie privée
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Nous utilisons des cookies pour améliorer votre expérience sur notre site. 
                  Certains cookies sont essentiels au fonctionnement du site, d'autres nous aident 
                  à comprendre comment vous l'utilisez.{' '}
                  <Link to="/legal/privacy" className="text-cyan-400 hover:underline">
                    En savoir plus
                  </Link>
                </p>
              </div>
            </div>

            {/* Detailed preferences */}
            {showDetails && (
              <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
                {/* Essential */}
                <div className="flex items-start justify-between gap-4 p-4 bg-white/5 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      🔒 Cookies essentiels
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                        Toujours actifs
                      </span>
                    </h4>
                    <p className="text-gray-400 text-sm mt-1">
                      Nécessaires au fonctionnement du site (authentification, sécurité, préférences).
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-6 bg-green-500/30 rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-green-500 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <div className="flex items-start justify-between gap-4 p-4 bg-white/5 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-white">📊 Cookies analytiques</h4>
                    <p className="text-gray-400 text-sm mt-1">
                      Nous aident à comprendre comment vous utilisez le site pour l'améliorer.
                    </p>
                  </div>
                  <button
                    onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                    className={`flex-shrink-0 w-12 h-6 rounded-full flex items-center px-1 transition-colors ${
                      preferences.analytics ? 'bg-cyan-500/30 justify-end' : 'bg-gray-600 justify-start'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full transition-colors ${
                      preferences.analytics ? 'bg-cyan-500' : 'bg-gray-400'
                    }`} />
                  </button>
                </div>

                {/* Marketing */}
                <div className="flex items-start justify-between gap-4 p-4 bg-white/5 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-white">📢 Cookies marketing</h4>
                    <p className="text-gray-400 text-sm mt-1">
                      Utilisés pour personnaliser les publicités et mesurer leur efficacité.
                    </p>
                  </div>
                  <button
                    onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                    className={`flex-shrink-0 w-12 h-6 rounded-full flex items-center px-1 transition-colors ${
                      preferences.marketing ? 'bg-cyan-500/30 justify-end' : 'bg-gray-600 justify-start'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full transition-colors ${
                      preferences.marketing ? 'bg-cyan-500' : 'bg-gray-400'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {showDetails ? (
                <>
                  <button
                    onClick={handleSavePreferences}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Enregistrer mes préférences
                  </button>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                  >
                    Retour
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleAcceptAll}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Tout accepter
                  </button>
                  <button
                    onClick={handleRejectAll}
                    className="flex-1 px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                  >
                    Refuser les optionnels
                  </button>
                  <button
                    onClick={() => setShowDetails(true)}
                    className="px-6 py-3 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    Personnaliser
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Exposer globalement pour le footer
if (typeof window !== 'undefined') {
  window.openCookieSettings = openCookieSettings;
}
