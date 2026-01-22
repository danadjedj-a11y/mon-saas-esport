/**
 * Composant RoundCheckIn pour permettre aux joueurs de confirmer leur présence par round
 * 
 * @component
 */

import React, { useMemo } from 'react';
import { useRoundCheckIn } from '../../shared/hooks/useRoundCheckIn';
import { Button, Badge } from '../../shared/components/ui';

/**
 * Bouton de check-in pour un round spécifique
 * 
 * @param {Object} props
 * @param {string} props.tournamentId - ID du tournoi
 * @param {string} props.participantId - ID du participant
 * @param {number} props.roundNumber - Numéro du round
 * @param {boolean} props.disabled - Désactiver le bouton
 * @param {string} props.size - Taille du bouton (sm, md, lg)
 */
export function RoundCheckInButton({ 
  tournamentId, 
  participantId, 
  roundNumber, 
  disabled = false,
  size = 'md'
}) {
  const { isCheckedIn, performCheckIn, loading } = useRoundCheckIn(
    tournamentId, 
    participantId
  );

  const hasCheckedIn = isCheckedIn(roundNumber);

  const handleCheckIn = async () => {
    await performCheckIn(roundNumber);
  };

  if (hasCheckedIn) {
    return (
      <Badge variant="success" className="inline-flex items-center gap-1">
        ✅ Check-in confirmé
      </Badge>
    );
  }

  return (
    <Button
      variant="primary"
      size={size}
      onClick={handleCheckIn}
      disabled={disabled || loading}
      loading={loading}
    >
      📍 Check-in Round {roundNumber}
    </Button>
  );
}

/**
 * Panneau complet de check-in par round pour un tournoi
 * Affiche tous les rounds avec leur statut de check-in
 * 
 * @param {Object} props
 * @param {string} props.tournamentId - ID du tournoi
 * @param {string} props.participantId - ID du participant
 * @param {number} props.totalRounds - Nombre total de rounds
 * @param {number} props.currentRound - Round actuel (pour mettre en évidence)
 * @param {boolean} props.isAdmin - Mode admin (peut annuler les check-ins)
 */
export function RoundCheckInPanel({
  tournamentId,
  participantId,
  totalRounds = 1,
  currentRound = 1,
  isAdmin = false
}) {
  const { 
    checkIns, 
    isCheckedIn, 
    performCheckIn, 
    cancelCheckIn,
    roundCheckInSettings,
    loading 
  } = useRoundCheckIn(tournamentId, participantId, { subscribe: true });

  const rounds = useMemo(() => {
    return Array.from({ length: totalRounds }, (_, i) => i + 1);
  }, [totalRounds]);

  if (!roundCheckInSettings.enabled) {
    return null;
  }

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-4 border border-white/10">
      <h3 className="text-lg font-display text-cyan-400 mb-4 flex items-center gap-2">
        📍 Check-in par Round
      </h3>
      
      <div className="space-y-3">
        {rounds.map(roundNum => {
          const hasCheckedIn = isCheckedIn(roundNum);
          const isCurrent = roundNum === currentRound;
          const isPast = roundNum < currentRound;
          const isFuture = roundNum > currentRound;

          return (
            <div 
              key={roundNum}
              className={`
                flex items-center justify-between p-3 rounded-lg border transition-all
                ${isCurrent 
                  ? 'border-cyan-500 bg-cyan-500/10' 
                  : 'border-white/10 bg-white/5'
                }
                ${isPast ? 'opacity-60' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${hasCheckedIn 
                    ? 'bg-green-500/20 text-green-400' 
                    : isCurrent 
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-white/10 text-gray-400'
                  }
                `}>
                  {roundNum}
                </span>
                <div>
                  <span className="font-medium text-white">
                    Round {roundNum}
                    {isCurrent && (
                      <Badge variant="info" className="ml-2 text-xs">
                        En cours
                      </Badge>
                    )}
                  </span>
                  {hasCheckedIn && (
                    <p className="text-xs text-green-400 mt-0.5">
                      ✓ Check-in effectué
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasCheckedIn ? (
                  <>
                    <Badge variant="success">✅</Badge>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelCheckIn(roundNum)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Annuler
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant={isCurrent ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => performCheckIn(roundNum)}
                    disabled={loading || (isFuture && !isAdmin)}
                  >
                    {loading ? '...' : 'Check-in'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        💡 Le check-in doit être fait {roundCheckInSettings.deadlineMinutes} minutes avant le début de chaque round.
      </p>
    </div>
  );
}

/**
 * Vue admin : liste des check-ins pour un round
 * 
 * @param {Object} props
 * @param {string} props.tournamentId - ID du tournoi
 * @param {number} props.roundNumber - Numéro du round
 * @param {Array} props.participants - Liste des participants
 */
export function RoundCheckInAdminList({
  tournamentId,
  roundNumber,
  participants = []
}) {
  const { 
    getCheckInsForRound, 
    isCheckedIn,
    performCheckIn,
    cancelCheckIn,
    loading 
  } = useRoundCheckIn(tournamentId, null, { subscribe: true });

  const checkInsForRound = getCheckInsForRound(roundNumber);
  const checkedInCount = checkInsForRound.length;
  const totalCount = participants.length;
  const percentage = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-4 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display text-white">
          Check-in Round {roundNumber}
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant={percentage === 100 ? 'success' : 'warning'}>
            {checkedInCount}/{totalCount} ({percentage}%)
          </Badge>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full h-2 bg-white/10 rounded-full mb-4 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            percentage === 100 ? 'bg-green-500' : 'bg-cyan-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Liste des participants */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {participants.map(participant => {
          const hasCheckedIn = isCheckedIn(roundNumber, participant.id);
          const teamName = participant.teams?.name || participant.temporary_team_name || 'Équipe';

          return (
            <div 
              key={participant.id}
              className={`
                flex items-center justify-between p-2 rounded border
                ${hasCheckedIn 
                  ? 'border-green-500/30 bg-green-500/10' 
                  : 'border-white/10 bg-white/5'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className={hasCheckedIn ? 'text-green-400' : 'text-gray-400'}>
                  {hasCheckedIn ? '✅' : '⏳'}
                </span>
                <span className="text-white">{teamName}</span>
              </div>

              <Button
                variant={hasCheckedIn ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => 
                  hasCheckedIn 
                    ? cancelCheckIn(roundNumber, participant.id)
                    : performCheckIn(roundNumber, participant.id)
                }
                disabled={loading}
                className={hasCheckedIn ? 'text-red-400' : ''}
              >
                {hasCheckedIn ? 'Annuler' : 'Forcer'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default {
  RoundCheckInButton,
  RoundCheckInPanel,
  RoundCheckInAdminList
};
