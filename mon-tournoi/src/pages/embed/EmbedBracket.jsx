import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import clsx from 'clsx';

/**
 * EmbedBracket - Widget embedable du bracket
 * URL: /embed/tournament/:id/bracket
 */
export default function EmbedBracket() {
  const { id: tournamentId } = useParams();
  const [searchParams] = useSearchParams();

  // Options de personnalisation via query params
  const theme = searchParams.get('theme') || 'dark';
  const showHeader = searchParams.get('header') !== 'false';
  const compact = searchParams.get('compact') === 'true';

  // Convex queries
  const tournament = useQuery(api.tournaments.getById, { tournamentId });
  const rawMatches = useQuery(api.matches.listByTournament, { tournamentId }) ?? [];

  const loading = tournament === undefined || rawMatches === undefined;

  // Process matches - sort by round
  const matches = useMemo(() => {
    return [...rawMatches].sort((a, b) => (a.round || 1) - (b.round || 1));
  }, [rawMatches]);

  // Organiser par rounds
  const rounds = matches.reduce((acc, match) => {
    const roundNum = match.round || 1;
    if (!acc[roundNum]) acc[roundNum] = [];
    acc[roundNum].push(match);
    return acc;
  }, {});

  const bgColor = theme === 'light' ? 'bg-white' : 'bg-[#0d1117]';
  const textColor = theme === 'light' ? 'text-gray-900' : 'text-white';
  const borderColor = theme === 'light' ? 'border-gray-200' : 'border-white/10';
  const cardBg = theme === 'light' ? 'bg-gray-50' : 'bg-white/5';

  if (loading) {
    return (
      <div className={clsx('min-h-screen flex items-center justify-center', bgColor)}>
        <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={clsx('min-h-screen', bgColor, textColor)}>
      {/* Header */}
      {showHeader && (
        <div className={clsx('p-4 border-b', borderColor)}>
          <div className="flex items-center gap-3">
            {tournament?.logoUrl && (
              <img src={tournament.logoUrl} alt="" className="w-10 h-10 rounded-lg" />
            )}
            <div>
              <h1 className="font-bold">{tournament?.name}</h1>
              <p className="text-sm opacity-60">{tournament?.game}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bracket */}
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          {Object.entries(rounds).map(([roundNum, roundMatches]) => (
            <div key={roundNum} className="flex flex-col gap-4">
              <div className={clsx('text-sm font-medium opacity-60 text-center mb-2')}>
                Round {roundNum}
              </div>
              
              <div className="flex flex-col gap-4 justify-around flex-1">
                {roundMatches.map((match) => (
                  <div
                    key={match._id}
                    className={clsx(
                      'rounded-lg border overflow-hidden',
                      borderColor,
                      cardBg,
                      compact ? 'w-48' : 'w-56'
                    )}
                  >
                    {/* Team 1 */}
                    <div className={clsx(
                      'flex items-center justify-between p-2 border-b',
                      borderColor,
                      match.status === 'completed' && match.scoreP1 > match.scoreP2 && 'bg-green-500/10'
                    )}>
                      <div className="flex items-center gap-2 truncate flex-1">
                        {match.team1?.logoUrl && (
                          <img src={match.team1.logoUrl} alt="" className="w-5 h-5 rounded" />
                        )}
                        <span className={clsx('truncate', compact ? 'text-xs' : 'text-sm')}>
                          {match.team1?.name || 'TBD'}
                        </span>
                      </div>
                      <span className={clsx(
                        'font-mono font-bold',
                        match.status === 'completed' && match.scoreP1 > match.scoreP2 && 'text-green-400'
                      )}>
                        {match.scoreP1 ?? '-'}
                      </span>
                    </div>

                    {/* Team 2 */}
                    <div className={clsx(
                      'flex items-center justify-between p-2',
                      match.status === 'completed' && match.scoreP2 > match.scoreP1 && 'bg-green-500/10'
                    )}>
                      <div className="flex items-center gap-2 truncate flex-1">
                        {match.team2?.logoUrl && (
                          <img src={match.team2.logoUrl} alt="" className="w-5 h-5 rounded" />
                        )}
                        <span className={clsx('truncate', compact ? 'text-xs' : 'text-sm')}>
                          {match.team2?.name || 'TBD'}
                        </span>
                      </div>
                      <span className={clsx(
                        'font-mono font-bold',
                        match.status === 'completed' && match.scoreP2 > match.scoreP1 && 'text-green-400'
                      )}>
                        {match.scoreP2 ?? '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={clsx('p-2 text-center text-xs opacity-40 border-t', borderColor)}>
        Powered by Mon-Tournoi
      </div>
    </div>
  );
}
