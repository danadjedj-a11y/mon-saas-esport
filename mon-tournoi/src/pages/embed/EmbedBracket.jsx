import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import clsx from 'clsx';

/**
 * EmbedBracket - Widget embedable du bracket
 * URL: /embed/tournament/:id/bracket
 */
export default function EmbedBracket() {
  const { id: tournamentId } = useParams();
  const [searchParams] = useSearchParams();
  
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Options de personnalisation via query params
  const theme = searchParams.get('theme') || 'dark';
  const showHeader = searchParams.get('header') !== 'false';
  const compact = searchParams.get('compact') === 'true';

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      const [tournamentRes, matchesRes] = await Promise.all([
        supabase
          .from('tournaments')
          .select('id, name, game, logo_url')
          .eq('id', tournamentId)
          .single(),
        supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('round_number', { ascending: true }),
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      setTournament(tournamentRes.data);

      // Enrichir avec les noms des équipes
      const teamIds = [...new Set(
        (matchesRes.data || []).flatMap(m => [m.player1_id, m.player2_id]).filter(Boolean)
      )];
      
      let teamsMap = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, logo_url')
          .in('id', teamIds);
        teamsMap = Object.fromEntries((teamsData || []).map(t => [t.id, t]));
      }

      const enriched = (matchesRes.data || []).map(m => ({
        ...m,
        team1: teamsMap[m.player1_id],
        team2: teamsMap[m.player2_id],
      }));

      setMatches(enriched);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Organiser par rounds
  const rounds = matches.reduce((acc, match) => {
    const round = match.round_number || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
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
            {tournament?.logo_url && (
              <img src={tournament.logo_url} alt="" className="w-10 h-10 rounded-lg" />
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
                    key={match.id}
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
                      match.status === 'completed' && match.score_p1 > match.score_p2 && 'bg-green-500/10'
                    )}>
                      <div className="flex items-center gap-2 truncate flex-1">
                        {match.team1?.logo_url && (
                          <img src={match.team1.logo_url} alt="" className="w-5 h-5 rounded" />
                        )}
                        <span className={clsx('truncate', compact ? 'text-xs' : 'text-sm')}>
                          {match.team1?.name || 'TBD'}
                        </span>
                      </div>
                      <span className={clsx(
                        'font-mono font-bold',
                        match.status === 'completed' && match.score_p1 > match.score_p2 && 'text-green-400'
                      )}>
                        {match.score_p1 ?? '-'}
                      </span>
                    </div>

                    {/* Team 2 */}
                    <div className={clsx(
                      'flex items-center justify-between p-2',
                      match.status === 'completed' && match.score_p2 > match.score_p1 && 'bg-green-500/10'
                    )}>
                      <div className="flex items-center gap-2 truncate flex-1">
                        {match.team2?.logo_url && (
                          <img src={match.team2.logo_url} alt="" className="w-5 h-5 rounded" />
                        )}
                        <span className={clsx('truncate', compact ? 'text-xs' : 'text-sm')}>
                          {match.team2?.name || 'TBD'}
                        </span>
                      </div>
                      <span className={clsx(
                        'font-mono font-bold',
                        match.status === 'completed' && match.score_p2 > match.score_p1 && 'text-green-400'
                      )}>
                        {match.score_p2 ?? '-'}
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
