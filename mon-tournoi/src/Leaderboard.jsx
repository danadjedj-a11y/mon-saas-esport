import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import BadgeDisplay from './components/BadgeDisplay';
import Skeleton from './components/Skeleton';
import DashboardLayout from './layouts/DashboardLayout';

export default function Leaderboard({ session, supabase }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [levelLeaderboard, setLevelLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('winRate'); // 'winRate', 'wins', 'matches'
  const [gameFilter, setGameFilter] = useState('all');
  const [games, setGames] = useState([]);
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' ou 'levels'
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'teams') {
      fetchLeaderboard();
      fetchGames();
    } else {
      fetchLevelLeaderboard();
    }
  }, [sortBy, gameFilter, activeTab]);

  const fetchGames = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('game')
      .not('game', 'is', null);
    
    const uniqueGames = [...new Set(data?.map(t => t.game) || [])];
    setGames(uniqueGames);
  };

  const fetchLeaderboard = async () => {
    setLoading(true);

    // Récupérer toutes les équipes
    const { data: teams } = await supabase
      .from('teams')
      .select('*');

    if (!teams) {
      setLoading(false);
      return;
    }

    // Calculer les stats pour chaque équipe
    const statsPromises = teams.map(async (team) => {
      // Récupérer tous les matchs terminés de cette équipe
      let query = supabase
        .from('matches')
        .select('*, tournaments(game)')
        .or(`player1_id.eq.${team.id},player2_id.eq.${team.id}`)
        .eq('status', 'completed');

      // Filtrer par jeu si nécessaire
      if (gameFilter !== 'all') {
        query = query.eq('tournaments.game', gameFilter);
      }

      const { data: matches } = await query;

      if (!matches || matches.length === 0) {
        return null;
      }

      let wins = 0;
      let losses = 0;
      let draws = 0;
      let totalScoreFor = 0;
      let totalScoreAgainst = 0;

      matches.forEach(match => {
        const isTeam1 = match.player1_id === team.id;
        const myScore = isTeam1 ? match.score_p1 : match.score_p2;
        const opponentScore = isTeam1 ? match.score_p2 : match.score_p1;

        totalScoreFor += myScore || 0;
        totalScoreAgainst += opponentScore || 0;

        if (myScore > opponentScore) {
          wins++;
        } else if (myScore < opponentScore) {
          losses++;
        } else {
          draws++;
        }
      });

      const totalMatches = matches.length;
      const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;
      const scoreDifference = totalScoreFor - totalScoreAgainst;

      // Récupérer le nombre de tournois
      const { data: participations } = await supabase
        .from('participants')
        .select('tournament_id')
        .eq('team_id', team.id);

      return {
        team,
        totalMatches,
        wins,
        losses,
        draws,
        winRate: parseFloat(winRate),
        scoreDifference,
        tournamentsCount: participations?.length || 0
      };
    });

    const allStats = await Promise.all(statsPromises);
    const validStats = allStats.filter(s => s !== null && s.totalMatches > 0);

    // Trier selon le critère sélectionné
    validStats.sort((a, b) => {
      switch (sortBy) {
        case 'winRate':
          return b.winRate - a.winRate;
        case 'wins':
          return b.wins - a.wins;
        case 'matches':
          return b.totalMatches - a.totalMatches;
        default:
          return 0;
      }
    });

    setLeaderboard(validStats);
    setLoading(false);
  };

  const fetchLevelLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_levels')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .order('total_xp', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrichir avec les badges
      const enriched = await Promise.all((data || []).map(async (userLevel) => {
        const { data: badges } = await supabase
          .from('user_badges')
          .select('badges(*)')
          .eq('user_id', userLevel.user_id)
          .limit(3);

        return {
          ...userLevel,
          badges: badges?.map(ub => ub.badges) || []
        };
      }));

      setLevelLeaderboard(enriched);
    } catch (err) {
      console.error('Erreur chargement classement niveaux:', err);
      setLevelLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout session={session}>
        <div className="w-full max-w-6xl mx-auto">
        <Skeleton variant="text" height="40px" width="300px" style={{ marginBottom: '30px' }} />
          <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5">
          <Skeleton variant="text" height="30px" width="100%" style={{ marginBottom: '20px' }} />
          {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 mb-4 pb-4 border-b border-white/5">
              <Skeleton variant="text" height="20px" />
              <Skeleton variant="text" height="20px" />
              <Skeleton variant="text" height="20px" />
              <Skeleton variant="text" height="20px" />
              <Skeleton variant="text" height="20px" />
              <Skeleton variant="text" height="20px" />
            </div>
          ))}
        </div>
      </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display text-4xl text-fluky-secondary m-0" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>🏆 Classement Global</h1>
        
        {/* Onglets */}
          <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
              className={`px-5 py-2 border-2 border-fluky-secondary rounded-lg cursor-pointer font-body transition-all duration-300 ${
                activeTab === 'teams'
                  ? 'bg-fluky-primary text-white'
                  : 'bg-transparent text-fluky-text hover:bg-fluky-primary/30'
              }`}
          >
            Équipes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('levels')}
              className={`px-5 py-2 border-2 border-fluky-secondary rounded-lg cursor-pointer font-body transition-all duration-300 ${
                activeTab === 'levels'
                  ? 'bg-fluky-primary text-white'
                  : 'bg-transparent text-fluky-text hover:bg-fluky-primary/30'
              }`}
          >
            Niveaux & XP
          </button>
        </div>
      </div>

      {/* Filtres */}
        <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5 mb-8 flex gap-5 flex-wrap items-center">
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Trier par :</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '10px',
              background: 'rgba(3, 9, 19, 0.8)',
              border: '2px solid #C10468',
              color: '#F8F6F2',
              borderRadius: '8px',
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
            <option value="winRate">Win Rate (%)</option>
            <option value="wins">Victoires</option>
            <option value="matches">Matchs joués</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Jeu :</label>
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            style={{
              padding: '10px',
              background: 'rgba(3, 9, 19, 0.8)',
              border: '2px solid #C10468',
              color: '#F8F6F2',
              borderRadius: '8px',
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
            <option value="all">Tous les jeux</option>
            {games.map(game => (
              <option key={game} value={game}>{game}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau de classement */}
        <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5 overflow-x-auto">
        {activeTab === 'levels' ? (
          levelLeaderboard.length === 0 ? (
              <div className="text-center py-10 text-fluky-text font-body">
              Aucun classement disponible pour le moment.
            </div>
          ) : (
              <table className="w-full border-collapse">
              <thead>
                  <tr className="border-b-2 border-fluky-secondary">
                    <th className="p-4 text-left text-fluky-secondary font-normal font-body">Rang</th>
                    <th className="p-4 text-left text-fluky-secondary font-normal font-body">Joueur</th>
                    <th className="p-4 text-center text-fluky-secondary font-normal font-body">Niveau</th>
                    <th className="p-4 text-center text-fluky-secondary font-normal font-body">XP Total</th>
                    <th className="p-4 text-center text-fluky-secondary font-normal font-body">Badges</th>
                </tr>
              </thead>
              <tbody>
                {levelLeaderboard.map((userLevel, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3;
                  const rankColors = { 1: '#F8EC54', 2: '#FF36A3', 3: '#E7632C' };
                  const profile = userLevel.profiles || {};

                  return (
                    <tr
                      key={userLevel.user_id}
                        className={`border-b border-white/5 transition-colors duration-300 ${
                          isTop3 ? 'bg-fluky-primary/20' : 'bg-transparent'
                        } hover:bg-fluky-secondary/20`}
                      >
                        <td className={`p-4 text-xl font-bold font-display ${isTop3 ? '' : 'text-fluky-secondary'}`} style={{ color: isTop3 ? rankColors[rank] : undefined }}>
                        #{rank}
                      </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                          {profile.avatar_url && (
                            <img 
                              src={profile.avatar_url} 
                              alt="" 
                                className="w-10 h-10 rounded-full object-cover border-2 border-fluky-secondary"
                            />
                          )}
                            <div className="font-display text-lg font-bold text-fluky-text">
                            {profile.username || 'Joueur anonyme'}
                          </div>
                        </div>
                      </td>
                        <td className="p-4 text-center text-fluky-secondary font-bold text-xl font-body">
                        {userLevel.level}
                      </td>
                        <td className="p-4 text-center text-fluky-accent-orange font-bold font-body">
                        {userLevel.total_xp}
                      </td>
                        <td className="p-4 text-center">
                          <div className="flex gap-1 justify-center text-xl">
                          {userLevel.badges.slice(0, 3).map((badge, idx) => (
                            <span key={idx} title={badge.name}>{badge.icon}</span>
                          ))}
                            {userLevel.badges.length === 0 && <span className="text-fluky-text text-sm font-body">-</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : leaderboard.length === 0 ? (
            <div className="text-center py-10 text-fluky-text font-body">
            Aucune statistique disponible pour le moment.
          </div>
        ) : (
            <table className="w-full border-collapse">
            <thead>
                <tr className="border-b-2 border-fluky-secondary">
                  <th className="p-4 text-left text-fluky-secondary font-normal font-body">Rang</th>
                  <th className="p-4 text-left text-fluky-secondary font-normal font-body">Équipe</th>
                  <th className="p-4 text-center text-fluky-secondary font-normal font-body">Matchs</th>
                  <th className="p-4 text-center text-fluky-secondary font-normal font-body">Victoires</th>
                  <th className="p-4 text-center text-fluky-secondary font-normal font-body">Défaites</th>
                  <th className="p-4 text-center text-fluky-secondary font-normal font-body">Win Rate</th>
                  <th className="p-4 text-center text-fluky-secondary font-normal font-body">Diff. Scores</th>
                  <th className="p-4 text-center text-fluky-secondary font-normal font-body">Tournois</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((stat, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const rankColors = { 1: '#F8EC54', 2: '#FF36A3', 3: '#E7632C' };

                return (
                  <tr
                    key={stat.team.id}
                      className={`border-b border-white/5 transition-colors duration-300 ${
                        isTop3 ? 'bg-fluky-primary/20' : 'bg-transparent'
                      } hover:bg-fluky-secondary/20`}
                    >
                      <td className={`p-4 text-xl font-bold font-display ${isTop3 ? '' : 'text-fluky-secondary'}`} style={{ color: isTop3 ? rankColors[rank] : undefined }}>
                      #{rank}
                    </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                        {stat.team.logo_url && (
                          <img 
                            src={stat.team.logo_url} 
                            alt="" 
                              className="w-10 h-10 rounded-lg object-cover border-2 border-fluky-secondary"
                          />
                        )}
                        <div>
                            <div className="font-display text-lg font-bold text-fluky-text">{stat.team.name}</div>
                            <div className="text-sm text-fluky-secondary font-body">[{stat.team.tag}]</div>
                        </div>
                      </div>
                    </td>
                      <td className="p-4 text-center text-fluky-secondary font-bold font-body">
                      {stat.totalMatches}
                    </td>
                      <td className="p-4 text-center text-fluky-primary font-bold font-body">
                      {stat.wins}
                    </td>
                      <td className="p-4 text-center text-fluky-secondary font-bold font-body">
                      {stat.losses}
                    </td>
                      <td className="p-4 text-center text-fluky-accent-orange font-bold text-lg font-body">
                      {stat.winRate}%
                    </td>
                      <td className={`p-4 text-center font-bold font-body ${
                        stat.scoreDifference >= 0 ? 'text-fluky-primary' : 'text-fluky-secondary'
                      }`}>
                      {stat.scoreDifference >= 0 ? '+' : ''}{stat.scoreDifference}
                    </td>
                      <td className="p-4 text-center text-fluky-secondary font-bold font-body">
                      {stat.tournamentsCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {leaderboard.length > 0 && (
            <div className="mt-5 text-center text-fluky-text text-sm font-body">
          {leaderboard.length} équipe{leaderboard.length > 1 ? 's' : ''} classée{leaderboard.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}

