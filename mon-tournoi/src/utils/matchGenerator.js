import { supabase } from '../supabaseClient';

/**
 * Génère les matchs pour une phase de type bracket
 * Les matchs sont créés avec player1_id et player2_id à NULL (à déterminer)
 */
export async function generateBracketMatches(phase, tournamentId) {
  const { format, config, id: phaseId } = phase;
  const size = config?.size || 8;
  
  const matches = [];

  if (format === 'elimination' || format === 'double_elimination') {
    // Calculer le nombre de rounds
    const numRounds = Math.ceil(Math.log2(size));
    
    // Winners Bracket
    let matchNumber = 1;
    for (let round = 1; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round);
      
      for (let m = 0; m < matchesInRound; m++) {
        matches.push({
          tournament_id: tournamentId,
          phase_id: phaseId,
          round_number: round,
          match_number: matchNumber++,
          bracket_type: 'winners',
          player1_id: null,
          player2_id: null,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    }

    // Losers Bracket (pour double élimination)
    if (format === 'double_elimination') {
      matchNumber = 1;
      // Le losers bracket a généralement (numRounds - 1) * 2 rounds
      const losersRounds = (numRounds - 1) * 2;
      
      for (let round = 1; round <= losersRounds; round++) {
        // Calculer le nombre de matchs dans ce round du losers
        // C'est plus complexe car le losers reçoit des perdants du winners
        let matchesInRound;
        if (round % 2 === 1) {
          // Rounds impairs: reçoit des perdants du winners
          matchesInRound = Math.pow(2, numRounds - Math.ceil(round / 2) - 1);
        } else {
          // Rounds pairs: matchs internes losers
          matchesInRound = Math.pow(2, numRounds - round / 2 - 1);
        }
        
        matchesInRound = Math.max(1, matchesInRound);
        
        for (let m = 0; m < matchesInRound; m++) {
          matches.push({
            tournament_id: tournamentId,
            phase_id: phaseId,
            round_number: round,
            match_number: matchNumber++,
            bracket_type: 'losers',
            player1_id: null,
            player2_id: null,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
        }
      }

      // Grand Final
      matches.push({
        tournament_id: tournamentId,
        phase_id: phaseId,
        round_number: 1,
        match_number: 1,
        bracket_type: 'grand_final',
        player1_id: null,
        player2_id: null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      // Grand Final Reset (si double)
      if (config?.grand_final === 'double') {
        matches.push({
          tournament_id: tournamentId,
          phase_id: phaseId,
          round_number: 2,
          match_number: 1,
          bracket_type: 'grand_final',
          player1_id: null,
          player2_id: null,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    }
  } else if (format === 'round_robin') {
    // Round Robin: chaque participant affronte tous les autres
    const numParticipants = size;
    const _matchesCount = (numParticipants * (numParticipants - 1)) / 2;
    
    let matchNumber = 1;
    for (let i = 0; i < numParticipants - 1; i++) {
      for (let j = i + 1; j < numParticipants; j++) {
        matches.push({
          tournament_id: tournamentId,
          phase_id: phaseId,
          round_number: Math.floor(matchNumber / Math.ceil(numParticipants / 2)) + 1,
          match_number: matchNumber++,
          bracket_type: 'round_robin',
          player1_id: null,
          player2_id: null,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    }
  } else if (format === 'swiss') {
    // Swiss: généralement nombre de rounds = log2(participants)
    const numRounds = Math.ceil(Math.log2(size));
    const matchesPerRound = Math.floor(size / 2);
    
    let matchNumber = 1;
    for (let round = 1; round <= numRounds; round++) {
      for (let m = 0; m < matchesPerRound; m++) {
        matches.push({
          tournament_id: tournamentId,
          phase_id: phaseId,
          round_number: round,
          match_number: matchNumber++,
          bracket_type: 'swiss',
          player1_id: null,
          player2_id: null,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    }
  } else if (format === 'gauntlet') {
    // Gauntlet: structure pyramidale
    const numMatches = size - 1;
    
    for (let m = 1; m <= numMatches; m++) {
      matches.push({
        tournament_id: tournamentId,
        phase_id: phaseId,
        round_number: m,
        match_number: 1,
        bracket_type: 'gauntlet',
        player1_id: null,
        player2_id: null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    }
  } else if (format === 'group_stage' || format === 'groups') {
    // Phase de groupes avec round robin dans chaque groupe
    const numGroups = config?.num_groups || 4;
    const teamsPerGroup = Math.ceil(size / numGroups);
    
    // Pour chaque groupe, générer les matchs round robin
    let matchNumber = 1;
    for (let group = 1; group <= numGroups; group++) {
      // Round robin dans le groupe: chaque équipe affronte toutes les autres
      const matchesInGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
      
      for (let m = 0; m < matchesInGroup; m++) {
        matches.push({
          tournament_id: tournamentId,
          phase_id: phaseId,
          round_number: Math.floor(m / Math.ceil(teamsPerGroup / 2)) + 1,
          match_number: matchNumber++,
          bracket_type: `group_${String.fromCharCode(64 + group)}`, // group_A, group_B, etc.
          player1_id: null,
          player2_id: null,
          status: 'pending',
          group_number: group,
          created_at: new Date().toISOString(),
        });
      }
    }
    
    // Playoffs après la phase de groupes (optionnel)
    if (config?.include_playoffs !== false) {
      const qualifiedPerGroup = config?.qualified_per_group || 2;
      const playoffSize = numGroups * qualifiedPerGroup;
      const playoffRounds = Math.ceil(Math.log2(playoffSize));
      
      for (let round = 1; round <= playoffRounds; round++) {
        const matchesInRound = Math.pow(2, playoffRounds - round);
        for (let m = 0; m < matchesInRound; m++) {
          matches.push({
            tournament_id: tournamentId,
            phase_id: phaseId,
            round_number: round,
            match_number: matchNumber++,
            bracket_type: 'playoff',
            player1_id: null,
            player2_id: null,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  // Insérer tous les matchs
  if (matches.length > 0) {
    const { data, error } = await supabase
      .from('matches')
      .insert(matches)
      .select();

    if (error) {
      console.error('Erreur génération matchs:', error);
      throw error;
    }

    return data;
  }

  return [];
}

/**
 * Supprime tous les matchs d'une phase
 */
export async function deletePhaseMatches(phaseId) {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('phase_id', phaseId);

  if (error) {
    console.error('Erreur suppression matchs:', error);
    throw error;
  }
}

/**
 * Regénère les matchs d'une phase (après modification de la config)
 */
export async function regeneratePhaseMatches(phase, tournamentId) {
  // D'abord supprimer les matchs existants
  await deletePhaseMatches(phase.id);
  
  // Puis regénérer
  return generateBracketMatches(phase, tournamentId);
}

/**
 * Calcule le nombre de matchs pour un format et une taille donnés
 */
export function calculateMatchCount(format, size, config = {}) {
  if (format === 'elimination') {
    return size - 1;
  } else if (format === 'double_elimination') {
    // Winners: size - 1
    // Losers: environ size - 1
    // Grand final: 1 ou 2
    const grandFinalMatches = config.grand_final === 'double' ? 2 : 1;
    return (size - 1) * 2 + grandFinalMatches;
  } else if (format === 'round_robin') {
    return (size * (size - 1)) / 2;
  } else if (format === 'swiss') {
    const numRounds = Math.ceil(Math.log2(size));
    return numRounds * Math.floor(size / 2);
  } else if (format === 'gauntlet') {
    return size - 1;
  } else if (format === 'group_stage' || format === 'groups') {
    const numGroups = config.num_groups || 4;
    const teamsPerGroup = Math.ceil(size / numGroups);
    // Matchs dans les groupes (round robin)
    const groupMatches = numGroups * ((teamsPerGroup * (teamsPerGroup - 1)) / 2);
    // Playoffs
    if (config.include_playoffs !== false) {
      const qualifiedPerGroup = config.qualified_per_group || 2;
      const playoffSize = numGroups * qualifiedPerGroup;
      const playoffMatches = playoffSize - 1;
      return groupMatches + playoffMatches;
    }
    return groupMatches;
  }
  return 0;
}
