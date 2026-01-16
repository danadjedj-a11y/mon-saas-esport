import React from 'react';

/**
 * Tableau de classement pour le format Round Robin
 */
export default function RoundRobinStandings({ participants, matches }) {
  if (!participants || !matches) return null;

  // Calculer les statistiques pour chaque équipe
  const stats = participants.map(p => ({
    ...p,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    goalDiff: 0
  }));

  matches.filter(m => m.status === 'completed').forEach(m => {
    const p1 = stats.find(p => p.team_id === m.player1_id);
    const p2 = stats.find(p => p.team_id === m.player2_id);
    if (!p1 || !p2) return;

    p1.played++;
    p2.played++;
    
    const diff = (m.score_p1 || 0) - (m.score_p2 || 0);
    p1.goalDiff += diff;
    p2.goalDiff -= diff;

    if ((m.score_p1 || 0) > (m.score_p2 || 0)) {
      p1.wins++;
      p1.points += 3;
      p2.losses++;
    } else if ((m.score_p2 || 0) > (m.score_p1 || 0)) {
      p2.wins++;
      p2.points += 3;
      p1.losses++;
    } else {
      p1.draws++;
      p1.points++;
      p2.draws++;
      p2.points++;
    }
  });

  const standings = stats.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.goalDiff - a.goalDiff;
  });

  return (
    <div className="mb-10 bg-[#1a1a1a] rounded-2xl p-5 border border-white/20">
      <h2 className="border-b border-white/20 pb-2.5 mt-0 text-white font-display text-xl">
        🏆 Classement
      </h2>
      
      <table className="w-full border-collapse text-white">
        <thead>
          <tr className="bg-[#252525] text-left">
            <th className="p-2.5">Rang</th>
            <th className="p-2.5">Équipe</th>
            <th className="p-2.5 text-center">Pts</th>
            <th className="p-2.5 text-center">J</th>
            <th className="p-2.5 text-center">V</th>
            <th className="p-2.5 text-center">N</th>
            <th className="p-2.5 text-center">D</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, index) => (
            <tr key={team.id} className="border-b border-white/10">
              <td className={`p-2.5 ${index === 0 ? 'text-yellow-400 font-bold' : 'text-white'}`}>
                #{index + 1}
              </td>
              <td className="p-2.5">
                <div className="flex items-center gap-2.5">
                  <img
                    loading="lazy"
                    src={team.teams?.logo_url || `https://ui-avatars.com/api/?name=${team.teams?.tag}`}
                    className="w-6 h-6 rounded-full"
                    alt=""
                  />
                  <span className="font-body">{team.teams?.name || 'Inconnu'}</span>
                </div>
              </td>
              <td className="p-2.5 text-center text-green-400 font-bold">{team.points}</td>
              <td className="p-2.5 text-center text-gray-400">{team.played}</td>
              <td className="p-2.5 text-center">{team.wins}</td>
              <td className="p-2.5 text-center">{team.draws}</td>
              <td className="p-2.5 text-center">{team.losses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
