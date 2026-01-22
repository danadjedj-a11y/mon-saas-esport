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
    // @ts-ignore - Package optionnel
    const sentryModule = await import('@sentry/react');
    
    // Sentry v10 exporte directement init, browserTracingIntegration, etc.
    if (sentryModule.init && typeof sentryModule.init === 'function') {
      return sentryModule;
    }
    
    // Vérifier si c'est dans default (anciennes versions)
    if (sentryModule.default) {
      const defaultExport = sentryModule.default;
      if (defaultExport.init && typeof defaultExport.init === 'function') {
        return defaultExport;
      }
      if (typeof defaultExport === 'object' && defaultExport.init) {
        return defaultExport;
      }
    }
    
    return null;
  } catch {
    // Le package n'est pas installé
    return null;
  }
}
