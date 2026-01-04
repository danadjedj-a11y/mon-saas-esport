import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { toast } from './utils/toast';

export default function HomePage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    fetchTournaments();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    let timeoutId;
    try {
      console.log('🔄 Chargement des tournois...');
      
      // Créer une promesse avec timeout de 10 secondes
      const queryPromise = supabase
        .from('tournaments')
        .select('*')
        .in('status', ['draft', 'ongoing'])
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Timeout: La requête a pris plus de 10 secondes'));
        }, 10000);
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      const { data, error } = result;

      if (error) {
        console.error('❌ Erreur chargement tournois:', error);
        toast.error(`Erreur: ${error.message}`);
        setTournaments([]);
      } else {
        console.log('✅ Tournois chargés:', data?.length || 0);
        setTournaments(data || []);
      }
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error('❌ Erreur lors du chargement des tournois:', err.message || err);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'draft': return { bg: '#E7632C', text: 'Inscriptions ouvertes', icon: '📝' };
      case 'completed': return { bg: '#FF36A3', text: 'Terminé', icon: '🏁' };
      default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
    }
  };

  const getFormatLabel = (format) => {
    switch (format) {
      case 'elimination': return 'Élimination Directe';
      case 'double_elimination': return 'Double Elimination';
      case 'round_robin': return 'Championnat';
      case 'swiss': return 'Système Suisse';
      default: return format;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030913', color: '#F8F6F2' }}>
      {/* HEADER */}
      <div style={{ background: 'rgba(3, 9, 19, 0.95)', borderBottom: '3px solid #FF36A3', padding: '20px 30px', boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#FF36A3', cursor: 'pointer', fontFamily: "'Shadows Into Light', cursive" }} onClick={() => navigate('/')}>
              ⚔️ Fluky Boys
            </h1>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {session ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/player/dashboard')}
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
                  🎮 Espace Joueur
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { error } = await supabase.auth.signOut();
                      if (error) {
                        console.error('Erreur déconnexion:', error);
                      } else {
                        navigate('/');
                        window.location.reload(); // Force le rafraîchissement pour mettre à jour la session
                      }
                    } catch (err) {
                      console.error('Erreur déconnexion:', err);
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '2px solid #C10468',
                    color: '#F8F6F2',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: "'Shadows Into Light', cursive",
                    fontSize: '0.95rem',
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
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  style={{
                    padding: '10px 20px',
                    background: '#C10468',
                    border: '2px solid #FF36A3',
                    color: '#F8F6F2',
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
                  Connexion
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* HERO SECTION */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(193, 4, 104, 0.1) 0%, rgba(255, 54, 163, 0.05) 100%)', 
        padding: '60px 30px',
        textAlign: 'center',
        borderBottom: '3px solid #FF36A3',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '3rem', margin: '0 0 20px 0', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontWeight: '400' }}>
            Organisez et participez à des tournois
          </h2>
          <p style={{ fontSize: '1.3rem', color: '#F8F6F2', margin: '0 0 30px 0', fontFamily: "'Protest Riot', sans-serif" }}>
            Plateforme complète de gestion de tournois e-sport
          </p>
          {!session && (
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/auth')}
                style={{
                  padding: '15px 40px',
                  background: '#C10468',
                  color: '#F8F6F2',
                  border: '2px solid #FF36A3',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Shadows Into Light', cursive",
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(193, 4, 104, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                  e.currentTarget.style.background = '#FF36A3';
                  e.currentTarget.style.borderColor = '#C10468';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 54, 163, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.background = '#C10468';
                  e.currentTarget.style.borderColor = '#FF36A3';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(193, 4, 104, 0.4)';
                }}
              >
                🔐 Se Connecter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>🏆 Tournois Disponibles</h2>
          <div style={{ fontSize: '0.95rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
            {tournaments.length} tournoi{tournaments.length > 1 ? 's' : ''} disponible{tournaments.length > 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#F8F6F2' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
            <p style={{ fontFamily: "'Protest Riot', sans-serif" }}>Chargement des tournois...</p>
          </div>
        ) : tournaments.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
            {tournaments.map((t) => {
              const statusStyle = getStatusStyle(t.status);
              
              return (
                <div
                  key={t.id}
                  onClick={() => navigate(`/tournament/${t.id}/public`)}
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
                    e.currentTarget.style.transform = 'translateY(-5px)';
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
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>{t.name}</h3>
                      <div style={{ fontSize: '0.85rem', color: '#F8F6F2', display: 'flex', gap: '15px', marginTop: '8px', flexWrap: 'wrap', fontFamily: "'Protest Riot', sans-serif" }}>
                        <span>🎮 {t.game}</span>
                        <span>📊 {getFormatLabel(t.format)}</span>
                      </div>
                    </div>
                    <span style={{
                      background: statusStyle.bg === '#f39c12' ? '#E7632C' : statusStyle.bg === '#27ae60' ? '#C10468' : '#FF36A3',
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

                  <div style={{ 
                    marginTop: '15px', 
                    paddingTop: '15px', 
                    borderTop: '2px solid #FF36A3',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
                      Créé le {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      background: '#C10468',
                      borderRadius: '5px',
                      fontSize: '0.85rem',
                      color: '#F8F6F2',
                      fontWeight: 'bold',
                      fontFamily: "'Protest Riot', sans-serif"
                    }}>
                      Voir le tournoi →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(3, 9, 19, 0.9)', borderRadius: '12px', border: '2px solid #FF36A3' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏆</div>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.5rem', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>Aucun tournoi disponible</h3>
            <p style={{ color: '#F8F6F2', margin: 0, fontFamily: "'Protest Riot', sans-serif" }}>
              Il n'y a actuellement aucun tournoi ouvert aux inscriptions.
            </p>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ 
        marginTop: '60px', 
        padding: '40px 30px', 
        background: 'rgba(3, 9, 19, 0.95)', 
        borderTop: '3px solid #FF36A3',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <p style={{ color: '#F8F6F2', margin: '0 0 10px 0', fontFamily: "'Protest Riot', sans-serif" }}>© 2024 Fluky Boys - Plateforme de gestion de tournois e-sport</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
            <a href="#" style={{ color: '#FF36A3', textDecoration: 'none', fontSize: '0.9rem', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#C10468'} onMouseLeave={(e) => e.currentTarget.style.color = '#FF36A3'}>À propos</a>
            <a href="#" style={{ color: '#FF36A3', textDecoration: 'none', fontSize: '0.9rem', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#C10468'} onMouseLeave={(e) => e.currentTarget.style.color = '#FF36A3'}>Contact</a>
            <a href="#" style={{ color: '#FF36A3', textDecoration: 'none', fontSize: '0.9rem', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#C10468'} onMouseLeave={(e) => e.currentTarget.style.color = '#FF36A3'}>Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}

