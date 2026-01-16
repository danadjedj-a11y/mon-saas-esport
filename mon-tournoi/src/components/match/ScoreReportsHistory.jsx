import React from 'react';

/**
 * Historique des déclarations de score
 */
export default function ScoreReportsHistory({ reports, isAdmin }) {
  if (!reports || reports.length === 0) return null;

  return (
    <div className={`mt-5 ${isAdmin ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a]'} p-5 rounded-2xl border border-white/20`}>
      <h3 className="font-display text-fluky-text mt-0">📋 Historique des déclarations</h3>
      
      <div className="flex flex-col gap-2.5 mt-4">
        {reports.map((report) => (
          <div 
            key={report.id} 
            className={`p-3 rounded-lg border ${
              report.is_resolved 
                ? 'bg-green-900/20 border-green-500 opacity-70' 
                : 'bg-[#2a2a2a] border-white/30'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="font-body text-fluky-text">
                <strong>{report.teams?.name || 'Équipe'}</strong> a déclaré : 
                <span className="ml-2.5 text-xl font-bold">
                  {report.score_team} - {report.score_opponent}
                </span>
              </div>
              <div className="text-xs text-gray-400 font-body">
                {new Date(report.created_at).toLocaleString('fr-FR')}
                {report.is_resolved && (
                  <span className="ml-2.5 text-green-400">✅ Résolu</span>
                )}
              </div>
            </div>
            {report.profiles?.username && (
              <div className="text-xs text-gray-500 mt-1 font-body">
                Déclaré par {report.profiles.username}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
