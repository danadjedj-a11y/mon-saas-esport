/**
 * Chargeur optionnel pour Sentry
 * Ce fichier permet de charger Sentry de manière conditionnelle
 * sans que Vite essaie de résoudre le package au build
 */

/**
 * Charge Sentry de manière dynamique
 * Retourne null si le package n'est pas installé
 */
export async function loadSentry() {
  try {
    // Essayer d'importer Sentry directement
    // Utiliser import * as pour éviter les problèmes CommonJS
    // @ts-ignore - Package optionnel
    const sentryModule = await import('@sentry/react');
    
    if (import.meta.env.DEV) {
      console.log('[Sentry Loader] ✅ Module chargé avec succès');
      console.log('[Sentry Loader] Clés disponibles:', Object.keys(sentryModule).slice(0, 15));
      console.log('[Sentry Loader] init existe ?', !!sentryModule.init);
      console.log('[Sentry Loader] Type de init:', typeof sentryModule.init);
    }
    
    // Sentry v10 exporte directement init, browserTracingIntegration, etc.
    if (sentryModule.init && typeof sentryModule.init === 'function') {
      // Export nommé direct (Sentry v10)
      if (import.meta.env.DEV) {
        console.log('[Sentry Loader] ✅ Utilisation des exports nommés (Sentry v10)');
      }
      return sentryModule;
    }
    
    // Vérifier si c'est dans default (anciennes versions)
    if (sentryModule.default) {
      const defaultExport = sentryModule.default;
      if (defaultExport.init && typeof defaultExport.init === 'function') {
        if (import.meta.env.DEV) {
          console.log('[Sentry Loader] ✅ Utilisation de default export');
        }
        return defaultExport;
      }
      // Parfois default contient directement les exports
      if (typeof defaultExport === 'object' && defaultExport.init) {
        return defaultExport;
      }
    }
    
    // Si on arrive ici, le module est invalide
    if (import.meta.env.DEV) {
      console.error('[Sentry Loader] ❌ Module Sentry invalide.');
      console.error('[Sentry Loader] Structure complète:', Object.keys(sentryModule));
      console.error('[Sentry Loader] Type de init:', typeof sentryModule.init);
    }
    return null;
  } catch (error) {
    // Le package n'est pas installé ou erreur d'import
    if (import.meta.env.DEV) {
      console.error('[Sentry Loader] ❌ Erreur import Sentry:', error.message);
      console.error('[Sentry Loader] Type d\'erreur:', error.name);
      if (error.stack) {
        console.error('[Sentry Loader] Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
      }
    }
    return null;
  }
}
