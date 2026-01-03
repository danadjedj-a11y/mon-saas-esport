import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import NotificationCenter from './NotificationCenter';

export default function PlayerDashboard({ session }) {
  const [myTournaments, setMyTournaments] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlayerData();
  }, [session]);

  const fetchPlayerData = async () => {
    if (!session) return;
    
    // Récupérer mes équipes
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
      setLoading(false);
      return;
    }

    // Récupérer les tournois où mes équipes sont inscrites
    const { data: participants } = await supabase
      .from('participants')
      .select('tournament_id, tournaments(*)')
      .in('team_id', uniqueTeamIds);

    if (participants) {
      const tournamentIds = [...new Set(participants.map(p => p.tournament_id))];
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('*')
        .in('id', tournamentIds)
        .order('created_at', { ascending: false });
      
      setMyTournaments(tournaments || []);

      // Récupérer les matchs à venir
      const { data: matches } = await supabase
        .from('matches')
        .select('*, tournaments(*)')
        .in('tournament_id', tournamentIds)
        .in('player1_id', uniqueTeamIds)
        .or(`player2_id.in.(${uniqueTeamIds.join(',')})`)
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true })
        .limit(5);

      setUpcomingMatches(matches || []);
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Erreur lors de la déconnexion");
    else navigate('/');
  };

  if (loading) return <div style={{color:'white', padding:'20px'}}>Chargement...</div>;

  return (
    <div style={{ padding: '20px', color: 'white', minHeight: '100vh', background: '#0a0a0a' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#3498db', fontSize: '2rem' }}>⚔️ Espace Joueur</h1>
          <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.9rem' }}>Vos tournois et matchs à venir</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

          <button 
            onClick={() => navigate('/create-team')} 
            style={{ padding: '10px 20px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🛡️ Créer une Team
          </button>

          <button 
            onClick={() => navigate('/my-team')} 
            style={{ padding: '10px 20px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🛡️ Mon Équipe
          </button>

          <NotificationCenter session={session} supabase={supabase} />

          <button 
            onClick={() => navigate('/stats')} 
            style={{ background: '#3498db', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📊 Statistiques
          </button>

          <button 
            onClick={() => navigate('/leaderboard')} 
            style={{ background: '#f39c12', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🏆 Classement
          </button>
          
          <button 
            onClick={() => navigate('/profile')} 
            style={{ background: '#9b59b6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ⚙️ Profil
          </button>
          
          <button 
            onClick={handleLogout}
            style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #e74c3c', borderRadius: '8px', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* MATCHS À VENIR */}
      {upcomingMatches.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '20px', color: '#00d4ff' }}>⚡ Matchs à Venir</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {upcomingMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => navigate(`/match/${match.id}`)}
                style={{
                  background: '#1a1a1a',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #3498db',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '5px' }}>
                    {match.tournaments?.name || 'Tournoi'}
                  </div>
                  {match.scheduled_at && (
                    <div style={{ fontSize: '0.85rem', color: '#888' }}>
                      📅 {new Date(match.scheduled_at).toLocaleString('fr-FR')}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '1.5rem' }}>⚔️</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MES TOURNOIS */}
      <div>
        <h2 style={{ marginBottom: '20px', color: '#00d4ff' }}>Mes Tournois Inscrits</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {myTournaments.map((t) => {
            const getStatusStyle = (status) => {
              switch (status) {
                case 'draft': return { bg: '#f39c12', text: 'Inscriptions' };
                case 'completed': return { bg: '#7f8c8d', text: 'Terminé' };
                default: return { bg: '#27ae60', text: 'En cours' };
              }
            };
            const statusStyle = getStatusStyle(t.status);
            
            return (
              <div 
                key={t.id} 
                onClick={() => navigate(`/player/tournament/${t.id}`)}
                style={{ 
                  background: '#1a1a1a', 
                  padding: '20px', 
                  borderRadius: '10px', 
                  border: '1px solid #333', 
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '200px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ 
                  position: 'absolute', top: '10px', right: '10px', 
                  background: statusStyle.bg, padding: '4px 8px', 
                  borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' 
                }}>
                  {statusStyle.text}
                </span>

                <div>
                  <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🏆</div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#00d4ff' }}>{t.name}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#3498db', marginBottom: '2px' }}>🎮 {t.game}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '10px' }}>📊 {t.format}</div>
                  <p style={{ color: '#555', fontSize: '0.75rem', margin: 0 }}>
                    Inscrit le {new Date(t.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {myTournaments.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', marginTop: '50px', padding: '40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⚔️</div>
          <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Aucun tournoi inscrit</p>
          <p style={{ color: '#888', marginBottom: '20px' }}>Rejoignez un tournoi pour commencer à jouer</p>
          <button 
            onClick={() => navigate('/create-team')} 
            style={{ padding: '12px 24px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', marginRight: '10px' }}
          >
            🛡️ Créer une Équipe
          </button>
        </div>
      )}
    </div>
  );
}

