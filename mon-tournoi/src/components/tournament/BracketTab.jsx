import MatchCard from './MatchCard';
import { GlassCard } from '../../shared/components/ui';

// Composant pour le classement Round Robin
function RoundRobinStandings({ standings }) {
  return (
    <GlassCard className="p-8">
      <h2 className="mt-0 text-white font-bold text-2xl mb-6 flex items-center gap-2">
        <span className="text-3xl">🏆</span> Classement
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-white/10">
              <th className="pb-4 font-bold text-gray-400 text-sm uppercase tracking-wider">Rang</th>
              <th className="pb-4 font-bold text-gray-400 text-sm uppercase tracking-wider">Équipe</th>
              <th className="pb-4 text-center font-bold text-gray-400 text-sm uppercase tracking-wider">Pts</th>
              <th className="pb-4 text-center font-bold text-gray-400 text-sm uppercase tracking-wider">J</th>
              <th className="pb-4 text-center font-bold text-gray-400 text-sm uppercase tracking-wider">V</th>
              <th className="pb-4 text-center font-bold text-gray-400 text-sm uppercase tracking-wider">N</th>
              <th className="pb-4 text-center font-bold text-gray-400 text-sm uppercase tracking-wider">D</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, index) => (
              <tr key={team.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className={`py-4 text-lg ${index === 0 ? 'font-bold text-[#FFD700]' : 'text-gray-400'}`}>
                  #{index + 1}
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={team.teams?.logo_url || `https://ui-avatars.com/api/?name=${team.teams?.tag}`}
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10"
                      alt=""
                      loading="lazy"
                    />
                    <span className={`font-medium text-white ${index === 0 ? 'text-[#FFD700]' : ''}`}>
                      {team.teams?.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 text-center font-bold text-xl text-cyan-400 font-mono">
                  {team.points}
                </td>
                <td className="py-4 text-center text-gray-300 font-mono">{team.played}</td>
                <td className="py-4 text-center text-green-400 font-mono">{team.wins}</td>
                <td className="py-4 text-center text-gray-500 font-mono">{team.draws}</td>
                <td className="py-4 text-center text-red-400 font-mono">{team.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// Composant pour le classement Swiss
function SwissStandings({ swissScores, participants }) {
  if (!swissScores || swissScores.length === 0) return null;

  const sortedScores = [...swissScores].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.buchholz_score !== a.buchholz_score) return b.buchholz_score - a.buchholz_score;
    return a.team_id.localeCompare(b.team_id);
  });

  return (
    <GlassCard className="p-8 mb-10">
      <h2 className="mt-0 text-white font-bold text-2xl mb-6 flex items-center gap-2">
        <span className="text-3xl">🇨🇭</span> Classement Suisse
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-white/10">
              <th className="pb-4 font-bold text-gray-400 text-sm uppercase tracking-wider">Rang</th>
              <th className="pb-4 font-bold text-gray-400 text-sm uppercase tracking-wider">Équipe</th>
              <th className="pb-4 text-center font-bold text-gray-400 text-sm uppercase tracking-wider">V</th>
              <th className="pb-4 text-center font-bold text-gray-400 text-sm uppercase tracking-wider">D</th>
              <th className="pb-4 text-center font-bold text-gray-400 text-sm uppercase tracking-wider">Buchholz</th>
            </tr>
          </thead>
          <tbody>
            {sortedScores.map((score, index) => {
              const team = participants.find(p => p.team_id === score.team_id);
              return (
                <tr key={score.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className={`py-4 text-lg ${index === 0 ? 'font-bold text-[#FFD700]' : 'text-gray-400'}`}>
                    #{index + 1}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={team?.teams?.logo_url || `https://ui-avatars.com/api/?name=${team?.teams?.tag || '?'}`}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10"
                        alt=""
                        loading="lazy"
                      />
                      <span className={`font-medium text-white ${index === 0 ? 'text-[#FFD700]' : ''}`}>
                        {team?.teams?.name || 'Inconnu'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-center font-bold text-lg text-green-400 font-mono">
                    {score.wins}
                  </td>
                  <td className="py-4 text-center text-red-400 font-mono">{score.losses}</td>
                  <td className="py-4 text-center font-bold text-cyan-400 font-mono">
                    {parseFloat(score.buchholz_score || 0).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// Composant pour afficher les rounds
function BracketRounds({ matches, title, bracketFilter }) {
  const filteredMatches = bracketFilter
    ? matches.filter(m => m.bracket_type === bracketFilter)
    : matches;

  const rounds = [...new Set(filteredMatches.map(m => m.round_number))].sort((a, b) => a - b);

  return (
    <div className="flex gap-12 pb-8 min-w-fit px-4">
      {rounds.map(round => (
        <div key={round} className="flex flex-col gap-6 min-w-[280px]">
          <h4 className="text-center text-gray-400 mb-2 font-bold uppercase tracking-widest text-sm sticky left-0">
            {title ? `${title} ` : ''}Round {round}
          </h4>
          <div className="flex flex-col justify-around flex-grow gap-6">
            {filteredMatches.filter(m => m.round_number === round).map(m => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Composant principal
export default function BracketTab({ tournoi, matches, swissScores, participants, getStandings }) {
  const emptyState = (
    <GlassCard className="text-center p-12 flex flex-col items-center justify-center min-h-[300px]">
      <div className="text-6xl mb-6 opacity-30">🕸️</div>
      <h3 className="text-xl font-bold text-white mb-2">L'arbre est vide</h3>
      <p className="text-gray-400">Les matchs apparaîtront ici une fois le tournoi lancé.</p>
    </GlassCard>
  );

  // Round Robin
  if (tournoi.format === 'round_robin') {
    const standings = getStandings ? getStandings() : [];
    return <RoundRobinStandings standings={standings} />;
  }

  // Swiss
  if (tournoi.format === 'swiss') {
    return (
      <div>
        <SwissStandings swissScores={swissScores} participants={participants} />

        {matches.length > 0 && (
          <GlassCard className="p-8 overflow-x-auto">
            <h2 className="mt-0 text-white font-bold text-2xl mb-8 flex items-center gap-2">
              <span className="text-3xl">⚔️</span> Matchs
            </h2>
            <BracketRounds
              matches={matches.filter(m => m.bracket_type === 'swiss')}
              title=""
              bracketFilter={null}
            />
          </GlassCard>
        )}
      </div>
    );
  }

  // Double Elimination
  if (tournoi.format === 'double_elimination') {
    if (matches.length === 0) return emptyState;

    const winnersMatches = matches.filter(m => m.bracket_type === 'winners');
    const losersMatches = matches.filter(m => m.bracket_type === 'losers');
    const grandFinals = matches.filter(m => !m.bracket_type && !m.is_reset);
    const resetMatch = matches.filter(m => m.is_reset && m.player1_id && m.player2_id);

    return (
      <GlassCard className="p-8 overflow-x-auto cursor-grab active:cursor-grabbing">
        <h2 className="mt-0 text-white font-bold text-2xl mb-8 flex items-center gap-2">
          <span className="text-3xl">🏆</span> Arbre du Tournoi
        </h2>

        <div className="flex gap-20 pb-5 min-w-fit">
          {/* Winners Bracket */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold text-sm mb-8 mx-4">
              🏆 WINNERS BRACKET
            </div>
            <BracketRounds matches={winnersMatches} bracketFilter={null} />
          </div>

          {/* Losers Bracket */}
          <div className="mt-32"> {/* Offset visually to separate */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-sm mb-8 mx-4">
              💀 LOSERS BRACKET
            </div>
            <BracketRounds matches={losersMatches} bracketFilter={null} />

            {/* Grand Finals */}
            {grandFinals.length > 0 && (
              <div className="mt-16 ml-8 pl-8 border-l border-white/10">
                <div className="text-center text-[#FFD700] mb-6 font-bold uppercase tracking-widest text-lg drop-shadow-glow">
                  🏅 Grand Finals
                </div>
                <div className="flex gap-8">
                  {grandFinals.map(m => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                  {resetMatch.map(m => (
                    <div key={m.id} className="relative">
                      <span className="absolute -top-6 left-0 right-0 text-center text-xs text-orange-500 font-bold">RESET?</span>
                      <MatchCard match={m} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    );
  }

  // Single Elimination (default)
  return (
    <GlassCard className="p-8 overflow-x-auto cursor-grab active:cursor-grabbing">
      <h2 className="mt-0 text-white font-bold text-2xl mb-8 flex items-center gap-2">
        <span className="text-3xl">⚡</span> Arbre Éliminatoire
      </h2>
      {matches.length > 0 ? (
        <BracketRounds matches={matches} bracketFilter={null} />
      ) : (
        emptyState
      )}
    </GlassCard>
  );
}
