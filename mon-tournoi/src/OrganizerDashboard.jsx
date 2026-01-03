import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import NotificationCenter from './NotificationCenter';

export default function OrganizerDashboard({ session }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
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
    const { error } = await supabase.auth.signOut();
    if (error) alert("Erreur lors de la déconnexion");
    else navigate('/');
  };

  const deleteTournament = async (e, id) => {
    e.stopPropagation();
    if (!confirm("⚠️ Supprimer ce tournoi et tous ses matchs ? C'est irréversible.")) return;

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Impossible de supprimer.");
      console.error(error);
    } else {
      setTournaments(tournaments.filter(t => t.id !== id));
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'draft': return { bg: '#f39c12', text: 'Brouillon', icon: '📝' };
      case 'completed': return { bg: '#7f8c8d', text: 'Terminé', icon: '🏁' };
      default: return { bg: '#27ae60', text: 'En cours', icon: '⚔️' };
    }
  };

  if (loading) return <div style={{color:'white', padding:'20px'}}>Chargement...</div>;

  // Statistiques
  const draftCount = tournaments.filter(t => t.status === 'draft').length;
  const ongoingCount = tournaments.filter(t => t.status === 'ongoing').length;
  const completedCount = tournaments.filter(t => t.status === 'completed').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: 'white' }}>
      {/* HEADER */}
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '15px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#8e44ad' }}>🎯 Mon Tournoi - Organisateur</h1>
            <nav style={{ display: 'flex', gap: '20px' }}>
              <a href="#" style={{ color: '#8e44ad', textDecoration: 'none', fontWeight: 'bold' }}>Mes Tournois</a>
              <a onClick={() => navigate('/create-tournament')} style={{ color: '#888', textDecoration: 'none', cursor: 'pointer' }}>Créer un Tournoi</a>
            </nav>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <NotificationCenter session={session} supabase={supabase} />
            <button 
              onClick={() => navigate('/create-tournament')} 
              style={{ padding: '10px 20px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}
            >
              + Créer un Tournoi
            </button>
            <button 
              onClick={() => navigate('/profile')} 
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #555', color: '#aaa', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Paramètres
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
        {/* STATISTIQUES RAPIDES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '10px', border: '1px solid #2a2a2a', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8e44ad', marginBottom: '10px' }}>{tournaments.length}</div>
            <div style={{ fontSize: '0.95rem', color: '#888' }}>Total Tournois</div>
          </div>
          <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '10px', border: '1px solid #2a2a2a', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#27ae60', marginBottom: '10px' }}>{ongoingCount}</div>
            <div style={{ fontSize: '0.95rem', color: '#888' }}>En cours</div>
          </div>
          <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '10px', border: '1px solid #2a2a2a', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f39c12', marginBottom: '10px' }}>{draftCount}</div>
            <div style={{ fontSize: '0.95rem', color: '#888' }}>Brouillons</div>
          </div>
          <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '10px', border: '1px solid #2a2a2a', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '10px' }}>{completedCount}</div>
            <div style={{ fontSize: '0.95rem', color: '#888' }}>Terminés</div>
          </div>
        </div>

        {/* ACTIONS RAPIDES */}
        <div style={{ background: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)', padding: '25px', borderRadius: '10px', marginBottom: '40px', border: '1px solid #8e44ad' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: 'white' }}>🚀 Prêt à créer un nouveau tournoi ?</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>
                Organisez votre événement en quelques clics
              </p>
            </div>
            <button 
              onClick={() => navigate('/create-tournament')} 
              style={{ 
                padding: '12px 30px', 
                background: 'white', 
                color: '#8e44ad', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                fontSize: '1rem',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Créer un Tournoi
            </button>
          </div>
        </div>

        {/* LISTE DES TOURNOIS */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#8e44ad' }}>Mes Tournois</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                style={{ 
                  padding: '8px 16px', 
                  background: draftCount > 0 ? '#f39c12' : '#2a2a2a', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Brouillons ({draftCount})
              </button>
              <button 
                style={{ 
                  padding: '8px 16px', 
                  background: ongoingCount > 0 ? '#27ae60' : '#2a2a2a', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                En cours ({ongoingCount})
              </button>
              <button 
                style={{ 
                  padding: '8px 16px', 
                  background: completedCount > 0 ? '#7f8c8d' : '#2a2a2a', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Terminés ({completedCount})
              </button>
            </div>
          </div>

          {tournaments.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {tournaments.map((t) => {
                const statusStyle = getStatusStyle(t.status);
                
                return (
                  <div 
                    key={t.id} 
                    onClick={() => navigate(`/organizer/tournament/${t.id}`)}
                    style={{ 
                      background: '#1a1a1a', 
                      padding: '25px', 
                      borderRadius: '10px', 
                      border: '1px solid #2a2a2a', 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#8e44ad';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(142, 68, 173, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2a2a2a';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#fff' }}>{t.name}</h3>
                        <div style={{ fontSize: '0.85rem', color: '#888', display: 'flex', gap: '15px', marginTop: '8px' }}>
                          <span>🎮 {t.game}</span>
                          <span>📊 {t.format}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
                          Créé le {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #2a2a2a' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTournament(e, t.id);
                        }}
                        style={{ 
                          background: 'transparent', 
                          border: '1px solid #e74c3c', 
                          color: '#e74c3c',
                          padding: '6px 12px', 
                          borderRadius: '5px', 
                          cursor: 'pointer', 
                          fontSize: '0.85rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#e74c3c';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#e74c3c';
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
            <div style={{ background: '#1a1a1a', padding: '60px', borderRadius: '10px', textAlign: 'center', border: '1px solid #2a2a2a' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎯</div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3rem', color: '#fff' }}>Aucun tournoi créé</h3>
              <p style={{ color: '#888', marginBottom: '30px' }}>Créez votre premier tournoi pour commencer à organiser</p>
              <button 
                onClick={() => navigate('/create-tournament')} 
                style={{ 
                  padding: '12px 30px', 
                  background: '#8e44ad', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  fontSize: '1rem'
                }}
              >
                + Créer mon Premier Tournoi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
