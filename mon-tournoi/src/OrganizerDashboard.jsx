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
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) console.error('Erreur chargement:', error);
    else setTournaments(data || []);
    setLoading(false);
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
      case 'draft': return { bg: '#f39c12', text: 'Brouillon' };
      case 'completed': return { bg: '#7f8c8d', text: 'Terminé' };
      default: return { bg: '#27ae60', text: 'En cours' };
    }
  };

  if (loading) return <div style={{color:'white', padding:'20px'}}>Chargement...</div>;

  return (
    <div style={{ padding: '20px', color: 'white', minHeight: '100vh', background: '#0a0a0a' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#8e44ad', fontSize: '2rem' }}>🎯 Espace Organisateur</h1>
          <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.9rem' }}>Gérez vos tournois et événements</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => navigate('/create-tournament')} 
            style={{ padding: '12px 24px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
          >
            + Créer un Tournoi
          </button>


          <NotificationCenter session={session} supabase={supabase} />

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

      {/* STATISTIQUES RAPIDES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
          <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px' }}>Total Tournois</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8e44ad' }}>{tournaments.length}</div>
        </div>
        <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
          <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px' }}>En cours</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>{tournaments.filter(t => t.status === 'ongoing').length}</div>
        </div>
        <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
          <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px' }}>Brouillons</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f39c12' }}>{tournaments.filter(t => t.status === 'draft').length}</div>
        </div>
        <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
          <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px' }}>Terminés</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7f8c8d' }}>{tournaments.filter(t => t.status === 'completed').length}</div>
        </div>
      </div>

      {/* LISTE DES TOURNOIS */}
      <div>
        <h2 style={{ marginBottom: '20px', color: '#00d4ff' }}>Mes Tournois</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {tournaments.map((t) => {
            const statusStyle = getStatusStyle(t.status);
            
            return (
              <div 
                key={t.id} 
                onClick={() => navigate(`/organizer/tournament/${t.id}`)}
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
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(142, 68, 173, 0.3)';
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
                    Créé le {new Date(t.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                  <button 
                    onClick={(e) => deleteTournament(e, t.id)}
                    style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.4, padding: '5px' }}
                    onMouseEnter={(e) => e.target.style.opacity = '1'}
                    onMouseLeave={(e) => e.target.style.opacity = '0.4'}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {tournaments.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', marginTop: '50px', padding: '40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎯</div>
          <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Aucun tournoi créé</p>
          <p style={{ color: '#888', marginBottom: '20px' }}>Créez votre premier tournoi pour commencer à organiser</p>
          <button 
            onClick={() => navigate('/create-tournament')} 
            style={{ padding: '12px 24px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
          >
            + Créer mon Premier Tournoi
          </button>
        </div>
      )}
    </div>
  );
}

