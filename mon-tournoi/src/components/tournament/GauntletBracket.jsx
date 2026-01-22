// src/components/tournament/GauntletBracket.jsx
// Composant d'affichage du bracket Gauntlet

import React from 'react';
import Card from '../../shared/components/ui/Card';
import Badge from '../../shared/components/ui/Badge';
import { getGauntletStats, getCurrentGauntletMatch } from '../../gauntletUtils';

/**
 * Affichage principal du format Gauntlet
 * @param {Object} props
 * @param {Object} props.gauntletState - État du Gauntlet
 * @param {Object} props.teams - Map id → team data
 * @param {Function} props.onMatchClick - Callback au clic sur un match
 * @param {Boolean} props.isAdmin - Mode admin
 */
export function GauntletBracket({ gauntletState, teams = {}, onMatchClick, isAdmin = false }) {
  if (!gauntletState) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <p>Aucune donnée de Gauntlet disponible</p>
      </Card>
    );
  }

  const { champion, challengers, matches, isCompleted, finalChampion } = gauntletState;
  const stats = getGauntletStats(gauntletState);
  const currentMatch = getCurrentGauntletMatch(gauntletState);

  return (
    <div className="space-y-6">
      {/* Header avec champion actuel */}
      <GauntletHeader 
        champion={isCompleted ? finalChampion : champion} 
        isCompleted={isCompleted}
        stats={stats}
      />

      {/* Match en cours */}
      {currentMatch && (
        <CurrentMatchCard 
          match={currentMatch}
          teams={teams}
          onMatchClick={onMatchClick}
          isAdmin={isAdmin}
        />
      )}

      {/* Timeline des matchs */}
      <GauntletTimeline 
        matches={matches}
        challengers={challengers}
        teams={teams}
        onMatchClick={onMatchClick}
        isAdmin={isAdmin}
      />

      {/* Statistiques */}
      <GauntletStatsCard stats={stats} />
    </div>
  );
}

/**
 * Header avec le champion actuel
 */
function GauntletHeader({ champion, isCompleted, stats }) {
  return (
    <Card className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-500/20 rounded-full text-3xl">
            👑
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wider">
              {isCompleted ? 'Champion Final' : 'Champion Actuel'}
            </p>
            <h2 className="text-2xl font-bold text-white">
              {champion?.name || 'Champion'}
            </h2>
            {stats.currentStreak > 0 && (
              <p className="text-sm text-yellow-500 flex items-center gap-1 mt-1">
                📈 {stats.currentStreak} défense{stats.currentStreak > 1 ? 's' : ''} consécutive{stats.currentStreak > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        
        {isCompleted && (
          <Badge variant="success" className="text-lg px-4 py-2">
            🏆 Tournoi Terminé
          </Badge>
        )}
      </div>
    </Card>
  );
}

/**
 * Card du match en cours
 */
function CurrentMatchCard({ match, teams, onMatchClick, isAdmin }) {
  const champion = match.champion;
  const challenger = match.challenger;

  return (
    <Card 
      className="p-6 border-2 border-violet-500/30 bg-gradient-to-r from-violet-500/5 to-cyan-500/5 cursor-pointer hover:border-violet-500/50 transition-all"
      onClick={() => onMatchClick?.(match)}
    >
      <div className="flex items-center justify-between mb-4">
        <Badge variant="warning" className="animate-pulse">
          ⚔️ Match {match.round} - EN COURS
        </Badge>
        {isAdmin && (
          <Badge variant="secondary">Admin: Cliquez pour saisir le score</Badge>
        )}
      </div>

      <div className="flex items-center justify-center gap-8">
        {/* Champion */}
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-yellow-500">👑</span>
            <span className="text-xs text-yellow-500 uppercase">Champion</span>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-xl font-bold text-white">{champion?.name}</p>
          </div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-gray-500">VS</span>
        </div>

        {/* Challenger */}
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-red-500">🎯</span>
            <span className="text-xs text-red-500 uppercase">Challenger</span>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-xl font-bold text-white">{challenger?.name}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Timeline des matchs Gauntlet
 */
function GauntletTimeline({ matches, challengers, teams, onMatchClick, isAdmin }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        ⚔️ Progression du Gauntlet
      </h3>
      
      <div className="relative">
        {/* Ligne de progression */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700" />
        
        <div className="space-y-4">
          {matches.map((match, index) => (
            <GauntletMatchItem
              key={match.round}
              match={match}
              challenger={challengers[index]}
              onClick={() => match.status !== 'waiting' && onMatchClick?.(match)}
              isClickable={match.status !== 'waiting' && isAdmin}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

/**
 * Item de match dans la timeline
 */
function GauntletMatchItem({ match, challenger, onClick, isClickable }) {
  const statusStyles = {
    completed: 'bg-green-500',
    pending: 'bg-yellow-500 animate-pulse',
    waiting: 'bg-gray-600'
  };

  const cardStyles = {
    completed: 'border-green-500/30 bg-green-500/5',
    pending: 'border-yellow-500/30 bg-yellow-500/5',
    waiting: 'border-gray-700 bg-gray-800/30 opacity-50'
  };

  return (
    <div 
      className={`relative pl-12 ${isClickable ? 'cursor-pointer' : ''}`}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Point sur la timeline */}
      <div className={`absolute left-4 w-4 h-4 rounded-full ${statusStyles[match.status]} border-4 border-gray-900`} />
      
      <Card className={`p-4 ${cardStyles[match.status]} ${isClickable ? 'hover:border-violet-500/50' : ''} transition-all`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Match {match.round}</p>
            <p className="font-semibold text-white">vs {challenger?.name}</p>
          </div>
          
          <div className="text-right">
            {match.status === 'completed' && (
              <Badge variant={match.winner_id === match.loser_id ? 'secondary' : 'success'}>
                {match.winner_id === challenger?.id ? '🔄 Nouveau Champion!' : '🛡️ Titre défendu'}
              </Badge>
            )}
            {match.status === 'pending' && (
              <Badge variant="warning">⏳ En attente</Badge>
            )}
            {match.status === 'waiting' && (
              <Badge variant="secondary">📅 À venir</Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Card de statistiques
 */
function GauntletStatsCard({ stats }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">📊 Statistiques</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatItem 
          label="Matchs joués" 
          value={`${stats.completedMatches}/${stats.totalMatches}`}
        />
        <StatItem 
          label="Défenses de titre" 
          value={stats.titleDefenses}
        />
        <StatItem 
          label="Changements" 
          value={stats.titleChanges}
        />
        <StatItem 
          label="Progression" 
          value={`${stats.progress}%`}
        />
      </div>
      
      {/* Barre de progression */}
      <div className="mt-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="text-center p-3 bg-gray-800/50 rounded-lg">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

export default GauntletBracket;
