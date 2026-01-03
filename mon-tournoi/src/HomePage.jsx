import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

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
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .in('status', ['draft', 'ongoing'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement tournois:', error);
    } else {
      setTournaments(data || []);
    }
    setLoading(false);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'draft': return { bg: '#f39c12', text: 'Inscriptions ouvertes', icon: '📝' };
      case 'completed': return { bg: '#7f8c8d', text: 'Terminé', icon: '🏁' };
      default: return { bg: '#27ae60', text: 'En cours', icon: '⚔️' };
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
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: 'white' }}>
      {/* HEADER */}
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '20px 30px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#3498db', cursor: 'pointer' }} onClick={() => navigate('/')}>
              ⚔️ Mon Tournoi
            </h1>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {session ? (
              <>
                <button
                  onClick={() => navigate('/player/dashboard')}
                  style={{
                    padding: '10px 20px',
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.95rem'
                  }}
                >
                  🎮 Espace Joueur
                </button>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid #555',
                    color: '#aaa',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid #555',
                    color: '#aaa',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.95rem'
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
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', 
        padding: '60px 30px',
        textAlign: 'center',
        borderBottom: '1px solid #2a2a2a'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', margin: '0 0 20px 0', color: '#3498db', fontWeight: 'bold' }}>
            Organisez et participez à des tournois
          </h2>
          <p style={{ fontSize: '1.3rem', color: '#aaa', margin: '0 0 30px 0' }}>
            Plateforme complète de gestion de tournois e-sport
          </p>
          {!session && (
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/auth')}
                style={{
                  padding: '15px 40px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
          <h2 style={{ margin: 0, fontSize: '2rem', color: '#3498db' }}>🏆 Tournois Disponibles</h2>
          <div style={{ fontSize: '0.95rem', color: '#888' }}>
            {tournaments.length} tournoi{tournaments.length > 1 ? 's' : ''} disponible{tournaments.length > 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
            <p>Chargement des tournois...</p>
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
                    background: '#1a1a1a',
                    padding: '25px',
                    borderRadius: '12px',
                    border: '1px solid #2a2a2a',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3498db';
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(52, 152, 219, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2a2a2a';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: '#fff' }}>{t.name}</h3>
                      <div style={{ fontSize: '0.85rem', color: '#888', display: 'flex', gap: '15px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <span>🎮 {t.game}</span>
                        <span>📊 {getFormatLabel(t.format)}</span>
                      </div>
                    </div>
                    <span style={{
                      background: statusStyle.bg,
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>
                      {statusStyle.icon} {statusStyle.text}
                    </span>
                  </div>

                  <div style={{ 
                    marginTop: '15px', 
                    paddingTop: '15px', 
                    borderTop: '1px solid #2a2a2a',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#888' }}>
                      Créé le {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      background: '#2a2a2a',
                      borderRadius: '5px',
                      fontSize: '0.85rem',
                      color: '#3498db',
                      fontWeight: 'bold'
                    }}>
                      Voir le tournoi →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', background: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏆</div>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.5rem', color: '#fff' }}>Aucun tournoi disponible</h3>
            <p style={{ color: '#888', margin: 0 }}>
              Il n'y a actuellement aucun tournoi ouvert aux inscriptions.
            </p>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ 
        marginTop: '60px', 
        padding: '40px 30px', 
        background: '#1a1a1a', 
        borderTop: '1px solid #2a2a2a',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <p style={{ color: '#888', margin: '0 0 10px 0' }}>© 2024 Mon Tournoi - Plateforme de gestion de tournois e-sport</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
            <a href="#" style={{ color: '#3498db', textDecoration: 'none', fontSize: '0.9rem' }}>À propos</a>
            <a href="#" style={{ color: '#3498db', textDecoration: 'none', fontSize: '0.9rem' }}>Contact</a>
            <a href="#" style={{ color: '#3498db', textDecoration: 'none', fontSize: '0.9rem' }}>Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}

