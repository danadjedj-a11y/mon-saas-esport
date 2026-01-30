import { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button, Modal } from '../../shared/components/ui';
import { toast } from '../../utils/toast';
import clsx from 'clsx';

/**
 * PlacementManager - Composant pour gérer le placement des équipes dans le bracket
 * Permet de placer manuellement ou automatiquement les équipes selon le seeding
 */
export default function PlacementManager({ 
  phaseId, 
  tournamentId, 
  size,
  format,
  onPlacementChange 
}) {
  const [draggedParticipant, setDraggedParticipant] = useState(null);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Convex queries
  const participants = useQuery(api.registrations.listByTournament, 
    tournamentId ? { tournamentId, status: 'confirmed' } : 'skip'
  ) || [];
  const slotsData = useQuery(api.tournamentPhases.getBracketSlots, 
    phaseId ? { phaseId } : 'skip'
  ) || [];
  const loading = participants === undefined || slotsData === undefined;

  // Convex mutations
  const placeBracketSlot = useMutation(api.tournamentPhases.placeBracketSlot);
  const clearBracketSlot = useMutation(api.tournamentPhases.clearBracketSlot);
  const resetBracketSlots = useMutation(api.tournamentPhases.resetBracketSlots);
  const autoPlaceBracketSlots = useMutation(api.tournamentPhases.autoPlaceBracketSlots);

  // Compute slots - use data or create empty slots
  const slots = slotsData.length > 0 
    ? slotsData 
    : Array.from({ length: size }, (_, i) => ({
        slotNumber: i + 1,
        teamId: null,
        participantId: null,
      }));

  // Calculate unplaced participants
  const placedTeamIds = slots.filter(s => s.teamId).map(s => s.teamId);
  const unplacedParticipants = participants.filter(p => 
    p.teamId && !placedTeamIds.includes(p.teamId)
  );

  // Placer une équipe dans un slot
  const placeTeam = async (slotNumber, participant) => {
    if (!participant) return;

    try {
      await placeBracketSlot({
        phaseId,
        slotNumber,
        teamId: participant.teamId,
        participantId: participant._id,
      });

      toast.success(`${participant.team?.name || 'Équipe'} placée en position ${slotNumber}`);
      onPlacementChange?.();
    } catch (error) {
      console.error('Erreur placement:', error);
      toast.error('Erreur lors du placement');
    }
  };

  // Retirer une équipe d'un slot
  const removeTeam = async (slotNumber) => {
    try {
      await clearBracketSlot({
        phaseId,
        slotNumber,
      });
      
      toast.success('Équipe retirée');
      onPlacementChange?.();
    } catch (error) {
      console.error('Erreur retrait:', error);
      toast.error('Erreur lors du retrait');
    }
  };

  // Placement automatique selon le seeding
  const autoPlace = async () => {
    if (participants.length === 0) {
      toast.error('Aucun participant confirmé à placer');
      return;
    }

    try {
      // Créer les placements
      const placements = participants
        .slice(0, size)
        .map((participant, index) => ({
          slotNumber: index + 1,
          teamId: participant.teamId,
          participantId: participant._id,
        }));

      await autoPlaceBracketSlots({
        phaseId,
        placements,
      });

      toast.success(`${placements.length} équipes placées automatiquement`);
      onPlacementChange?.();
    } catch (error) {
      console.error('Erreur auto-placement:', error);
      toast.error('Erreur lors du placement automatique');
    }
  };

  // Réinitialiser tous les placements
  const resetPlacements = async () => {
    if (!confirm('Réinitialiser tous les placements ?')) return;

    try {
      await resetBracketSlots({ phaseId });

      toast.success('Placements réinitialisés');
      onPlacementChange?.();
    } catch (error) {
      console.error('Erreur reset:', error);
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e, participant) => {
    setDraggedParticipant(participant);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, slotNumber) => {
    e.preventDefault();
    if (draggedParticipant) {
      placeTeam(slotNumber, draggedParticipant);
      setDraggedParticipant(null);
    }
  };

  // Ouvrir le modal de sélection
  const openSlotModal = (slotNumber) => {
    setSelectedSlot(slotNumber);
    setShowParticipantModal(true);
  };

  // Obtenir l'équipe placée dans un slot
  const getTeamForSlot = (slotNumber) => {
    const slot = slots.find(s => s.slotNumber === slotNumber);
    if (!slot?.teamId) return null;
    return participants.find(p => p.teamId === slot.teamId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={autoPlace}
          variant="secondary"
          className="bg-[#2a2d3e] border-white/10 hover:bg-white/10"
        >
          🎲 Placement automatique
        </Button>
        <Button
          onClick={resetPlacements}
          variant="secondary"
          className="bg-[#2a2d3e] border-white/10 hover:bg-white/10 text-red-400 hover:text-red-300"
        >
          ↺ Réinitialiser
        </Button>
        <span className="text-sm text-gray-500 ml-auto">
          {slots.filter(s => s.teamId).length} / {size} positions remplies
        </span>
      </div>

      {/* Grille des slots */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: size }, (_, i) => i + 1).map(slotNumber => {
          const team = getTeamForSlot(slotNumber);
          
          return (
            <div
              key={slotNumber}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, slotNumber)}
              onClick={() => !team && openSlotModal(slotNumber)}
              className={clsx(
                'relative p-3 rounded-lg border-2 border-dashed transition-all min-h-[80px]',
                team
                  ? 'bg-[#2a2d3e] border-white/10'
                  : 'bg-[#1e2235] border-white/10 hover:border-violet/50 cursor-pointer'
              )}
            >
              {/* Numéro de seed */}
              <div className="absolute top-1 left-2 text-xs font-bold text-amber-500">
                #{slotNumber}
              </div>

              {team ? (
                <div className="pt-4">
                  <div className="flex items-center gap-2">
                    {team.team?.logoUrl ? (
                      <img 
                        src={team.team.logoUrl} 
                        alt="" 
                        className="w-6 h-6 rounded object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-violet/20 rounded flex items-center justify-center text-xs text-violet">
                        {team.team?.name?.[0] || '?'}
                      </div>
                    )}
                    <span className="text-sm text-white font-medium truncate flex-1">
                      {team.team?.tag || team.team?.name || 'Équipe'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTeam(slotNumber);
                    }}
                    className="absolute top-1 right-1 text-gray-500 hover:text-red-400 transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-gray-500 text-sm">+ Placer</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Équipes non placées */}
      {unplacedParticipants.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Équipes non placées ({unplacedParticipants.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unplacedParticipants.map(participant => (
              <div
                key={participant._id}
                draggable
                onDragStart={(e) => handleDragStart(e, participant)}
                className="flex items-center gap-2 px-3 py-2 bg-[#2a2d3e] border border-white/10 rounded-lg cursor-grab hover:border-violet/50 transition-colors"
              >
                {participant.team?.logoUrl ? (
                  <img 
                    src={participant.team.logoUrl} 
                    alt="" 
                    className="w-5 h-5 rounded object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 bg-violet/20 rounded flex items-center justify-center text-xs text-violet">
                    {participant.team?.name?.[0] || '?'}
                  </div>
                )}
                <span className="text-sm text-white">
                  {participant.team?.name || 'Équipe'}
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  (Seed {participant.seed || '?'})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de sélection de participant */}
      <Modal
        isOpen={showParticipantModal}
        onClose={() => {
          setShowParticipantModal(false);
          setSelectedSlot(null);
        }}
        title={`Placer une équipe en position #${selectedSlot}`}
        size="md"
      >
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {unplacedParticipants.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              Toutes les équipes sont déjà placées
            </p>
          ) : (
            unplacedParticipants.map(participant => (
              <button
                key={participant._id}
                onClick={() => {
                  placeTeam(selectedSlot, participant);
                  setShowParticipantModal(false);
                  setSelectedSlot(null);
                }}
                className="w-full flex items-center gap-3 p-3 bg-[#2a2d3e] border border-white/10 rounded-lg hover:border-violet/50 transition-colors text-left"
              >
                {participant.team?.logoUrl ? (
                  <img 
                    src={participant.team.logoUrl} 
                    alt="" 
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-violet/20 rounded flex items-center justify-center text-violet">
                    {participant.team?.name?.[0] || '?'}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white font-medium">{participant.team?.name || 'Équipe'}</p>
                  <p className="text-xs text-gray-500">Seed actuel: {participant.seed || '-'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
