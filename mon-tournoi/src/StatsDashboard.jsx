import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardLayout from './layouts/DashboardLayout';
import { Pagination } from './shared/components/ui';

const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];

export default function StatsDashboard({ session, supabase }) {
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [tournamentStats, setTournamentStats] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [gameStats, setGameStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Nombre de tournois par page
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      fetchMyTeams();
    }
  }, [session]);

  useEffect(() => {
    if (selectedTeam) {
      setCurrentPage(1); // Réinitialiser la page quand on change d'équipe
      fetchTeamStats();
    }
  }, [selectedTeam]);

  // Calculer les tournois paginés
  const paginatedTournamentStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return tournamentStats.slice(startIndex, endIndex);
  }, [tournamentStats, currentPage, itemsPerPage]);

  // Calculer le nombre total de pages
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

    // Récupérer tous les tournois où l'équipe a participé
    const { data: participations } = await supabase
      .from('participants')
      .select('*, tournaments(*)')
      .eq('team_id', selectedTeam)
      .order('created_at', { ascending: false });

    // Récupérer tous les matchs de l'équipe
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*, tournaments(name, game, format)')
      .or(`player1_id.eq.${selectedTeam},player2_id.eq.${selectedTeam}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    // Calculer les stats globales
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

      // Par jeu
      const game = match.tournaments?.game || 'Autre';
      if (!matchesByGame[game]) {
        matchesByGame[game] = { wins: 0, losses: 0, draws: 0, total: 0 };
      }
      matchesByGame[game].total++;
      if (myScore > opponentScore) matchesByGame[game].wins++;
      else if (myScore < opponentScore) matchesByGame[game].losses++;
      else matchesByGame[game].draws++;

      // Par mois (pour graphique)
      const matchDate = new Date(match.created_at);
      const monthKey = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')}`;
      if (!matchesByMonth[monthKey]) {
        matchesByMonth[monthKey] = { wins: 0, losses: 0, total: 0 };
      }
      matchesByMonth[monthKey].total++;
      if (myScore > opponentScore) matchesByMonth[monthKey].wins++;
      else matchesByMonth[monthKey].losses++;

      // Timeline de performance
      performanceTimeline.push({
        date: new Date(match.created_at).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        winRate: ((wins / totalMatches) * 100).toFixed(1),
        matches: totalMatches
      });
    });

    // Stats globales
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

    // Stats par tournoi
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

    // Données pour graphiques
    const gameStatsData = Object.entries(matchesByGame).map(([game, stats]) => ({
      name: game,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0
    }));

    setGameStats(gameStatsData);

    // Performance par mois (derniers 12 mois)
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
        <div className="text-fluky-text font-body text-center py-20">Chargement...</div>
      </DashboardLayout>
    );
  }

  if (myTeams.length === 0) {
    return (
      <div style={{ minHeight: '100vh', padding: '40px', color: '#F8F6F2', textAlign: 'center', maxWidth: '800px', margin: '0 auto', background: '#030913' }}>
        <h2 style={{fontFamily: "'Shadows Into Light', cursive", color: '#FF36A3', fontSize: '2rem'}}>📊 Statistiques</h2>
        <p style={{marginTop:'20px', color:'#F8F6F2', fontFamily: "'Protest Riot', sans-serif"}}>Vous n'avez pas encore d'équipe.</p>
        <button 
          type="button"
          onClick={() => navigate('/create-team')} 
          style={{
            marginTop:'20px',
            padding: '12px 24px',
            background: '#C10468',
            color: '#F8F6F2',
            border: '2px solid #FF36A3',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: "'Shadows Into Light', cursive",
            fontSize: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FF36A3';
            e.currentTarget.style.borderColor = '#C10468';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#C10468';
            e.currentTarget.style.borderColor = '#FF36A3';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🛡️ Créer une équipe
        </button>
      </div>
    );
  }

  const currentTeam = myTeams.find(t => t.id === selectedTeam);
  const pieData = teamStats ? [
    { name: 'Victoires', value: teamStats.wins, color: '#C10468' },
    { name: 'Défaites', value: teamStats.losses, color: '#FF36A3' },
    { name: 'Matchs nuls', value: teamStats.draws, color: '#E7632C' }
  ].filter(item => item.value > 0) : [];

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display text-4xl text-fluky-secondary m-0" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>📊 Statistiques</h1>
          <button 
            type="button"
            onClick={() => navigate('/dashboard')} 
            className="px-4 py-2 bg-transparent border-2 border-fluky-primary text-fluky-text rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 hover:bg-fluky-primary hover:border-fluky-secondary"
          >
            ← Retour
          </button>
        </div>

        {/* Sélection d'équipe */}
        <div className="mb-8 bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5">
          <label className="block mb-3 font-bold text-lg font-body text-fluky-text">Équipe :</label>
          <select
            value={selectedTeam || ''}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg min-w-[300px] text-base cursor-pointer font-body transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
          >
            {myTeams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name} [{team.tag}]
              </option>
            ))}
          </select>
        </div>

        {loading && teamStats && (
          <div className="text-center py-5 text-fluky-text font-body">Chargement des statistiques...</div>
        )}

        {teamStats && (
          <>
            {/* Stats globales */}
            <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-8 mb-8">
              <h2 className="font-display text-3xl text-fluky-secondary mb-6 mt-0" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>📈 Statistiques Globales</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mb-8">
                <div className="bg-[#030913]/60 p-5 rounded-xl text-center border border-white/5">
                  <div className="font-display text-4xl font-bold text-fluky-secondary mb-2">
                    {teamStats.totalMatches}
                  </div>
                  <div className="text-sm text-fluky-text font-body">Matchs totaux</div>
                </div>
                <div className="bg-[#030913]/60 p-5 rounded-xl text-center border border-white/5">
                  <div className="font-display text-4xl font-bold text-fluky-primary mb-2">
                    {teamStats.wins}
                  </div>
                  <div className="text-sm text-fluky-text/70 font-body">Victoires</div>
                </div>
                <div className="bg-[#030913]/60 p-5 rounded-xl text-center border border-white/5">
                  <div className="font-display text-4xl font-bold text-fluky-secondary mb-2">
                    {teamStats.losses}
                  </div>
                  <div className="text-sm text-fluky-text font-body">Défaites</div>
                </div>
                {teamStats.draws > 0 && (
                  <div className="bg-[#030913]/60 p-5 rounded-xl text-center border border-white/5">
                    <div className="font-display text-4xl font-bold text-fluky-accent-orange mb-2">
                      {teamStats.draws}
                    </div>
                    <div className="text-sm text-fluky-text font-body">Matchs nuls</div>
                  </div>
                )}
                <div className="bg-[#030913]/60 p-5 rounded-xl text-center border border-white/5">
                  <div className="font-display text-4xl font-bold text-fluky-accent-orange mb-2">
                    {teamStats.winRate}%
                  </div>
                  <div className="text-sm text-fluky-text font-body">Win Rate</div>
                </div>
                <div className="bg-[#030913]/60 p-5 rounded-xl text-center border border-white/5">
                  <div className={`font-display text-4xl font-bold mb-2 ${teamStats.scoreDifference >= 0 ? 'text-fluky-primary' : 'text-fluky-secondary'}`}>
                    {teamStats.scoreDifference >= 0 ? '+' : ''}{teamStats.scoreDifference}
                  </div>
                  <div className="text-sm text-fluky-text font-body">Différence de scores</div>
                </div>
              </div>

              {/* Graphique en secteurs */}
              {pieData.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-5 text-xl font-display text-fluky-secondary">Répartition des résultats</h3>
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
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Performance par mois */}
            {performanceData.length > 0 && (
              <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-8 mb-8">
                <h2 className="font-display text-3xl text-fluky-secondary mb-6 mt-0" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>📊 Performance par Mois</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 54, 163, 0.3)" />
                    <XAxis dataKey="month" stroke="#F8F6F2" />
                    <YAxis stroke="#F8F6F2" />
                    <Tooltip 
                      contentStyle={{ background: 'rgba(3, 9, 19, 0.95)', border: '2px solid #FF36A3', borderRadius: '8px', color: '#F8F6F2' }}
                      labelStyle={{ color: '#FF36A3', fontFamily: "'Protest Riot', sans-serif" }}
                    />
                    <Legend />
                    <Bar dataKey="wins" fill="#C10468" name="Victoires" />
                    <Bar dataKey="losses" fill="#FF36A3" name="Défaites" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Stats par jeu */}
            {gameStats.length > 0 && (
              <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-8 mb-8">
                <h2 className="font-display text-3xl text-fluky-secondary mb-6 mt-0" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>🎮 Statistiques par Jeu</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gameStats.map((game, index) => (
                    <div key={index} className="bg-[#030913]/60 p-5 rounded-xl border border-white/5">
                      <h3 className="font-display text-xl text-fluky-text mb-4 mt-0">{game.name}</h3>
                      <div className="flex justify-between mb-2">
                        <span className="text-fluky-text font-body">Victoires:</span>
                        <span className="text-fluky-primary font-bold font-body">{game.wins}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-fluky-text font-body">Défaites:</span>
                        <span className="text-fluky-secondary font-bold font-body">{game.losses}</span>
                      </div>
                      {game.draws > 0 && (
                        <div className="flex justify-between mb-2">
                          <span className="text-fluky-text font-body">Nuls:</span>
                          <span className="text-fluky-accent-orange font-bold font-body">{game.draws}</span>
                        </div>
                      )}
                      <div className="flex justify-between mt-3 pt-3 border-t border-white/5">
                        <span className="text-fluky-text font-body">Win Rate:</span>
                        <span className="text-fluky-accent-orange font-bold text-lg font-body">{game.winRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Stats par tournoi */}
        <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-8">
          <h2 className="font-display text-3xl text-fluky-secondary mb-6 mt-0" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>🏆 Statistiques par Tournoi</h2>
          {tournamentStats.length === 0 ? (
            <div className="text-center py-10 text-fluky-text font-body">
              Aucune participation à un tournoi pour cette équipe.
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {paginatedTournamentStats.map((stat, index) => (
                  <div
                    key={index}
                    className="bg-[#030913]/60 p-5 rounded-xl border border-white/5 transition-all duration-300 cursor-pointer hover:translate-x-1 hover:border-fluky-primary"
                    onClick={() => navigate(`/tournament/${stat.tournament?.id}`)}
                  >
                    <div className="flex justify-between items-start flex-wrap gap-5">
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-display text-xl font-bold mb-2 text-fluky-text">
                          {stat.tournament?.name || 'Tournoi'}
                        </div>
                        <div className="text-sm text-fluky-secondary font-body">
                          🎮 {stat.tournament?.game} | 📊 {stat.tournament?.format === 'elimination' ? 'Élimination' : 
                                                          stat.tournament?.format === 'double_elimination' ? 'Double Élimination' : 
                                                          stat.tournament?.format === 'round_robin' ? 'Round Robin' : stat.tournament?.format}
                        </div>
                      </div>
                      <div className="flex gap-8 text-center flex-wrap">
                        <div>
                          <div className="font-display text-2xl font-bold text-fluky-secondary">{stat.totalMatches}</div>
                          <div className="text-xs text-fluky-text font-body">Matchs</div>
                        </div>
                        <div>
                          <div className="font-display text-2xl font-bold text-fluky-primary">{stat.wins}</div>
                          <div className="text-xs text-fluky-text font-body">Victoires</div>
                        </div>
                        <div>
                          <div className="font-display text-2xl font-bold text-fluky-secondary">{stat.losses}</div>
                          <div className="text-xs text-fluky-text font-body">Défaites</div>
                        </div>
                        {stat.draws > 0 && (
                          <div>
                            <div className="font-display text-2xl font-bold text-fluky-accent-orange">{stat.draws}</div>
                            <div className="text-xs text-fluky-text font-body">Nuls</div>
                          </div>
                        )}
                        <div>
                          <div className="font-display text-2xl font-bold text-fluky-accent-orange">{stat.winRate}%</div>
                          <div className="text-xs text-fluky-text font-body">Win Rate</div>
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
                  <div className="text-center text-fluky-text/70 text-sm font-body">
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
