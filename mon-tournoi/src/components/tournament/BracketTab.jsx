import MatchCard from './MatchCard';

// Composant pour le classement Round Robin
function RoundRobinStandings({ standings }) {
  return (
    <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/30">
      <h2 className="mt-0 text-fluky-accent font-handwriting text-3xl mb-6">
        🏆 Classement
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-fluky-text">
          <thead>
            <tr className="bg-fluky-primary/30 text-left border-b-2 border-fluky-accent">
              <th className="p-3 rounded-tl font-handwriting text-fluky-accent">Rang</th>
              <th className="p-3 font-handwriting text-fluky-accent">Équipe</th>
              <th className="p-3 text-center font-handwriting text-fluky-accent">Pts</th>
              <th className="p-3 text-center font-handwriting text-fluky-accent">J</th>
              <th className="p-3 text-center font-handwriting text-fluky-accent">V</th>
              <th className="p-3 text-center font-handwriting text-fluky-accent">N</th>
              <th className="p-3 text-center rounded-tr font-handwriting text-fluky-accent">D</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, index) => (
              <tr key={team.id} className="border-b border-fluky-accent/30">
                <td className={`p-3 font-display text-lg ${index === 0 ? 'font-bold text-fluky-accent' : 'text-fluky-text'}`}>
                  #{index + 1}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={team.teams?.logo_url || `https://ui-avatars.com/api/?name=${team.teams?.tag}`} 
                      className="w-8 h-8 rounded-full border-2 border-fluky-accent"
                      alt=""
                      loading="lazy"
                    />
                    <span className={`font-display ${index === 0 ? 'font-bold' : ''}`}>
                      {team.teams?.name}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-center font-bold text-xl text-fluky-accent font-handwriting">
                  {team.points}
                </td>
                <td className="p-3 text-center font-display">{team.played}</td>
                <td className="p-3 text-center font-display">{team.wins}</td>
                <td className="p-3 text-center font-display">{team.draws}</td>
                <td className="p-3 text-center font-display">{team.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
    <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/30 mb-10">
      <h2 className="mt-0 text-fluky-accent font-handwriting text-3xl mb-6">
        🇨🇭 Classement Suisse
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-white">
          <thead>
            <tr className="bg-fluky-primary/30 text-left border-b-2 border-fluky-accent">
              <th className="p-3 rounded-tl font-handwriting text-fluky-accent">Rang</th>
              <th className="p-3 font-handwriting text-fluky-accent">Équipe</th>
              <th className="p-3 text-center font-handwriting text-fluky-accent">Victoires</th>
              <th className="p-3 text-center font-handwriting text-fluky-accent">Défaites</th>
              <th className="p-3 text-center font-handwriting text-fluky-accent">Nuls</th>
              <th className="p-3 text-center rounded-tr font-handwriting text-fluky-accent">Buchholz</th>
            </tr>
          </thead>
          <tbody>
            {sortedScores.map((score, index) => {
              const team = participants.find(p => p.team_id === score.team_id);
              return (
                <tr key={score.id} className="border-b border-fluky-accent/30">
                  <td className={`p-3 font-display text-lg ${index === 0 ? 'font-bold text-fluky-accent' : 'text-fluky-text'}`}>
                    #{index + 1}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={team?.teams?.logo_url || `https://ui-avatars.com/api/?name=${team?.teams?.tag || '?'}`} 
                        className="w-8 h-8 rounded-full border-2 border-fluky-accent"
                        alt=""
                        loading="lazy"
                      />
                      <span className={`font-display ${index === 0 ? 'font-bold' : ''} text-fluky-text`}>
                        {team?.teams?.name || 'Inconnu'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center font-bold text-lg text-fluky-accent font-handwriting">
                    {score.wins}
                  </td>
                  <td className="p-3 text-center font-display text-fluky-text">{score.losses}</td>
                  <td className="p-3 text-center font-display text-fluky-text">{score.draws}</td>
                  <td className="p-3 text-center font-bold text-fluky-accent font-handwriting">
                    {parseFloat(score.buchholz_score || 0).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Composant pour afficher les rounds
function BracketRounds({ matches, title, bracketFilter }) {
  const filteredMatches = bracketFilter 
    ? matches.filter(m => m.bracket_type === bracketFilter)
    : matches;

  const rounds = [...new Set(filteredMatches.map(m => m.round_number))].sort();

  return (
    <div className="flex gap-10 pb-5 min-w-fit">
      {rounds.map(round => (
        <div key={round} className="flex flex-col justify-around gap-5">
          <h4 className="text-center text-fluky-text mb-4 font-display">
            {title ? `${title} ` : ''}Round {round}
          </h4>
          {filteredMatches.filter(m => m.round_number === round).map(m => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Composant principal
export default function BracketTab({ tournoi, matches, swissScores, participants, getStandings }) {
  const emptyState = (
    <div className="text-center p-12 border-2 border-dashed border-fluky-accent rounded-lg bg-fluky-bg/50 text-fluky-text font-display">
      L'arbre apparaîtra une fois le tournoi lancé.
    </div>
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
          <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/30 overflow-x-auto">
            <h2 className="mt-0 text-fluky-accent font-handwriting text-3xl mb-6">
              🇨🇭 Rounds
            </h2>
            <BracketRounds 
              matches={matches.filter(m => m.bracket_type === 'swiss')} 
              title="🇨🇭"
              bracketFilter={null}
            />
          </div>
        )}
      </div>
    );
  }

  // Double Elimination
  if (tournoi.format === 'double_elimination') {
    if (matches.length === 0) {
      return (
        <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/30">
          <h2 className="mt-0 text-fluky-accent font-handwriting text-3xl mb-6">
            🏆 Arbre du Tournoi
          </h2>
          {emptyState}
        </div>
      );
    }

    const winnersMatches = matches.filter(m => m.bracket_type === 'winners');
    const losersMatches = matches.filter(m => m.bracket_type === 'losers');
    const grandFinals = matches.filter(m => !m.bracket_type && !m.is_reset);
    const resetMatch = matches.filter(m => m.is_reset && m.player1_id && m.player2_id);

    return (
      <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/30 overflow-x-auto">
        <h2 className="mt-0 text-fluky-accent font-handwriting text-3xl mb-6">
          🏆 Arbre du Tournoi
        </h2>
        <div className="flex gap-10 pb-5 min-w-fit">
          {/* Winners Bracket */}
          <div className="flex-1">
            <h3 className="text-center text-fluky-accent mb-5 font-handwriting text-2xl">
              🏆 Winners Bracket
            </h3>
            <BracketRounds matches={winnersMatches} bracketFilter={null} />
          </div>
          
          {/* Losers Bracket */}
          <div className="flex-1">
            <h3 className="text-center text-fluky-primary mb-5 font-handwriting text-2xl">
              💀 Losers Bracket
            </h3>
            <BracketRounds matches={losersMatches} bracketFilter={null} />
            
            {/* Grand Finals */}
            {grandFinals.length > 0 && (
              <div className="mt-10 pt-5 border-t-4 border-fluky-accent">
                <h3 className="text-center text-fluky-accent mb-5 font-handwriting text-2xl">
                  🏅 Grand Finals
                </h3>
                <div className="flex justify-center">
                  {grandFinals.map(m => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Reset Match */}
            {resetMatch.length > 0 && (
              <div className="mt-5 pt-5 border-t-4 border-fluky-accent">
                <h4 className="text-center text-fluky-orange mb-2.5 font-handwriting text-xl">
                  🔄 Reset Match
                </h4>
                <div className="flex justify-center">
                  {resetMatch.map(m => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Single Elimination (default)
  return (
    <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/30 overflow-x-auto">
      <h2 className="mt-0 text-fluky-accent font-handwriting text-3xl mb-6">
        🏆 Arbre du Tournoi
      </h2>
      {matches.length > 0 ? (
        <BracketRounds matches={matches} bracketFilter={null} />
      ) : (
        emptyState
      )}
    </div>
  );
}
