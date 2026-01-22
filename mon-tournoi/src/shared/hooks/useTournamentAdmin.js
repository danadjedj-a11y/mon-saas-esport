/**
 * Hook personnalisé pour les actions d'administration des tournois
 * Gère le démarrage, la génération des brackets, la gestion des participants
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from '../../utils/toast';
import { initializeSwissScores } from '../../swissUtils';

/**
 * Hook pour les actions admin sur un tournoi
 * @param {string} tournamentId - ID du tournoi
 * @param {Object} tournament - Données du tournoi
 * @param {Array} participants - Liste des participants
 * @param {Function} onRefresh - Callback pour rafraîchir les données
 */
export function useTournamentAdmin(tournamentId, tournament, participants, onRefresh) {
  const [actionLoading, setActionLoading] = useState(false);

  /**
   * Lance le tournoi
   */
  const startTournament = useCallback(async () => {
    if (participants.length < 2) {
      toast.error("Il faut au moins 2 équipes pour lancer !");
      return false;
    }
    if (!confirm("Lancer le tournoi ? Plus aucune inscription ne sera possible.")) {
      return false;
    }
    
    setActionLoading(true);

    try {
      const checkedInParticipants = participants.filter(p => p.checked_in && !p.disqualified);
      
      if (checkedInParticipants.length < 2) {
        toast.warning("Moins de 2 équipes ont fait leur check-in. Impossible de lancer.");
        return false;
      }

      await generateBracket(checkedInParticipants);

      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'ongoing' })
        .eq('id', tournamentId);

      if (error) throw error;

      toast.success("Tournoi lancé !");
      onRefresh?.();
      return true;
    } catch (error) {
      console.error('[useTournamentAdmin] Erreur startTournament:', error);
      toast.error("Erreur: " + error.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [tournamentId, participants, onRefresh]);

  /**
   * Génère le bracket du tournoi
   * @param {Array} participantsList - Liste des participants à inclure
   * @param {boolean} deleteExisting - Supprimer les matchs existants
   */
  const generateBracket = useCallback(async (participantsList, deleteExisting = true) => {
    if (!tournament || participantsList.length < 2) {
      toast.error("Il faut au moins 2 équipes pour générer le bracket.");
      return false;
    }

    setActionLoading(true);

    try {
      if (deleteExisting) {
        await supabase.from('matches').delete().eq('tournament_id', tournamentId);
      }

      let matchesToCreate = [];
      let orderedParticipants = [...participantsList];
      
      // Gestion du Seeding
      const hasSeeding = participantsList.some(p => p.seed_order !== null && p.seed_order !== undefined);
      if (hasSeeding) {
        orderedParticipants.sort((a, b) => (a.seed_order ?? 999) - (b.seed_order ?? 999));
      } else {
        orderedParticipants.sort(() => 0.5 - Math.random());
      }

      // Générer selon le format
      switch (tournament.format) {
        case 'elimination':
          matchesToCreate = generateSingleEliminationMatches(orderedParticipants, tournamentId);
          break;
        case 'double_elimination':
          matchesToCreate = generateDoubleEliminationMatches(orderedParticipants, tournamentId);
          break;
        case 'round_robin':
          matchesToCreate = generateRoundRobinMatches(orderedParticipants, tournamentId);
          break;
        case 'swiss':
          matchesToCreate = await generateSwissMatches(orderedParticipants, tournamentId);
          break;
        default:
          throw new Error(`Format non supporté: ${tournament.format}`);
      }

      const { error } = await supabase.from('matches').insert(matchesToCreate);
      if (error) throw error;
      
      toast.success("Bracket généré !");
      onRefresh?.();
      return true;
    } catch (error) {
      console.error('[useTournamentAdmin] Erreur generateBracket:', error);
      toast.error("Erreur: " + error.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [tournamentId, tournament, onRefresh]);

  /**
   * Promeut une équipe de la waitlist vers les participants
   */
  const promoteFromWaitlist = useCallback(async (waitlistEntryId, teamId) => {
    setActionLoading(true);
    
    try {
      // 1. Récupérer l'entrée waitlist
      const { data: waitlistEntry, error: fetchError } = await supabase
        .from('waitlist')
        .select('*')
        .eq('id', waitlistEntryId)
        .single();
      
      if (fetchError || !waitlistEntry) {
        throw new Error("Entrée waitlist non trouvée");
      }

      // 2. Créer le participant
      const participantData = {
        tournament_id: tournamentId,
        team_id: teamId,
        checked_in: false,
        disqualified: false
      };

      // Si équipe temporaire
      if (waitlistEntry.temporary_team_name) {
        participantData.temporary_team_name = waitlistEntry.temporary_team_name;
      }

      const { error: insertError } = await supabase
        .from('participants')
        .insert([participantData]);
      
      if (insertError) throw insertError;

      // 3. Supprimer de la waitlist
      await supabase.from('waitlist').delete().eq('id', waitlistEntryId);

      // 4. Réordonner les positions
      const { data: remaining } = await supabase
        .from('waitlist')
        .select('id')
        .eq('tournament_id', tournamentId)
        .order('position');

      if (remaining?.length > 0) {
        for (let i = 0; i < remaining.length; i++) {
          await supabase
            .from('waitlist')
            .update({ position: i + 1 })
            .eq('id', remaining[i].id);
        }
      }

      toast.success("Équipe promue avec succès !");
      onRefresh?.();
      return true;
    } catch (error) {
      console.error('[useTournamentAdmin] Erreur promoteFromWaitlist:', error);
      toast.error("Erreur: " + error.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [tournamentId, onRefresh]);

  /**
   * Supprime un participant
   */
  const removeParticipant = useCallback(async (participantId) => {
    if (!confirm("Supprimer ce participant ?")) return false;

    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);
      
      if (error) throw error;
      
      toast.success("Participant supprimé");
      onRefresh?.();
      return true;
    } catch (error) {
      console.error('[useTournamentAdmin] Erreur removeParticipant:', error);
      toast.error("Erreur: " + error.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [onRefresh]);

  /**
   * Toggle le check-in d'un participant (admin)
   */
  const toggleCheckIn = useCallback(async (participantId, currentStatus) => {
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('participants')
        .update({ checked_in: !currentStatus })
        .eq('id', participantId);
      
      if (error) throw error;
      
      toast.success(!currentStatus ? "Check-in effectué" : "Check-in annulé");
      onRefresh?.();
      return true;
    } catch (error) {
      console.error('[useTournamentAdmin] Erreur toggleCheckIn:', error);
      toast.error("Erreur: " + error.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [onRefresh]);

  /**
   * Disqualifie ou réintègre un participant
   */
  const toggleDisqualification = useCallback(async (participantId, currentStatus) => {
    const action = currentStatus ? "réintégrer" : "disqualifier";
    if (!confirm(`Voulez-vous ${action} ce participant ?`)) return false;

    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('participants')
        .update({ disqualified: !currentStatus })
        .eq('id', participantId);
      
      if (error) throw error;
      
      toast.success(!currentStatus ? "Participant disqualifié" : "Participant réintégré");
      onRefresh?.();
      return true;
    } catch (error) {
      console.error('[useTournamentAdmin] Erreur toggleDisqualification:', error);
      toast.error("Erreur: " + error.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [onRefresh]);

  return {
    actionLoading,
    startTournament,
    generateBracket,
    promoteFromWaitlist,
    removeParticipant,
    toggleCheckIn,
    toggleDisqualification
  };
}

// =============================================================================
// FONCTIONS DE GÉNÉRATION DE MATCHS (privées)
// =============================================================================

/**
 * Génère les matchs pour Single Elimination
 */
function generateSingleEliminationMatches(orderedParticipants, tournamentId) {
  const matchesToCreate = [];
  const teamIds = orderedParticipants.map(p => p.team_id);
  const numTeams = teamIds.length;
  let matchCount = 1;
  const totalRounds = Math.ceil(Math.log2(numTeams));
  
  // Round 1
  const pairs = [];
  const teams = [...teamIds];
  while (teams.length > 0) pairs.push(teams.splice(0, 2));
  
  pairs.forEach(pair => {
    matchesToCreate.push({
      tournament_id: tournamentId,
      match_number: matchCount++,
      round_number: 1,
      player1_id: pair[0] || null,
      player2_id: pair[1] || null,
      status: pair[1] ? 'pending' : 'completed',
      bracket_type: null
    });
  });
  
  // Rounds suivants
  let matchesInPrevRound = pairs.length;
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInCurrentRound = Math.ceil(matchesInPrevRound / 2);
    for (let i = 0; i < matchesInCurrentRound; i++) {
      matchesToCreate.push({
        tournament_id: tournamentId,
        match_number: matchCount++,
        round_number: round,
        player1_id: null,
        player2_id: null,
        status: 'pending',
        bracket_type: null
      });
    }
    matchesInPrevRound = matchesInCurrentRound;
  }
  
  return matchesToCreate;
}

/**
 * Génère les matchs pour Double Elimination
 */
function generateDoubleEliminationMatches(orderedParticipants, tournamentId) {
  const matchesToCreate = [];
  const teamIds = orderedParticipants.map(p => p.team_id);
  const numTeams = teamIds.length;
  let matchCount = 1;
  const winnersRounds = Math.ceil(Math.log2(numTeams));
  
  const winnersMatchesByRound = {};
  const losersMatchesByRound = {};

  // Winners Bracket - Round 1
  const pairs = [];
  const teams = [...teamIds];
  while (teams.length > 0) pairs.push(teams.splice(0, 2));
  
  winnersMatchesByRound[1] = [];
  pairs.forEach(pair => {
    const matchNum = matchCount++;
    matchesToCreate.push({
      tournament_id: tournamentId,
      match_number: matchNum,
      round_number: 1,
      player1_id: pair[0] || null,
      player2_id: pair[1] || null,
      status: pair[1] ? 'pending' : 'completed',
      bracket_type: 'winners',
      is_reset: false
    });
    winnersMatchesByRound[1].push(matchNum);
  });
  
  // Winners Bracket - Rounds suivants
  for (let round = 2; round <= winnersRounds; round++) {
    winnersMatchesByRound[round] = [];
    const matchesInRound = Math.ceil(winnersMatchesByRound[round - 1].length / 2);
    for (let i = 0; i < matchesInRound; i++) {
      const matchNum = matchCount++;
      matchesToCreate.push({
        tournament_id: tournamentId,
        match_number: matchNum,
        round_number: round,
        player1_id: null,
        player2_id: null,
        status: 'pending',
        bracket_type: 'winners',
        is_reset: false
      });
      winnersMatchesByRound[round].push(matchNum);
    }
  }
  
  // Losers Bracket - Round 1
  losersMatchesByRound[1] = [];
  const losersRound1Count = Math.ceil(winnersMatchesByRound[1].length / 2);
  for (let i = 0; i < losersRound1Count; i++) {
    const matchNum = matchCount++;
    matchesToCreate.push({
      tournament_id: tournamentId,
      match_number: matchNum,
      round_number: 1,
      player1_id: null,
      player2_id: null,
      status: 'pending',
      bracket_type: 'losers',
      is_reset: false
    });
    losersMatchesByRound[1].push(matchNum);
  }
  
  // Losers Bracket - Rounds suivants
  for (let round = 2; round < winnersRounds; round++) {
    losersMatchesByRound[round] = [];
    const losersFromWinners = winnersMatchesByRound[round].length;
    const winnersFromLosers = Math.ceil(losersMatchesByRound[round - 1].length / 2);
    const totalLosersMatches = Math.max(losersFromWinners, winnersFromLosers);
    
    for (let i = 0; i < totalLosersMatches; i++) {
      const matchNum = matchCount++;
      matchesToCreate.push({
        tournament_id: tournamentId,
        match_number: matchNum,
        round_number: round,
        player1_id: null,
        player2_id: null,
        status: 'pending',
        bracket_type: 'losers',
        is_reset: false
      });
      losersMatchesByRound[round].push(matchNum);
    }
  }
  
  // Losers Finals
  if (winnersRounds > 1) {
    matchesToCreate.push({
      tournament_id: tournamentId,
      match_number: matchCount++,
      round_number: winnersRounds,
      player1_id: null,
      player2_id: null,
      status: 'pending',
      bracket_type: 'losers',
      is_reset: false
    });
  }
  
  // Grand Finals
  matchesToCreate.push({
    tournament_id: tournamentId,
    match_number: matchCount++,
    round_number: winnersRounds + 1,
    player1_id: null,
    player2_id: null,
    status: 'pending',
    bracket_type: null,
    is_reset: false
  });
  
  // Reset Match
  matchesToCreate.push({
    tournament_id: tournamentId,
    match_number: matchCount++,
    round_number: winnersRounds + 2,
    player1_id: null,
    player2_id: null,
    status: 'pending',
    bracket_type: null,
    is_reset: true
  });
  
  return matchesToCreate;
}

/**
 * Génère les matchs pour Round Robin
 */
function generateRoundRobinMatches(orderedParticipants, tournamentId) {
  const matchesToCreate = [];
  let matchNum = 1;
  
  for (let i = 0; i < orderedParticipants.length; i++) {
    for (let j = i + 1; j < orderedParticipants.length; j++) {
      matchesToCreate.push({
        tournament_id: tournamentId,
        match_number: matchNum++,
        round_number: 1,
        player1_id: orderedParticipants[i].team_id,
        player2_id: orderedParticipants[j].team_id,
        status: 'pending',
        score_p1: 0,
        score_p2: 0,
        bracket_type: null
      });
    }
  }
  
  return matchesToCreate;
}

/**
 * Génère les matchs pour le système Suisse
 */
async function generateSwissMatches(orderedParticipants, tournamentId) {
  const matchesToCreate = [];
  const teamIds = orderedParticipants.map(p => p.team_id);
  
  // Initialiser les scores suisses
  await initializeSwissScores(supabase, tournamentId, teamIds);
  
  // Premier round - pairing aléatoire ou seeding
  const pairs = [];
  const teams = [...teamIds];
  while (teams.length > 0) {
    const pair = teams.splice(0, 2);
    pairs.push(pair);
  }
  
  let matchNum = 1;
  pairs.forEach(pair => {
    matchesToCreate.push({
      tournament_id: tournamentId,
      match_number: matchNum++,
      round_number: 1,
      player1_id: pair[0] || null,
      player2_id: pair[1] || null,
      status: pair[1] ? 'pending' : 'completed',
      bracket_type: 'swiss'
    });
  });
  
  return matchesToCreate;
}

export default useTournamentAdmin;
