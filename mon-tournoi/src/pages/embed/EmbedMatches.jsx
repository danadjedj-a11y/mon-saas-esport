import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import clsx from 'clsx';

/**
 * EmbedMatches - Widget embedable des matchs en cours/à venir
 * URL: /embed/tournament/:id/matches
 */
export default function EmbedMatches() {
  const { id: tournamentId } = useParams();
  const [searchParams] = useSearchParams();
  
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = searchParams.get('theme') || 'dark';
  const showHeader = searchParams.get('header') !== 'false';
  const filter = searchParams.get('filter') || 'all'; // all, live, upcoming, completed
  const limit = parseInt(searchParams.get('limit')) || 10;

  useEffect(() => {
    fetchData();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, filter]);

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
          .order('round_number', { ascending: true })
          .order('created_at', { ascending: false }),
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      setTournament(tournamentRes.data);

      let filtered = matchesRes.data || [];
      
      // Filtrer selon le paramètre
      if (filter === 'live') {
        filtered = filtered.filter(m => m.status === 'in_progress');
      } else if (filter === 'upcoming') {
        filtered = filtered.filter(m => m.status === 'pending' || m.status === 'scheduled');
      } else if (filter === 'completed') {
        filtered = filtered.filter(m => m.status === 'completed');
      }

      filtered = filtered.slice(0, limit);

      // Enrichir avec les équipes
      const teamIds = [...new Set(
        filtered.flatMap(m => [m.player1_id, m.player2_id]).filter(Boolean)
      )];
      
      let teamsMap = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, logo_url')
          .in('id', teamIds);
        teamsMap = Object.fromEntries((teamsData || []).map(t => [t.id, t]));
      }

      const enriched = filtered.map(m => ({
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
              {tournament?.logo_url && (
                <img src={tournament.logo_url} alt="" className="w-10 h-10 rounded-lg" />
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
              key={match.id}
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
                  Round {match.round_number || 1} • Match #{match.match_number || 1}
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
                  match.status === 'completed' && match.score_p1 > match.score_p2 && 'font-bold'
                )}>
                  <div className="flex items-center gap-3 flex-1">
                    {match.team1?.logo_url ? (
                      <img src={match.team1.logo_url} alt="" className="w-8 h-8 rounded-lg" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-violet/20 flex items-center justify-center text-sm">
                        👥
                      </div>
                    )}
                    <span className="truncate">{match.team1?.name || 'TBD'}</span>
                  </div>
                  <span className={clsx(
                    'font-mono text-lg',
                    match.status === 'completed' && match.score_p1 > match.score_p2 && 'text-green-500'
                  )}>
                    {match.score_p1 ?? '-'}
                  </span>
                </div>

                {/* Separator */}
                <div className={clsx('my-2 h-px', borderColor)} />

                {/* Team 2 */}
                <div className={clsx(
                  'flex items-center justify-between py-2',
                  match.status === 'completed' && match.score_p2 > match.score_p1 && 'font-bold'
                )}>
                  <div className="flex items-center gap-3 flex-1">
                    {match.team2?.logo_url ? (
                      <img src={match.team2.logo_url} alt="" className="w-8 h-8 rounded-lg" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-violet/20 flex items-center justify-center text-sm">
                        👥
                      </div>
                    )}
                    <span className="truncate">{match.team2?.name || 'TBD'}</span>
                  </div>
                  <span className={clsx(
                    'font-mono text-lg',
                    match.status === 'completed' && match.score_p2 > match.score_p1 && 'text-green-500'
                  )}>
                    {match.score_p2 ?? '-'}
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
