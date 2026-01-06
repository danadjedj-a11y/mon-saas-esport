import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import { handleRateLimitError } from './utils/rateLimitHandler';
import DashboardLayout from './layouts/DashboardLayout';

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
        const errorMessage = handleRateLimitError(error, 'créations d\'équipes');
        toast.error(errorMessage);
      } else {
        toast.success("Équipe créée avec succès !");
        navigate('/player/dashboard');
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'équipe:', error);
      const errorMessage = handleRateLimitError(error, 'créations d\'équipes');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-8">
          <h2 className="font-display text-4xl text-fluky-secondary mb-4" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>Créer mon Équipe</h2>
          <p className="text-fluky-text text-sm mb-8 font-body">
            Tu deviendras le <b>Capitaine</b> de cette équipe. C'est toi qui géreras les inscriptions aux tournois.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block mb-2 font-body text-fluky-text">Nom de l'équipe</label>
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
                className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              />
              <div className="text-xs text-fluky-text mt-1 font-body">
                {name.length}/{MAX_NAME_LENGTH} caractères
              </div>
            </div>

            <div>
              <label className="block mb-2 font-body text-fluky-text">Tag ({MIN_TAG_LENGTH}-{MAX_TAG_LENGTH} caractères)</label>
              <input 
                type="text" 
                placeholder="Ex: FNC" 
                maxLength={MAX_TAG_LENGTH}
                value={tag} 
                onChange={e => setTag(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} 
                className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg uppercase font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              />
              <div className="text-xs text-fluky-text mt-1 font-body">
                {tag.length}/{MAX_TAG_LENGTH} caractères (lettres et chiffres uniquement)
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`mt-2 px-6 py-4 border-2 border-fluky-secondary rounded-lg text-white font-display text-base uppercase tracking-wide transition-all duration-300 ${
                loading 
                  ? 'bg-fluky-primary/50 opacity-60 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-fluky-primary to-fluky-secondary hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50'
              }`}
            >
              {loading ? 'Création...' : 'Valider et créer l\'équipe'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}