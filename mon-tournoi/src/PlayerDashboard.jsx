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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur déconnexion:', error);
      } else {
        navigate('/');
        window.location.reload();
      }
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    }
  };

  if (loading) return <div style={{color:'#F8F6F2', padding:'20px', background: '#030913', fontFamily: "'Protest Riot', sans-serif"}}>Chargement...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#030913', color: '#F8F6F2' }}>
      {/* HEADER */}
      <div style={{ background: 'rgba(3, 9, 19, 0.95)', borderBottom: '3px solid #FF36A3', padding: '15px 30px', boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>⚔️ Fluky Boys - Joueur</h1>
            <nav style={{ display: 'flex', gap: '20px' }}>
              <a href="#" style={{ color: '#FF36A3', textDecoration: 'none', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#C10468'} onMouseLeave={(e) => e.currentTarget.style.color = '#FF36A3'}>Mes Tournois</a>
              <a onClick={() => navigate('/stats')} style={{ color: '#F8F6F2', textDecoration: 'none', cursor: 'pointer', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FF36A3'} onMouseLeave={(e) => e.currentTarget.style.color = '#F8F6F2'}>Statistiques</a>
              <a onClick={() => navigate('/leaderboard')} style={{ color: '#F8F6F2', textDecoration: 'none', cursor: 'pointer', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FF36A3'} onMouseLeave={(e) => e.currentTarget.style.color = '#F8F6F2'}>Classement</a>
            </nav>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <NotificationCenter session={session} supabase={supabase} />
            <button 
              type="button"
              onClick={() => navigate('/create-team')} 
              style={{ 
                padding: '8px 16px', 
                background: '#C10468', 
                color: '#F8F6F2', 
                border: '2px solid #FF36A3', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontFamily: "'Shadows Into Light', cursive",
                fontSize: '0.9rem',
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
              🛡️ Créer une Team
            </button>
            <button 
              type="button"
              onClick={() => navigate('/my-team')} 
              style={{ 
                padding: '8px 16px', 
                background: 'transparent', 
                color: '#F8F6F2', 
                border: '2px solid #C10468', 
                borderRadius: '8px', 
                cursor: 'pointer', 
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
              Mon Équipe
            </button>
            <button 
              type="button"
              onClick={() => navigate('/profile')} 
              style={{ 
                padding: '8px 16px', 
                background: 'transparent', 
                border: '2px solid #FF36A3', 
                color: '#F8F6F2', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontFamily: "'Shadows Into Light', cursive",
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FF36A3';
                e.currentTarget.style.borderColor = '#C10468';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#FF36A3';
              }}
            >
              Profil
            </button>
            <button 
              type="button"
              onClick={handleLogout}
              style={{ 
                padding: '8px 16px', 
                background: 'transparent', 
                border: '2px solid #C10468', 
                borderRadius: '8px', 
                color: '#F8F6F2', 
                cursor: 'pointer', 
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
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>⚡ Mes Prochains Matchs</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '15px' }}>
              {upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => navigate(`/match/${match.id}`)}
                  style={{
                    background: 'rgba(3, 9, 19, 0.9)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #FF36A3',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#C10468';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(193, 4, 104, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#FF36A3';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', fontFamily: "'Shadows Into Light', cursive", color: '#FF36A3' }}>
                      {match.tournaments?.name || 'Tournoi'}
                    </div>
                    {match.scheduled_at && (
                      <div style={{ fontSize: '0.85rem', color: '#F8F6F2', background: '#C10468', padding: '5px 10px', borderRadius: '5px', fontFamily: "'Protest Riot', sans-serif" }}>
                        📅 {new Date(match.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
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
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>🎯 Mes Tournois</h2>
              <span style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>{myTournaments.length} tournoi(s)</span>
            </div>

            {myTournaments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {myTournaments.map((t) => {
                  const getStatusStyle = (status) => {
                    switch (status) {
                      case 'draft': return { bg: '#E7632C', text: 'Inscriptions', icon: '📝' };
                      case 'completed': return { bg: '#FF36A3', text: 'Terminé', icon: '🏁' };
                      default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
                    }
                  };
                  const statusStyle = getStatusStyle(t.status);
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => navigate(`/player/tournament/${t.id}`)}
                      style={{ 
                        background: 'rgba(3, 9, 19, 0.9)', 
                        padding: '20px', 
                        borderRadius: '12px', 
                        border: '2px solid #FF36A3', 
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#C10468';
                        e.currentTarget.style.transform = 'translateX(5px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(193, 4, 104, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#FF36A3';
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>{t.name}</h3>
                          <div style={{ fontSize: '0.85rem', color: '#F8F6F2', display: 'flex', gap: '15px', marginTop: '8px', fontFamily: "'Protest Riot', sans-serif" }}>
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
                          whiteSpace: 'nowrap',
                          color: '#F8F6F2',
                          fontFamily: "'Protest Riot', sans-serif"
                        }}>
                          {statusStyle.icon} {statusStyle.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: 'rgba(3, 9, 19, 0.9)', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎯</div>
                <p style={{ color: '#F8F6F2', margin: 0, fontFamily: "'Protest Riot', sans-serif" }}>Vous n'êtes inscrit à aucun tournoi</p>
                <p style={{ color: '#F8F6F2', fontSize: '0.9rem', marginTop: '5px', fontFamily: "'Protest Riot', sans-serif" }}>Rejoignez un tournoi disponible ci-contre</p>
              </div>
            )}
          </div>

          {/* COLONNE DROITE : TOURNOIS DISPONIBLES */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>🌟 Tournois Disponibles</h2>
              <span style={{ fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>{availableTournaments.filter(t => !myTournaments.some(mt => mt.id === t.id)).length} disponible(s)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto' }}>
              {availableTournaments
                .filter(t => !myTournaments.some(mt => mt.id === t.id))
                .map((t) => {
                  const getStatusStyle = (status) => {
                    switch (status) {
                      case 'draft': return { bg: '#E7632C', text: 'Inscriptions ouvertes', icon: '📝' };
                      default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
                    }
                  };
                  const statusStyle = getStatusStyle(t.status);
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => navigate(`/tournament/${t.id}/public`)}
                      style={{ 
                        background: 'rgba(3, 9, 19, 0.9)', 
                        padding: '20px', 
                        borderRadius: '12px', 
                        border: '2px solid #FF36A3', 
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#C10468';
                        e.currentTarget.style.transform = 'translateX(5px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(193, 4, 104, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#FF36A3';
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>{t.name}</h3>
                          <div style={{ fontSize: '0.85rem', color: '#F8F6F2', display: 'flex', gap: '15px', marginTop: '8px', fontFamily: "'Protest Riot', sans-serif" }}>
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
                          whiteSpace: 'nowrap',
                          color: '#F8F6F2',
                          fontFamily: "'Protest Riot', sans-serif"
                        }}>
                          {statusStyle.icon} {statusStyle.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              
              {availableTournaments.filter(t => !myTournaments.some(mt => mt.id === t.id)).length === 0 && (
                <div style={{ background: 'rgba(3, 9, 19, 0.9)', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🌟</div>
                  <p style={{ color: '#F8F6F2', margin: 0, fontFamily: "'Protest Riot', sans-serif" }}>Aucun tournoi disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STATISTIQUES RAPIDES */}
        <div style={{ marginTop: '40px', background: 'rgba(3, 9, 19, 0.9)', padding: '25px', borderRadius: '12px', border: '2px solid #FF36A3' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>📊 Aperçu Statistiques</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>{myTournaments.length}</div>
              <div style={{ fontSize: '0.9rem', color: '#F8F6F2', marginTop: '5px', fontFamily: "'Protest Riot', sans-serif" }}>Tournois</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#C10468', fontFamily: "'Shadows Into Light', cursive" }}>{upcomingMatches.length}</div>
              <div style={{ fontSize: '0.9rem', color: '#F8F6F2', marginTop: '5px', fontFamily: "'Protest Riot', sans-serif" }}>Matchs à venir</div>
            </div>
            <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/stats')}>
              <div style={{ fontSize: '0.9rem', color: '#FF36A3', textDecoration: 'underline', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#C10468'} onMouseLeave={(e) => e.currentTarget.style.color = '#FF36A3'}>Voir toutes les stats →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
