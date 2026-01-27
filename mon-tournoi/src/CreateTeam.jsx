import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import { handleRateLimitError } from './utils/rateLimitHandler';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth, useDebounce } from './shared/hooks';
import { createTeam } from './shared/services/api/teams';
import { teamSchema } from './shared/utils/schemas/team';
import { Button, Input, Card, GradientButton } from './shared/components/ui';

export default function CreateTeam() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const MAX_NAME_LENGTH = 50;
  const MAX_TAG_LENGTH = 5;
  const MIN_TAG_LENGTH = 2;

  // Débouncer les données du formulaire pour validation en temps réel
  const debouncedFormData = useDebounce(formData, 500);

  // Validation en temps réel
  useEffect(() => {
    // Valider seulement si les champs ont du contenu
    if (!debouncedFormData.name && !debouncedFormData.tag) {
      setErrors({});
      return;
    }

    const result = teamSchema.safeParse(debouncedFormData);

    if (!result.success) {
      const zodErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        // Ne montrer l'erreur que si le champ a une valeur
        if ((field === 'name' && debouncedFormData.name) ||
          (field === 'tag' && debouncedFormData.tag)) {
          zodErrors[field] = issue.message;
        }
      });
      setErrors(prev => ({ ...prev, ...zodErrors }));
    } else {
      // Effacer les erreurs si la validation passe
      setErrors({});
    }
  }, [debouncedFormData]);

  // Mettre à jour un champ du formulaire
  const updateField = useCallback((field, value) => {
    if (field === 'name' && value.length > MAX_NAME_LENGTH) {
      return; // Ne pas permettre de dépasser la longueur max
    }
    if (field === 'tag') {
      // Nettoyer le tag (majuscules, alphanumériques uniquement)
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (value.length > MAX_TAG_LENGTH) {
        return; // Ne pas permettre de dépasser la longueur max
      }
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!session?.user) {
      toast.error('Vous devez être connecté pour créer une équipe');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Validation avec Zod
      const validatedData = teamSchema.parse(formData);

      // Créer l'équipe via le service API
      const _team = await createTeam({
        name: validatedData.name,
        tag: validatedData.tag,
        captain_id: session.user.id,
      });

      toast.success("Équipe créée avec succès !");
      navigate('/player/dashboard');
    } catch (error) {
      console.error('Erreur lors de la création de l\'équipe:', error);

      if (error.issues && Array.isArray(error.issues)) {
        // Erreurs Zod
        const zodErrors = {};
        error.issues.forEach((issue) => {
          zodErrors[issue.path[0]] = issue.message;
        });
        setErrors(zodErrors);
        const firstError = Object.values(zodErrors)[0];
        toast.error('Erreur de validation : ' + firstError);
      } else {
        // Erreurs API
        const errorMessage = handleRateLimitError(error, 'créations d\'équipes');
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-2xl mx-auto">
        <Card variant="glass" padding="xl" className="shadow-xl">
          <h2 className="font-display text-4xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4 text-center drop-shadow-glow">
            Créer mon Équipe
          </h2>
          <p className="text-gray-400 text-sm mb-8 text-center">
            Tu deviendras le <b className="text-violet-400">Capitaine</b> de cette équipe. C'est toi qui géreras les inscriptions aux tournois.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Nom de l'équipe"
              type="text"
              placeholder="Ex: T1, Cloud9..."
              value={formData.name}
              onChange={e => updateField('name', e.target.value)}
              required
              error={!!errors.name}
              errorMessage={errors.name}
              maxLength={MAX_NAME_LENGTH}
            />
            {formData.name && (
              <div className="text-xs text-gray-500 mt-1 -mt-4">
                {formData.name.length}/{MAX_NAME_LENGTH} caractères
              </div>
            )}

            <Input
              label={`Tag (${MIN_TAG_LENGTH}-${MAX_TAG_LENGTH} caractères)`}
              type="text"
              placeholder="Ex: FNC"
              value={formData.tag}
              onChange={e => updateField('tag', e.target.value)}
              required
              error={!!errors.tag}
              errorMessage={errors.tag}
              maxLength={MAX_TAG_LENGTH}
              className="uppercase"
            />
            <div className="text-xs text-gray-500 mt-1 -mt-4">
              {formData.tag.length}/{MAX_TAG_LENGTH} caractères (lettres et chiffres uniquement, automatiquement en majuscules)
            </div>

            <GradientButton
              type="submit"
              size="lg"
              loading={loading}
              disabled={loading}
              className="mt-5 uppercase tracking-wide w-full"
            >
              {loading ? 'Création...' : 'Valider et créer l\'équipe'}
            </GradientButton>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}