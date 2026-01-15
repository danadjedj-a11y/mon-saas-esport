import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import { handleRateLimitError } from './utils/rateLimitHandler';
import TemplateSelector from './components/TemplateSelector';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth, useDebounce } from './shared/hooks';
import { createTournament } from './shared/services/api/tournaments';
import { tournamentSchema, templateSchema } from './shared/utils/schemas/tournament';
import { Button, Input, Textarea, Select, Card, Badge } from './shared/components/ui';
import { supabase } from './supabaseClient';

export default function CreateTournament() {
  const navigate = useNavigate();
  const { session } = useAuth();
  
  // États du formulaire
  const [formData, setFormData] = useState({
    name: '',
    game: 'Valorant',
    format: 'elimination',
    date: '',
    bestOf: 1,
    mapsPool: '',
    rules: '',
    maxParticipants: '',
    registrationDeadline: '',
  });
  
  // États UI
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Options pour les selects
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
    { value: 3, label: 'Best-of-3 (3 manches, premier à 2 victoires)' },
    { value: 5, label: 'Best-of-5 (5 manches, premier à 3 victoires)' },
    { value: 7, label: 'Best-of-7 (7 manches, premier à 4 victoires)' },
  ];

  // Débouncer les données du formulaire pour validation en temps réel
  const debouncedFormData = useDebounce(formData, 500);

  // Validation en temps réel (déclenchée après le debounce)
  useEffect(() => {
    // Valider seulement certains champs en temps réel (pas tous pour éviter trop de validations)
    const fieldsToValidate = ['name', 'date', 'registrationDeadline'];
    const hasRelevantChanges = fieldsToValidate.some(field => {
      const value = debouncedFormData[field];
      return value && value.length > 0;
    });

    if (!hasRelevantChanges) {
      // Si aucun champ pertinent n'a de valeur, effacer les erreurs pour ces champs
      setErrors(prev => {
        const newErrors = { ...prev };
        fieldsToValidate.forEach(field => {
          delete newErrors[field];
        });
        return newErrors;
      });
      return;
    }

    // Préparer les données pour la validation partielle
    // Utiliser des valeurs par défaut minimales pour permettre la validation
    const partialData = {
      name: debouncedFormData.name || 'placeholder',
      game: debouncedFormData.game,
      format: debouncedFormData.format,
      best_of: debouncedFormData.bestOf,
      maps_pool: debouncedFormData.mapsPool || '',
      rules: debouncedFormData.rules || '',
      max_participants: debouncedFormData.maxParticipants || '',
      start_date: debouncedFormData.date || '',
      registration_deadline: debouncedFormData.registrationDeadline || '',
    };

    // Valider avec Zod (utiliser safeParse pour ne pas throw)
    const result = tournamentSchema.safeParse(partialData);
    
    if (!result.success) {
      // Mapper les erreurs Zod vers les noms du formulaire
      const zodErrors = {};
      result.error.issues.forEach((issue) => {
        const zodField = issue.path[0];
        const fieldMap = {
          'start_date': 'date',
          'maps_pool': 'mapsPool',
          'max_participants': 'maxParticipants',
          'registration_deadline': 'registrationDeadline',
          'best_of': 'bestOf',
        };
        const formField = fieldMap[zodField] || zodField;
        
        // Ne montrer l'erreur que si le champ a une valeur réelle (éviter les erreurs sur champs vides)
        if (formField === 'name' && debouncedFormData.name && debouncedFormData.name !== 'placeholder') {
          zodErrors[formField] = issue.message;
        } else if (formField === 'date' && debouncedFormData.date) {
          zodErrors[formField] = issue.message;
        } else if (formField === 'registrationDeadline' && debouncedFormData.registrationDeadline) {
          zodErrors[formField] = issue.message;
        }
      });
      
      // Mettre à jour seulement les erreurs des champs validés
      setErrors(prev => {
        const newErrors = { ...prev };
        fieldsToValidate.forEach(field => {
          if (zodErrors[field]) {
            newErrors[field] = zodErrors[field];
          } else {
            delete newErrors[field];
          }
        });
        return newErrors;
      });
    } else {
      // Effacer les erreurs si la validation passe
      setErrors(prev => {
        const newErrors = { ...prev };
        fieldsToValidate.forEach(field => {
          delete newErrors[field];
        });
        return newErrors;
      });
    }
  }, [debouncedFormData]);

  // Mettre à jour un champ du formulaire
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Ne pas effacer l'erreur immédiatement - attendre la validation debounced
  }, []);

  // Sauvegarder la configuration actuelle comme template
  const handleSaveAsTemplate = async () => {
    if (!session?.user) {
      toast.error('Vous devez être connecté pour sauvegarder un template');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Veuillez d\'abord donner un nom au tournoi');
      return;
    }

    try {
      // Validation avec Zod
      const templateName = prompt('Nom du template:', `${formData.name} - Template`);
      if (!templateName || !templateName.trim()) {
        return; // Utilisateur a annulé
      }

      // Préparer les données pour la validation - mapper les noms de champs
      const dataToValidate = {
        game: formData.game,
        format: formData.format,
        best_of: formData.bestOf,
        maps_pool: formData.mapsPool,
        rules: formData.rules,
        max_participants: formData.maxParticipants,
        start_date: formData.date || null,
        registration_deadline: formData.registrationDeadline || null,
        template_name: templateName.trim(),
      };

      const validatedData = templateSchema.parse(dataToValidate);

      // Créer le template
      const { error } = await supabase
        .from('tournament_templates')
        .insert([{
          name: validatedData.template_name,
          description: `Template basé sur "${formData.name}"`,
          owner_id: session.user.id,
          is_public: false,
          game: validatedData.game,
          format: validatedData.format,
          max_participants: validatedData.max_participants,
          best_of: validatedData.best_of,
          check_in_window_minutes: 15,
          registration_deadline: validatedData.registration_deadline,
          start_date: validatedData.start_date,
          rules: validatedData.rules,
          maps_pool: validatedData.maps_pool,
        }]);

      if (error) throw error;

      toast.success('Template sauvegardé avec succès !');
    } catch (err) {
      console.error('Erreur sauvegarde template:', err);
      if (err.issues && Array.isArray(err.issues)) {
        // Erreurs Zod - mapper les noms de champs vers les noms du formulaire
        const zodErrors = {};
        err.issues.forEach((issue) => {
          const zodField = issue.path[0];
          // Mapper les noms de champs Zod vers les noms du formulaire
          const fieldMap = {
            'template_name': 'name',
            'start_date': 'date',
            'maps_pool': 'mapsPool',
            'max_participants': 'maxParticipants',
            'registration_deadline': 'registrationDeadline',
            'best_of': 'bestOf',
          };
          const formField = fieldMap[zodField] || zodField;
          zodErrors[formField] = issue.message;
        });
        setErrors(zodErrors);
        toast.error('Erreur de validation : ' + Object.values(zodErrors)[0]);
      } else {
        const errorMessage = handleRateLimitError(err, 'templates');
        toast.error(errorMessage);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validation avec Zod - mapper les noms de champs
      const dataToValidate = {
        name: formData.name,
        game: formData.game,
        format: formData.format,
        best_of: formData.bestOf,
        maps_pool: formData.mapsPool,
        rules: formData.rules,
        max_participants: formData.maxParticipants,
        start_date: formData.date,
        registration_deadline: formData.registrationDeadline,
      };

      const validatedData = tournamentSchema.parse(dataToValidate);

      // Créer le tournoi via le service API
      const tournament = await createTournament({
        name: validatedData.name,
        game: validatedData.game,
        start_date: validatedData.start_date,
        owner_id: session.user.id,
        status: 'draft',
        format: validatedData.format,
        best_of: validatedData.best_of,
        maps_pool: validatedData.maps_pool,
        rules: validatedData.rules,
        max_participants: validatedData.max_participants,
        registration_deadline: validatedData.registration_deadline,
      });

      // Redirection vers la page de gestion du tournoi
      toast.success('Tournoi créé avec succès !');
      navigate(`/tournament/${tournament.id}`);
    } catch (err) {
      console.error('Erreur création tournoi:', err);
      
      if (err.issues && Array.isArray(err.issues)) {
        // Erreurs Zod - mapper les noms de champs vers les noms du formulaire
        const zodErrors = {};
        err.issues.forEach((issue) => {
          const zodField = issue.path[0];
          // Mapper les noms de champs Zod vers les noms du formulaire
          const fieldMap = {
            'start_date': 'date',
            'maps_pool': 'mapsPool',
            'max_participants': 'maxParticipants',
            'registration_deadline': 'registrationDeadline',
            'best_of': 'bestOf',
          };
          const formField = fieldMap[zodField] || zodField;
          zodErrors[formField] = issue.message;
        });
        setErrors(zodErrors);
        const firstError = Object.values(zodErrors)[0];
        toast.error('Erreur de validation : ' + firstError);
      } else {
        // Erreurs API
        const errorMessage = handleRateLimitError(err, 'créations de tournois');
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helpers pour les descriptions de format
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

  const getMapsPoolHint = (game) => {
    switch (game) {
      case 'Valorant':
        return ' Exemples: Bind, Haven, Split, Ascent, Icebox, Breeze, Fracture';
      case 'CS2':
        return ' Exemples: Dust2, Mirage, Inferno, Nuke, Overpass, Vertigo, Ancient';
      case 'League of Legends':
        return ' (Non applicable - carte unique)';
      default:
        return '';
    }
  };

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-3xl mx-auto">
        <Card variant="glass" padding="xl" className="shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate('/organizer/dashboard')}
            >
              ← Annuler
            </Button>
            
            <Button 
              variant="secondary"
              size="sm"
              onClick={handleSaveAsTemplate}
            >
              💾 Sauvegarder comme Template
            </Button>
          </div>
      
          <h2 className="text-center mb-8 font-display text-4xl text-fluky-secondary" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>
            Organiser un nouveau tournoi
          </h2>
      
      {/* Sélecteur de Templates */}
      <TemplateSelector 
        session={session}
        onSelectTemplate={(templateData) => {
          // Appliquer les valeurs du template aux champs du formulaire
          if (templateData.name) updateField('name', templateData.name);
          if (templateData.game) updateField('game', templateData.game);
          if (templateData.format) updateField('format', templateData.format);
          if (templateData.max_participants) updateField('maxParticipants', templateData.max_participants?.toString() || '');
          if (templateData.best_of) updateField('bestOf', templateData.best_of);
          if (templateData.rules) updateField('rules', templateData.rules || '');
          if (templateData.maps_pool && Array.isArray(templateData.maps_pool)) {
            updateField('mapsPool', templateData.maps_pool.join(', '));
          }
          // Dates (convertir ISO en format datetime-local)
          if (templateData.start_date) {
            const startDate = new Date(templateData.start_date);
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const hours = String(startDate.getHours()).padStart(2, '0');
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            updateField('date', `${year}-${month}-${day}T${hours}:${minutes}`);
          }
          if (templateData.registration_deadline) {
            const regDate = new Date(templateData.registration_deadline);
            const year = regDate.getFullYear();
            const month = String(regDate.getMonth() + 1).padStart(2, '0');
            const day = String(regDate.getDate()).padStart(2, '0');
            const hours = String(regDate.getHours()).padStart(2, '0');
            const minutes = String(regDate.getMinutes()).padStart(2, '0');
            updateField('registrationDeadline', `${year}-${month}-${day}T${hours}:${minutes}`);
          }
        }}
        currentValues={{
          name: formData.name,
          game: formData.game,
          format: formData.format,
          max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
          best_of: formData.bestOf,
          rules: formData.rules,
          maps_pool: formData.mapsPool ? formData.mapsPool.split(',').map(m => m.trim()).filter(m => m) : null,
          registration_deadline: formData.registrationDeadline || null,
          start_date: formData.date || null
        }}
      />
      
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* NOM */}
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
            {formData.name && (
              <div className="text-xs text-fluky-text mt-1 font-body">
                {formData.name.length}/100 caractères
              </div>
            )}

            {/* JEU */}
            <Select
              label="Jeu"
              value={formData.game}
              onChange={e => updateField('game', e.target.value)}
              options={gameOptions}
            />

            {/* FORMAT */}
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

            {/* BEST-OF-X */}
            <Card variant="outlined" padding="md" className="border-fluky-secondary">
              <Select
                label="Format des Matchs (Best-of-X)"
                value={String(formData.bestOf)}
                onChange={e => updateField('bestOf', parseInt(e.target.value))}
                options={bestOfOptions}
              />
              <p className="text-sm text-fluky-text mt-2 italic font-body">
                Détermine le nombre de manches par match. Le gagnant est la première équipe à remporter {Math.ceil(formData.bestOf / 2)} manche{Math.ceil(formData.bestOf / 2) > 1 ? 's' : ''}.
              </p>
            </Card>

            {/* MAPS POOL */}
            {formData.bestOf > 1 && (
              <Card variant="outlined" padding="md" className="border-fluky-secondary">
                <Input
                  label="Pool de Cartes (Optionnel)"
                  type="text"
                  placeholder="Ex: Bind, Haven, Split, Ascent, Icebox (séparées par des virgules)"
                  value={formData.mapsPool}
                  onChange={e => updateField('mapsPool', e.target.value)}
                  error={!!errors.mapsPool}
                  errorMessage={errors.mapsPool}
                  maxLength={500}
                />
                {formData.mapsPool && (
                  <div className="text-xs text-fluky-text mt-1 font-body">
                    {formData.mapsPool.length}/500 caractères
                  </div>
                )}
                <p className="text-sm text-fluky-text mt-2 italic font-body">
                  Liste les cartes disponibles pour le tournoi. Les équipes pourront bannir/picker des cartes avant chaque match.
                  {getMapsPoolHint(formData.game)}
                </p>
              </Card>
            )}

            {/* DATE */}
            <Input
              label="Date de début"
              type="datetime-local"
              value={formData.date}
              onChange={e => updateField('date', e.target.value)}
              required
              error={!!errors.date}
              errorMessage={errors.date}
            />

            {/* RÈGLEMENT */}
            <Card variant="outlined" padding="md" className="border-fluky-secondary">
              <Textarea
                label="📋 Règlement du Tournoi (Optionnel)"
                value={formData.rules}
                onChange={e => updateField('rules', e.target.value)}
                placeholder="Exemple:&#10;&#10;## Règles Générales&#10;- Les matchs sont en Best-of-3&#10;- Les screenshots de fin de partie sont obligatoires&#10;&#10;## Récompenses&#10;- 1er : 500€&#10;- 2e : 250€&#10;&#10;## Sanctions&#10;- Abandon = Disqualification&#10;- Retard de plus de 10 min = Forfait"
                rows={8}
                error={!!errors.rules}
                errorMessage={errors.rules}
                maxLength={5000}
              />
              {formData.rules && (
                <div className="text-xs text-fluky-text mt-1 font-body">
                  {formData.rules.length}/5000 caractères
                </div>
              )}
              <p className="text-sm text-fluky-text mt-2 italic font-body">
                Rédigez le règlement en Markdown. Il sera visible sur la page publique du tournoi. Les équipes pourront le consulter avant de s'inscrire.
              </p>
            </Card>

            {/* LIMITATIONS D'INSCRIPTION */}
            <Card variant="outlined" padding="md" className="border-fluky-secondary">
              <label className="font-bold block mb-3 text-fluky-secondary font-body">🚪 Limitations d'Inscription</label>
              
              <div className="mb-4">
                <Input
                  label="Nombre maximum d'équipes (Laisser vide = illimité)"
                  type="number"
                  min={2}
                  max={1000}
                  placeholder="Ex: 16, 32, 64..."
                  value={formData.maxParticipants}
                  onChange={e => updateField('maxParticipants', e.target.value)}
                  error={!!errors.maxParticipants}
                  errorMessage={errors.maxParticipants}
                  size="sm"
                />
                <p className="text-xs text-fluky-text mt-1 font-body">
                  Si le nombre maximum est atteint, les équipes pourront s'inscrire sur une liste d'attente.
                </p>
              </div>

              <div>
                <Input
                  label="Date limite d'inscription (Optionnel)"
                  type="datetime-local"
                  value={formData.registrationDeadline}
                  onChange={e => updateField('registrationDeadline', e.target.value)}
                  error={!!errors.registrationDeadline}
                  errorMessage={errors.registrationDeadline}
                  size="sm"
                />
                <p className="text-xs text-fluky-text mt-1 font-body">
                  Après cette date, les inscriptions seront automatiquement fermées.
                </p>
              </div>
            </Card>

            <Button 
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading}
              fullWidth
              className="mt-5 uppercase tracking-wide"
            >
              {loading ? 'Création en cours...' : '🚀 Lancer l\'événement'}
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}