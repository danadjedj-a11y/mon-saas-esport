import React from 'react';

/**
 * Composant pour afficher une bannière quand l'utilisateur est hors ligne
 */
export default function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600/90 backdrop-blur-sm border-b border-red-500 px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <span className="text-white text-sm font-semibold font-body">
            Hors ligne
          </span>
          <span className="text-white/90 text-xs sm:text-sm font-body">
            Certaines fonctionnalités peuvent être limitées.
          </span>
        </div>
      </div>
    </div>
  );
}
