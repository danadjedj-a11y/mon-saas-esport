import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';

export default function CreateTeam({ session, supabase }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState(''); // Ex: "SKT"
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const MAX_NAME_LENGTH = 50;
  const MAX_TAG_LENGTH = 5;
  const MIN_TAG_LENGTH = 2;

  // Sanitizer pour les noms
  const sanitizeInput = (text) => {
    return text.trim().replace(/[<>]/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const sanitizedName = sanitizeInput(name);
    const sanitizedTag = sanitizeInput(tag);

    if (!sanitizedName || !sanitizedTag) {
      toast.error("Nom et Tag obligatoires");
      return;
    }

    if (sanitizedName.length > MAX_NAME_LENGTH) {
      toast.error(`Le nom de l'équipe ne peut pas dépasser ${MAX_NAME_LENGTH} caractères`);
      return;
    }

    if (sanitizedTag.length < MIN_TAG_LENGTH || sanitizedTag.length > MAX_TAG_LENGTH) {
      toast.error(`Le tag doit contenir entre ${MIN_TAG_LENGTH} et ${MAX_TAG_LENGTH} caractères`);
      return;
    }
    
    setLoading(true);

    try {
      // Création de l'équipe (L'utilisateur connecté devient automatiquement captain_id grâce à Supabase)
      const { data, error } = await supabase
        .from('teams')
        .insert([
          { 
            name: sanitizedName, 
            tag: sanitizedTag.toUpperCase().replace(/[^A-Z0-9]/g, ''), // On force le tag en majuscules et on enlève les caractères non alphanumériques
            captain_id: session.user.id 
          }
        ])
        .select();

      if (error) {
        toast.error("Erreur: " + error.message);
      } else {
        toast.success("Équipe créée avec succès !");
        navigate('/player/dashboard');
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'équipe:', error);
      toast.error('Erreur lors de la création de l\'équipe');
    } finally {
      setLoading(false);
    }
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
            onChange={e => {
              const value = e.target.value;
              if (value.length <= MAX_NAME_LENGTH) {
                setName(value);
              }
            }}
            maxLength={MAX_NAME_LENGTH}
            style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: 'white', borderRadius: '5px' }}
          />
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
            {name.length}/{MAX_NAME_LENGTH} caractères
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>Tag ({MIN_TAG_LENGTH}-{MAX_TAG_LENGTH} caractères)</label>
          <input 
            type="text" 
            placeholder="Ex: FNC" 
            maxLength={MAX_TAG_LENGTH}
            value={tag} 
            onChange={e => setTag(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} 
            style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: 'white', borderRadius: '5px', textTransform: 'uppercase' }}
          />
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
            {tag.length}/{MAX_TAG_LENGTH} caractères (lettres et chiffres uniquement)
          </div>
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