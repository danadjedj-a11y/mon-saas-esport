import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import TemplateSelector from './components/TemplateSelector';

export default function CreateTournament({ session, supabase }) {
  const [name, setName] = useState('');
  const [game, setGame] = useState('Valorant');
  const [format, setFormat] = useState('elimination'); // Par défaut : Arbre
  const [date, setDate] = useState('');
  const [bestOf, setBestOf] = useState(1); // Best-of-X : 1 = single game, 3 = BO3, 5 = BO5, 7 = BO7
  const [mapsPool, setMapsPool] = useState(''); // Liste de cartes séparées par des virgules
  const [rules, setRules] = useState(''); // Règlement du tournoi (Markdown)
  const [maxParticipants, setMaxParticipants] = useState(''); // Nombre maximum de participants (vide = illimité)
  const [registrationDeadline, setRegistrationDeadline] = useState(''); // Date limite d'inscription
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Limites de sécurité
  const MAX_NAME_LENGTH = 100;
  const MAX_RULES_LENGTH = 5000;
  const MAX_MAPS_POOL_LENGTH = 500;
  const MAX_PARTICIPANTS = 1000;
  const MIN_PARTICIPANTS = 2;

  // Sanitizer pour les inputs
  const sanitizeInput = (text) => {
    return text.trim().replace(/[<>]/g, '');
  };

  // Sauvegarder la configuration actuelle comme template
  const handleSaveAsTemplate = async () => {
    if (!session?.user) {
      toast.error('Vous devez être connecté pour sauvegarder un template');
      return;
    }

    if (!name.trim()) {
      toast.error('Veuillez d\'abord donner un nom au tournoi');
      return;
    }

    try {
      // Convertir les dates en ISO si présentes
      let startDateISO = null;
      if (date) {
        const [datePart, timePart] = date.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const localDate = new Date(year, month - 1, day, hours, minutes, 0);
        startDateISO = localDate.toISOString();
      }

      let registrationDeadlineISO = null;
      if (registrationDeadline) {
        const [datePart, timePart] = registrationDeadline.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const localDate = new Date(year, month - 1, day, hours, minutes, 0);
        registrationDeadlineISO = localDate.toISOString();
      }

      // Préparer le maps_pool
      let mapsPoolArray = null;
      if (mapsPool.trim()) {
        mapsPoolArray = mapsPool.split(',').map(m => m.trim()).filter(m => m.length > 0);
      }

      const templateName = prompt('Nom du template:', `${name} - Template`);
      if (!templateName || !templateName.trim()) {
        return; // Utilisateur a annulé
      }

      const { error } = await supabase
        .from('tournament_templates')
        .insert([{
          name: sanitizeInput(templateName),
          description: `Template basé sur "${name}"`,
          owner_id: session.user.id,
          is_public: false, // Par défaut privé
          game: game,
          format: format,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          best_of: bestOf,
          check_in_window_minutes: 15, // Valeur par défaut
          registration_deadline: registrationDeadlineISO,
          start_date: startDateISO,
          rules: rules.trim() || null,
          maps_pool: mapsPoolArray
        }]);

      if (error) throw error;

      toast.success('Template sauvegardé avec succès !');
    } catch (err) {
      console.error('Erreur sauvegarde template:', err);
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation des inputs
      const sanitizedName = sanitizeInput(name);
      if (!sanitizedName || sanitizedName.length > MAX_NAME_LENGTH) {
        toast.error(`Le nom du tournoi est requis et ne peut pas dépasser ${MAX_NAME_LENGTH} caractères`);
        setLoading(false);
        return;
      }

      if (rules && rules.length > MAX_RULES_LENGTH) {
        toast.error(`Le règlement ne peut pas dépasser ${MAX_RULES_LENGTH} caractères`);
        setLoading(false);
        return;
      }

      if (maxParticipants) {
        const maxPartsNum = parseInt(maxParticipants);
        if (isNaN(maxPartsNum) || maxPartsNum < MIN_PARTICIPANTS || maxPartsNum > MAX_PARTICIPANTS) {
          toast.error(`Le nombre maximum de participants doit être entre ${MIN_PARTICIPANTS} et ${MAX_PARTICIPANTS}`);
          setLoading(false);
          return;
        }
      }
      // Convertir la date locale en ISO string pour éviter le décalage d'heure
      // datetime-local renvoie "YYYY-MM-DDTHH:mm" sans timezone
      // On doit construire la date en considérant qu'elle est en heure locale
      let startDateISO = null;
      if (date) {
        // Parser la date datetime-local (format: "YYYY-MM-DDTHH:mm")
        const [datePart, timePart] = date.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Créer la date en utilisant le constructeur avec paramètres numériques
        // Ce constructeur interprète toujours en heure locale
        const localDate = new Date(year, month - 1, day, hours, minutes, 0);
        
        // Convertir en ISO string (UTC) pour Supabase
        startDateISO = localDate.toISOString();
      }

      // Préparer le maps_pool (JSON array)
      let mapsPoolArray = [];
      if (mapsPool.trim()) {
        mapsPoolArray = mapsPool.split(',').map(m => m.trim()).filter(m => m.length > 0);
      }

      // Convertir la date limite d'inscription
      let registrationDeadlineISO = null;
      if (registrationDeadline) {
        const [datePart, timePart] = registrationDeadline.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const localDate = new Date(year, month - 1, day, hours, minutes, 0);
        registrationDeadlineISO = localDate.toISOString();
      }

      // Préparer max_participants (null si vide)
      const maxParticipantsNum = maxParticipants.trim() ? parseInt(maxParticipants) : null;

      // 1. Création du tournoi dans la base de données
      const { data, error } = await supabase
        .from('tournaments')
        .insert([
          { 
            name: sanitizedName, 
            game, 
            start_date: startDateISO, 
            owner_id: session.user.id,
            status: 'draft',
            format: format, // On enregistre le choix (elimination ou round_robin)
            best_of: bestOf,
            maps_pool: mapsPoolArray.length > 0 ? mapsPoolArray : null,
            rules: rules.trim() || null,
            max_participants: maxParticipantsNum,
            registration_deadline: registrationDeadlineISO
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // 2. Redirection vers la page de gestion du tournoi
      navigate(`/tournament/${data.id}`);

    } catch (error) {
      toast.error('Erreur lors de la création : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030913', padding: '40px 20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px', background: 'rgba(3, 9, 19, 0.95)', borderRadius: '15px', color: '#F8F6F2', border: '2px solid #FF36A3', boxShadow: '0 8px 32px rgba(193, 4, 104, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button 
            type="button"
            onClick={() => navigate('/organizer/dashboard')} 
            style={{
              background:'transparent', 
              border:'2px solid #C10468', 
              color:'#F8F6F2', 
              cursor:'pointer',
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
            ← Annuler
          </button>
          
          <button 
            type="button"
            onClick={handleSaveAsTemplate}
            style={{
              background:'transparent', 
              border:'2px solid #FF36A3', 
              color:'#FF36A3', 
              cursor:'pointer',
              padding: '8px 16px',
              borderRadius: '8px',
              fontFamily: "'Shadows Into Light', cursive",
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FF36A3';
              e.currentTarget.style.borderColor = '#C10468';
              e.currentTarget.style.color = '#F8F6F2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#FF36A3';
              e.currentTarget.style.color = '#FF36A3';
            }}
          >
            💾 Sauvegarder comme Template
          </button>
        </div>
      
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontSize: '2rem' }}>Organiser un nouveau tournoi</h2>
      
      {/* Sélecteur de Templates */}
      <TemplateSelector 
        session={session}
        onSelectTemplate={(templateData) => {
          // Appliquer les valeurs du template aux champs du formulaire
          if (templateData.name) setName(templateData.name);
          if (templateData.game) setGame(templateData.game);
          if (templateData.format) setFormat(templateData.format);
          if (templateData.max_participants) setMaxParticipants(templateData.max_participants?.toString() || '');
          if (templateData.best_of) setBestOf(templateData.best_of);
          if (templateData.rules) setRules(templateData.rules || '');
          if (templateData.maps_pool && Array.isArray(templateData.maps_pool)) {
            setMapsPool(templateData.maps_pool.join(', '));
          }
          // Dates (convertir ISO en format datetime-local)
          if (templateData.start_date) {
            const startDate = new Date(templateData.start_date);
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const hours = String(startDate.getHours()).padStart(2, '0');
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            setDate(`${year}-${month}-${day}T${hours}:${minutes}`);
          }
          if (templateData.registration_deadline) {
            const regDate = new Date(templateData.registration_deadline);
            const year = regDate.getFullYear();
            const month = String(regDate.getMonth() + 1).padStart(2, '0');
            const day = String(regDate.getDate()).padStart(2, '0');
            const hours = String(regDate.getHours()).padStart(2, '0');
            const minutes = String(regDate.getMinutes()).padStart(2, '0');
            setRegistrationDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
          }
        }}
        currentValues={{
          name,
          game,
          format,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          best_of: bestOf,
          rules,
          maps_pool: mapsPool ? mapsPool.split(',').map(m => m.trim()).filter(m => m) : null,
          registration_deadline: registrationDeadline || null,
          start_date: date || null
        }}
      />
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* NOM */}
        <div>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', fontFamily: "'Protest Riot', sans-serif", color: '#F8F6F2'}}>Nom de l'événement</label>
          <input 
            required 
            type="text" 
            placeholder="Ex: Weekly Cup #42"
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

        {/* JEU */}
        <div>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', fontFamily: "'Protest Riot', sans-serif", color: '#F8F6F2'}}>Jeu</label>
          <select 
            value={game} 
            onChange={e => setGame(e.target.value)} 
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
          >
            <option value="Valorant">Valorant</option>
            <option value="League of Legends">League of Legends</option>
            <option value="CS2">Counter-Strike 2</option>
            <option value="Rocket League">Rocket League</option>
            <option value="FC 24">FC 24</option>
          </select>
        </div>

        {/* FORMAT (LE CŒUR DU SUJET) */}
        <div style={{background:'rgba(3, 9, 19, 0.6)', padding:'15px', borderRadius:'12px', border:'2px solid #FF36A3'}}>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', color:'#FF36A3', fontFamily: "'Protest Riot', sans-serif"}}>Format de la compétition</label>
          <select 
            value={format} 
            onChange={e => setFormat(e.target.value)} 
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
          >
            <option value="elimination">🏆 Arbre à Élimination Directe</option>
            <option value="double_elimination">⚔️ Double Elimination</option>
            <option value="round_robin">🔄 Championnat (Round Robin)</option>
            <option value="swiss">🇨🇭 Système Suisse</option>
          </select>
          <p style={{fontSize:'0.85rem', color:'#F8F6F2', marginTop:'8px', fontStyle:'italic', fontFamily: "'Protest Riot', sans-serif"}}>
            {format === 'elimination' 
              ? "Classique. Le perdant rentre chez lui. Idéal pour les tournois rapides." 
              : format === 'double_elimination'
              ? "Deux brackets : Winners et Losers. Une deuxième chance après une défaite. Format esport professionnel."
              : format === 'round_robin'
              ? "Tout le monde joue contre tout le monde. Classement aux points (Victoire=3, Nul=1, Défaite=0)."
              : "Plusieurs rounds où les équipes sont appariées selon leur score. Pas d'élimination, classement final par victoires et tie-breaks."}
          </p>
        </div>

        {/* BEST-OF-X */}
        <div style={{background:'rgba(3, 9, 19, 0.6)', padding:'15px', borderRadius:'12px', border:'2px solid #FF36A3'}}>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', color:'#FF36A3', fontFamily: "'Protest Riot', sans-serif"}}>Format des Matchs (Best-of-X)</label>
          <select 
            value={bestOf} 
            onChange={e => setBestOf(parseInt(e.target.value))} 
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
          >
            <option value={1}>Single Game (1 manche)</option>
            <option value={3}>Best-of-3 (3 manches, premier à 2 victoires)</option>
            <option value={5}>Best-of-5 (5 manches, premier à 3 victoires)</option>
            <option value={7}>Best-of-7 (7 manches, premier à 4 victoires)</option>
          </select>
          <p style={{fontSize:'0.85rem', color:'#F8F6F2', marginTop:'8px', fontStyle:'italic', fontFamily: "'Protest Riot', sans-serif"}}>
            Détermine le nombre de manches par match. Le gagnant est la première équipe à remporter {Math.ceil(bestOf / 2)} manche{Math.ceil(bestOf / 2) > 1 ? 's' : ''}.
          </p>
        </div>

        {/* MAPS POOL */}
        {bestOf > 1 && (
          <div style={{background:'rgba(3, 9, 19, 0.6)', padding:'15px', borderRadius:'12px', border:'2px solid #FF36A3'}}>
            <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', color:'#FF36A3', fontFamily: "'Protest Riot', sans-serif"}}>Pool de Cartes (Optionnel)</label>
            <input 
              type="text" 
              placeholder="Ex: Bind, Haven, Split, Ascent, Icebox (séparées par des virgules)"
              value={mapsPool} 
              onChange={e => {
                const value = e.target.value;
                if (value.length <= MAX_MAPS_POOL_LENGTH) {
                  setMapsPool(value);
                }
              }}
              maxLength={MAX_MAPS_POOL_LENGTH}
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
              {mapsPool.length}/{MAX_MAPS_POOL_LENGTH} caractères
            </div>
            <p style={{fontSize:'0.85rem', color:'#F8F6F2', marginTop:'8px', fontStyle:'italic', fontFamily: "'Protest Riot', sans-serif"}}>
              Liste les cartes disponibles pour le tournoi. Les équipes pourront bannir/picker des cartes avant chaque match.
              {game === 'Valorant' && ' Exemples: Bind, Haven, Split, Ascent, Icebox, Breeze, Fracture'}
              {game === 'CS2' && ' Exemples: Dust2, Mirage, Inferno, Nuke, Overpass, Vertigo, Ancient'}
              {game === 'League of Legends' && ' (Non applicable - carte unique)'}
            </p>
          </div>
        )}

        {/* DATE */}
        <div>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', fontFamily: "'Protest Riot', sans-serif", color: '#F8F6F2'}}>Date de début</label>
          <input 
            required 
            type="datetime-local" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
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
        </div>

        {/* RÈGLEMENT */}
        <div style={{background:'rgba(3, 9, 19, 0.6)', padding:'15px', borderRadius:'12px', border:'2px solid #FF36A3'}}>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', color:'#FF36A3', fontFamily: "'Protest Riot', sans-serif"}}>📋 Règlement du Tournoi (Optionnel)</label>
          <textarea
            value={rules}
            onChange={e => {
              const value = e.target.value;
              if (value.length <= MAX_RULES_LENGTH) {
                setRules(value);
              }
            }}
            maxLength={MAX_RULES_LENGTH}
            placeholder="Exemple:&#10;&#10;## Règles Générales&#10;- Les matchs sont en Best-of-3&#10;- Les screenshots de fin de partie sont obligatoires&#10;&#10;## Récompenses&#10;- 1er : 500€&#10;- 2e : 250€&#10;&#10;## Sanctions&#10;- Abandon = Disqualification&#10;- Retard de plus de 10 min = Forfait"
            rows={8}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: 'rgba(3, 9, 19, 0.8)', 
              border: '2px solid #C10468', 
              color: '#F8F6F2', 
              borderRadius: '8px', 
              fontFamily: "'Protest Riot', sans-serif", 
              fontSize: '0.9rem',
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
            {rules.length}/{MAX_RULES_LENGTH} caractères
          </div>
          <p style={{fontSize:'0.85rem', color:'#F8F6F2', marginTop:'8px', fontStyle:'italic', fontFamily: "'Protest Riot', sans-serif"}}>
            Rédigez le règlement en Markdown. Il sera visible sur la page publique du tournoi. Les équipes pourront le consulter avant de s'inscrire.
          </p>
        </div>

        {/* LIMITATIONS D'INSCRIPTION */}
        <div style={{background:'rgba(3, 9, 19, 0.6)', padding:'15px', borderRadius:'12px', border:'2px solid #FF36A3'}}>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'10px', color:'#FF36A3', fontFamily: "'Protest Riot', sans-serif"}}>🚪 Limitations d'Inscription</label>
          
          <div style={{marginBottom:'15px'}}>
            <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', fontSize:'0.9rem', fontFamily: "'Protest Riot', sans-serif", color: '#F8F6F2'}}>Nombre maximum d'équipes (Laisser vide = illimité)</label>
            <input 
              type="number" 
              min={MIN_PARTICIPANTS}
              max={MAX_PARTICIPANTS}
              placeholder="Ex: 16, 32, 64..."
              value={maxParticipants}
              onChange={e => {
                const value = e.target.value;
                if (value === '' || (parseInt(value) >= MIN_PARTICIPANTS && parseInt(value) <= MAX_PARTICIPANTS)) {
                  setMaxParticipants(value);
                }
              }}
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
            <p style={{fontSize:'0.8rem', color:'#F8F6F2', marginTop:'5px', fontFamily: "'Protest Riot', sans-serif"}}>
              Si le nombre maximum est atteint, les équipes pourront s'inscrire sur une liste d'attente.
            </p>
          </div>

          <div>
            <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', fontSize:'0.9rem'}}>Date limite d'inscription (Optionnel)</label>
            <input 
              type="datetime-local" 
              value={registrationDeadline} 
              onChange={e => setRegistrationDeadline(e.target.value)} 
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
            <p style={{fontSize:'0.8rem', color:'#F8F6F2', marginTop:'5px', fontFamily: "'Protest Riot', sans-serif"}}>
              Après cette date, les inscriptions seront automatiquement fermées.
            </p>
          </div>
        </div>

        <button 
          disabled={loading} 
          type="submit" 
          style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#C10468', 
            color: '#F8F6F2', 
            border: '2px solid #FF36A3', 
            borderRadius: '8px', 
            fontFamily: "'Shadows Into Light', cursive",
            cursor: loading ? 'not-allowed' : 'pointer', 
            fontSize:'1.1rem',
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
          {loading ? 'Création en cours...' : '🚀 Lancer l\'événement'}
        </button>

      </form>
      </div>
    </div>
  );
}