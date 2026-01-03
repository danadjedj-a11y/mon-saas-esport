import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
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
            name, 
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
      alert('Erreur lors de la création : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '40px', background: '#1a1a1a', borderRadius: '15px', color: 'white', border: '1px solid #333' }}>
      <button onClick={() => navigate('/organizer/dashboard')} style={{background:'transparent', border:'none', color:'#888', cursor:'pointer', marginBottom:'20px'}}>← Annuler</button>
      
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#00d4ff' }}>Organiser un nouveau tournoi</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* NOM */}
        <div>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px'}}>Nom de l'événement</label>
          <input 
            required 
            type="text" 
            placeholder="Ex: Weekly Cup #42"
            value={name} 
            onChange={e => setName(e.target.value)} 
            style={{ width: '100%', padding: '12px', background: '#252525', border: '1px solid #444', color: 'white', borderRadius: '8px' }} 
          />
        </div>

        {/* JEU */}
        <div>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px'}}>Jeu</label>
          <select 
            value={game} 
            onChange={e => setGame(e.target.value)} 
            style={{ width: '100%', padding: '12px', background: '#252525', border: '1px solid #444', color: 'white', borderRadius: '8px' }}
          >
            <option value="Valorant">Valorant</option>
            <option value="League of Legends">League of Legends</option>
            <option value="CS2">Counter-Strike 2</option>
            <option value="Rocket League">Rocket League</option>
            <option value="FC 24">FC 24</option>
          </select>
        </div>

        {/* FORMAT (LE CŒUR DU SUJET) */}
        <div style={{background:'#2a2a2a', padding:'15px', borderRadius:'8px', border:'1px solid #8e44ad'}}>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', color:'#cd84f1'}}>Format de la compétition</label>
          <select 
            value={format} 
            onChange={e => setFormat(e.target.value)} 
            style={{ width: '100%', padding: '12px', background: '#1a1a1a', border: '1px solid #8e44ad', color: 'white', borderRadius: '8px' }}
          >
            <option value="elimination">🏆 Arbre à Élimination Directe</option>
            <option value="double_elimination">⚔️ Double Elimination</option>
            <option value="round_robin">🔄 Championnat (Round Robin)</option>
            <option value="swiss">🇨🇭 Système Suisse</option>
          </select>
          <p style={{fontSize:'0.85rem', color:'#aaa', marginTop:'8px', fontStyle:'italic'}}>
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
        <div style={{background:'#2a2a2a', padding:'15px', borderRadius:'8px', border:'1px solid #3498db'}}>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', color:'#5dade2'}}>Format des Matchs (Best-of-X)</label>
          <select 
            value={bestOf} 
            onChange={e => setBestOf(parseInt(e.target.value))} 
            style={{ width: '100%', padding: '12px', background: '#1a1a1a', border: '1px solid #3498db', color: 'white', borderRadius: '8px' }}
          >
            <option value={1}>Single Game (1 manche)</option>
            <option value={3}>Best-of-3 (3 manches, premier à 2 victoires)</option>
            <option value={5}>Best-of-5 (5 manches, premier à 3 victoires)</option>
            <option value={7}>Best-of-7 (7 manches, premier à 4 victoires)</option>
          </select>
          <p style={{fontSize:'0.85rem', color:'#aaa', marginTop:'8px', fontStyle:'italic'}}>
            Détermine le nombre de manches par match. Le gagnant est la première équipe à remporter {Math.ceil(bestOf / 2)} manche{Math.ceil(bestOf / 2) > 1 ? 's' : ''}.
          </p>
        </div>

        {/* MAPS POOL */}
        {bestOf > 1 && (
          <div style={{background:'#2a2a2a', padding:'15px', borderRadius:'8px', border:'1px solid #f39c12'}}>
            <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', color:'#f7dc6f'}}>Pool de Cartes (Optionnel)</label>
            <input 
              type="text" 
              placeholder="Ex: Bind, Haven, Split, Ascent, Icebox (séparées par des virgules)"
              value={mapsPool} 
              onChange={e => setMapsPool(e.target.value)} 
              style={{ width: '100%', padding: '12px', background: '#1a1a1a', border: '1px solid #f39c12', color: 'white', borderRadius: '8px' }} 
            />
            <p style={{fontSize:'0.85rem', color:'#aaa', marginTop:'8px', fontStyle:'italic'}}>
              Liste les cartes disponibles pour le tournoi. Les équipes pourront bannir/picker des cartes avant chaque match.
              {game === 'Valorant' && ' Exemples: Bind, Haven, Split, Ascent, Icebox, Breeze, Fracture'}
              {game === 'CS2' && ' Exemples: Dust2, Mirage, Inferno, Nuke, Overpass, Vertigo, Ancient'}
              {game === 'League of Legends' && ' (Non applicable - carte unique)'}
            </p>
          </div>
        )}

        {/* DATE */}
        <div>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px'}}>Date de début</label>
          <input 
            required 
            type="datetime-local" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            style={{ width: '100%', padding: '12px', background: '#252525', border: '1px solid #444', color: 'white', borderRadius: '8px' }} 
          />
        </div>

        {/* RÈGLEMENT */}
        <div style={{background:'#2a2a2a', padding:'15px', borderRadius:'8px', border:'1px solid #e74c3c'}}>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', color:'#ec7063'}}>📋 Règlement du Tournoi (Optionnel)</label>
          <textarea
            value={rules}
            onChange={e => setRules(e.target.value)}
            placeholder="Exemple:&#10;&#10;## Règles Générales&#10;- Les matchs sont en Best-of-3&#10;- Les screenshots de fin de partie sont obligatoires&#10;&#10;## Récompenses&#10;- 1er : 500€&#10;- 2e : 250€&#10;&#10;## Sanctions&#10;- Abandon = Disqualification&#10;- Retard de plus de 10 min = Forfait"
            rows={8}
            style={{ width: '100%', padding: '12px', background: '#1a1a1a', border: '1px solid #e74c3c', color: 'white', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.9rem' }}
          />
          <p style={{fontSize:'0.85rem', color:'#aaa', marginTop:'8px', fontStyle:'italic'}}>
            Rédigez le règlement en Markdown. Il sera visible sur la page publique du tournoi. Les équipes pourront le consulter avant de s'inscrire.
          </p>
        </div>

        {/* LIMITATIONS D'INSCRIPTION */}
        <div style={{background:'#2a2a2a', padding:'15px', borderRadius:'8px', border:'1px solid #f39c12'}}>
          <label style={{fontWeight:'bold', display:'block', marginBottom:'10px', color:'#f7dc6f'}}>🚪 Limitations d'Inscription</label>
          
          <div style={{marginBottom:'15px'}}>
            <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', fontSize:'0.9rem'}}>Nombre maximum d'équipes (Laisser vide = illimité)</label>
            <input 
              type="number" 
              min="2"
              placeholder="Ex: 16, 32, 64..."
              value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)} 
              style={{ width: '100%', padding: '12px', background: '#1a1a1a', border: '1px solid #f39c12', color: 'white', borderRadius: '8px' }} 
            />
            <p style={{fontSize:'0.8rem', color:'#aaa', marginTop:'5px'}}>
              Si le nombre maximum est atteint, les équipes pourront s'inscrire sur une liste d'attente.
            </p>
          </div>

          <div>
            <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', fontSize:'0.9rem'}}>Date limite d'inscription (Optionnel)</label>
            <input 
              type="datetime-local" 
              value={registrationDeadline} 
              onChange={e => setRegistrationDeadline(e.target.value)} 
              style={{ width: '100%', padding: '12px', background: '#1a1a1a', border: '1px solid #f39c12', color: 'white', borderRadius: '8px' }} 
            />
            <p style={{fontSize:'0.8rem', color:'#aaa', marginTop:'5px'}}>
              Après cette date, les inscriptions seront automatiquement fermées.
            </p>
          </div>
        </div>

        <button 
          disabled={loading} 
          type="submit" 
          style={{ marginTop: '20px', padding: '15px', background: 'linear-gradient(45deg, #8e44ad, #3498db)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize:'1.1rem' }}
        >
          {loading ? 'Création en cours...' : '🚀 Lancer l\'événement'}
        </button>

      </form>
    </div>
  );
}