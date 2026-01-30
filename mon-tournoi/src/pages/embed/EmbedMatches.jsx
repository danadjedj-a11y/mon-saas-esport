import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import clsx from 'clsx';

/**
 * EmbedMatches - Widget embedable des matchs en cours/à venir
 * URL: /embed/tournament/:id/matches
 */
export default function EmbedMatches() {
  const { id: tournamentId } = useParams();
  const [searchParams] = useSearchParams();

  const theme = searchParams.get('theme') || 'dark';
  const showHeader = searchParams.get('header') !== 'false';
  const filter = searchParams.get('filter') || 'all'; // all, live, upcoming, completed
  const limit = parseInt(searchParams.get('limit')) || 10;

  // Convex queries
  const tournament = useQuery(api.tournaments.getById, { tournamentId });
  const rawMatches = useQuery(api.matches.listByTournament, { tournamentId }) ?? [];

  const loading = tournament === undefined || rawMatches === undefined;

  // Process and filter matches
  const matches = useMemo(() => {
    let filtered = [...rawMatches];
    
    // Sort by round then by creation (descending)
    filtered.sort((a, b) => {
      if ((a.round || 1) !== (b.round || 1)) return (a.round || 1) - (b.round || 1);
      return (b._creationTime || 0) - (a._creationTime || 0);
    });
    
    // Filtrer selon le paramètre
    if (filter === 'live') {
      filtered = filtered.filter(m => m.status === 'in_progress');
    } else if (filter === 'upcoming') {
      filtered = filtered.filter(m => m.status === 'pending' || m.status === 'scheduled');
    } else if (filter === 'completed') {
      filtered = filtered.filter(m => m.status === 'completed');
    }

    return filtered.slice(0, limit);
  }, [rawMatches, filter, limit]);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'in_progress': return { text: 'LIVE', color: 'bg-red-500 animate-pulse' };
      case 'completed': return { text: 'Terminé', color: 'bg-green-500' };
      case 'scheduled': return { text: 'Planifié', color: 'bg-blue-500' };
      default: return { text: 'En attente', color: 'bg-gray-500' };
    }
  };

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tournament?.logoUrl && (
                <img src={tournament.logoUrl} alt="" className="w-10 h-10 rounded-lg" />
              )}
              <div>
                <h1 className="font-bold">{tournament?.name}</h1>
                <p className="text-sm opacity-60">
                  {filter === 'live' && 'Matchs en cours'}
                  {filter === 'upcoming' && 'Matchs à venir'}
                  {filter === 'completed' && 'Matchs terminés'}
                  {filter === 'all' && 'Tous les matchs'}
                </p>
              </div>
            </div>
            
            {/* Live indicator */}
            {matches.some(m => m.status === 'in_progress') && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full text-white text-sm">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            )}
          </div>
        </div>
      )}

      {/* Matches List */}
      <div className="p-4 space-y-3">
        {matches.map((match) => {
          const status = getStatusLabel(match.status);
          const isLive = match.status === 'in_progress';
          
          return (
            <div
              key={match._id}
              className={clsx(
                'rounded-lg border overflow-hidden',
                borderColor,
                cardBg,
                isLive && 'ring-2 ring-red-500/50'
              )}
            >
              {/* Match header */}
              <div className={clsx('px-3 py-2 flex items-center justify-between border-b', borderColor)}>
                <span className="text-xs opacity-60">
                  Round {match.round || 1} • Match #{match.matchNumber || 1}
                </span>
                <span className={clsx('px-2 py-0.5 rounded text-xs text-white font-medium', status.color)}>
                  {status.text}
                </span>
              </div>

              {/* Teams */}
              <div className="p-3">
                {/* Team 1 */}
                <div className={clsx(
                  'flex items-center justify-between py-2',
                  match.status === 'completed' && match.scoreP1 > match.scoreP2 && 'font-bold'
                )}>
                  <div className="flex items-center gap-3 flex-1">
                    {match.team1?.logoUrl ? (
                      <img src={match.team1.logoUrl} alt="" className="w-8 h-8 rounded-lg" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-violet/20 flex items-center justify-center text-sm">
                        👥
                      </div>
                    )}
                    <span className="truncate">{match.team1?.name || 'TBD'}</span>
                  </div>
                  <span className={clsx(
                    'font-mono text-lg',
                    match.status === 'completed' && match.scoreP1 > match.scoreP2 && 'text-green-500'
                  )}>
                    {match.scoreP1 ?? '-'}
                  </span>
                </div>

                {/* Separator */}
                <div className={clsx('my-2 h-px', borderColor)} />

                {/* Team 2 */}
                <div className={clsx(
                  'flex items-center justify-between py-2',
                  match.status === 'completed' && match.scoreP2 > match.scoreP1 && 'font-bold'
                )}>
                  <div className="flex items-center gap-3 flex-1">
                    {match.team2?.logoUrl ? (
                      <img src={match.team2.logoUrl} alt="" className="w-8 h-8 rounded-lg" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-violet/20 flex items-center justify-center text-sm">
                        👥
                      </div>
                    )}
                    <span className="truncate">{match.team2?.name || 'TBD'}</span>
                  </div>
                  <span className={clsx(
                    'font-mono text-lg',
                    match.status === 'completed' && match.scoreP2 > match.scoreP1 && 'text-green-500'
                  )}>
                    {match.scoreP2 ?? '-'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {matches.length === 0 && (
          <div className="text-center py-12 opacity-60">
            Aucun match à afficher
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={clsx('p-2 text-center text-xs opacity-40 border-t', borderColor)}>
        Powered by Mon-Tournoi
      </div>
    </div>
  );
}
