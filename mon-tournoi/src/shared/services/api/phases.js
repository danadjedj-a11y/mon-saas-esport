/**
 * API Service pour la gestion des phases de tournoi
 * Inspiré de Toornament Organizer
 */

import { supabase } from '../../supabaseClient';

/**
 * Récupère toutes les phases d'un tournoi
 */
export async function getPhases(tournamentId) {
  const { data, error } = await supabase
    .from('tournament_phases')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('phase_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Récupère une phase par son ID
 */
export async function getPhase(phaseId) {
  const { data, error } = await supabase
    .from('tournament_phases')
    .select('*')
    .eq('id', phaseId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Crée une nouvelle phase
 */
export async function createPhase(phaseData) {
  const { data, error } = await supabase
    .from('tournament_phases')
    .insert([phaseData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Met à jour une phase
 */
export async function updatePhase(phaseId, updates) {
  const { data, error } = await supabase
    .from('tournament_phases')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', phaseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supprime une phase
 */
export async function deletePhase(phaseId) {
  const { error } = await supabase
    .from('tournament_phases')
    .delete()
    .eq('id', phaseId);

  if (error) throw error;
  return true;
}

/**
 * Réordonne les phases d'un tournoi
 */
export async function reorderPhases(tournamentId, phaseIds) {
  const updates = phaseIds.map((id, index) => ({
    id,
    phase_order: index + 1,
  }));

  // Update chaque phase
  for (const update of updates) {
    const { error } = await supabase
      .from('tournament_phases')
      .update({ phase_order: update.phase_order, updated_at: new Date().toISOString() })
      .eq('id', update.id);

    if (error) throw error;
  }

  return true;
}

/**
 * Change le statut d'une phase
 */
export async function updatePhaseStatus(phaseId, status) {
  const validStatuses = ['draft', 'ready', 'ongoing', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  return updatePhase(phaseId, { status });
}

// =====================================================
// BRACKET SLOTS
// =====================================================

/**
 * Récupère les slots de bracket d'une phase
 */
export async function getBracketSlots(phaseId) {
  const { data, error } = await supabase
    .from('bracket_slots')
    .select(`
      *,
      team:teams(id, name, logo_url),
      participant:participants(id, team_name, seed_order)
    `)
    .eq('phase_id', phaseId)
    .order('slot_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Place une équipe dans un slot
 */
export async function placeTeamInSlot(phaseId, slotNumber, teamId, participantId = null) {
  // Upsert - créer ou mettre à jour le slot
  const { data, error } = await supabase
    .from('bracket_slots')
    .upsert({
      phase_id: phaseId,
      slot_number: slotNumber,
      team_id: teamId,
      participant_id: participantId,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'phase_id,slot_number'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Retire une équipe d'un slot
 */
export async function removeTeamFromSlot(phaseId, slotNumber) {
  const { error } = await supabase
    .from('bracket_slots')
    .update({
      team_id: null,
      participant_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('phase_id', phaseId)
    .eq('slot_number', slotNumber);

  if (error) throw error;
  return true;
}

/**
 * Auto-place les équipes selon leur seeding
 */
export async function autoPlaceBySeeding(phaseId, tournamentId) {
  // Récupérer les participants triés par seed_order
  const { data: participants, error: pError } = await supabase
    .from('participants')
    .select('id, team_id, seed_order')
    .eq('tournament_id', tournamentId)
    .order('seed_order', { ascending: true });

  if (pError) throw pError;

  // Placer chaque participant dans un slot
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    await placeTeamInSlot(phaseId, i + 1, participant.team_id, participant.id);
  }

  return true;
}

/**
 * Réinitialise tous les placements d'une phase
 */
export async function resetPlacements(phaseId) {
  const { error } = await supabase
    .from('bracket_slots')
    .delete()
    .eq('phase_id', phaseId);

  if (error) throw error;
  return true;
}

/**
 * Initialise les slots vides pour une phase
 */
export async function initializeBracketSlots(phaseId, size) {
  const slots = [];
  for (let i = 1; i <= size; i++) {
    slots.push({
      phase_id: phaseId,
      slot_number: i,
      team_id: null,
      participant_id: null,
    });
  }

  const { data, error } = await supabase
    .from('bracket_slots')
    .upsert(slots, { onConflict: 'phase_id,slot_number' })
    .select();

  if (error) throw error;
  return data;
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Génère la structure d'un bracket en fonction du format
 */
export function generateBracketStructure(format, size, config = {}) {
  const numRounds = Math.ceil(Math.log2(size));
  
  switch (format) {
    case 'elimination':
      return generateSingleEliminationStructure(size, numRounds);
    case 'double_elimination':
      return generateDoubleEliminationStructure(size, numRounds, config);
    case 'round_robin':
      return generateRoundRobinStructure(size);
    case 'swiss':
      return generateSwissStructure(size, config.rounds || Math.ceil(Math.log2(size)));
    default:
      return generateSingleEliminationStructure(size, numRounds);
  }
}

function generateSingleEliminationStructure(size, numRounds) {
  const rounds = [];
  let matchesInRound = Math.ceil(size / 2);

  for (let round = 1; round <= numRounds; round++) {
    const matches = [];
    for (let i = 1; i <= matchesInRound; i++) {
      matches.push({
        id: `R${round}M${i}`,
        round,
        position: i,
        bracket: 'main',
      });
    }
    rounds.push({
      name: round === numRounds ? 'Finale' : `Round ${round}`,
      matches,
    });
    matchesInRound = Math.ceil(matchesInRound / 2);
  }

  return { rounds, type: 'single_elimination' };
}

function generateDoubleEliminationStructure(size, numRounds, config) {
  const winnersRounds = [];
  const losersRounds = [];
  
  // Winners bracket
  let matchesInRound = Math.ceil(size / 2);
  for (let round = 1; round <= numRounds; round++) {
    const matches = [];
    for (let i = 1; i <= matchesInRound; i++) {
      matches.push({
        id: `WB${round}M${i}`,
        round,
        position: i,
        bracket: 'winners',
      });
    }
    winnersRounds.push({
      name: round === numRounds ? 'WB Final' : `WB Round ${round}`,
      matches,
    });
    matchesInRound = Math.ceil(matchesInRound / 2);
  }

  // Losers bracket (simplified)
  const losersRoundsCount = (numRounds - 1) * 2;
  matchesInRound = Math.ceil(size / 4);
  
  for (let round = 1; round <= losersRoundsCount; round++) {
    const matches = [];
    for (let i = 1; i <= matchesInRound; i++) {
      matches.push({
        id: `LB${round}M${i}`,
        round,
        position: i,
        bracket: 'losers',
      });
    }
    losersRounds.push({
      name: round === losersRoundsCount ? 'LB Final' : `LB Round ${round}`,
      matches,
    });
    if (round % 2 === 0) {
      matchesInRound = Math.ceil(matchesInRound / 2);
    }
  }

  // Grand Final
  const grandFinal = config.grand_final !== 'none' ? {
    name: 'Grand Final',
    matches: [{ id: 'GF1', round: 1, position: 1, bracket: 'grand_final' }],
  } : null;

  return { 
    winnersRounds, 
    losersRounds, 
    grandFinal,
    type: 'double_elimination' 
  };
}

function generateRoundRobinStructure(size) {
  // Calculer le nombre de matchs: n(n-1)/2
  const totalMatches = (size * (size - 1)) / 2;
  const rounds = [];
  
  // Simplifié: tous les matchs dans une seule "ronde"
  const matches = [];
  for (let i = 1; i <= totalMatches; i++) {
    matches.push({
      id: `RRM${i}`,
      round: 1,
      position: i,
      bracket: 'round_robin',
    });
  }
  
  rounds.push({
    name: 'Matchs',
    matches,
  });

  return { rounds, type: 'round_robin' };
}

function generateSwissStructure(size, numRounds) {
  const rounds = [];
  
  for (let round = 1; round <= numRounds; round++) {
    const matchesInRound = Math.floor(size / 2);
    const matches = [];
    for (let i = 1; i <= matchesInRound; i++) {
      matches.push({
        id: `SW${round}M${i}`,
        round,
        position: i,
        bracket: 'swiss',
      });
    }
    rounds.push({
      name: `Ronde ${round}`,
      matches,
    });
  }

  return { rounds, type: 'swiss' };
}

export default {
  // Phases
  getPhases,
  getPhase,
  createPhase,
  updatePhase,
  deletePhase,
  reorderPhases,
  updatePhaseStatus,
  
  // Bracket Slots
  getBracketSlots,
  placeTeamInSlot,
  removeTeamFromSlot,
  autoPlaceBySeeding,
  resetPlacements,
  initializeBracketSlots,
  
  // Helpers
  generateBracketStructure,
};
