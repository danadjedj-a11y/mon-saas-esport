/**
 * TemporaryTeamForm - Formulaire de création d'équipe temporaire
 * 
 * Permet de créer une équipe à la volée pour s'inscrire à un tournoi
 */

import React, { useState } from 'react';
import { Button, Input } from '../../shared/components/ui';
import PlayerFieldsRepeater from './PlayerFieldsRepeater';
import { getPlatformForGame, getRequiredPlatformName, GAME_PLATFORMS } from '../../utils/gamePlatforms';

/**
 * @param {Object} props
 * @param {Object} props.tournament - Données du tournoi
 * @param {Function} props.onSubmit - Callback (teamData, players)
 * @param {Function} props.onBack - Retour à l'étape précédente
 * @param {boolean} props.loading - État de chargement
 * @param {string} props.userEmail - Email de l'utilisateur connecté
 */
export default function TemporaryTeamForm({ 
  tournament, 
  onSubmit, 
  onBack, 
  loading,
  userEmail 
}) {
  // État du formulaire équipe
  const [teamData, setTeamData] = useState({
    name: '',
    tag: '',
    logoUrl: '',
    captainEmail: userEmail || '',
    discordContact: ''
  });

  // État des joueurs
  const [players, setPlayers] = useState([
    { name: '', email: '', gameAccount: '', gameAccountPlatform: '', role: '' }
  ]);

  // Erreurs de validation
  const [errors, setErrors] = useState({});

  // Plateforme requise pour le jeu
  const requiredPlatform = getPlatformForGame(tournament?.game);
  const platformName = requiredPlatform ? getRequiredPlatformName(tournament?.game) : null;

  // Mettre à jour les données de l'équipe
  const handleTeamChange = (field, value) => {
    setTeamData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validation du formulaire
  const validate = () => {
    const newErrors = {};

    // Validation équipe
    if (!teamData.name.trim()) {
      newErrors.name = 'Le nom de l\'équipe est requis';
    } else if (teamData.name.length < 3) {
      newErrors.name = 'Le nom doit faire au moins 3 caractères';
    } else if (teamData.name.length > 50) {
      newErrors.name = 'Le nom ne peut pas dépasser 50 caractères';
    }

    if (teamData.tag && teamData.tag.length > 5) {
      newErrors.tag = 'Le tag ne peut pas dépasser 5 caractères';
    }

    // Validation joueurs (au moins 1 joueur)
    if (players.length === 0 || !players.some(p => p.name.trim())) {
      newErrors.players = 'Ajoutez au moins un joueur';
    }

    // Vérifier que tous les joueurs ont un nom
    players.forEach((player, index) => {
      if (!player.name.trim() && (player.email || player.gameAccount)) {
        newErrors[`player_${index}_name`] = 'Le pseudo est requis';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission du formulaire
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    // Filtrer les joueurs vides et définir la plateforme si nécessaire
    const validPlayers = players
      .filter(p => p.name.trim())
      .map(p => ({
        ...p,
        gameAccountPlatform: requiredPlatform || p.gameAccountPlatform
      }));

    onSubmit(teamData, validPlayers);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* En-tête */}
      <div>
        <button 
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors mb-4"
        >
          <span>←</span>
          <span>Retour</span>
        </button>
        
        <h3 className="text-xl font-display text-white mb-2">
          Créer une équipe temporaire
        </h3>
        <p className="text-gray-400 text-sm">
          Cette équipe sera créée uniquement pour le tournoi <span className="text-cyan-400">{tournament?.name}</span>
        </p>
      </div>

      {/* Section Informations Équipe */}
      <div className="bg-gray-800/50 rounded-lg p-5 border border-white/10">
        <h4 className="text-lg font-display text-white mb-4 flex items-center gap-2">
          <span>👥</span>
          Informations de l'équipe
        </h4>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Nom de l'équipe */}
          <Input
            label="Nom de l'équipe"
            placeholder="Ex: Les Champions"
            value={teamData.name}
            onChange={(e) => handleTeamChange('name', e.target.value)}
            required
            error={!!errors.name}
            errorMessage={errors.name}
          />

          {/* Tag */}
          <Input
            label="Tag (optionnel)"
            placeholder="Ex: LC"
            value={teamData.tag}
            onChange={(e) => handleTeamChange('tag', e.target.value.toUpperCase())}
            maxLength={5}
            error={!!errors.tag}
            errorMessage={errors.tag}
          />

          {/* Email de contact */}
          <Input
            label="Email de contact"
            type="email"
            placeholder="capitaine@email.com"
            value={teamData.captainEmail}
            onChange={(e) => handleTeamChange('captainEmail', e.target.value)}
          />

          {/* Discord */}
          <Input
            label="Discord (optionnel)"
            placeholder="username#0000 ou lien serveur"
            value={teamData.discordContact}
            onChange={(e) => handleTeamChange('discordContact', e.target.value)}
          />
        </div>

        {/* URL Logo (optionnel) */}
        <div className="mt-4">
          <Input
            label="URL du logo (optionnel)"
            placeholder="https://..."
            value={teamData.logoUrl}
            onChange={(e) => handleTeamChange('logoUrl', e.target.value)}
          />
          {teamData.logoUrl && (
            <div className="mt-2">
              <img 
                src={teamData.logoUrl} 
                alt="Aperçu logo"
                className="w-16 h-16 rounded-lg object-cover border border-white/20"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Section Joueurs */}
      <div className="bg-gray-800/50 rounded-lg p-5 border border-white/10">
        <h4 className="text-lg font-display text-white mb-4 flex items-center gap-2">
          <span>🎮</span>
          Joueurs de l'équipe
          {platformName && (
            <span className="text-sm font-normal text-cyan-400 ml-2">
              (compte {platformName} requis)
            </span>
          )}
        </h4>

        {errors.players && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{errors.players}</p>
          </div>
        )}

        <PlayerFieldsRepeater
          players={players}
          onChange={setPlayers}
          errors={errors}
          requiredPlatform={requiredPlatform}
          platformName={platformName}
          game={tournament?.game}
        />
      </div>

      {/* Info équipe temporaire */}
      <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-white font-medium mb-1">Équipe temporaire</p>
            <p className="text-gray-400 text-sm">
              Cette équipe existe uniquement pour ce tournoi. Après le tournoi, vous pourrez 
              la convertir en équipe permanente si vous le souhaitez.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-white/10">
        <Button 
          type="button"
          variant="ghost" 
          onClick={onBack}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button 
          type="submit"
          variant="primary"
          disabled={loading}
          loading={loading}
          className="flex-1"
        >
          ✨ Créer et s'inscrire
        </Button>
      </div>
    </form>
  );
}
