/**
 * PlayerFieldsRepeater - Champs répétables pour ajouter des joueurs
 * 
 * Permet d'ajouter/supprimer dynamiquement des joueurs à une équipe
 */

import React from 'react';
import { Button, Input, Select } from '../../shared/components/ui';

// Rôles prédéfinis par jeu (peut être étendu)
const GAME_ROLES = {
  'Valorant': ['Duelist', 'Initiator', 'Controller', 'Sentinel', 'Flex'],
  'League of Legends': ['Top', 'Jungle', 'Mid', 'ADC', 'Support'],
  'Counter-Strike 2': ['Rifler', 'AWPer', 'Entry', 'Support', 'IGL'],
  'Rocket League': ['Striker', 'Midfield', 'Defender', 'Flex'],
  'Overwatch 2': ['Tank', 'DPS', 'Support'],
  'default': ['Capitaine', 'Titulaire', 'Remplaçant']
};

/**
 * @param {Object} props
 * @param {Array} props.players - Liste des joueurs
 * @param {Function} props.onChange - Callback pour mise à jour
 * @param {Object} props.errors - Erreurs de validation
 * @param {string} props.requiredPlatform - Plateforme de jeu requise
 * @param {string} props.platformName - Nom de la plateforme pour affichage
 * @param {string} props.game - Nom du jeu pour les rôles
 */
export default function PlayerFieldsRepeater({ 
  players, 
  onChange, 
  errors = {},
  requiredPlatform,
  platformName,
  game
}) {
  // Obtenir les rôles pour ce jeu
  const roles = GAME_ROLES[game] || GAME_ROLES.default;

  // Ajouter un joueur
  const addPlayer = () => {
    onChange([
      ...players,
      { name: '', email: '', gameAccount: '', gameAccountPlatform: requiredPlatform || '', role: '' }
    ]);
  };

  // Supprimer un joueur
  const removePlayer = (index) => {
    if (players.length <= 1) return; // Garder au moins 1 joueur
    onChange(players.filter((_, i) => i !== index));
  };

  // Mettre à jour un champ de joueur
  const updatePlayer = (index, field, value) => {
    onChange(
      players.map((player, i) => 
        i === index ? { ...player, [field]: value } : player
      )
    );
  };

  return (
    <div className="space-y-4">
      {players.map((player, index) => (
        <PlayerFieldGroup
          key={index}
          index={index}
          player={player}
          onUpdate={(field, value) => updatePlayer(index, field, value)}
          onRemove={() => removePlayer(index)}
          canRemove={players.length > 1}
          error={errors[`player_${index}_name`]}
          requiredPlatform={requiredPlatform}
          platformName={platformName}
          roles={roles}
        />
      ))}

      {/* Bouton ajouter */}
      <Button
        type="button"
        variant="outline"
        onClick={addPlayer}
        className="w-full"
      >
        ➕ Ajouter un joueur
      </Button>

      {/* Aide */}
      <p className="text-gray-500 text-xs text-center">
        Ajoutez les membres de votre équipe. Seul le pseudo est obligatoire.
      </p>
    </div>
  );
}

/**
 * Groupe de champs pour un joueur
 */
function PlayerFieldGroup({ 
  index, 
  player, 
  onUpdate, 
  onRemove, 
  canRemove,
  error,
  requiredPlatform: _requiredPlatform,
  platformName,
  roles
}) {
  return (
    <div className="relative bg-gray-900/50 rounded-lg p-4 border border-white/5">
      {/* Numéro du joueur et bouton supprimer */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-cyan-400">
          Joueur #{index + 1}
          {index === 0 && <span className="text-gray-500 ml-2">(Vous)</span>}
        </span>
        
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-500 hover:text-red-400 transition-colors p-1"
            title="Supprimer ce joueur"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pseudo (requis) */}
        <Input
          label="Pseudo"
          placeholder="Pseudo du joueur"
          value={player.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          required={index === 0}
          error={!!error}
          errorMessage={error}
        />

        {/* Email (optionnel) */}
        <Input
          label="Email (optionnel)"
          type="email"
          placeholder="email@example.com"
          value={player.email}
          onChange={(e) => onUpdate('email', e.target.value)}
        />

        {/* Compte en jeu */}
        <Input
          label={platformName ? `Compte ${platformName}` : 'Compte en jeu'}
          placeholder={platformName ? `ID ${platformName}` : 'Identifiant en jeu'}
          value={player.gameAccount}
          onChange={(e) => onUpdate('gameAccount', e.target.value)}
        />

        {/* Rôle */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Rôle (optionnel)
          </label>
          <select
            value={player.role}
            onChange={(e) => onUpdate('role', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Sélectionner un rôle</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
