import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import clsx from 'clsx';

/**
 * EmbedStandings - Widget embedable du classement
 * URL: /embed/tournament/:id/standings
 */
export default function EmbedStandings() {
  const { id: tournamentId } = useParams();
  const [searchParams] = useSearchParams();
  
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = searchParams.get('theme') || 'dark';
  const showHeader = searchParams.get('header') !== 'false';
  const limit = parseInt(searchParams.get('limit')) || 16;

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      const [tournamentRes, participantsRes, matchesRes] = await Promise.all([
        supabase
          .from('tournaments')
          .select('id, name, game, logo_url')
          .eq('id', tournamentId)
          .single(),
        supabase
          .from('participants')
          .select('*, team:team_id(id, name, logo_url)')
          .eq('tournament_id', tournamentId)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: true }),
        supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', tournamentId)
          .eq('status', 'completed'),
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      setTournament(tournamentRes.data);

      // Calculer les statistiques
      const stats = {};
      (participantsRes.data || []).forEach(p => {
        const teamId = p.team_id || p.id;
        stats[teamId] = {
          id: p.id,
          name: p.team?.name || p.name || 'TBD',
          logo: p.team?.logo_url,
          wins: 0,
          losses: 0,
          points: 0,
          matchesPlayed: 0,
        };
      });

      // Compter les victoires/défaites
      (matchesRes.data || []).forEach(match => {
        if (match.player1_id && stats[match.player1_id]) {
          stats[match.player1_id].matchesPlayed++;
          if (match.score_p1 > match.score_p2) {
            stats[match.player1_id].wins++;
            stats[match.player1_id].points += 3;
          } else {
            stats[match.player1_id].losses++;
          }
        }
        if (match.player2_id && stats[match.player2_id]) {
          stats[match.player2_id].matchesPlayed++;
          if (match.score_p2 > match.score_p1) {
            stats[match.player2_id].wins++;
            stats[match.player2_id].points += 3;
          } else {
            stats[match.player2_id].losses++;
          }
        }
      });

      // Trier par points puis par victoires
      const sorted = Object.values(stats)
        .sort((a, b) => b.points - a.points || b.wins - a.wins)
        .slice(0, limit)
        .map((s, i) => ({ ...s, rank: i + 1 }));

      setStandings(sorted);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const bgColor = theme === 'light' ? 'bg-white' : 'bg-[#0d1117]';
  const textColor = theme === 'light' ? 'text-gray-900' : 'text-white';
  const borderColor = theme === 'light' ? 'border-gray-200' : 'border-white/10';

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-yellow-500 text-black';
    if (rank === 2) return 'bg-gray-400 text-black';
    if (rank === 3) return 'bg-amber-600 text-white';
    return theme === 'light' ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-white';
  };

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
              <p className="text-sm opacity-60">Classement</p>
            </div>
          </div>
        </div>
      )}

      {/* Standings Table */}
      <div className="p-4">
        <div className={clsx('rounded-lg border overflow-hidden', borderColor)}>
          <table className="w-full">
            <thead>
              <tr className={clsx('border-b text-sm', borderColor, theme === 'light' ? 'bg-gray-100' : 'bg-white/5')}>
                <th className="px-4 py-3 text-left w-16">#</th>
                <th className="px-4 py-3 text-left">Équipe</th>
                <th className="px-4 py-3 text-center w-16">V</th>
                <th className="px-4 py-3 text-center w-16">D</th>
                <th className="px-4 py-3 text-center w-20">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, i) => (
                <tr
                  key={team.id}
                  className={clsx(
                    'border-b transition-colors',
                    borderColor,
                    i % 2 === 0 
                      ? (theme === 'light' ? 'bg-white' : 'bg-transparent')
                      : (theme === 'light' ? 'bg-gray-50' : 'bg-white/[0.02]')
                  )}
                >
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold',
                      getRankStyle(team.rank)
                    )}>
                      {team.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {team.logo ? (
                        <img src={team.logo} alt="" className="w-8 h-8 rounded-lg" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-violet/20 flex items-center justify-center text-sm">
                          👥
                        </div>
                      )}
                      <span className="font-medium">{team.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-green-500">{team.wins}</td>
                  <td className="px-4 py-3 text-center font-mono text-red-500">{team.losses}</td>
                  <td className="px-4 py-3 text-center font-bold">{team.points}</td>
                </tr>
              ))}

              {standings.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center opacity-60">
                    Aucune donnée de classement
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className={clsx('p-2 text-center text-xs opacity-40 border-t', borderColor)}>
        Powered by Mon-Tournoi
      </div>
    </div>
  );
}
