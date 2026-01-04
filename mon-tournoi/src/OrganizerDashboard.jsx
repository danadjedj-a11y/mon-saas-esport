import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import NotificationCenter from './NotificationCenter';
import { toast } from './utils/toast';

export default function OrganizerDashboard({ session }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'draft', 'ongoing', 'completed'
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyTournaments();
  }, [session]);

  const fetchMyTournaments = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement:', error);
        setTournaments([]);
      } else {
        setTournaments(data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Erreur lors de la déconnexion");
      } else {
        navigate('/');
        window.location.reload();
      }
    } catch (err) {
      console.error('Erreur déconnexion:', err);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const deleteTournament = async (e, id) => {
    e.stopPropagation();
    if (!confirm("⚠️ Supprimer ce tournoi et tous ses matchs ? C'est irréversible.")) return;

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Impossible de supprimer: " + error.message);
      console.error(error);
    } else {
      toast.success("Tournoi supprimé avec succès");
      setTournaments(tournaments.filter(t => t.id !== id));
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'draft': return { bg: '#E7632C', text: 'Brouillon', icon: '📝' };
      case 'completed': return { bg: '#FF36A3', text: 'Terminé', icon: '🏁' };
      default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
    }
  };

  if (loading) return <div style={{color:'#F8F6F2', padding:'20px', background: '#030913', fontFamily: "'Protest Riot', sans-serif"}}>Chargement...</div>;

  // Statistiques
  const draftCount = tournaments.filter(t => t.status === 'draft').length;
  const ongoingCount = tournaments.filter(t => t.status === 'ongoing').length;
  const completedCount = tournaments.filter(t => t.status === 'completed').length;

  // Filtrer les tournois selon le filtre actif
  const filteredTournaments = activeFilter === 'all' 
    ? tournaments 
    : tournaments.filter(t => {
        if (activeFilter === 'draft') return t.status === 'draft';
        if (activeFilter === 'ongoing') return t.status === 'ongoing';
        if (activeFilter === 'completed') return t.status === 'completed';
        return true;
      });

  return (
    <div style={{ minHeight: '100vh', background: '#030913', color: '#F8F6F2' }}>
      {/* HEADER */}
      <div style={{ background: 'rgba(3, 9, 19, 0.95)', borderBottom: '3px solid #FF36A3', padding: '15px 30px', boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>🎯 Fluky Boys - Organisateur</h1>
            <nav style={{ display: 'flex', gap: '20px' }}>
              <a href="#" style={{ color: '#FF36A3', textDecoration: 'none', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#C10468'} onMouseLeave={(e) => e.currentTarget.style.color = '#FF36A3'}>Mes Tournois</a>
              <a onClick={() => navigate('/create-tournament')} style={{ color: '#F8F6F2', textDecoration: 'none', cursor: 'pointer', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FF36A3'} onMouseLeave={(e) => e.currentTarget.style.color = '#F8F6F2'}>Créer un Tournoi</a>
            </nav>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <NotificationCenter session={session} supabase={supabase} />
            <button 
              type="button"
              onClick={() => navigate('/create-tournament')} 
              style={{ 
                padding: '10px 20px', 
                background: '#C10468', 
                color: '#F8F6F2', 
                border: '2px solid #FF36A3', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontFamily: "'Shadows Into Light', cursive",
                fontSize: '0.95rem',
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
              + Créer un Tournoi
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
              Paramètres
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
        {/* STATISTIQUES RAPIDES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: 'rgba(3, 9, 19, 0.9)', padding: '25px', borderRadius: '12px', border: '2px solid #FF36A3', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FF36A3', marginBottom: '10px', fontFamily: "'Shadows Into Light', cursive" }}>{tournaments.length}</div>
            <div style={{ fontSize: '0.95rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Total Tournois</div>
          </div>
          <div style={{ background: 'rgba(3, 9, 19, 0.9)', padding: '25px', borderRadius: '12px', border: '2px solid #FF36A3', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#C10468', marginBottom: '10px', fontFamily: "'Shadows Into Light', cursive" }}>{ongoingCount}</div>
            <div style={{ fontSize: '0.95rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>En cours</div>
          </div>
          <div style={{ background: 'rgba(3, 9, 19, 0.9)', padding: '25px', borderRadius: '12px', border: '2px solid #FF36A3', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#E7632C', marginBottom: '10px', fontFamily: "'Shadows Into Light', cursive" }}>{draftCount}</div>
            <div style={{ fontSize: '0.95rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Brouillons</div>
          </div>
          <div style={{ background: 'rgba(3, 9, 19, 0.9)', padding: '25px', borderRadius: '12px', border: '2px solid #FF36A3', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FF36A3', marginBottom: '10px', fontFamily: "'Shadows Into Light', cursive" }}>{completedCount}</div>
            <div style={{ fontSize: '0.95rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>Terminés</div>
          </div>
        </div>

        {/* ACTIONS RAPIDES */}
        <div style={{ background: 'linear-gradient(135deg, rgba(193, 4, 104, 0.3) 0%, rgba(255, 54, 163, 0.2) 100%)', padding: '25px', borderRadius: '12px', marginBottom: '40px', border: '2px solid #FF36A3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>🚀 Prêt à créer un nouveau tournoi ?</h3>
              <p style={{ margin: 0, color: '#F8F6F2', fontSize: '0.95rem', fontFamily: "'Protest Riot', sans-serif" }}>
                Organisez votre événement en quelques clics
              </p>
            </div>
            <button 
              type="button"
              onClick={() => navigate('/create-tournament')} 
              style={{ 
                padding: '12px 30px', 
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
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                e.currentTarget.style.background = '#FF36A3';
                e.currentTarget.style.borderColor = '#C10468';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.background = '#C10468';
                e.currentTarget.style.borderColor = '#FF36A3';
              }}
            >
              Créer un Tournoi
            </button>
          </div>
        </div>

        {/* LISTE DES TOURNOIS */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>Mes Tournois</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                onClick={() => setActiveFilter('draft')}
                style={{ 
                  padding: '8px 16px', 
                  background: activeFilter === 'draft' ? '#E7632C' : 'transparent', 
                  color: '#F8F6F2', 
                  border: activeFilter === 'draft' ? '2px solid #E7632C' : '2px solid #FF36A3', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontFamily: "'Shadows Into Light', cursive",
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeFilter !== 'draft') {
                    e.currentTarget.style.background = '#C10468';
                    e.currentTarget.style.borderColor = '#FF36A3';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeFilter !== 'draft') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#FF36A3';
                  }
                }}
              >
                Brouillons ({draftCount})
              </button>
              <button 
                type="button"
                onClick={() => setActiveFilter('ongoing')}
                style={{ 
                  padding: '8px 16px', 
                  background: activeFilter === 'ongoing' ? '#C10468' : 'transparent', 
                  color: '#F8F6F2', 
                  border: activeFilter === 'ongoing' ? '2px solid #C10468' : '2px solid #FF36A3', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontFamily: "'Shadows Into Light', cursive",
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeFilter !== 'ongoing') {
                    e.currentTarget.style.background = '#C10468';
                    e.currentTarget.style.borderColor = '#FF36A3';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeFilter !== 'ongoing') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#FF36A3';
                  }
                }}
              >
                En cours ({ongoingCount})
              </button>
              <button 
                type="button"
                onClick={() => setActiveFilter('completed')}
                style={{ 
                  padding: '8px 16px', 
                  background: activeFilter === 'completed' ? '#FF36A3' : 'transparent', 
                  color: '#F8F6F2', 
                  border: activeFilter === 'completed' ? '2px solid #FF36A3' : '2px solid #FF36A3', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontFamily: "'Shadows Into Light', cursive",
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeFilter !== 'completed') {
                    e.currentTarget.style.background = '#C10468';
                    e.currentTarget.style.borderColor = '#FF36A3';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeFilter !== 'completed') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#FF36A3';
                  }
                }}
              >
                Terminés ({completedCount})
              </button>
            </div>
          </div>

          {filteredTournaments.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {filteredTournaments.map((t) => {
                const statusStyle = getStatusStyle(t.status);
                
                return (
                  <div 
                    key={t.id} 
                    onClick={() => navigate(`/organizer/tournament/${t.id}`)}
                    style={{ 
                      background: 'rgba(3, 9, 19, 0.9)', 
                      padding: '25px', 
                      borderRadius: '12px', 
                      border: '2px solid #FF36A3', 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#C10468';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(193, 4, 104, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#FF36A3';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>{t.name}</h3>
                        <div style={{ fontSize: '0.85rem', color: '#F8F6F2', display: 'flex', gap: '15px', marginTop: '8px', fontFamily: "'Protest Riot', sans-serif" }}>
                          <span>🎮 {t.game}</span>
                          <span>📊 {t.format}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#F8F6F2', marginTop: '10px', fontFamily: "'Protest Riot', sans-serif" }}>
                          Créé le {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <span style={{ 
                        background: statusStyle.bg, 
                        padding: '6px 14px', 
                        borderRadius: '6px', 
                        fontSize: '0.85rem', 
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        color: '#F8F6F2',
                        fontFamily: "'Protest Riot', sans-serif"
                      }}>
                        {statusStyle.icon} {statusStyle.text}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #FF36A3' }}>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTournament(e, t.id);
                        }}
                        style={{ 
                          background: 'transparent', 
                          border: '2px solid #C10468', 
                          color: '#F8F6F2',
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          cursor: 'pointer', 
                          fontFamily: "'Shadows Into Light', cursive",
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#C10468';
                          e.currentTarget.style.borderColor = '#FF36A3';
                          e.currentTarget.style.color = '#F8F6F2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = '#C10468';
                          e.currentTarget.style.color = '#F8F6F2';
                        }}
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: 'rgba(3, 9, 19, 0.9)', padding: '60px', borderRadius: '12px', textAlign: 'center', border: '2px solid #FF36A3' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎯</div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3rem', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>
                {tournaments.length === 0 
                  ? 'Aucun tournoi créé' 
                  : `Aucun tournoi ${activeFilter === 'draft' ? 'brouillon' : activeFilter === 'ongoing' ? 'en cours' : activeFilter === 'completed' ? 'terminé' : ''}`}
              </h3>
              <p style={{ color: '#F8F6F2', marginBottom: '30px', fontFamily: "'Protest Riot', sans-serif" }}>
                {tournaments.length === 0 
                  ? 'Créez votre premier tournoi pour commencer à organiser'
                  : 'Essayez un autre filtre ou créez un nouveau tournoi'}
              </p>
              <button 
                type="button"
                onClick={() => navigate('/create-tournament')} 
                style={{ 
                  padding: '12px 30px', 
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
                + Créer un Tournoi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
