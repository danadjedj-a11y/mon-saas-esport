import React from 'react';
import GameRoundItem from './GameRoundItem';

/**
 * Liste des manches Best-of-X
 */
export default function GameRoundsList({
  tournamentBestOf,
  matchGames,
  match,
  isTeam1,
  myTeamId,
  isAdmin,
  isMatchCompleted,
  tournamentMapsPool,
  vetos,
  onSubmitScore,
  onResolveConflict
}) {
  if (tournamentBestOf <= 1) return null;

  return (
    <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5 mt-5">
      <h3 className="font-display text-xl text-white mt-0 mb-4">
        🎮 Manches (Best-of-{tournamentBestOf})
      </h3>
      
      <div className="flex flex-col gap-4">
        {Array.from({ length: tournamentBestOf }, (_, i) => i + 1).map((gameNum) => {
          const game = matchGames.find(g => g.game_number === gameNum);
          
          return (
            <GameRoundItem
              key={gameNum}
              gameNum={gameNum}
              game={game}
              match={match}
              isTeam1={isTeam1}
              myTeamId={myTeamId}
              isAdmin={isAdmin}
              isMatchCompleted={isMatchCompleted}
              tournamentMapsPool={tournamentMapsPool}
              vetos={vetos}
              matchGames={matchGames}
              onSubmitScore={onSubmitScore}
              onResolveConflict={onResolveConflict}
            />
          );
        })}
      </div>
    </div>
  );
}
