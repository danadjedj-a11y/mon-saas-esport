import React from 'react';
import { getMapForGame } from '../../bofUtils';

/**
 * Affiche une manche Best-of-X avec ses contrôles
 */
export default function GameRoundItem({
  gameNum,
  game,
  match,
  isTeam1,
  isAdmin,
  isMatchCompleted,
  tournamentMapsPool,
  vetos,
  matchGames,
  onSubmitScore,
  onResolveConflict
}) {
  const isCompleted = game?.status === 'completed';
  const isConfirmed = game?.score_status === 'confirmed';
  const hasConflict = game?.score_status === 'disputed';
  const gameReportedByMe = isTeam1 ? game?.reported_by_team1 : game?.reported_by_team2;
  const mapName = game?.map_name || getMapForGame(matchGames, gameNum, tournamentMapsPool, vetos) || `Manche ${gameNum}`;

  const handleSubmit = () => {
    const myScore = parseInt(document.getElementById(`game-${gameNum}-my`)?.value) || 0;
    const oppScore = parseInt(document.getElementById(`game-${gameNum}-opp`)?.value) || 0;
    onSubmitScore(gameNum, myScore, oppScore);
  };

  const handleResolve = () => {
    const score1 = parseInt(document.getElementById(`admin-game-${gameNum}-team1`)?.value) || 0;
    const score2 = parseInt(document.getElementById(`admin-game-${gameNum}-team2`)?.value) || 0;
    onResolveConflict(game.id, score1, score2);
  };

  return (
    <div 
      className={`p-4 rounded-lg ${
        isConfirmed ? 'bg-green-900/20 border border-green-500' : 
        (hasConflict ? 'bg-red-900/20 border border-red-500' : 
        'bg-[#030913]/60 border border-white/5')
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <strong className="font-body text-fluky-text">Manche {gameNum}</strong>
          {mapName && <span className="ml-3 text-sm text-fluky-text/70 font-body">🗺️ {mapName}</span>}
        </div>
        {isConfirmed && <span className="text-green-400 text-sm font-body">✅ Terminée</span>}
        {hasConflict && <span className="text-red-400 text-sm font-body">⚠️ Conflit</span>}
      </div>

      {/* Contenu conditionnel */}
      {hasConflict && isAdmin && game ? (
        // Admin: Résolution de conflit
        <div className="flex flex-col gap-2.5">
          <div className="text-red-400 text-sm mb-1 font-bold">⚠️ Conflit détecté. Résoudre :</div>
          <div className="flex gap-2.5 items-center justify-center">
            <input
              type="number"
              defaultValue={game.team1_score_reported || 0}
              id={`admin-game-${gameNum}-team1`}
              min="0"
              className="w-20 p-2 bg-white text-black border-2 border-red-400 rounded text-center font-bold"
            />
            <span className="text-xl font-bold">:</span>
            <input
              type="number"
              defaultValue={game.team2_score_reported || 0}
              id={`admin-game-${gameNum}-team2`}
              min="0"
              className="w-20 p-2 bg-white text-black border-2 border-red-400 rounded text-center font-bold"
            />
            <button
              onClick={handleResolve}
              className="px-4 py-2 bg-red-400 text-white border-none rounded cursor-pointer font-bold text-sm hover:bg-red-500"
            >
              ✅ Valider
            </button>
          </div>
          <div className="text-xs text-gray-400 text-center mt-1">
            Scores déclarés: {match.team1?.name} = {game.team1_score_reported || '-'}, {match.team2?.name} = {game.team2_score_reported || '-'}
          </div>
        </div>
      ) : isConfirmed && isCompleted && game ? (
        // Manche terminée
        <div className="flex justify-between items-center">
          <span className={`text-xl font-bold ${game.team1_score > game.team2_score ? 'text-green-400' : 'text-gray-400'}`}>
            {match.team1?.name}: {game.team1_score}
          </span>
          <span className="text-2xl">:</span>
          <span className={`text-xl font-bold ${game.team2_score > game.team1_score ? 'text-green-400' : 'text-gray-400'}`}>
            {game.team2_score} : {match.team2?.name}
          </span>
        </div>
      ) : hasConflict && !isAdmin && game ? (
        // Joueur: Conflit en attente
        <div className="text-red-400 text-sm text-center p-2.5">
          ⚠️ Conflit détecté. Les scores déclarés ne correspondent pas. Un administrateur doit intervenir.
        </div>
      ) : !isConfirmed && match.player1_id && match.player2_id && !gameReportedByMe && !isMatchCompleted ? (
        // Formulaire de déclaration
        <div className="flex flex-col gap-2.5">
          {game?.team1_score_reported != null && game?.team2_score_reported != null && (
            <div className="flex justify-between items-center mb-1 text-sm text-gray-400">
              <span>{game.team1_score_reported ?? '-'}</span>
              <span>:</span>
              <span>{game.team2_score_reported ?? '-'}</span>
            </div>
          )}
          <div className="flex gap-2.5 items-center justify-center">
            <input
              type="number"
              placeholder="Mon score"
              min="0"
              id={`game-${gameNum}-my`}
              className="w-20 p-2 bg-[#111] text-white border-2 border-yellow-500 rounded text-center"
            />
            <span>:</span>
            <input
              type="number"
              placeholder="Adverse"
              min="0"
              id={`game-${gameNum}-opp`}
              className="w-20 p-2 bg-[#111] text-white border-2 border-yellow-500 rounded text-center"
            />
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-yellow-500 text-black border-none rounded cursor-pointer font-bold hover:bg-yellow-400"
            >
              ✉️ Envoyer
            </button>
          </div>
          {gameReportedByMe && (
            <div className="text-xs text-green-400 text-center">✅ Score déclaré</div>
          )}
        </div>
      ) : (
        <div className="text-gray-400 text-sm">
          {gameReportedByMe ? '✅ Score déclaré, en attente de l\'adversaire...' : 'En attente...'}
        </div>
      )}
    </div>
  );
}
