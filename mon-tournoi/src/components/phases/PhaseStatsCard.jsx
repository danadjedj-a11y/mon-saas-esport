import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import clsx from 'clsx';

/**
 * PhaseStatsCard - Affiche les statistiques d'une phase
 */
export default function PhaseStatsCard({ phase, tournamentId }) {
  // Convex queries for stats
  const slotsData = useQuery(
    api.tournamentPhases.getBracketSlots,
    phase?._id ? { phaseId: phase._id } : "skip"
  );
  
  const matchesData = useQuery(
    api.matches.listByPhase,
    phase?._id ? { phaseId: phase._id } : "skip"
  );

  const loading = slotsData === undefined || matchesData === undefined;
  
  // Calculate stats
  const placedCount = (slotsData || []).filter(s => s.teamId).length;
  const matches = matchesData || [];
  const matchStats = matches.reduce((acc, m) => {
    if (m.status === 'completed') acc.completed++;
    else if (m.status === 'in_progress') acc.inProgress++;
    else acc.pending++;
    return acc;
  }, { completed: 0, inProgress: 0, pending: 0 });

  const stats = {
    totalTeams: phase?.settings?.maxTeams || 0,
    placedTeams: placedCount,
    completedMatches: matchStats.completed,
    pendingMatches: matchStats.pending,
    inProgressMatches: matchStats.inProgress,
  };

  const progress = stats.totalTeams > 0 
    ? Math.round((stats.placedTeams / stats.totalTeams) * 100) 
    : 0;

  const matchProgress = (stats.completedMatches + stats.pendingMatches + stats.inProgressMatches) > 0
    ? Math.round((stats.completedMatches / (stats.completedMatches + stats.pendingMatches + stats.inProgressMatches)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="animate-pulse p-4 bg-[#2a2d3e] rounded-lg">
        <div className="h-4 bg-white/10 rounded w-1/2 mb-2" />
        <div className="h-6 bg-white/10 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#2a2d3e] rounded-lg border border-white/10">
      <h4 className="text-sm font-medium text-gray-300 mb-3">{phase.name}</h4>
      
      <div className="space-y-3">
        {/* Placement progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Placement</span>
            <span>{stats.placedTeams}/{stats.totalTeams} équipes</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet to-cyan transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Match progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Matchs</span>
            <span>{stats.completedMatches} terminés</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
              style={{ width: `${matchProgress}%` }}
            />
          </div>
        </div>

        {/* Détails */}
        <div className="flex gap-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-gray-400">{stats.inProgressMatches} en cours</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-gray-400">{stats.pendingMatches} à venir</span>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <span className={clsx(
          'px-2 py-1 text-xs rounded-full',
          phase.status === 'completed' && 'bg-green-500/20 text-green-400',
          phase.status === 'ongoing' && 'bg-cyan-500/20 text-cyan-400',
          phase.status === 'ready' && 'bg-blue-500/20 text-blue-400',
          (!phase.status || phase.status === 'draft') && 'bg-gray-500/20 text-gray-400',
        )}>
          {phase.status === 'completed' ? '✓ Terminée' :
           phase.status === 'ongoing' ? '▶ En cours' :
           phase.status === 'ready' ? '● Prête' : '○ Brouillon'}
        </span>
      </div>
    </div>
  );
}
