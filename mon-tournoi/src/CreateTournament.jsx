import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import { handleRateLimitError } from './utils/rateLimitHandler';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth } from './shared/hooks';
import { createTournament } from './shared/services/api/tournaments';
import { tournamentSchema as _tournamentSchema } from './shared/utils/schemas/tournament';
import { Button, Input, Textarea, Select, Card, Badge, WYSIWYGEditor } from './shared/components/ui';

export default function CreateTournament() {
  const navigate = useNavigate();
  const { session } = useAuth();
  
  // Wizard step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Détails du tournoi
    name: '',
    game: 'Valorant',
    format: 'elimination',
    date: '',
    maxParticipants: '',
    registrationDeadline: '',
    
    // Step 2: Règles
    rules: '',
    description: '',
    
    // Step 3: Récompenses
    cashprizeTotal: '',
    cashprizeDistribution: { '1': '', '2': '', '3': '' },
    
    // Step 4: Configuration avancée
    bestOf: 1,
    mapsPool: '',
    sponsors: [],
    streamUrls: { twitch: '', youtube: '' },
    clips: [], // Nouvelle section clips
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const gameOptions = [
    { value: 'Valorant', label: 'Valorant' },
    { value: 'League of Legends', label: 'League of Legends' },
    { value: 'CS2', label: 'Counter-Strike 2' },
    { value: 'Rocket League', label: 'Rocket League' },
    { value: 'FC 24', label: 'FC 24' },
  ];

  const formatOptions = [
    { value: 'elimination', label: '🏆 Arbre à Élimination Directe' },
    { value: 'double_elimination', label: '⚔️ Double Elimination' },
    { value: 'round_robin', label: '🔄 Championnat (Round Robin)' },
    { value: 'swiss', label: '🇨🇭 Système Suisse' },
  ];

  const bestOfOptions = [
    { value: 1, label: 'Single Game (1 manche)' },
    { value: 3, label: 'Best-of-3 (premier à 2 victoires)' },
    { value: 5, label: 'Best-of-5 (premier à 3 victoires)' },
    { value: 7, label: 'Best-of-7 (premier à 4 victoires)' },
  ];

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const updateNestedField = useCallback((parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  }, []);

  const addSponsor = () => {
    setFormData(prev => ({
      ...prev,
      sponsors: [...prev.sponsors, { name: '', logo_url: '' }]
    }));
  };

  const removeSponsor = (index) => {
    setFormData(prev => ({
      ...prev,
      sponsors: prev.sponsors.filter((_, i) => i !== index)
    }));
  };

  const addClip = () => {
    setFormData(prev => ({
      ...prev,
      clips: [...prev.clips, { title: '', url: '', platform: 'twitch' }]
    }));
  };

  const removeClip = (index) => {
    setFormData(prev => ({
      ...prev,
      clips: prev.clips.filter((_, i) => i !== index)
    }));
  };

  const updateClip = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      clips: prev.clips.map((clip, i) => 
        i === index ? { ...clip, [field]: value } : clip
      )
    }));
  };

  const updateSponsor = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sponsors: prev.sponsors.map((sponsor, i) => 
        i === index ? { ...sponsor, [field]: value } : sponsor
      )
    }));
  };

  const validateStep = (step) => {
    const stepErrors = {};
    
    if (step === 1) {
      if (!formData.name.trim()) stepErrors.name = 'Le nom du tournoi est requis';
      if (!formData.date) stepErrors.date = 'La date de début est requise';
      if (formData.date && new Date(formData.date) < new Date()) {
        stepErrors.date = 'La date doit être dans le futur';
      }
      if (formData.registrationDeadline && formData.date) {
        if (new Date(formData.registrationDeadline) > new Date(formData.date)) {
          stepErrors.registrationDeadline = 'La date limite d\'inscription doit être avant le début du tournoi';
        }
      }
    }
    
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) return;
    
    setLoading(true);
    setErrors({});

    try {
      // Prepare cashprize distribution (only include non-empty values)
      const cashprizeDistribution = {};
      Object.entries(formData.cashprizeDistribution).forEach(([rank, amount]) => {
        if (amount && !isNaN(parseFloat(amount))) {
          cashprizeDistribution[rank] = parseFloat(amount);
        }
      });

      // Prepare sponsors (only include non-empty sponsors)
      const sponsors = formData.sponsors.filter(s => s.name.trim() || s.logo_url.trim());

      // Prepare clips (only include non-empty clips)
      const clips = formData.clips.filter(c => c.url.trim());

      // Prepare stream URLs (only include non-empty URLs)
      const streamUrls = {};
      if (formData.streamUrls.twitch) streamUrls.twitch = formData.streamUrls.twitch;
      if (formData.streamUrls.youtube) streamUrls.youtube = formData.streamUrls.youtube;

      const tournamentData = {
        name: formData.name,
        game: formData.game,
        start_date: formData.date,
        owner_id: session.user.id,
        status: 'draft',
        format: formData.format,
        best_of: formData.bestOf,
        maps_pool: formData.mapsPool ? formData.mapsPool.split(',').map(m => m.trim()).filter(m => m) : null,
        rules: formData.rules || '',
        description: formData.description || '',
        max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        registration_deadline: formData.registrationDeadline || null,
        cashprize_total: formData.cashprizeTotal ? parseFloat(formData.cashprizeTotal) : null,
        cashprize_distribution: Object.keys(cashprizeDistribution).length > 0 ? cashprizeDistribution : null,
        sponsors: sponsors.length > 0 ? sponsors : null,
        stream_urls: Object.keys(streamUrls).length > 0 ? streamUrls : null,
        clips: clips.length > 0 ? clips : null,
      };

      const tournament = await createTournament(tournamentData);

      toast.success('Tournoi créé avec succès !');
      navigate(`/tournament/${tournament.id}`);
    } catch (err) {
      console.error('Erreur création tournoi:', err);
      
      if (err.issues && Array.isArray(err.issues)) {
        const zodErrors = {};
        err.issues.forEach((issue) => {
          zodErrors[issue.path[0]] = issue.message;
        });
        setErrors(zodErrors);
        toast.error('Erreur de validation : ' + Object.values(zodErrors)[0]);
      } else {
        const errorMessage = handleRateLimitError(err, 'créations de tournois');
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getFormatDescription = (format) => {
    switch (format) {
      case 'elimination':
        return "Classique. Le perdant rentre chez lui. Idéal pour les tournois rapides.";
      case 'double_elimination':
        return "Deux brackets : Winners et Losers. Une deuxième chance après une défaite. Format esport professionnel.";
      case 'round_robin':
        return "Tout le monde joue contre tout le monde. Classement aux points (Victoire=3, Nul=1, Défaite=0).";
      case 'swiss':
        return "Plusieurs rounds où les équipes sont appariées selon leur score. Pas d'élimination, classement final par victoires et tie-breaks.";
      default:
        return '';
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center items-center gap-3 mb-8">
      {[1, 2, 3, 4].map(step => (
        <div key={step} className="flex items-center">
          <div 
            className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold
              transition-all duration-300
              ${step === currentStep 
                ? 'bg-gradient-to-r from-fluky-primary to-fluky-secondary text-white scale-110' 
                : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-fluky-text/50'
              }
            `}
          >
            {step < currentStep ? '✓' : step}
          </div>
          {step < 4 && (
            <div 
              className={`w-16 h-1 mx-2 ${
                step < currentStep ? 'bg-green-500' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="font-display text-2xl text-fluky-secondary mb-4">
        📋 Détails du Tournoi
      </h3>
      
      <Input
        label="Nom de l'événement"
        type="text"
        placeholder="Ex: Weekly Cup #42"
        value={formData.name}
        onChange={e => updateField('name', e.target.value)}
        required
        error={!!errors.name}
        errorMessage={errors.name}
        maxLength={100}
      />

      <Select
        label="Jeu"
        value={formData.game}
        onChange={e => updateField('game', e.target.value)}
        options={gameOptions}
      />

      <Card variant="outlined" padding="md" className="border-fluky-secondary">
        <Select
          label="Format de la compétition"
          value={formData.format}
          onChange={e => updateField('format', e.target.value)}
          options={formatOptions}
        />
        <p className="text-sm text-fluky-text mt-2 italic font-body">
          {getFormatDescription(formData.format)}
        </p>
      </Card>

      <Input
        label="Date de début"
        type="datetime-local"
        value={formData.date}
        onChange={e => updateField('date', e.target.value)}
        required
        error={!!errors.date}
        errorMessage={errors.date}
      />

      <Input
        label="Nombre maximum d'équipes (Optionnel)"
        type="number"
        min={2}
        max={1000}
        placeholder="Ex: 16, 32, 64... (Laisser vide = illimité)"
        value={formData.maxParticipants}
        onChange={e => updateField('maxParticipants', e.target.value)}
        error={!!errors.maxParticipants}
        errorMessage={errors.maxParticipants}
      />

      <Input
        label="Date limite d'inscription (Optionnel)"
        type="datetime-local"
        value={formData.registrationDeadline}
        onChange={e => updateField('registrationDeadline', e.target.value)}
        error={!!errors.registrationDeadline}
        errorMessage={errors.registrationDeadline}
      />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="font-display text-2xl text-fluky-secondary mb-4">
        📝 Description & Règles
      </h3>

      <div>
        <label className="block mb-2 text-fluky-text font-body">Description du tournoi</label>
        <WYSIWYGEditor
          value={formData.description}
          onChange={(value) => updateField('description', value)}
          placeholder="Décrivez votre tournoi : objectifs, ambiance, spécificités..."
          minHeight="200px"
        />
        <p className="text-xs text-fluky-text/70 mt-2 font-body">
          Utilisez cette section pour donner envie aux équipes de s'inscrire !
        </p>
      </div>

      <div>
        <label className="block mb-2 text-fluky-text font-body">Règlement (Optionnel)</label>
        <WYSIWYGEditor
          value={formData.rules}
          onChange={(value) => updateField('rules', value)}
          placeholder="Rédigez le règlement : format, sanctions, preuves requises..."
          minHeight="300px"
        />
        <p className="text-xs text-fluky-text/70 mt-2 font-body">
          Un règlement clair évite les conflits ! Pas de limite de caractères.
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="font-display text-2xl text-fluky-secondary mb-4">
        💰 Récompenses (Cashprize)
      </h3>

      <Input
        label="Montant total du cashprize (€)"
        type="number"
        step="0.01"
        min="0"
        placeholder="Ex: 1000"
        value={formData.cashprizeTotal}
        onChange={e => updateField('cashprizeTotal', e.target.value)}
      />

      {formData.cashprizeTotal && parseFloat(formData.cashprizeTotal) > 0 && (
        <Card variant="outlined" padding="md" className="border-fluky-secondary">
          <label className="block mb-3 text-fluky-text font-body font-bold">
            Distribution du cashprize par rang
          </label>
          
          <div className="space-y-3">
            <Input
              label="🥇 1ère place (€)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 500"
              value={formData.cashprizeDistribution['1']}
              onChange={e => updateNestedField('cashprizeDistribution', '1', e.target.value)}
            />
            
            <Input
              label="🥈 2ème place (€)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 300"
              value={formData.cashprizeDistribution['2']}
              onChange={e => updateNestedField('cashprizeDistribution', '2', e.target.value)}
            />
            
            <Input
              label="🥉 3ème place (€)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 200"
              value={formData.cashprizeDistribution['3']}
              onChange={e => updateNestedField('cashprizeDistribution', '3', e.target.value)}
            />
          </div>

          <p className="text-xs text-fluky-text/70 mt-3 font-body">
            💡 Astuce : La somme des montants devrait correspondre au cashprize total
          </p>
        </Card>
      )}

      {!formData.cashprizeTotal && (
        <div className="text-center text-fluky-text/50 py-8 font-body">
          Aucun cashprize ? Pas de problème ! Les joueurs aiment aussi la gloire 🏆
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="font-display text-2xl text-fluky-secondary mb-4">
        ⚙️ Configuration Avancée
      </h3>

      <Card variant="outlined" padding="md" className="border-fluky-secondary">
        <Select
          label="Format des Matchs (Best-of-X)"
          value={String(formData.bestOf)}
          onChange={e => updateField('bestOf', parseInt(e.target.value))}
          options={bestOfOptions}
        />
        <p className="text-sm text-fluky-text mt-2 italic font-body">
          Le gagnant est la première équipe à remporter {Math.ceil(formData.bestOf / 2)} manche{Math.ceil(formData.bestOf / 2) > 1 ? 's' : ''}.
        </p>
      </Card>

      {formData.bestOf > 1 && (
        <Input
          label="Pool de Cartes (Optionnel)"
          type="text"
          placeholder="Ex: Bind, Haven, Split, Ascent (séparées par des virgules)"
          value={formData.mapsPool}
          onChange={e => updateField('mapsPool', e.target.value)}
          maxLength={500}
        />
      )}

      <Card variant="outlined" padding="md" className="border-fluky-secondary">
        <label className="block mb-3 text-fluky-text font-body font-bold">
          📺 Streams Officiels
        </label>
        
        <div className="space-y-3">
          <Input
            label="Twitch"
            type="url"
            placeholder="https://twitch.tv/votre-chaine"
            value={formData.streamUrls.twitch}
            onChange={e => updateNestedField('streamUrls', 'twitch', e.target.value)}
          />
          
          <Input
            label="YouTube"
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={formData.streamUrls.youtube}
            onChange={e => updateNestedField('streamUrls', 'youtube', e.target.value)}
          />
        </div>
      </Card>

      <Card variant="outlined" padding="md" className="border-fluky-secondary">
        <div className="flex justify-between items-center mb-3">
          <label className="text-fluky-text font-body font-bold">
            🏢 Sponsors
          </label>
          <Button size="sm" onClick={addSponsor} variant="secondary">
            + Ajouter un sponsor
          </Button>
        </div>

        {formData.sponsors.length > 0 ? (
          <div className="space-y-4">
            {formData.sponsors.map((sponsor, index) => (
              <Card key={index} variant="outlined" padding="sm" className="border-white/10">
                <div className="flex gap-3 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Nom du sponsor"
                      value={sponsor.name}
                      onChange={e => updateSponsor(index, 'name', e.target.value)}
                      size="sm"
                    />
                    <Input
                      placeholder="URL du logo (https://...)"
                      type="url"
                      value={sponsor.logo_url}
                      onChange={e => updateSponsor(index, 'logo_url', e.target.value)}
                      size="sm"
                    />
                  </div>
                  <button
                    onClick={() => removeSponsor(index)}
                    className="text-red-400 hover:text-red-500 transition-colors text-xl"
                    title="Retirer ce sponsor"
                  >
                    ✕
                  </button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fluky-text/50 text-center py-4 font-body">
            Aucun sponsor pour le moment
          </p>
        )}
      </Card>

      {/* Section Clips */}
      <Card variant="outlined" padding="md" className="border-fluky-secondary">
        <div className="flex justify-between items-center mb-3">
          <label className="text-fluky-text font-body font-bold">
            🎬 Clips & Temps Forts
          </label>
          <Button size="sm" onClick={addClip} variant="secondary">
            + Ajouter un clip
          </Button>
        </div>

        {formData.clips.length > 0 ? (
          <div className="space-y-4">
            {formData.clips.map((clip, index) => (
              <Card key={index} variant="outlined" padding="sm" className="border-white/10">
                <div className="flex gap-3 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Titre du clip (ex: Action finale Round 13)"
                      value={clip.title}
                      onChange={e => updateClip(index, 'title', e.target.value)}
                      size="sm"
                    />
                    <div className="flex gap-2">
                      <Select
                        value={clip.platform}
                        onChange={e => updateClip(index, 'platform', e.target.value)}
                        options={[
                          { value: 'twitch', label: '🟣 Twitch' },
                          { value: 'youtube', label: '🔴 YouTube' },
                          { value: 'twitter', label: '𝕏 Twitter/X' },
                        ]}
                        className="w-36"
                      />
                      <Input
                        placeholder="URL du clip"
                        type="url"
                        value={clip.url}
                        onChange={e => updateClip(index, 'url', e.target.value)}
                        size="sm"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeClip(index)}
                    className="text-red-400 hover:text-red-500 transition-colors text-xl"
                    title="Retirer ce clip"
                  >
                    ✕
                  </button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fluky-text/50 text-center py-4 font-body">
            Ajoutez des clips pour mettre en avant les meilleurs moments du tournoi
          </p>
        )}
      </Card>
    </div>
  );

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-4xl mx-auto">
        <Card variant="glass" padding="xl" className="shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate('/organizer/dashboard')}
            >
              ← Annuler
            </Button>
          </div>

          <h2 className="text-center mb-2 font-display text-4xl text-fluky-secondary" 
              style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>
            Créer un Tournoi
          </h2>
          <p className="text-center text-fluky-text/70 mb-8 font-body">
            Configuration en {totalSteps} étapes
          </p>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                ← Précédent
              </Button>

              <div className="text-sm text-fluky-text/70 font-body">
                Étape {currentStep} sur {totalSteps}
              </div>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={nextStep}
                >
                  Suivant →
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                >
                  {loading ? 'Création...' : '🚀 Créer le Tournoi'}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
