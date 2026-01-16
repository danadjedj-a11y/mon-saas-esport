import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardLayout from './layouts/DashboardLayout';
import { Pagination } from './shared/components/ui';

const COLORS = ['#8B5CF6', '#06B6D4', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];

export default function StatsDashboard({ session, supabase }) {
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [tournamentStats, setTournamentStats] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [gameStats, setGameStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      fetchMyTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (selectedTeam) {
      setCurrentPage(1);
      fetchTeamStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam]);

  const paginatedTournamentStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return tournamentStats.slice(startIndex, endIndex);
  }, [tournamentStats, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(tournamentStats.length / itemsPerPage);

  const fetchMyTeams = async () => {
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('captain_id', session.user.id);
    
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id, teams(*)')
      .eq('user_id', session.user.id);

    const allTeams = [
      ...(captainTeams || []),
      ...(memberTeams?.map(m => m.teams).filter(Boolean) || [])
    ];

    const uniqueTeams = Array.from(new Map(allTeams.map(t => [t.id, t])).values());
    setMyTeams(uniqueTeams);
    
    if (uniqueTeams.length > 0) {
      setSelectedTeam(uniqueTeams[0].id);
    }
    
    setLoading(false);
  };

  const fetchTeamStats = async () => {
    if (!selectedTeam) return;

    setLoading(true);

    const { data: participations } = await supabase
      .from('participants')
      .select('*, tournaments(*)')
      .eq('team_id', selectedTeam)
      .order('created_at', { ascending: false });

    const { data: allMatches } = await supabase
      .from('matches')
      .select('*, tournaments(name, game, format)')
      .or(`player1_id.eq.${selectedTeam},player2_id.eq.${selectedTeam}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    let totalMatches = 0;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalScoreFor = 0;
    let totalScoreAgainst = 0;

    const matchesByGame = {};
    const matchesByMonth = {};
    const performanceTimeline = [];

    (allMatches || []).forEach(match => {
      const isTeam1 = match.player1_id === selectedTeam;
      const myScore = isTeam1 ? match.score_p1 : match.score_p2;
      const opponentScore = isTeam1 ? match.score_p2 : match.score_p1;
      
      totalMatches++;
      totalScoreFor += myScore || 0;
      totalScoreAgainst += opponentScore || 0;

      if (myScore > opponentScore) {
        wins++;
      } else if (myScore < opponentScore) {
        losses++;
      } else {
        draws++;
      }

      const game = match.tournaments?.game || 'Autre';
      if (!matchesByGame[game]) {
        matchesByGame[game] = { wins: 0, losses: 0, draws: 0, total: 0 };
      }
      matchesByGame[game].total++;
      if (myScore > opponentScore) matchesByGame[game].wins++;
      else if (myScore < opponentScore) matchesByGame[game].losses++;
      else matchesByGame[game].draws++;

      const matchDate = new Date(match.created_at);
      const monthKey = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')}`;
      if (!matchesByMonth[monthKey]) {
        matchesByMonth[monthKey] = { wins: 0, losses: 0, total: 0 };
      }
      matchesByMonth[monthKey].total++;
      if (myScore > opponentScore) matchesByMonth[monthKey].wins++;
      else matchesByMonth[monthKey].losses++;

      performanceTimeline.push({
        date: new Date(match.created_at).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        winRate: ((wins / totalMatches) * 100).toFixed(1),
        matches: totalMatches
      });
    });

    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;
    const avgScoreFor = totalMatches > 0 ? (totalScoreFor / totalMatches).toFixed(1) : 0;
    const avgScoreAgainst = totalMatches > 0 ? (totalScoreAgainst / totalMatches).toFixed(1) : 0;

    setTeamStats({
      totalMatches,
      wins,
      losses,
      draws,
      winRate: parseFloat(winRate),
      avgScoreFor: parseFloat(avgScoreFor),
      avgScoreAgainst: parseFloat(avgScoreAgainst),
      scoreDifference: totalScoreFor - totalScoreAgainst
    });

    const tournamentStatsData = await Promise.all((participations || []).map(async (participation) => {
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${selectedTeam},player2_id.eq.${selectedTeam}`)
        .eq('tournament_id', participation.tournament_id)
        .eq('status', 'completed');

      const tournamentWins = (matches || []).filter(m => {
        const isTeam1 = m.player1_id === selectedTeam;
        return (isTeam1 ? m.score_p1 : m.score_p2) > (isTeam1 ? m.score_p2 : m.score_p1);
      }).length;

      const tournamentLosses = (matches || []).filter(m => {
        const isTeam1 = m.player1_id === selectedTeam;
        return (isTeam1 ? m.score_p1 : m.score_p2) < (isTeam1 ? m.score_p2 : m.score_p1);
      }).length;

      const tournamentTotal = matches?.length || 0;
      const tournamentWinRate = tournamentTotal > 0 ? ((tournamentWins / tournamentTotal) * 100).toFixed(1) : 0;

      return {
        tournament: participation.tournaments,
        participation,
        totalMatches: tournamentTotal,
        wins: tournamentWins,
        losses: tournamentLosses,
        draws: tournamentTotal - tournamentWins - tournamentLosses,
        winRate: parseFloat(tournamentWinRate)
      };
    }));

    setTournamentStats(tournamentStatsData);

    const gameStatsData = Object.entries(matchesByGame).map(([game, stats]) => ({
      name: game,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0
    }));

    setGameStats(gameStatsData);

    const monthData = Object.entries(matchesByMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, stats]) => ({
        month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0
      }));

    setPerformanceData(monthData);
    setLoading(false);
  };

  if (loading && !teamStats) {
    return (
      <DashboardLayout session={session}>
        <div className="text-gray-400 font-body text-center py-20">
          <div className="animate-pulse">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (myTeams.length === 0) {
    return (
      <DashboardLayout session={session}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <div className="glass-card p-12 max-w-md">
            <div className="text-6xl mb-6">📊</div>
            <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 font-display text-3xl mb-4">
              Statistiques
            </h2>
            <p className="text-gray-400 mb-8">
              Vous n'avez pas encore d'équipe.
            </p>
            <button 
              type="button"
              onClick={() => navigate('/create-team')} 
              className="btn-primary"
            >
              🛡️ Créer une équipe
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const _currentTeam = myTeams.find(t => t.id === selectedTeam);
  const pieData = teamStats ? [
    { name: 'Victoires', value: teamStats.wins, color: '#8B5CF6' },
    { name: 'Défaites', value: teamStats.losses, color: '#EC4899' },
    { name: 'Matchs nuls', value: teamStats.draws, color: '#06B6D4' }
  ].filter(item => item.value > 0) : [];

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-7xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 font-display text-4xl">
            📊 Statistiques
          </h1>
          <button 
            type="button"
            onClick={() => navigate('/dashboard')} 
            className="btn-secondary"
          >
            ← Retour
          </button>
        </div>

        {/* Sélection d'équipe */}
        <div className="glass-card p-6 mb-8">
          <label className="block mb-3 font-semibold text-lg text-white">Équipe :</label>
          <select
            value={selectedTeam || ''}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl min-w-[300px] text-base cursor-pointer font-body transition-all duration-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
          >
            {myTeams.map(team => (
              <option key={team.id} value={team.id} className="bg-gray-900">
                {team.name} [{team.tag}]
              </option>
            ))}
          </select>
        </div>

        {loading && teamStats && (
          <div className="text-center py-5 text-gray-400">
            <div className="animate-pulse">Chargement des statistiques...</div>
          </div>
        )}

        {teamStats && (
          <>
            {/* Stats globales */}
            <div className="glass-card p-8 mb-8">
              <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 font-display text-2xl mb-6">
                📈 Statistiques Globales
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-white/5 p-5 rounded-xl text-center border border-white/10 hover:border-violet-500/50 transition-colors">
                  <div className="font-display text-4xl font-bold text-cyan-400 mb-2">
                    {teamStats.totalMatches}
                  </div>
                  <div className="text-sm text-gray-400">Matchs totaux</div>
                </div>
                <div className="bg-white/5 p-5 rounded-xl text-center border border-white/10 hover:border-violet-500/50 transition-colors">
                  <div className="font-display text-4xl font-bold text-violet-400 mb-2">
                    {teamStats.wins}
                  </div>
                  <div className="text-sm text-gray-400">Victoires</div>
                </div>
                <div className="bg-white/5 p-5 rounded-xl text-center border border-white/10 hover:border-violet-500/50 transition-colors">
                  <div className="font-display text-4xl font-bold text-pink-400 mb-2">
                    {teamStats.losses}
                  </div>
                  <div className="text-sm text-gray-400">Défaites</div>
                </div>
                {teamStats.draws > 0 && (
                  <div className="bg-white/5 p-5 rounded-xl text-center border border-white/10 hover:border-violet-500/50 transition-colors">
                    <div className="font-display text-4xl font-bold text-cyan-400 mb-2">
                      {teamStats.draws}
                    </div>
                    <div className="text-sm text-gray-400">Matchs nuls</div>
                  </div>
                )}
                <div className="bg-white/5 p-5 rounded-xl text-center border border-white/10 hover:border-violet-500/50 transition-colors">
                  <div className="font-display text-4xl font-bold text-amber-400 mb-2">
                    {teamStats.winRate}%
                  </div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                </div>
                <div className="bg-white/5 p-5 rounded-xl text-center border border-white/10 hover:border-violet-500/50 transition-colors">
                  <div className={`font-display text-4xl font-bold mb-2 ${teamStats.scoreDifference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {teamStats.scoreDifference >= 0 ? '+' : ''}{teamStats.scoreDifference}
                  </div>
                  <div className="text-sm text-gray-400">Différence de scores</div>
                </div>
              </div>

              {/* Graphique en secteurs */}
              {pieData.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-5 text-xl font-display text-white">Répartition des résultats</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(10, 10, 15, 0.95)', 
                          border: '1px solid rgba(139, 92, 246, 0.5)', 
                          borderRadius: '12px', 
                          color: '#fff' 
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Performance par mois */}
            {performanceData.length > 0 && (
              <div className="glass-card p-8 mb-8">
                <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 font-display text-2xl mb-6">
                  📊 Performance par Mois
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.2)" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(10, 10, 15, 0.95)', 
                        border: '1px solid rgba(139, 92, 246, 0.5)', 
                        borderRadius: '12px', 
                        color: '#fff' 
                      }}
                      labelStyle={{ color: '#8B5CF6', fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Bar dataKey="wins" fill="#8B5CF6" name="Victoires" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="losses" fill="#EC4899" name="Défaites" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Stats par jeu */}
            {gameStats.length > 0 && (
              <div className="glass-card p-8 mb-8">
                <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 font-display text-2xl mb-6">
                  🎮 Statistiques par Jeu
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gameStats.map((game, index) => (
                    <div key={index} className="bg-white/5 p-5 rounded-xl border border-white/10 hover:border-violet-500/50 transition-all hover:shadow-glow-violet">
                      <h3 className="font-display text-xl text-white mb-4">{game.name}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Victoires:</span>
                          <span className="text-violet-400 font-bold">{game.wins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Défaites:</span>
                          <span className="text-pink-400 font-bold">{game.losses}</span>
                        </div>
                        {game.draws > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Nuls:</span>
                            <span className="text-cyan-400 font-bold">{game.draws}</span>
                          </div>
                        )}
                        <div className="flex justify-between mt-3 pt-3 border-t border-white/10">
                          <span className="text-gray-400">Win Rate:</span>
                          <span className="text-amber-400 font-bold text-lg">{game.winRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Stats par tournoi */}
        <div className="glass-card p-8">
          <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 font-display text-2xl mb-6">
            🏆 Statistiques par Tournoi
          </h2>
          {tournamentStats.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              Aucune participation à un tournoi pour cette équipe.
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedTournamentStats.map((stat, index) => (
                  <div
                    key={index}
                    className="bg-white/5 p-5 rounded-xl border border-white/10 transition-all duration-300 cursor-pointer hover:translate-x-1 hover:border-violet-500/50 hover:shadow-glow-violet"
                    onClick={() => navigate(`/tournament/${stat.tournament?.id}`)}
                  >
                    <div className="flex justify-between items-start flex-wrap gap-5">
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-display text-xl font-bold mb-2 text-white">
                          {stat.tournament?.name || 'Tournoi'}
                        </div>
                        <div className="text-sm text-gray-400">
                          🎮 {stat.tournament?.game} | 📊 {stat.tournament?.format === 'elimination' ? 'Élimination' : 
                                                          stat.tournament?.format === 'double_elimination' ? 'Double Élimination' : 
                                                          stat.tournament?.format === 'round_robin' ? 'Round Robin' : stat.tournament?.format}
                        </div>
                      </div>
                      <div className="flex gap-8 text-center flex-wrap">
                        <div>
                          <div className="font-display text-2xl font-bold text-cyan-400">{stat.totalMatches}</div>
                          <div className="text-xs text-gray-400">Matchs</div>
                        </div>
                        <div>
                          <div className="font-display text-2xl font-bold text-violet-400">{stat.wins}</div>
                          <div className="text-xs text-gray-400">Victoires</div>
                        </div>
                        <div>
                          <div className="font-display text-2xl font-bold text-pink-400">{stat.losses}</div>
                          <div className="text-xs text-gray-400">Défaites</div>
                        </div>
                        {stat.draws > 0 && (
                          <div>
                            <div className="font-display text-2xl font-bold text-cyan-400">{stat.draws}</div>
                            <div className="text-xs text-gray-400">Nuls</div>
                          </div>
                        )}
                        <div>
                          <div className="font-display text-2xl font-bold text-amber-400">{stat.winRate}%</div>
                          <div className="text-xs text-gray-400">Win Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination pour les tournois */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center gap-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    isLoading={loading}
                  />
                  <div className="text-center text-gray-500 text-sm">
                    Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, tournamentStats.length)} sur {tournamentStats.length} tournoi{tournamentStats.length > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
