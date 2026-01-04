import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';

export default function Profile({ session }) {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      getProfile();
      fetchPlayerStats();
    }
  }, [session]);

  async function getProfile() {
    const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();
    if (data) {
      setUsername(data.username || '');
      setAvatarUrl(data.avatar_url || '');
    }
  }

  async function fetchPlayerStats() {
    if (!session?.user) return;

    // Récupérer toutes les équipes du joueur
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('captain_id', session.user.id);
    
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', session.user.id);

    const allTeamIds = [
      ...(captainTeams?.map(t => t.id) || []),
      ...(memberTeams?.map(tm => tm.team_id) || [])
    ];
    const uniqueTeamIds = [...new Set(allTeamIds)];

    if (uniqueTeamIds.length === 0) {
      setPlayerStats({
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        tournamentsCount: 0,
        teamsCount: uniqueTeamIds.length
      });
      setLoading(false);
      return;
    }

    // Récupérer tous les matchs de toutes les équipes du joueur
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*')
      .or(uniqueTeamIds.map(id => `player1_id.eq.${id},player2_id.eq.${id}`).join(','))
      .eq('status', 'completed');

    let wins = 0;
    let losses = 0;
    let draws = 0;

    (allMatches || []).forEach(match => {
      const myTeamId = uniqueTeamIds.find(id => id === match.player1_id || id === match.player2_id);
      if (!myTeamId) return;

      const isTeam1 = match.player1_id === myTeamId;
      const myScore = isTeam1 ? match.score_p1 : match.score_p2;
      const opponentScore = isTeam1 ? match.score_p2 : match.score_p1;

      if (myScore > opponentScore) {
        wins++;
      } else if (myScore < opponentScore) {
        losses++;
      } else {
        draws++;
      }
    });

    const totalMatches = wins + losses + draws;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

    // Récupérer le nombre de tournois
    const { data: participations } = await supabase
      .from('participants')
      .select('tournament_id')
      .in('team_id', uniqueTeamIds);

    const uniqueTournaments = new Set(participations?.map(p => p.tournament_id) || []);

    setPlayerStats({
      totalMatches,
      wins,
      losses,
      draws,
      winRate: parseFloat(winRate),
      tournamentsCount: uniqueTournaments.size,
      teamsCount: uniqueTeamIds.length
    });
    setLoading(false);
  }

  async function updateProfile() {
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      username,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    });
    if (error) toast.error("Erreur : " + error.message);
    else toast.success("Profil mis à jour !");
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px', color: '#F8F6F2', maxWidth: '1000px', margin: '0 auto', background: '#030913' }}>
      <button 
        type="button"
        onClick={() => navigate('/dashboard')} 
        style={{ 
          background: 'transparent', 
          border: '2px solid #C10468', 
          color: '#F8F6F2', 
          cursor: 'pointer', 
          marginBottom: '20px',
          padding: '8px 16px',
          borderRadius: '8px',
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
        ← Retour au Dashboard
      </button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Colonne gauche : Paramètres */}
        <div style={{ background: 'rgba(3, 9, 19, 0.95)', padding: '30px', borderRadius: '15px', border: '2px solid #FF36A3' }}>
          <h2 style={{ marginTop: 0, marginBottom: '30px', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontSize: '1.8rem' }}>⚙️ Paramètres du Profil</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#F8F6F2', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>Pseudo :</label>
              <input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '2px solid #C10468', 
                  background: 'rgba(3, 9, 19, 0.8)', 
                  color: '#F8F6F2',
                  fontSize: '1rem',
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
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#F8F6F2', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>Photo de profil (URL) :</label>
              <input 
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)} 
                placeholder="https://..." 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '2px solid #C10468', 
                  background: 'rgba(3, 9, 19, 0.8)', 
                  color: '#F8F6F2',
                  fontSize: '1rem',
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
              />
            </div>

            {avatarUrl && (
              <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(3, 9, 19, 0.6)', borderRadius: '12px', border: '2px solid #FF36A3' }}>
                <img 
                  src={avatarUrl} 
                  style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #FF36A3' }} 
                  alt="Aperçu" 
                />
              </div>
            )}

            <button 
              type="button"
              onClick={updateProfile} 
              style={{ 
                background: '#C10468', 
                color: '#F8F6F2', 
                padding: '15px', 
                border: '2px solid #FF36A3', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontFamily: "'Shadows Into Light', cursive",
                fontSize: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginTop: '10px',
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
              💾 Sauvegarder les modifications
            </button>
          </div>
        </div>

        {/* Colonne droite : Statistiques */}
        <div style={{ background: 'rgba(3, 9, 19, 0.95)', padding: '30px', borderRadius: '15px', border: '2px solid #FF36A3' }}>
          <h2 style={{ marginTop: 0, marginBottom: '30px', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontSize: '1.8rem' }}>📊 Mes Statistiques</h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
              Chargement des statistiques...
            </div>
          ) : playerStats ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '30px' }}>
                <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF36A3', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive" }}>
                    {playerStats.totalMatches}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Matchs joués</div>
                </div>
                <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#E7632C', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive" }}>
                    {playerStats.winRate}%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Win Rate</div>
                </div>
                <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#C10468', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive" }}>
                    {playerStats.wins}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Victoires</div>
                </div>
                <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF36A3', marginBottom: '8px', fontFamily: "'Shadows Into Light', cursive" }}>
                    {playerStats.losses}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Défaites</div>
                </div>
              </div>

              <div style={{ background: 'rgba(3, 9, 19, 0.6)', padding: '20px', borderRadius: '12px', border: '2px solid #FF36A3' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px solid #FF36A3' }}>
                  <span style={{ color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Équipes :</span>
                  <span style={{ fontWeight: 'bold', color: '#FF36A3', fontFamily: "'Protest Riot', sans-serif" }}>{playerStats.teamsCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Tournois :</span>
                  <span style={{ fontWeight: 'bold', color: '#FF36A3', fontFamily: "'Protest Riot', sans-serif" }}>{playerStats.tournamentsCount}</span>
                </div>
              </div>

              <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigate('/stats')}
                  style={{
                    background: '#C10468',
                    color: '#F8F6F2',
                    padding: '12px 24px',
                    border: '2px solid #FF36A3',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: "'Shadows Into Light', cursive",
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    width: '100%',
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
                  📊 Voir les statistiques détaillées
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
              Aucune statistique disponible. Rejoignez une équipe pour commencer !
            </div>
          )}
        </div>
      </div>
    </div>
  );
}