import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function Dashboard({ session }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, [session]);

  const fetchTournaments = async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Erreur chargement:', error);
    else setTournaments(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Erreur lors de la déconnexion");
    else navigate('/');
  };

  const createTournament = async () => {
    if (!session?.user) return alert("Tu n'es pas connecté !");

    const name = prompt("Nom du tournoi ?");
    if (!name) return;

    const game = prompt("Quel est le jeu ?") || "Général";

    const { data, error } = await supabase
      .from('tournaments')
      .insert([{ 
        name, 
        game,
        format: 'Single Elimination', 
        owner_id: session.user.id, 
        status: 'draft' 
      }])
      .select()
      .single();

    if (error) {
      console.error("Erreur:", error);
      alert("Erreur : " + error.message);
    } else {
      navigate(`/tournament/${data.id}`);
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
    <div style={{ padding: '20px', color: 'white' }}>
      {/* HEADER AVEC BOUTONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Mes Tournois Récents</h1>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={createTournament}
            style={{ padding: '10px 20px', background: '#3498db', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + Créer un tournoi
          </button>

          <button 
            onClick={handleLogout}
            style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #e74c3c', borderRadius: '5px', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Déconnexion
          </button>
          <button 
  onClick={() => navigate('/profile')} 
  style={{ background: '#9b59b6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
>
  👤 Profil
</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {tournaments.map((t) => {
          const statusStyle = getStatusStyle(t.status);
          
          return (
            <div 
              key={t.id} 
              onClick={() => navigate(`/tournament/${t.id}`)}
              style={{ 
                background: '#1a1a1a', 
                padding: '20px', 
                borderRadius: '10px', 
                border: '1px solid #333', 
                cursor: 'pointer',
                position: 'relative',
                transition: 'transform 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '180px' // Augmenté pour laisser de la place au texte
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
                <h3 style={{ margin: '0 0 5px 0' }}>{t.name}</h3>
                
                {/* --- NOUVEAUX CHAMPS JEU ET FORMAT --- */}
                <div style={{ fontSize: '0.85rem', color: '#3498db', marginBottom: '2px' }}>🎮 {t.game}</div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '10px' }}>📊 {t.format}</div>
                
                <p style={{ color: '#555', fontSize: '0.75rem', margin: 0 }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  onClick={(e) => deleteTournament(e, t.id)}
                  style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.4 }}
                  onMouseEnter={(e) => e.target.style.opacity = '1'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.4'}
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {tournaments.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>Tu n'as aucun tournoi. Crées-en un !</p>
      )}
    </div>
  );
}