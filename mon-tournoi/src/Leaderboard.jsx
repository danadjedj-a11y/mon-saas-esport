import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function Leaderboard({ session, supabase }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('winRate'); // 'winRate', 'wins', 'matches'
  const [gameFilter, setGameFilter] = useState('all');
  const [games, setGames] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
    fetchGames();
  }, [sortBy, gameFilter]);

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

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>
        <div>Chargement du classement...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#00d4ff' }}>🏆 Classement Global</h1>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{
            background:'transparent', 
            border:'1px solid #555', 
            color:'white', 
            padding:'8px 15px', 
            borderRadius:'5px', 
            cursor:'pointer'
          }}
        >
          ← Retour
        </button>
      </div>

      {/* Filtres */}
      <div style={{ 
        background: '#1a1a1a', 
        padding: '20px', 
        borderRadius: '10px', 
        marginBottom: '30px', 
        border: '1px solid #333',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#aaa' }}>Trier par :</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '10px',
              background: '#2a2a2a',
              border: '1px solid #444',
              color: 'white',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            <option value="winRate">Win Rate (%)</option>
            <option value="wins">Victoires</option>
            <option value="matches">Matchs joués</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#aaa' }}>Jeu :</label>
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            style={{
              padding: '10px',
              background: '#2a2a2a',
              border: '1px solid #444',
              color: 'white',
              borderRadius: '5px',
              cursor: 'pointer'
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
      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '1px solid #333', overflowX: 'auto' }}>
        {leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
            Aucune statistique disponible pour le moment.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333' }}>
                <th style={{ padding: '15px', textAlign: 'left', color: '#aaa', fontWeight: 'normal' }}>Rang</th>
                <th style={{ padding: '15px', textAlign: 'left', color: '#aaa', fontWeight: 'normal' }}>Équipe</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#aaa', fontWeight: 'normal' }}>Matchs</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#aaa', fontWeight: 'normal' }}>Victoires</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#aaa', fontWeight: 'normal' }}>Défaites</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#aaa', fontWeight: 'normal' }}>Win Rate</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#aaa', fontWeight: 'normal' }}>Diff. Scores</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#aaa', fontWeight: 'normal' }}>Tournois</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((stat, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const rankColors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

                return (
                  <tr
                    key={stat.team.id}
                    style={{
                      borderBottom: '1px solid #2a2a2a',
                      background: isTop3 ? '#2a2a2a' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isTop3 ? '#2a2a2a' : 'transparent'}
                  >
                    <td style={{ padding: '15px', fontSize: '1.2rem', fontWeight: 'bold', color: isTop3 ? rankColors[rank] : 'white' }}>
                      #{rank}
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {stat.team.logo_url && (
                          <img 
                            src={stat.team.logo_url} 
                            alt="" 
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{stat.team.name}</div>
                          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>[{stat.team.tag}]</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#3498db', fontWeight: 'bold' }}>
                      {stat.totalMatches}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#2ecc71', fontWeight: 'bold' }}>
                      {stat.wins}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#e74c3c', fontWeight: 'bold' }}>
                      {stat.losses}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#f39c12', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {stat.winRate}%
                    </td>
                    <td style={{ 
                      padding: '15px', 
                      textAlign: 'center', 
                      color: stat.scoreDifference >= 0 ? '#2ecc71' : '#e74c3c', 
                      fontWeight: 'bold' 
                    }}>
                      {stat.scoreDifference >= 0 ? '+' : ''}{stat.scoreDifference}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#9b59b6', fontWeight: 'bold' }}>
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
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
          {leaderboard.length} équipe{leaderboard.length > 1 ? 's' : ''} classée{leaderboard.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

