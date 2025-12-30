import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ session }) {
  const [tournaments, setTournaments] = useState([]);
  const [newTournoiName, setNewTournoiName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getTournaments();
  }, []);

  const getTournaments = async () => {
    const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
    setTournaments(data || []);
  };

  const createTournament = async () => {
    if (!newTournoiName) return;
    const { data, error } = await supabase
      .from('tournaments')
      .insert([{ 
        name: newTournoiName, 
        owner_id: session.user.id, 
        game: 'Universal', 
        format: 'single_elim', 
        status: 'draft' 
      }])
      .select()
      .single();

    if (error) alert(error.message);
    else navigate(`/tournament/${data.id}`); // On redirige direct vers le nouveau tournoi
  };

  const deleteTournament = async (e, id) => {
    e.stopPropagation(); // Empêche le clic sur la carte
    if(!confirm("Supprimer ce tournoi définitivement ?")) return;
    
    await supabase.from('tournaments').delete().eq('id', id);
    getTournaments(); // On rafraichit la liste
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px', color: 'white', fontFamily: 'Arial' }}>
      
      {/* HEADER DASHBOARD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Mon Espace <span style={{color:'#4ade80'}}>eSport</span></h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer' }}>Déconnexion</button>
      </div>

      {/* SECTION CRÉATION RAPIDE */}
      <div style={{ background: '#1e1e1e', padding: '30px', borderRadius: '12px', border: '1px solid #333', marginBottom: '50px', display:'flex', gap:'20px', alignItems:'center' }}>
        <div style={{flex:1}}>
            <h3 style={{marginTop:0}}>Créer un nouveau tournoi</h3>
            <p style={{color:'#888', margin:0}}>Lancez une compétition en quelques secondes.</p>
        </div>
        <div style={{display:'flex', gap:'10px', flex:1}}>
            <input 
                type="text" 
                placeholder="Nom du tournoi (ex: Coupe d'Hiver)" 
                value={newTournoiName}
                onChange={(e) => setNewTournoiName(e.target.value)}
                style={{flex:1, padding:'12px', borderRadius:'6px', border:'1px solid #444', background:'#111', color:'white', outline:'none'}}
            />
            <button onClick={createTournament} style={{padding:'12px 25px', background:'#4ade80', color:'black', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>Créer +</button>
        </div>
      </div>

      {/* GRILLE DES TOURNOIS */}
      <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom:'20px' }}>Mes Tournois Récents</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {tournaments.length === 0 && <p style={{color:'#666'}}>Aucun tournoi pour l'instant.</p>}
        
        {tournaments.map((t) => (
          <div 
            key={t.id} 
            onClick={() => navigate(`/tournament/${t.id}`)}
            style={{ 
                background: '#252525', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid #333', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                position: 'relative'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'15px' }}>
                <span style={{ fontSize: '2rem' }}>🏆</span>
                <span style={{ fontSize: '0.8rem', padding:'4px 8px', borderRadius:'4px', background: t.status === 'ongoing' ? '#166534' : '#333', color: t.status === 'ongoing' ? '#4ade80' : '#888' }}>
                    {t.status === 'draft' ? 'Brouillon' : 'En cours'}
                </span>
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize:'1.2rem' }}>{t.name}</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>Créé le {new Date(t.created_at).toLocaleDateString()}</p>
            
            <button 
                onClick={(e) => deleteTournament(e, t.id)} 
                style={{position:'absolute', bottom:'20px', right:'20px', background:'transparent', border:'none', color:'#444', cursor:'pointer', fontSize:'1.2rem'}}
                title="Supprimer"
            >
                🗑️
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}