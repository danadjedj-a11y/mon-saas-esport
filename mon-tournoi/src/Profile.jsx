import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

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
    if (error) alert("Erreur : " + error.message);
    else alert("Profil mis à jour !");
  }

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1000px', margin: '0 auto' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', marginBottom: '20px' }}>← Retour au Dashboard</button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Colonne gauche : Paramètres */}
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
          <h2 style={{ marginTop: 0, marginBottom: '30px', color: '#00d4ff' }}>⚙️ Paramètres du Profil</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontWeight: 'bold' }}>Pseudo :</label>
              <input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '5px', 
                  border: '1px solid #444', 
                  background: '#2a2a2a', 
                  color: 'white',
                  fontSize: '1rem'
                }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontWeight: 'bold' }}>Photo de profil (URL) :</label>
              <input 
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)} 
                placeholder="https://..." 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '5px', 
                  border: '1px solid #444', 
                  background: '#2a2a2a', 
                  color: 'white',
                  fontSize: '1rem'
                }} 
              />
            </div>

            {avatarUrl && (
              <div style={{ textAlign: 'center', padding: '20px', background: '#2a2a2a', borderRadius: '8px' }}>
                <img 
                  src={avatarUrl} 
                  style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #3498db' }} 
                  alt="Aperçu" 
                />
              </div>
            )}

            <button 
              onClick={updateProfile} 
              style={{ 
                background: '#3498db', 
                color: 'white', 
                padding: '15px', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                fontSize: '1rem',
                marginTop: '10px'
              }}
            >
              💾 Sauvegarder les modifications
            </button>
          </div>
        </div>

        {/* Colonne droite : Statistiques */}
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
          <h2 style={{ marginTop: 0, marginBottom: '30px', color: '#00d4ff' }}>📊 Mes Statistiques</h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Chargement des statistiques...
            </div>
          ) : playerStats ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '30px' }}>
                <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #444' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db', marginBottom: '8px' }}>
                    {playerStats.totalMatches}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Matchs joués</div>
                </div>
                <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #444' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f39c12', marginBottom: '8px' }}>
                    {playerStats.winRate}%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Win Rate</div>
                </div>
                <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #444' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2ecc71', marginBottom: '8px' }}>
                    {playerStats.wins}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Victoires</div>
                </div>
                <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #444' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e74c3c', marginBottom: '8px' }}>
                    {playerStats.losses}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Défaites</div>
                </div>
              </div>

              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '10px', border: '1px solid #444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #333' }}>
                  <span style={{ color: '#aaa' }}>Équipes :</span>
                  <span style={{ fontWeight: 'bold', color: '#9b59b6' }}>{playerStats.teamsCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#aaa' }}>Tournois :</span>
                  <span style={{ fontWeight: 'bold', color: '#3498db' }}>{playerStats.tournamentsCount}</span>
                </div>
              </div>

              <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <button
                  onClick={() => navigate('/stats')}
                  style={{
                    background: '#3498db',
                    color: 'white',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                >
                  📊 Voir les statistiques détaillées
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Aucune statistique disponible. Rejoignez une équipe pour commencer !
            </div>
          )}
        </div>
      </div>
    </div>
  );
}