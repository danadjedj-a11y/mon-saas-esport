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
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#030913' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px', background: 'rgba(3, 9, 19, 0.95)', borderRadius: '15px', color: '#F8F6F2', border: '2px solid #FF36A3', boxShadow: '0 8px 32px rgba(193, 4, 104, 0.3)' }}>
        <button 
          type="button"
          onClick={() => navigate(-1)} 
          style={{ 
            background: 'transparent', 
            border: '2px solid #C10468', 
            color: '#F8F6F2', 
            cursor: 'pointer', 
            marginBottom: '20px',
            padding: '8px 16px',
            borderRadius: '8px',
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
          ← Retour
        </button>
      
        <h2 style={{ color: '#FF36A3', marginTop: 0, fontFamily: "'Shadows Into Light', cursive", fontSize: '2rem' }}>Créer mon Équipe</h2>
        <p style={{ color: '#F8F6F2', fontSize: '0.9rem', marginBottom: '30px', fontFamily: "'Protest Riot', sans-serif" }}>
          Tu deviendras le <b>Capitaine</b> de cette équipe. C'est toi qui géreras les inscriptions aux tournois.
        </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontFamily: "'Protest Riot', sans-serif", color: '#F8F6F2' }}>Nom de l'équipe</label>
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
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: 'rgba(3, 9, 19, 0.8)', 
              border: '2px solid #C10468', 
              color: '#F8F6F2', 
              borderRadius: '8px',
              fontFamily: "'Protest Riot', sans-serif",
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FF36A3';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#C10468';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div style={{ fontSize: '0.75rem', color: '#F8F6F2', marginTop: '4px', fontFamily: "'Protest Riot', sans-serif" }}>
            {name.length}/{MAX_NAME_LENGTH} caractères
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontFamily: "'Protest Riot', sans-serif", color: '#F8F6F2' }}>Tag ({MIN_TAG_LENGTH}-{MAX_TAG_LENGTH} caractères)</label>
          <input 
            type="text" 
            placeholder="Ex: FNC" 
            maxLength={MAX_TAG_LENGTH}
            value={tag} 
            onChange={e => setTag(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} 
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: 'rgba(3, 9, 19, 0.8)', 
              border: '2px solid #C10468', 
              color: '#F8F6F2', 
              borderRadius: '8px', 
              textTransform: 'uppercase',
              fontFamily: "'Protest Riot', sans-serif",
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FF36A3';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#C10468';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div style={{ fontSize: '0.75rem', color: '#F8F6F2', marginTop: '4px', fontFamily: "'Protest Riot', sans-serif" }}>
            {tag.length}/{MAX_TAG_LENGTH} caractères (lettres et chiffres uniquement)
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            marginTop: '10px',
            padding: '15px', 
            background: loading ? 'rgba(193, 4, 104, 0.5)' : '#C10468', 
            color: '#F8F6F2', 
            border: '2px solid #FF36A3', 
            borderRadius: '8px', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            fontFamily: "'Shadows Into Light', cursive",
            fontSize: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s ease',
            opacity: loading ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#FF36A3';
              e.currentTarget.style.borderColor = '#C10468';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#C10468';
              e.currentTarget.style.borderColor = '#FF36A3';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {loading ? 'Création...' : 'Valider et créer l\'équipe'}
        </button>

      </form>
      </div>
    </div>
  );
}