import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import { handleRateLimitError } from './utils/rateLimitHandler';
import TemplateSelector from './components/TemplateSelector';
import DashboardLayout from './layouts/DashboardLayout';

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
      const errorMessage = handleRateLimitError(err, 'templates');
      toast.error(errorMessage);
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
      const errorMessage = handleRateLimitError(error, 'créations de tournois');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <button 
              type="button"
              onClick={() => navigate('/organizer/dashboard')} 
              className="px-4 py-2 bg-transparent border-2 border-fluky-primary text-fluky-text rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 hover:bg-fluky-primary hover:border-fluky-secondary"
            >
              ← Annuler
            </button>
            
            <button 
              type="button"
              onClick={handleSaveAsTemplate}
              className="px-4 py-2 bg-transparent border-2 border-fluky-secondary text-fluky-secondary rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 hover:bg-fluky-secondary hover:text-white"
            >
              💾 Sauvegarder comme Template
            </button>
          </div>
      
          <h2 className="text-center mb-8 font-display text-4xl text-fluky-secondary" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>Organiser un nouveau tournoi</h2>
      
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
      
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* NOM */}
            <div>
              <label className="font-bold block mb-2 font-body text-fluky-text">Nom de l'événement</label>
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
                className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              />
              <div className="text-xs text-fluky-text mt-1 font-body">
                {name.length}/{MAX_NAME_LENGTH} caractères
              </div>
            </div>

            {/* JEU */}
            <div>
              <label className="font-bold block mb-2 font-body text-fluky-text">Jeu</label>
              <select 
                value={game} 
                onChange={e => setGame(e.target.value)} 
                className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              >
                <option value="Valorant">Valorant</option>
                <option value="League of Legends">League of Legends</option>
                <option value="CS2">Counter-Strike 2</option>
                <option value="Rocket League">Rocket League</option>
                <option value="FC 24">FC 24</option>
              </select>
            </div>

            {/* FORMAT (LE CŒUR DU SUJET) */}
            <div className="bg-[#030913]/60 p-4 rounded-xl border border-fluky-secondary">
              <label className="font-bold block mb-2 text-fluky-secondary font-body">Format de la compétition</label>
              <select 
                value={format} 
                onChange={e => setFormat(e.target.value)} 
                className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              >
                <option value="elimination">🏆 Arbre à Élimination Directe</option>
                <option value="double_elimination">⚔️ Double Elimination</option>
                <option value="round_robin">🔄 Championnat (Round Robin)</option>
                <option value="swiss">🇨🇭 Système Suisse</option>
              </select>
              <p className="text-sm text-fluky-text mt-2 italic font-body">
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
            <div className="bg-[#030913]/60 p-4 rounded-xl border border-fluky-secondary">
              <label className="font-bold block mb-2 text-fluky-secondary font-body">Format des Matchs (Best-of-X)</label>
              <select 
                value={bestOf} 
                onChange={e => setBestOf(parseInt(e.target.value))} 
                className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              >
                <option value={1}>Single Game (1 manche)</option>
                <option value={3}>Best-of-3 (3 manches, premier à 2 victoires)</option>
                <option value={5}>Best-of-5 (5 manches, premier à 3 victoires)</option>
                <option value={7}>Best-of-7 (7 manches, premier à 4 victoires)</option>
              </select>
              <p className="text-sm text-fluky-text mt-2 italic font-body">
                Détermine le nombre de manches par match. Le gagnant est la première équipe à remporter {Math.ceil(bestOf / 2)} manche{Math.ceil(bestOf / 2) > 1 ? 's' : ''}.
              </p>
            </div>

            {/* MAPS POOL */}
            {bestOf > 1 && (
              <div className="bg-[#030913]/60 p-4 rounded-xl border border-fluky-secondary">
                <label className="font-bold block mb-2 text-fluky-secondary font-body">Pool de Cartes (Optionnel)</label>
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
                  className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
                />
                <div className="text-xs text-fluky-text mt-1 font-body">
                  {mapsPool.length}/{MAX_MAPS_POOL_LENGTH} caractères
                </div>
                <p className="text-sm text-fluky-text mt-2 italic font-body">
                  Liste les cartes disponibles pour le tournoi. Les équipes pourront bannir/picker des cartes avant chaque match.
                  {game === 'Valorant' && ' Exemples: Bind, Haven, Split, Ascent, Icebox, Breeze, Fracture'}
                  {game === 'CS2' && ' Exemples: Dust2, Mirage, Inferno, Nuke, Overpass, Vertigo, Ancient'}
                  {game === 'League of Legends' && ' (Non applicable - carte unique)'}
                </p>
              </div>
            )}

            {/* DATE */}
            <div>
              <label className="font-bold block mb-2 font-body text-fluky-text">Date de début</label>
              <input 
                required 
                type="datetime-local" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              />
            </div>

            {/* RÈGLEMENT */}
            <div className="bg-[#030913]/60 p-4 rounded-xl border border-fluky-secondary">
              <label className="font-bold block mb-2 text-fluky-secondary font-body">📋 Règlement du Tournoi (Optionnel)</label>
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
                className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-sm transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              />
              <div className="text-xs text-fluky-text mt-1 font-body">
                {rules.length}/{MAX_RULES_LENGTH} caractères
              </div>
              <p className="text-sm text-fluky-text mt-2 italic font-body">
                Rédigez le règlement en Markdown. Il sera visible sur la page publique du tournoi. Les équipes pourront le consulter avant de s'inscrire.
              </p>
            </div>

            {/* LIMITATIONS D'INSCRIPTION */}
            <div className="bg-[#030913]/60 p-4 rounded-xl border border-fluky-secondary">
              <label className="font-bold block mb-3 text-fluky-secondary font-body">🚪 Limitations d'Inscription</label>
              
              <div className="mb-4">
                <label className="font-bold block mb-2 text-sm font-body text-fluky-text">Nombre maximum d'équipes (Laisser vide = illimité)</label>
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
                  className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
                />
                <p className="text-xs text-fluky-text mt-1 font-body">
                  Si le nombre maximum est atteint, les équipes pourront s'inscrire sur une liste d'attente.
                </p>
              </div>

              <div>
                <label className="font-bold block mb-2 text-sm font-body text-fluky-text">Date limite d'inscription (Optionnel)</label>
                <input 
                  type="datetime-local" 
                  value={registrationDeadline} 
                  onChange={e => setRegistrationDeadline(e.target.value)} 
                  className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
                />
                <p className="text-xs text-fluky-text mt-1 font-body">
                  Après cette date, les inscriptions seront automatiquement fermées.
                </p>
              </div>
            </div>

            <button 
              disabled={loading} 
              type="submit" 
              className={`mt-5 px-6 py-4 border-2 border-fluky-secondary rounded-lg text-white font-display text-lg uppercase tracking-wide transition-all duration-300 ${
                loading 
                  ? 'bg-fluky-primary/50 opacity-60 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-fluky-primary to-fluky-secondary hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50'
              }`}
            >
              {loading ? 'Création en cours...' : '🚀 Lancer l\'événement'}
            </button>

          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}