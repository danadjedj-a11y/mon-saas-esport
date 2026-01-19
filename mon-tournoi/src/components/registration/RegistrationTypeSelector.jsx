/**
 * RegistrationTypeSelector - Choix du type d'inscription
 * 
 * Permet de choisir entre :
 * - Inscription avec une équipe existante
 * - Création d'une équipe temporaire pour ce tournoi
 */

import React from 'react';
import { Card, Button } from '../../shared/components/ui';

/**
 * @param {Object} props
 * @param {boolean} props.hasExistingTeams - Si l'utilisateur a des équipes
 * @param {Function} props.onSelect - Callback de sélection ('existing' | 'temporary')
 * @param {Object} props.tournament - Données du tournoi
 */
export default function RegistrationTypeSelector({ 
  hasExistingTeams, 
  onSelect,
  tournament 
}) {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="text-center">
        <h3 className="text-xl font-display text-white mb-2">
          Comment souhaitez-vous vous inscrire ?
        </h3>
        <p className="text-gray-400 text-sm">
          Choisissez le mode d'inscription qui vous convient
        </p>
      </div>

      {/* Options */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Option 1 : Équipe existante */}
        <OptionCard
          icon="👥"
          title="Équipe existante"
          description="Inscrivez une équipe dont vous êtes le capitaine"
          features={[
            'Équipe déjà configurée',
            'Membres permanents',
            'Logo et informations existants'
          ]}
          disabled={!hasExistingTeams}
          disabledReason="Vous n'avez pas d'équipe"
          onClick={() => onSelect('existing')}
          variant="primary"
        />

        {/* Option 2 : Équipe temporaire */}
        <OptionCard
          icon="⚡"
          title="Équipe temporaire"
          description="Créez une équipe uniquement pour ce tournoi"
          features={[
            'Rapide et simple',
            'Parfait pour les équipes ponctuelles',
            'Peut être convertie en équipe permanente'
          ]}
          onClick={() => onSelect('temporary')}
          variant="secondary"
          badge="Nouveau"
        />
      </div>

      {/* Info tournoi */}
      {tournament && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎮</span>
            <div>
              <p className="text-white font-medium">{tournament.name}</p>
              <p className="text-gray-400 text-sm">
                {tournament.game} • {tournament.format}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Carte d'option cliquable
 */
function OptionCard({ 
  icon, 
  title, 
  description, 
  features, 
  disabled, 
  disabledReason,
  onClick, 
  variant,
  badge
}) {
  const baseStyles = "relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer text-left";
  
  const variantStyles = {
    primary: disabled 
      ? "border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed"
      : "border-violet-500/50 bg-violet-500/10 hover:border-violet-400 hover:bg-violet-500/20 hover:shadow-lg hover:shadow-violet-500/20",
    secondary: "border-cyan-500/50 bg-cyan-500/10 hover:border-cyan-400 hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/20"
  };

  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]}`}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => !disabled && e.key === 'Enter' && onClick()}
    >
      {/* Badge */}
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-1 text-xs font-bold bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-full">
          {badge}
        </span>
      )}

      {/* Icône */}
      <div className="text-4xl mb-4">{icon}</div>
      
      {/* Titre */}
      <h4 className="text-lg font-display text-white mb-2">{title}</h4>
      
      {/* Description */}
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      
      {/* Features */}
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <span className="text-cyan-400">✓</span>
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Raison désactivée */}
      {disabled && disabledReason && (
        <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
          <p className="text-orange-400 text-sm flex items-center gap-2">
            <span>⚠️</span>
            {disabledReason}
          </p>
          <a 
            href="/create-team" 
            className="text-cyan-400 text-sm hover:underline mt-1 inline-block"
          >
            Créer une équipe permanente →
          </a>
        </div>
      )}
    </div>
  );
}
