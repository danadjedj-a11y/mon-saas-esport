import React from 'react';
// Note: calculateMatchWinner peut être utilisé pour le calcul du gagnant
// import { calculateMatchWinner } from '../../bofUtils';

/**
 * Panneau admin avec détails avancés du match
 */
export default function AdminMatchDetails({
  match,
  matchGames,
  matchResult,
  tournamentBestOf,
  scoreReports
}) {
  return (
    <div className="mt-5 bg-purple-900/30 p-5 rounded-2xl border-2 border-purple-500">
      <h3 className="mt-0 text-purple-400 font-display">👑 Panneau Admin - Détails du Match</h3>
      
      {/* Informations générales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <InfoCard 
          label="Statut du match"
          value={match.status === 'completed' ? '✅ Terminé' : match.status === 'pending' ? '⏳ En attente' : '❌ Annulé'}
          color={match.status === 'completed' ? 'text-green-400' : match.status === 'pending' ? 'text-yellow-500' : 'text-red-400'}
        />
        <InfoCard 
          label="Statut des scores"
          value={match.score_status === 'confirmed' ? '✅ Confirmé' : match.score_status === 'disputed' ? '⚠️ Conflit' : '⏳ En attente'}
          color={match.score_status === 'confirmed' ? 'text-green-400' : match.score_status === 'disputed' ? 'text-red-400' : 'text-yellow-500'}
        />
        {tournamentBestOf > 1 && (
          <InfoCard 
            label="Format"
            value={`Best-of-${tournamentBestOf}`}
          />
        )}
        {matchResult && tournamentBestOf > 1 && (
          <InfoCard 
            label="Score global"
            value={`${matchResult.team1Wins} - ${matchResult.team2Wins}${matchResult.isCompleted ? ' ✅' : ''}`}
          />
        )}
      </div>

      {/* Détails des manches pour Best-of-X */}
      {tournamentBestOf > 1 && matchGames.length > 0 && (
        <div className="bg-[#1a1a1a] p-4 rounded-lg mb-4">
          <h4 className="mt-0 mb-2.5 text-sm text-gray-400">📊 Statut des manches</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {matchGames.map((game) => (
              <GameStatusCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}

      {/* Historique des rapports de manches */}
      {tournamentBestOf > 1 && matchGames.some(g => g.reported_by_team1 || g.reported_by_team2) && (
        <div className="bg-[#1a1a1a] p-4 rounded-lg mb-4">
          <h4 className="mt-0 mb-2.5 text-sm text-gray-400">📋 Historique des rapports de manches</h4>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
            {matchGames.map((game) => {
              if (!game.reported_by_team1 && !game.reported_by_team2) return null;
              
              return (
                <div key={game.id} className="bg-[#2a2a2a] p-2.5 rounded-md text-xs">
                  <div className="font-bold mb-1">Manche {game.game_number}</div>
                  <div className="text-gray-400">
                    {game.reported_by_team1 && (
                      <div>Team 1: {game.team1_score_reported ?? '?'} - {game.team2_score_reported ?? '?'}</div>
                    )}
                    {game.reported_by_team2 && (
                      <div>Team 2: {game.team2_score_reported ?? '?'} - {game.team1_score_reported ?? '?'}</div>
                    )}
                    {game.score_status === 'disputed' && (
                      <div className="text-red-400 mt-1">⚠️ Conflit détecté</div>
                    )}
                    {game.score_status === 'confirmed' && (
                      <div className="text-green-400 mt-1">✅ Confirmé: {game.team1_score} - {game.team2_score}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historique des déclarations (single game) */}
      {scoreReports.length > 0 && (
        <div className="bg-[#1a1a1a] p-4 rounded-lg">
          <h4 className="mt-0 mb-2.5 text-sm text-gray-400">📋 Historique des déclarations</h4>
          <div className="flex flex-col gap-2.5">
            {scoreReports.map((report) => (
              <div 
                key={report.id} 
                className={`p-2.5 rounded-md border text-sm ${
                  report.is_resolved 
                    ? 'bg-green-900/20 border-green-500 opacity-70' 
                    : 'bg-[#2a2a2a] border-white/30'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <strong>{report.teams?.name || 'Équipe'}</strong> a déclaré : 
                    <span className="ml-2.5 font-bold">{report.score_team} - {report.score_opponent}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(report.created_at).toLocaleString('fr-FR')}
                    {report.is_resolved && <span className="ml-2.5 text-green-400">✅ Résolu</span>}
                  </div>
                </div>
                {report.profiles?.username && (
                  <div className="text-xs text-gray-500 mt-1">Déclaré par {report.profiles.username}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-[#1a1a1a] p-3 rounded-lg">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`font-bold ${color}`}>{value}</div>
    </div>
  );
}

function GameStatusCard({ game }) {
  const isConfirmed = game.score_status === 'confirmed';
  const hasConflict = game.score_status === 'disputed';
  
  return (
    <div className={`p-2.5 rounded-md border text-sm ${
      isConfirmed ? 'bg-green-900/20 border-green-500' : 
      hasConflict ? 'bg-red-900/20 border-red-500' : 
      'bg-[#2a2a2a] border-white/30'
    }`}>
      <div className="font-bold mb-1">Manche {game.game_number}</div>
      <div className="text-xs text-gray-400">
        {isConfirmed ? (
          <span className="text-green-400">✅ {game.team1_score} - {game.team2_score}</span>
        ) : hasConflict ? (
          <span className="text-red-400">⚠️ Conflit</span>
        ) : game.reported_by_team1 && game.reported_by_team2 ? (
          <span className="text-yellow-500">⏳ En validation</span>
        ) : (
          <span className="text-gray-500">⏳ En attente</span>
        )}
      </div>
      {game.map_name && (
        <div className="text-gray-500 text-xs mt-1">🗺️ {game.map_name}</div>
      )}
    </div>
  );
}
