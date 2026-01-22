// src/components/tournament/GroupStage.jsx
// Composants d'affichage du format Groupes (Pool Play)

import React, { useState } from 'react';
import Card from '../../shared/components/ui/Card';
import Badge from '../../shared/components/ui/Badge';
import { 
  getGroupName, 
  getGroupStageStats, 
  getGroupsSummary,
  sortGroupStandings 
} from '../../groupStageUtils';

/**
 * Affichage principal de la phase de groupes
 * @param {Object} props
 * @param {Object} props.groupStageState - État de la phase de groupes
 * @param {Object} props.teams - Map id → team data
 * @param {Function} props.onMatchClick - Callback au clic sur un match
 * @param {Boolean} props.isAdmin - Mode admin
 * @param {Number} props.teamsAdvancing - Nombre d'équipes qualifiées par groupe
 */
export function GroupStage({ 
  groupStageState, 
  teams = {}, 
  onMatchClick, 
  isAdmin = false 
}) {
  const [expandedGroup, setExpandedGroup] = useState(null);

  if (!groupStageState) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <p>Aucune donnée de phase de groupes disponible</p>
      </Card>
    );
  }

  const { 
    groups, 
    groupMatches, 
    standings, 
    teamsAdvancing, 
    phase,
    playoffFormat 
  } = groupStageState;
  
  const stats = getGroupStageStats(groupStageState);
  const summary = getGroupsSummary(groupStageState);

  return (
    <div className="space-y-6">
      {/* Header avec progression */}
      <GroupStageHeader stats={stats} phase={phase} />

      {/* Grille des groupes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {summary.map((group, index) => (
          <GroupCard
            key={group.name}
            group={group}
            groupIndex={index}
            standings={standings[index]}
            matches={groupMatches[index]?.matches || []}
            teamsAdvancing={teamsAdvancing}
            isExpanded={expandedGroup === index}
            onToggle={() => setExpandedGroup(expandedGroup === index ? null : index)}
            onMatchClick={onMatchClick}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {/* Légende */}
      <GroupLegend teamsAdvancing={teamsAdvancing} />

      {/* Statistiques globales */}
      <GroupStageStatsCard stats={stats} />
    </div>
  );
}

/**
 * Header de la phase de groupes
 */
function GroupStageHeader({ stats, phase }) {
  return (
    <Card className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-full text-3xl">
            👥
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wider">Phase de Groupes</p>
            <h2 className="text-2xl font-bold text-white">
              {stats.completedMatches} / {stats.totalMatches} matchs
            </h2>
          </div>
        </div>
        
        <div className="text-right">
          <Badge variant={stats.isComplete ? 'success' : 'warning'}>
            {stats.isComplete ? '✅ Terminée' : `⏳ En cours (${stats.progress}%)`}
          </Badge>
          
          {stats.isComplete && phase === 'groups' && (
            <p className="text-sm text-green-400 mt-2 flex items-center justify-end gap-1">
              ➡️ Prêt pour les Playoffs
            </p>
          )}
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mt-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

/**
 * Card d'un groupe
 */
function GroupCard({ 
  group, 
  groupIndex, 
  standings, 
  matches, 
  teamsAdvancing,
  isExpanded,
  onToggle,
  onMatchClick,
  isAdmin
}) {
  const sortedStandings = [...standings].sort(sortGroupStandings);

  return (
    <Card className="overflow-hidden">
      {/* Header du groupe */}
      <div 
        className="p-4 bg-gray-800/50 flex items-center justify-between cursor-pointer hover:bg-gray-800/70 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{group.name}</span>
          </div>
          <div>
            <h3 className="font-semibold text-white">Groupe {group.name}</h3>
            <p className="text-sm text-gray-400">
              {group.matchesPlayed}/{group.matchesTotal} matchs
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {group.isComplete && (
            <Badge variant="success" size="sm">
              ✅ Terminé
            </Badge>
          )}
          <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Classement */}
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase">
              <th className="text-left pb-2">#</th>
              <th className="text-left pb-2">Équipe</th>
              <th className="text-center pb-2">J</th>
              <th className="text-center pb-2">V</th>
              <th className="text-center pb-2">D</th>
              <th className="text-center pb-2">Pts</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((standing, index) => (
              <GroupStandingRow
                key={standing.team_id}
                standing={standing}
                position={index + 1}
                isQualified={index < teamsAdvancing}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Matchs (accordéon) */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-4 bg-gray-900/30">
          <h4 className="text-sm font-semibold text-gray-400 mb-3">Matchs du groupe</h4>
          <div className="space-y-2">
            {matches.map((match) => (
              <GroupMatchItem
                key={match.id}
                match={match}
                onClick={() => onMatchClick?.(match)}
                isClickable={isAdmin || match.status === 'completed'}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Ligne de classement d'une équipe
 */
function GroupStandingRow({ standing, position, isQualified }) {
  return (
    <tr className={`border-b border-gray-800 ${isQualified ? 'bg-green-500/5' : ''}`}>
      <td className="py-2">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
          ${position === 1 ? 'bg-yellow-500 text-black' : 
            isQualified ? 'bg-green-500/20 text-green-400' : 
            'bg-gray-700 text-gray-400'}`}>
          {position}
        </span>
      </td>
      <td className="py-2">
        <span className="font-medium text-white">{standing.team?.name || 'Équipe'}</span>
        {isQualified && (
          <Badge variant="success" size="xs" className="ml-2">Q</Badge>
        )}
      </td>
      <td className="text-center py-2 text-gray-400">{standing.played}</td>
      <td className="text-center py-2 text-green-400">{standing.wins}</td>
      <td className="text-center py-2 text-red-400">{standing.losses}</td>
      <td className="text-center py-2">
        <span className="font-bold text-white">{standing.points}</span>
      </td>
    </tr>
  );
}

/**
 * Item de match dans un groupe
 */
function GroupMatchItem({ match, onClick, isClickable }) {
  const statusColors = {
    completed: 'border-l-green-500',
    pending: 'border-l-yellow-500',
    live: 'border-l-red-500'
  };

  return (
    <div 
      className={`p-3 bg-gray-800/50 rounded border-l-4 ${statusColors[match.status] || 'border-l-gray-600'}
        ${isClickable ? 'cursor-pointer hover:bg-gray-800/70' : ''} transition-colors`}
      onClick={isClickable ? onClick : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <span className={`font-medium ${match.winner_id === match.player1_id ? 'text-green-400' : 'text-white'}`}>
            {match.player1?.name || 'TBD'}
          </span>
          
          {match.status === 'completed' ? (
            <span className="text-gray-400 font-mono">
              {match.score1 ?? 0} - {match.score2 ?? 0}
            </span>
          ) : (
            <span className="text-gray-500">vs</span>
          )}
          
          <span className={`font-medium ${match.winner_id === match.player2_id ? 'text-green-400' : 'text-white'}`}>
            {match.player2?.name || 'TBD'}
          </span>
        </div>
        
        <Badge 
          variant={match.status === 'completed' ? 'success' : match.status === 'pending' ? 'warning' : 'secondary'}
          size="xs"
        >
          {match.status === 'completed' ? '✅ Terminé' : 
           match.status === 'pending' ? '⏳ En attente' : 
           match.status === 'live' ? '🔴 En cours' : '📅 À venir'}
        </Badge>
      </div>
    </div>
  );
}

/**
 * Légende des qualifications
 */
function GroupLegend({ teamsAdvancing }) {
  return (
    <Card className="p-4 bg-gray-800/30">
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/50" />
          <span className="text-gray-400">
            Qualifié ({teamsAdvancing} premier{teamsAdvancing > 1 ? 's' : ''} par groupe)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <span className="text-gray-400">1ère place</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge size="xs" variant="success">Q</Badge>
          <span className="text-gray-400">Qualifié pour les playoffs</span>
        </div>
      </div>
    </Card>
  );
}

/**
 * Card de statistiques globales
 */
function GroupStageStatsCard({ stats }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        📊 Statistiques de la Phase de Groupes
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatItem 
          label="Matchs joués" 
          value={stats.completedMatches}
        />
        <StatItem 
          label="Matchs restants" 
          value={stats.remainingMatches}
        />
        <StatItem 
          label="Progression" 
          value={`${stats.progress}%`}
        />
        <StatItem 
          label="Total maps" 
          value={stats.totalGoals || 0}
        />
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

/**
 * Composant pour afficher les résultats des playoffs après les groupes
 */
export function PlayoffBracketPreview({ qualifiedTeams, playoffFormat }) {
  if (!qualifiedTeams || qualifiedTeams.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 mt-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        🏆 Équipes Qualifiées pour les Playoffs
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {qualifiedTeams.map((team, index) => (
          <div 
            key={team.team_id}
            className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-violet-500/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold
                ${index === 0 ? 'bg-yellow-500 text-black' : 
                  index === 1 ? 'bg-gray-300 text-black' :
                  index === 2 ? 'bg-orange-600 text-white' :
                  'bg-gray-600 text-white'}`}>
                {index + 1}
              </div>
              <div>
                <p className="font-semibold text-white">{team.team?.name}</p>
                <p className="text-xs text-gray-400">
                  {team.groupPosition}
                  {team.groupPosition === 1 ? 'er' : 'ème'} Groupe {team.qualifiedFrom}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <Badge variant="info">
          Format Playoffs: {playoffFormat === 'double_elimination' ? 'Double Élimination' : 'Élimination Directe'}
        </Badge>
      </div>
    </Card>
  );
}

export default GroupStage;
