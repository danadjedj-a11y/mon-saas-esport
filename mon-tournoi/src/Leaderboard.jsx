import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import BadgeDisplay from './components/BadgeDisplay';

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
      <div style={{ padding: '40px', color: '#F8F6F2', textAlign: 'center', background: '#030913', minHeight: '100vh', fontFamily: "'Protest Riot', sans-serif" }}>
        <div>Chargement du classement...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px', color: '#F8F6F2', maxWidth: '1200px', margin: '0 auto', background: '#030913' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontSize: '2.5rem' }}>🏆 Classement Global</h1>
        
        {/* Onglets */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            style={{
              background: activeTab === 'teams' ? '#C10468' : 'transparent',
              border: '2px solid #FF36A3',
              color: '#F8F6F2',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: "'Protest Riot', sans-serif",
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'teams') {
                e.currentTarget.style.background = 'rgba(193, 4, 104, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'teams') {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            Équipes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('levels')}
            style={{
              background: activeTab === 'levels' ? '#C10468' : 'transparent',
              border: '2px solid #FF36A3',
              color: '#F8F6F2',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: "'Protest Riot', sans-serif",
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'levels') {
                e.currentTarget.style.background = 'rgba(193, 4, 104, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'levels') {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            Niveaux & XP
          </button>
        </div>
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

      {/* Filtres */}
      <div style={{ 
        background: 'rgba(3, 9, 19, 0.95)', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '30px', 
        border: '2px solid #FF36A3',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
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
      <div style={{ background: 'rgba(3, 9, 19, 0.95)', padding: '20px', borderRadius: '15px', border: '2px solid #FF36A3', overflowX: 'auto' }}>
        {activeTab === 'levels' ? (
          levelLeaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
              Aucun classement disponible pour le moment.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #FF36A3' }}>
                  <th style={{ padding: '15px', textAlign: 'left', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Rang</th>
                  <th style={{ padding: '15px', textAlign: 'left', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Joueur</th>
                  <th style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Niveau</th>
                  <th style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>XP Total</th>
                  <th style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Badges</th>
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
                      style={{
                        borderBottom: '1px solid rgba(255, 54, 163, 0.3)',
                        background: isTop3 ? 'rgba(193, 4, 104, 0.2)' : 'transparent',
                        transition: 'background 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 54, 163, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = isTop3 ? 'rgba(193, 4, 104, 0.2)' : 'transparent'}
                    >
                      <td style={{ padding: '15px', fontSize: '1.2rem', fontWeight: 'bold', color: isTop3 ? rankColors[rank] : '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>
                        #{rank}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {profile.avatar_url && (
                            <img 
                              src={profile.avatar_url} 
                              alt="" 
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF36A3' }}
                            />
                          )}
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>
                            {profile.username || 'Joueur anonyme'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'bold', fontSize: '1.2rem', fontFamily: "'Protest Riot', sans-serif" }}>
                        {userLevel.level}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center', color: '#E7632C', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>
                        {userLevel.total_xp}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', fontSize: '1.2rem' }}>
                          {userLevel.badges.slice(0, 3).map((badge, idx) => (
                            <span key={idx} title={badge.name}>{badge.icon}</span>
                          ))}
                          {userLevel.badges.length === 0 && <span style={{ color: '#F8F6F2', fontSize: '0.9rem', fontFamily: "'Protest Riot', sans-serif" }}>-</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
            Aucune statistique disponible pour le moment.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #FF36A3' }}>
                <th style={{ padding: '15px', textAlign: 'left', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Rang</th>
                <th style={{ padding: '15px', textAlign: 'left', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Équipe</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Matchs</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Victoires</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Défaites</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Win Rate</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Diff. Scores</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'normal', fontFamily: "'Protest Riot', sans-serif" }}>Tournois</th>
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
                    style={{
                      borderBottom: '1px solid rgba(255, 54, 163, 0.3)',
                      background: isTop3 ? 'rgba(193, 4, 104, 0.2)' : 'transparent',
                      transition: 'background 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 54, 163, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isTop3 ? 'rgba(193, 4, 104, 0.2)' : 'transparent'}
                  >
                    <td style={{ padding: '15px', fontSize: '1.2rem', fontWeight: 'bold', color: isTop3 ? rankColors[rank] : '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>
                      #{rank}
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {stat.team.logo_url && (
                          <img 
                            src={stat.team.logo_url} 
                            alt="" 
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #FF36A3' }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>{stat.team.name}</div>
                          <div style={{ fontSize: '0.85rem', color: '#FF36A3', fontFamily: "'Protest Riot', sans-serif" }}>[{stat.team.tag}]</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>
                      {stat.totalMatches}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#C10468', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>
                      {stat.wins}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>
                      {stat.losses}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#E7632C', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: "'Protest Riot', sans-serif" }}>
                      {stat.winRate}%
                    </td>
                    <td style={{ 
                      padding: '15px', 
                      textAlign: 'center', 
                      color: stat.scoreDifference >= 0 ? '#C10468' : '#FF36A3', 
                      fontWeight: 'bold',
                      fontFamily: "'Protest Riot', sans-serif"
                    }}>
                      {stat.scoreDifference >= 0 ? '+' : ''}{stat.scoreDifference}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#FF36A3', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>
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
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#F8F6F2', fontSize: '0.9rem', fontFamily: "'Protest Riot', sans-serif" }}>
          {leaderboard.length} équipe{leaderboard.length > 1 ? 's' : ''} classée{leaderboard.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

