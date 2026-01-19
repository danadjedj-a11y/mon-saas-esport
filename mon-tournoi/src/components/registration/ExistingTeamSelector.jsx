/**
 * ExistingTeamSelector - Sélection d'une équipe existante
 * 
 * Permet de choisir parmi les équipes dont l'utilisateur est capitaine
 */

import React, { useState } from 'react';
import { Button, Card } from '../../shared/components/ui';

/**
 * @param {Object} props
 * @param {Array} props.teams - Liste des équipes de l'utilisateur
 * @param {Function} props.onSubmit - Callback avec l'ID de l'équipe sélectionnée
 * @param {Function} props.onBack - Retour à l'étape précédente
 * @param {boolean} props.loading - État de chargement
 * @param {Object} props.tournament - Données du tournoi
 */
export default function ExistingTeamSelector({ 
  teams, 
  onSubmit, 
  onBack, 
  loading,
  tournament 
}) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');

  const handleSubmit = () => {
    if (!selectedTeamId) return;
    onSubmit(selectedTeamId);
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors mb-4"
        >
          <span>←</span>
          <span>Retour</span>
        </button>
        
        <h3 className="text-xl font-display text-white mb-2">
          Sélectionnez votre équipe
        </h3>
        <p className="text-gray-400 text-sm">
          Choisissez l'équipe à inscrire au tournoi <span className="text-cyan-400">{tournament?.name}</span>
        </p>
      </div>

      {/* Liste des équipes */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            selected={selectedTeamId === team.id}
            onSelect={() => setSelectedTeamId(team.id)}
          />
        ))}
      </div>

      {/* Aperçu de l'équipe sélectionnée */}
      {selectedTeam && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-violet-500/30">
          <h4 className="text-sm text-gray-400 mb-3">Équipe sélectionnée</h4>
          <div className="flex items-center gap-4">
            <img
              src={selectedTeam.logo_url || `https://ui-avatars.com/api/?name=${selectedTeam.tag || selectedTeam.name}&background=8B5CF6&color=fff&size=64`}
              alt={selectedTeam.name}
              className="w-16 h-16 rounded-lg object-cover border-2 border-violet-500"
            />
            <div>
              <p className="text-white font-display text-lg">{selectedTeam.name}</p>
              <p className="text-cyan-400 text-sm">[{selectedTeam.tag}]</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-white/10">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={!selectedTeamId || loading}
          loading={loading}
          className="flex-1"
        >
          ✅ Confirmer l'inscription
        </Button>
      </div>
    </div>
  );
}

/**
 * Carte d'équipe sélectionnable
 */
function TeamCard({ team, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
        ${selected 
          ? 'border-violet-500 bg-violet-500/20 shadow-lg shadow-violet-500/20' 
          : 'border-white/10 bg-white/5 hover:border-violet-500/50 hover:bg-violet-500/10'
        }
      `}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="flex items-center gap-4">
        {/* Logo */}
        <img
          src={team.logo_url || `https://ui-avatars.com/api/?name=${team.tag || team.name}&background=8B5CF6&color=fff&size=48`}
          alt={team.name}
          className="w-12 h-12 rounded-lg object-cover border border-white/20"
        />
        
        {/* Infos */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{team.name}</p>
          <p className="text-gray-400 text-sm">[{team.tag}]</p>
        </div>
        
        {/* Indicateur de sélection */}
        <div className={`
          w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
          ${selected 
            ? 'border-violet-500 bg-violet-500' 
            : 'border-gray-600 bg-transparent'
          }
        `}>
          {selected && (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
