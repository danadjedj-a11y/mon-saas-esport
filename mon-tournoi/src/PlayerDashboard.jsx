import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import NotificationCenter from './NotificationCenter';

export default function PlayerDashboard({ session }) {
  const [myTournaments, setMyTournaments] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlayerData();
  }, [session]);

  const fetchPlayerData = async () => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      // Paralléliser les requêtes pour les équipes
      const [captainTeamsResult, memberTeamsResult, allTournamentsResult] = await Promise.all([
        supabase
          .from('teams')
          .select('id')
          .eq('captain_id', session.user.id),
        supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', session.user.id),
        supabase
          .from('tournaments')
          .select('*')
          .in('status', ['draft', 'ongoing'])
          .order('created_at', { ascending: false })
      ]);

      const captainTeams = captainTeamsResult.data || [];
      const memberTeams = memberTeamsResult.data || [];
      const allTournaments = allTournamentsResult.data || [];

      setAvailableTournaments(allTournaments);

      const allTeamIds = [
        ...captainTeams.map(t => t.id),
        ...memberTeams.map(tm => tm.team_id)
      ];
      const uniqueTeamIds = [...new Set(allTeamIds)];

      if (uniqueTeamIds.length === 0) {
        setMyTournaments([]);
        setUpcomingMatches([]);
        setLoading(false);
        return;
      }

      // Récupérer les participants et les matchs en parallèle
      const [participantsResult, matchesResult] = await Promise.all([
        supabase
          .from('participants')
          .select('tournament_id')
          .in('team_id', uniqueTeamIds),
        supabase
          .from('matches')
          .select('*, tournaments(*)')
          .in('player1_id', uniqueTeamIds)
          .or(`player2_id.in.(${uniqueTeamIds.join(',')})`)
          .eq('status', 'pending')
          .order('scheduled_at', { ascending: true })
          .limit(10)
      ]);

      const participants = participantsResult.data || [];
      const matches = matchesResult.data || [];

      if (participants.length > 0) {
        const tournamentIds = [...new Set(participants.map(p => p.tournament_id))];
        
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('*')
          .in('id', tournamentIds)
          .order('created_at', { ascending: false });
        
        setMyTournaments(tournaments || []);
      } else {
        setMyTournaments([]);
      }

      setUpcomingMatches(matches);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setMyTournaments([]);
      setAvailableTournaments([]);
      setUpcomingMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Erreur lors de la déconnexion");
    else navigate('/');
  };

  if (loading) return <div style={{color:'white', padding:'20px'}}>Chargement...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: 'white' }}>
      {/* HEADER */}
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '15px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#3498db' }}>⚔️ Mon Tournoi - Joueur</h1>
            <nav style={{ display: 'flex', gap: '20px' }}>
              <a href="#" style={{ color: '#3498db', textDecoration: 'none', fontWeight: 'bold' }}>Mes Tournois</a>
              <a onClick={() => navigate('/stats')} style={{ color: '#888', textDecoration: 'none', cursor: 'pointer' }}>Statistiques</a>
              <a onClick={() => navigate('/leaderboard')} style={{ color: '#888', textDecoration: 'none', cursor: 'pointer' }}>Classement</a>
            </nav>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <NotificationCenter session={session} supabase={supabase} />
            <button 
              onClick={() => navigate('/create-team')} 
              style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
            >
              🛡️ Créer une Team
            </button>
            <button 
              onClick={() => navigate('/my-team')} 
              style={{ padding: '8px 16px', background: '#34495e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
            >
              Mon Équipe
            </button>
            <button 
              onClick={() => navigate('/profile')} 
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #555', color: '#aaa', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Profil
            </button>
            <button 
              onClick={handleLogout}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #e74c3c', borderRadius: '6px', color: '#e74c3c', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px' }}>
        {/* MATCHS À VENIR - EN HAUT */}
        {upcomingMatches.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem', color: '#3498db' }}>⚡ Mes Prochains Matchs</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '15px' }}>
              {upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => navigate(`/match/${match.id}`)}
                  style={{
                    background: '#1a1a1a',
                    padding: '20px',
                    borderRadius: '10px',
                    border: '1px solid #2a2a2a',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3498db';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2a2a2a';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      {match.tournaments?.name || 'Tournoi'}
                    </div>
                    {match.scheduled_at && (
                      <div style={{ fontSize: '0.85rem', color: '#888', background: '#252525', padding: '5px 10px', borderRadius: '5px' }}>
                        📅 {new Date(match.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                    Round {match.round_number} • Match #{match.match_number}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* COLONNE GAUCHE : MES TOURNOIS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#3498db' }}>🎯 Mes Tournois</h2>
              <span style={{ fontSize: '0.9rem', color: '#888' }}>{myTournaments.length} tournoi(s)</span>
            </div>

            {myTournaments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {myTournaments.map((t) => {
                  const getStatusStyle = (status) => {
                    switch (status) {
                      case 'draft': return { bg: '#f39c12', text: 'Inscriptions', icon: '📝' };
                      case 'completed': return { bg: '#7f8c8d', text: 'Terminé', icon: '🏁' };
                      default: return { bg: '#27ae60', text: 'En cours', icon: '⚔️' };
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
                        border: '1px solid #2a2a2a', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3498db';
                        e.currentTarget.style.transform = 'translateX(5px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#2a2a2a';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#fff' }}>{t.name}</h3>
                          <div style={{ fontSize: '0.85rem', color: '#888', display: 'flex', gap: '15px', marginTop: '8px' }}>
                            <span>🎮 {t.game}</span>
                            <span>📊 {t.format}</span>
                          </div>
                        </div>
                        <span style={{ 
                          background: statusStyle.bg, 
                          padding: '5px 12px', 
                          borderRadius: '5px', 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap'
                        }}>
                          {statusStyle.icon} {statusStyle.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: '#1a1a1a', padding: '40px', borderRadius: '10px', textAlign: 'center', border: '1px solid #2a2a2a' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎯</div>
                <p style={{ color: '#888', margin: 0 }}>Vous n'êtes inscrit à aucun tournoi</p>
                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '5px' }}>Rejoignez un tournoi disponible ci-contre</p>
              </div>
            )}
          </div>

          {/* COLONNE DROITE : TOURNOIS DISPONIBLES */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#3498db' }}>🌟 Tournois Disponibles</h2>
              <span style={{ fontSize: '0.9rem', color: '#888' }}>{availableTournaments.filter(t => !myTournaments.some(mt => mt.id === t.id)).length} disponible(s)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto' }}>
              {availableTournaments
                .filter(t => !myTournaments.some(mt => mt.id === t.id))
                .map((t) => {
                  const getStatusStyle = (status) => {
                    switch (status) {
                      case 'draft': return { bg: '#f39c12', text: 'Inscriptions ouvertes', icon: '📝' };
                      default: return { bg: '#27ae60', text: 'En cours', icon: '⚔️' };
                    }
                  };
                  const statusStyle = getStatusStyle(t.status);
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => navigate(`/tournament/${t.id}/public`)}
                      style={{ 
                        background: '#1a1a1a', 
                        padding: '20px', 
                        borderRadius: '10px', 
                        border: '1px solid #2a2a2a', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3498db';
                        e.currentTarget.style.transform = 'translateX(5px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#2a2a2a';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#fff' }}>{t.name}</h3>
                          <div style={{ fontSize: '0.85rem', color: '#888', display: 'flex', gap: '15px', marginTop: '8px' }}>
                            <span>🎮 {t.game}</span>
                            <span>📊 {t.format}</span>
                          </div>
                        </div>
                        <span style={{ 
                          background: statusStyle.bg, 
                          padding: '5px 12px', 
                          borderRadius: '5px', 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap'
                        }}>
                          {statusStyle.icon} {statusStyle.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              
              {availableTournaments.filter(t => !myTournaments.some(mt => mt.id === t.id)).length === 0 && (
                <div style={{ background: '#1a1a1a', padding: '40px', borderRadius: '10px', textAlign: 'center', border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🌟</div>
                  <p style={{ color: '#888', margin: 0 }}>Aucun tournoi disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STATISTIQUES RAPIDES */}
        <div style={{ marginTop: '40px', background: '#1a1a1a', padding: '25px', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#3498db' }}>📊 Aperçu Statistiques</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db' }}>{myTournaments.length}</div>
              <div style={{ fontSize: '0.9rem', color: '#888', marginTop: '5px' }}>Tournois</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>{upcomingMatches.length}</div>
              <div style={{ fontSize: '0.9rem', color: '#888', marginTop: '5px' }}>Matchs à venir</div>
            </div>
            <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/stats')}>
              <div style={{ fontSize: '0.9rem', color: '#3498db', textDecoration: 'underline' }}>Voir toutes les stats →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
