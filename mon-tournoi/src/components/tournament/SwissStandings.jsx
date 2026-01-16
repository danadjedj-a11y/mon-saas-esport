import React from 'react';

/**
 * Tableau de classement pour le système Swiss
 */
export default function SwissStandings({ 
  swissScores, 
  participants, 
  isOwner, 
  tournamentStatus,
  onGenerateNextRound 
}) {
  if (!swissScores || swissScores.length === 0) return null;

  const standings = [...swissScores].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.buchholz_score !== a.buchholz_score) return b.buchholz_score - a.buchholz_score;
    return a.team_id.localeCompare(b.team_id);
  });

  return (
    <div className="mb-10 bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-2xl text-fluky-text m-0 border-b border-white/5 pb-3">
          🇨🇭 Classement Suisse
        </h2>
        {isOwner && tournamentStatus === 'ongoing' && onGenerateNextRound && (
          <button
            onClick={onGenerateNextRound}
            className="px-5 py-2.5 bg-blue-500 text-white border-none rounded-lg cursor-pointer font-bold transition-all hover:bg-blue-600"
          >
            ➕ Générer Round Suivant
          </button>
        )}
      </div>
      
      <table className="w-full border-collapse text-white">
        <thead>
          <tr className="bg-black/50 text-left">
            <th className="p-3">Rang</th>
            <th className="p-3">Équipe</th>
            <th className="p-3 text-center">Victoires</th>
            <th className="p-3 text-center">Défaites</th>
            <th className="p-3 text-center">Nuls</th>
            <th className="p-3 text-center">Buchholz</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((score, index) => {
            const team = participants.find(p => p.team_id === score.team_id);
            return (
              <tr key={score.id} className="border-b border-white/5">
                <td className={`p-3 ${index === 0 ? 'font-bold text-yellow-400' : 'text-white'}`}>
                  #{index + 1}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      loading="lazy"
                      src={team?.teams?.logo_url || `https://ui-avatars.com/api/?name=${team?.teams?.tag || '?'}`}
                      className="w-6 h-6 rounded-full"
                      alt=""
                    />
                    <span className="font-body">{team?.teams?.name || 'Inconnu'}</span>
                  </div>
                </td>
                <td className="p-3 text-center text-green-400 font-bold">{score.wins}</td>
                <td className="p-3 text-center text-red-400">{score.losses}</td>
                <td className="p-3 text-center text-yellow-400">{score.draws}</td>
                <td className="p-3 text-center text-blue-400">
                  {parseFloat(score.buchholz_score || 0).toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
