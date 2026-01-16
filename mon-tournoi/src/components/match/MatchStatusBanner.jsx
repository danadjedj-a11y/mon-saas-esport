import React from 'react';

/**
 * Bannière d'état du match (conflit ou confirmé)
 */
export default function MatchStatusBanner({ hasConflict, isConfirmed }) {
  if (hasConflict) {
    return (
      <div className="bg-cyan-500/30 text-white p-4 rounded-lg mb-5 border-2 border-cyan-500">
        <strong className="font-body">⚠️ Conflit de scores détecté</strong>
        <p className="m-0 mt-1 text-sm font-body">
          Les deux équipes ont déclaré des scores différents. Intervention admin requise.
        </p>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="bg-violet-500/30 text-white p-4 rounded-lg mb-5 border-2 border-violet-500">
        <strong className="font-body">✅ Scores confirmés</strong>
        <p className="m-0 mt-1 text-sm font-body">
          Les scores ont été validés automatiquement.
        </p>
      </div>
    );
  }

  return null;
}
