import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateTeam({ session, supabase }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState(''); // Ex: "SKT"
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !tag) return alert("Nom et Tag obligatoires");
    
    setLoading(true);

    // Création de l'équipe (L'utilisateur connecté devient automatiquement captain_id grâce à Supabase)
    const { data, error } = await supabase
      .from('teams')
      .insert([
        { 
          name: name, 
          tag: tag.toUpperCase(), // On force le tag en majuscules
          captain_id: session.user.id 
        }
      ])
      .select();

    if (error) {
      alert("Erreur: " + error.message);
    } else {
      alert("Équipe créée avec succès !");
      navigate('/dashboard'); // Retour au dashboard
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '500px', margin: '50px auto', background: '#1a1a1a', borderRadius: '15px', color: 'white', border: '1px solid #333' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '20px' }}>← Retour</button>
      
      <h2 style={{ color: '#00d4ff', marginTop: 0 }}>Créer mon Équipe</h2>
      <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '30px' }}>
        Tu deviendras le <b>Capitaine</b> de cette équipe. C'est toi qui géreras les inscriptions aux tournois.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>Nom de l'équipe</label>
          <input 
            type="text" 
            placeholder="Ex: T1, Cloud9..." 
            value={name} 
            onChange={e => setName(e.target.value)} 
            style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: 'white', borderRadius: '5px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>Tag (3-4 lettres)</label>
          <input 
            type="text" 
            placeholder="Ex: FNC" 
            maxLength={5}
            value={tag} 
            onChange={e => setTag(e.target.value)} 
            style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: 'white', borderRadius: '5px', textTransform: 'uppercase' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            marginTop: '10px',
            padding: '15px', 
            background: loading ? '#555' : '#8e44ad', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          {loading ? 'Création...' : 'Valider et créer l\'équipe'}
        </button>

      </form>
    </div>
  );
}