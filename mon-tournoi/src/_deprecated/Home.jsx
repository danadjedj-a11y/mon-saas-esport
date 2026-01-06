import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';

export default function Home({ session }) {
  const [nomTournoi, setNomTournoi] = useState('');
  const [liste, setListe] = useState([]);
  const navigate = useNavigate();

  // Charger la liste des tournois existants
  useEffect(() => {
    const fetchTournaments = async () => {
      let { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
      setListe(data || []);
    };
    fetchTournaments();
  }, []);

  const creerTournoi = async () => {
    if (!nomTournoi) {
      toast.warning("Donne un nom !");
      return;
    }
    
    // NOUVEAU CODE : On utilise la nouvelle structure SQL "Pro"
    const { data, error } = await supabase
      .from('tournaments')
      .insert([{ 
        name: nomTournoi, 
        owner_id: session.user.id, // <--- C'est ici que la magie opère !
        game: 'Universal', 
        format: 'single_elim',
        status: 'draft'
      }])
      .select();

    if (error) {
      console.error(error);
      toast.error("Erreur: " + error.message);
    } else {
      navigate(`/tournoi/${data[0].id}`);
    }
  };

  return (
    <div style={{ padding: '50px', color: 'white', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#00d4ff' }}>🏆 Toornament Clone</h1>
      
      <div style={{ background: '#222', padding: '30px', borderRadius: '10px', maxWidth: '500px', margin: '0 auto' }}>
        <h3>Créer un nouveau tournoi</h3>
        <input 
          type="text" 
          placeholder="Nom du tournoi (ex: LAN de Samedi)" 
          value={nomTournoi}
          onChange={e => setNomTournoi(e.target.value)}
          style={{ padding: '10px', width: '70%', marginRight: '10px' }}
        />
        <button onClick={creerTournoi} style={{ padding: '10px 20px', background: '#00d4ff', border: 'none', cursor: 'pointer' }}>Créer</button>
      </div>

      <h3 style={{ marginTop: '50px' }}>Tournois en cours :</h3>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {liste.map(t => (
          <Link key={t.id} to={`/tournoi/${t.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#333', padding: '20px', borderRadius: '8px', color: 'white', width: '200px', border: '1px solid #444' }}>
              <h4>{t.name}</h4>
              <span style={{ color: t.status === 'open' ? '#4ade80' : 'orange' }}>
                {t.status === 'open' ? '🟢 Inscriptions' : '🟠 En cours'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}