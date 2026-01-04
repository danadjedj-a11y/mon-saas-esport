import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];

export default function StatsDashboard({ session, supabase }) {
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [tournamentStats, setTournamentStats] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [gameStats, setGameStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      fetchMyTeams();
    }
  }, [session]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamStats();
    }
  }, [selectedTeam]);

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
    return <div style={{color:'#F8F6F2', padding:'20px', textAlign:'center', background: '#030913', minHeight: '100vh', fontFamily: "'Protest Riot', sans-serif"}}>Chargement...</div>;
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
    <div style={{ minHeight: '100vh', padding: '20px', color: '#F8F6F2', maxWidth: '1400px', margin: '0 auto', background: '#030913' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontSize: '2.5rem' }}>📊 Statistiques</h1>
        <button 
          type="button"
          onClick={() => navigate('/dashboard')} 
          style={{
            background:'transparent', 
            border:'2px solid #C10468', 
            color:'#F8F6F2', 
            padding:'8px 15px', 
            borderRadius:'8px', 
            cursor:'pointer',
            fontFamily: "'Shadows Into Light', cursive",
            fontSize: '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#C10468';
            e.currentTarget.style.borderColor = '#FF36A3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#C10468';
          }}
        >
          ← Retour
        </button>
      </div>

      {/* Sélection d'équipe */}
      <div style={{ marginBottom: '30px', background: 'rgba(3, 9, 19, 0.95)', padding: '20px', borderRadius: '12px', border: '2px solid #FF36A3' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: "'Protest Riot', sans-serif", color: '#F8F6F2' }}>Équipe :</label>
        <select
          value={selectedTeam || ''}
          onChange={(e) => setSelectedTeam(e.target.value)}
          style={{
            padding: '12px',
            background: 'rgba(3, 9, 19, 0.8)',
            border: '2px solid #C10468',
            color: '#F8F6F2',
            borderRadius: '8px',
            minWidth: '300px',
            fontSize: '1rem',
            cursor: 'pointer',
            fontFamily: "'Protest Riot', sans-serif",
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#FF36A3';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#C10468';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {myTeams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name} [{team.tag}]
            </option>
          ))}
        </select>
      </div>

      {loading && teamStats && (
        <div style={{textAlign:'center', padding:'20px', color:'#F8F6F2', fontFamily: "'Protest Riot', sans-serif"}}>Chargement des statistiques...</div>
      )}

      {teamStats && (
        <>
          {/* Stats globales */}
          <div style={{ background: 'rgba(3, 9, 19, 0.95)', padding: '30px', borderRadius: '15px', marginBottom: '30px', border: '2px solid #FF36A3' }}>
            <h2 style={{ marginTop: 0, marginBottom: '25px', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontSize: '2rem' }}>📈 Statistiques Globales</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FF36A3', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive" }}>
                  {teamStats.totalMatches}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Matchs totaux</div>
              </div>
              <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#C10468', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive" }}>
                  {teamStats.wins}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Victoires</div>
              </div>
              <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FF36A3', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive" }}>
                  {teamStats.losses}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Défaites</div>
              </div>
              {teamStats.draws > 0 && (
                <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#E7632C', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive" }}>
                    {teamStats.draws}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Matchs nuls</div>
                </div>
              )}
              <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#E7632C', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive" }}>
                  {teamStats.winRate}%
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Win Rate</div>
              </div>
              <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: teamStats.scoreDifference >= 0 ? '#C10468' : '#FF36A3', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive" }}>
                  {teamStats.scoreDifference >= 0 ? '+' : ''}{teamStats.scoreDifference}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Différence de scores</div>
              </div>
            </div>

            {/* Graphique en secteurs */}
            {pieData.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontFamily: "'Shadows Into Light', cursive", color: '#FF36A3' }}>Répartition des résultats</h3>
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
            <div style={{ background: 'rgba(3, 9, 19, 0.95)', padding: '30px', borderRadius: '15px', marginBottom: '30px', border: '2px solid #FF36A3' }}>
              <h2 style={{ marginTop: 0, marginBottom: '25px', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontSize: '2rem' }}>📊 Performance par Mois</h2>
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
            <div style={{ background: 'rgba(3, 9, 19, 0.95)', padding: '30px', borderRadius: '15px', marginBottom: '30px', border: '2px solid #FF36A3' }}>
              <h2 style={{ marginTop: 0, marginBottom: '25px', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontSize: '2rem' }}>🎮 Statistiques par Jeu</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                {gameStats.map((game, index) => (
                  <div key={index} style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', border: '2px solid #FF36A3' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', fontFamily: "'Shadows Into Light', cursive", color: '#F8F6F2' }}>{game.name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Victoires:</span>
                      <span style={{ color: '#C10468', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>{game.wins}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Défaites:</span>
                      <span style={{ color: '#FF36A3', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>{game.losses}</span>
                    </div>
                    {game.draws > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Nuls:</span>
                        <span style={{ color: '#E7632C', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>{game.draws}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #FF36A3' }}>
                      <span style={{ color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Win Rate:</span>
                      <span style={{ color: '#E7632C', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: "'Protest Riot', sans-serif" }}>{game.winRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Stats par tournoi */}
      <div style={{ background: 'rgba(3, 9, 19, 0.95)', padding: '30px', borderRadius: '15px', border: '2px solid #FF36A3' }}>
        <h2 style={{ marginTop: 0, marginBottom: '25px', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontSize: '2rem' }}>🏆 Statistiques par Tournoi</h2>
        {tournamentStats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
            Aucune participation à un tournoi pour cette équipe.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {tournamentStats.map((stat, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(3, 9, 19, 0.6)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '2px solid #FF36A3',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(5px)';
                  e.currentTarget.style.borderColor = '#C10468';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.borderColor = '#FF36A3';
                }}
                onClick={() => navigate(`/tournament/${stat.tournament?.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive", color: '#F8F6F2' }}>
                      {stat.tournament?.name || 'Tournoi'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#FF36A3', fontFamily: "'Protest Riot', sans-serif" }}>
                      🎮 {stat.tournament?.game} | 📊 {stat.tournament?.format === 'elimination' ? 'Élimination' : 
                                                      stat.tournament?.format === 'double_elimination' ? 'Double Élimination' : 
                                                      stat.tournament?.format === 'round_robin' ? 'Round Robin' : stat.tournament?.format}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '30px', textAlign: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>{stat.totalMatches}</div>
                      <div style={{ fontSize: '0.85rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Matchs</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#C10468', fontFamily: "'Shadows Into Light', cursive" }}>{stat.wins}</div>
                      <div style={{ fontSize: '0.85rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Victoires</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>{stat.losses}</div>
                      <div style={{ fontSize: '0.85rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Défaites</div>
                    </div>
                    {stat.draws > 0 && (
                      <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#E7632C', fontFamily: "'Shadows Into Light', cursive" }}>{stat.draws}</div>
                        <div style={{ fontSize: '0.85rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Nuls</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#E7632C', fontFamily: "'Shadows Into Light', cursive" }}>{stat.winRate}%</div>
                      <div style={{ fontSize: '0.85rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Win Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
