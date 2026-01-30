import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import clsx from 'clsx';

/**
 * MapVetoSystem - Système de ban/pick de maps
 * Utilisé dans le lobby de match pour déterminer les maps jouées
 */
export default function MapVetoSystem({
  matchId,
  maps = [],
  bestOf = 1,
  team1,
  team2,
  currentTeamId,
  isSpectator = false,
  onComplete,
  onUpdate,
}) {
  const [vetoState, setVetoState] = useState({
    step: 0,
    actions: [],
    selectedMaps: [],
    currentTurn: null,
    completed: false,
  });
  const [processing, setProcessing] = useState(false);

  // Convex query for veto actions - automatically reactive
  const vetoActions = useQuery(api.matchVeto.getByMatch, matchId ? { matchId } : 'skip');
  const addVetoAction = useMutation(api.matchVeto.addAction);

  // Définir le format de veto selon le Best-of
  const getVetoFormat = useCallback(() => {
    switch (bestOf) {
      case 1:
        // BO1: Ban Ban Ban Ban Ban Ban Pick
        return [
          { type: 'ban', team: 1 },
          { type: 'ban', team: 2 },
          { type: 'ban', team: 1 },
          { type: 'ban', team: 2 },
          { type: 'ban', team: 1 },
          { type: 'ban', team: 2 },
          { type: 'pick', team: 'remaining' },
        ];
      case 3:
        // BO3: Ban Ban Pick Pick Ban Ban Pick
        return [
          { type: 'ban', team: 1 },
          { type: 'ban', team: 2 },
          { type: 'pick', team: 1 },
          { type: 'pick', team: 2 },
          { type: 'ban', team: 1 },
          { type: 'ban', team: 2 },
          { type: 'pick', team: 'remaining' },
        ];
      case 5:
        // BO5: Ban Ban Pick Pick Pick Pick Pick
        return [
          { type: 'ban', team: 1 },
          { type: 'ban', team: 2 },
          { type: 'pick', team: 1 },
          { type: 'pick', team: 2 },
          { type: 'pick', team: 1 },
          { type: 'pick', team: 2 },
          { type: 'pick', team: 'remaining' },
        ];
      default:
        return [];
    }
  }, [bestOf]);

  const vetoFormat = getVetoFormat();

  // Loading state
  const loading = vetoActions === undefined;

  // Process veto state from Convex data
  useEffect(() => {
    if (!vetoActions) return;

    const actions = vetoActions.sort((a, b) => a.step - b.step);
    const step = actions.length;
    const completed = step >= vetoFormat.length;

    // Déterminer les maps sélectionnées
    const bannedMaps = actions.filter(a => a.actionType === 'ban').map(a => a.mapName);
    const pickedMaps = actions.filter(a => a.actionType === 'pick').map(a => a.mapName);
    
    // Maps restantes après tous les bans
    const remainingMaps = maps.filter(m => !bannedMaps.includes(m) && !pickedMaps.includes(m));

    // Déterminer le tour actuel
    let currentTurn = null;
    if (!completed && step < vetoFormat.length) {
      const currentAction = vetoFormat[step];
      if (currentAction.team !== 'remaining') {
        currentTurn = currentAction.team === 1 ? team1?._id : team2?._id;
      }
    }

    setVetoState({
      step,
      actions,
      selectedMaps: pickedMaps,
      bannedMaps,
      remainingMaps,
      currentTurn,
      completed,
    });

    if (completed && onComplete) {
      onComplete(pickedMaps);
    }
  }, [vetoActions, vetoFormat, maps, team1, team2, onComplete]);

  const handleVetoAction = async (mapName) => {
    if (processing || vetoState.completed) return;
    
    const currentAction = vetoFormat[vetoState.step];
    if (!currentAction) return;

    // Vérifier que c'est bien le tour de cette équipe
    if (currentAction.team !== 'remaining') {
      const expectedTeam = currentAction.team === 1 ? team1?._id : team2?._id;
      if (currentTeamId !== expectedTeam) {
        return; // Pas notre tour
      }
    }

    setProcessing(true);
    try {
      await addVetoAction({
        matchId,
        teamId: currentTeamId,
        mapName,
        actionType: currentAction.type,
        step: vetoState.step,
      });

      if (onUpdate) {
        onUpdate({
          step: vetoState.step + 1,
          action: currentAction.type,
          map: mapName,
        });
      }
    } catch (error) {
      console.error('Erreur veto:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getCurrentActionInfo = () => {
    if (vetoState.completed) {
      return { text: 'Veto terminé', color: 'text-green-400' };
    }
    
    const currentAction = vetoFormat[vetoState.step];
    if (!currentAction) return { text: '', color: '' };

    const actionText = currentAction.type === 'ban' ? 'BAN' : 'PICK';
    let teamName = '';
    
    if (currentAction.team === 'remaining') {
      return { text: 'Map restante sélectionnée automatiquement', color: 'text-cyan-400' };
    } else if (currentAction.team === 1) {
      teamName = team1?.name || 'Équipe 1';
    } else {
      teamName = team2?.name || 'Équipe 2';
    }

    const isOurTurn = currentAction.team === 1 
      ? currentTeamId === team1?._id 
      : currentTeamId === team2?._id;

    return {
      text: `${teamName} doit ${actionText} une map`,
      color: currentAction.type === 'ban' ? 'text-red-400' : 'text-green-400',
      isOurTurn,
    };
  };

  const getMapStatus = (mapName) => {
    const action = vetoState.actions.find(a => a.mapName === mapName);
    if (action) {
      return {
        type: action.actionType,
        team: action.teamId === team1?._id ? team1 : team2,
      };
    }
    return null;
  };

  const actionInfo = getCurrentActionInfo();

  if (loading) {
    return (
      <div className="p-6 bg-[#1e2235] rounded-xl border border-white/10">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e2235] rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            🗺️ Veto de Maps
            <span className="text-xs bg-violet/20 text-violet px-2 py-0.5 rounded">
              BO{bestOf}
            </span>
          </h3>
          <span className="text-sm text-text-secondary">
            Étape {vetoState.step + 1} / {vetoFormat.length}
          </span>
        </div>
        
        {!vetoState.completed && (
          <div className={clsx('mt-2 text-sm font-medium', actionInfo.color)}>
            {actionInfo.isOurTurn && '👉 '}{actionInfo.text}
          </div>
        )}
      </div>

      {/* Maps Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {maps.map((mapName) => {
            const status = getMapStatus(mapName);
            const isAvailable = !status;
            const isBanned = status?.type === 'ban';
            const isPicked = status?.type === 'pick';
            
            const currentAction = vetoFormat[vetoState.step];
            const canSelect = isAvailable && !vetoState.completed && !isSpectator && actionInfo.isOurTurn;

            return (
              <button
                key={mapName}
                onClick={() => canSelect && handleVetoAction(mapName)}
                disabled={!canSelect || processing}
                className={clsx(
                  'relative p-4 rounded-xl border-2 transition-all',
                  // États visuels
                  isBanned && 'bg-red-500/10 border-red-500/30 opacity-50',
                  isPicked && 'bg-green-500/20 border-green-500/50',
                  isAvailable && 'bg-white/5 border-white/10',
                  // Hover/interactif
                  canSelect && 'hover:bg-white/10 hover:border-violet cursor-pointer',
                  !canSelect && !isBanned && !isPicked && 'cursor-not-allowed',
                  processing && 'opacity-50'
                )}
              >
                {/* Map name */}
                <div className={clsx(
                  'font-medium text-center',
                  isBanned && 'text-red-400 line-through',
                  isPicked && 'text-green-400',
                  isAvailable && 'text-white'
                )}>
                  {mapName}
                </div>

                {/* Status badge */}
                {status && (
                  <div className={clsx(
                    'absolute -top-2 -right-2 px-2 py-0.5 rounded text-xs font-bold',
                    isBanned && 'bg-red-500 text-white',
                    isPicked && 'bg-green-500 text-white'
                  )}>
                    {isBanned ? 'BAN' : 'PICK'}
                  </div>
                )}

                {/* Team indicator */}
                {status && (
                  <div className="text-xs text-text-secondary mt-1 text-center truncate">
                    {status.team?.name || 'Équipe'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Veto History */}
      {vetoState.actions.length > 0 && (
        <div className="p-4 border-t border-white/10 bg-black/20">
          <p className="text-xs text-text-secondary mb-2">Historique du veto :</p>
          <div className="flex flex-wrap gap-2">
            {vetoState.actions.map((action, i) => {
              const team = action.teamId === team1?._id ? team1 : team2;
              return (
                <div
                  key={i}
                  className={clsx(
                    'px-2 py-1 rounded text-xs flex items-center gap-1',
                    action.actionType === 'ban' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-green-500/20 text-green-400'
                  )}
                >
                  <span className="font-medium">{team?.name?.slice(0, 3) || '?'}</span>
                  <span className="text-text-muted">
                    {action.actionType === 'ban' ? '✕' : '✓'}
                  </span>
                  <span>{action.mapName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Maps Summary */}
      {vetoState.selectedMaps.length > 0 && (
        <div className="p-4 border-t border-white/10">
          <p className="text-sm text-text-secondary mb-2">Maps à jouer :</p>
          <div className="flex gap-2">
            {vetoState.selectedMaps.map((map, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet/20 to-cyan/20 rounded-lg border border-violet/30"
              >
                <span className="text-xs text-text-muted">G{i + 1}</span>
                <span className="font-medium text-white">{map}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed state */}
      {vetoState.completed && (
        <div className="p-4 bg-green-500/10 border-t border-green-500/30">
          <div className="flex items-center gap-2 text-green-400">
            <span>✅</span>
            <span className="font-medium">Veto terminé - {vetoState.selectedMaps.length} map(s) sélectionnée(s)</span>
          </div>
        </div>
      )}
    </div>
  );
}
