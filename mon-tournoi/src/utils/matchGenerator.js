// Générateur de matchs pour les brackets
// Migré vers Convex - utilise une mutation pour créer les matchs en batch

/**
 * Convertit un bracket_type en isLosersBracket boolean pour Convex
 * @param {string} bracketType - Type de bracket (winners, losers, grand_final, etc.)
 * @returns {boolean} - true si losers bracket
 */
function bracketTypeToIsLosersBracket(bracketType) {
  return bracketType === 'losers';
}

/**
 * Génère les matchs pour une phase de type bracket
 * Les matchs sont créés avec team1Id et team2Id à NULL (à déterminer)
 * @param {Function} batchCreateMatchesMutation - The Convex mutation for batch creating matches
 * @param {Object} phase - Phase object with format, config, id
 * @param {string} tournamentId - Tournament ID (Convex ID)
 */
export async function generateBracketMatches(batchCreateMatchesMutation, phase, tournamentId) {
  if (!batchCreateMatchesMutation) {
    console.error('batchCreateMatchesMutation is required');
    return [];
  }

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
          tournamentId,
          phaseId,
          round,
          matchNumber: matchNumber++,
          isLosersBracket: false,
          team1Id: undefined,
          team2Id: undefined,
          status: 'pending',
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
            tournamentId,
            phaseId,
            round,
            matchNumber: matchNumber++,
            isLosersBracket: true,
            team1Id: undefined,
            team2Id: undefined,
            status: 'pending',
          });
        }
      }

      // Grand Final
      matches.push({
        tournamentId,
        phaseId,
        round: 1,
        matchNumber: 1,
        isLosersBracket: false, // Grand final n'est pas un losers bracket
        isGrandFinal: true,
        team1Id: undefined,
        team2Id: undefined,
        status: 'pending',
      });

      // Grand Final Reset (si double)
      if (config?.grand_final === 'double') {
        matches.push({
          tournamentId,
          phaseId,
          round: 2,
          matchNumber: 1,
          isLosersBracket: false,
          isGrandFinal: true,
          team1Id: undefined,
          team2Id: undefined,
          status: 'pending',
        });
      }
    }
  } else if (format === 'round_robin') {
    // Round Robin: chaque participant affronte tous les autres
    const numParticipants = size;
    
    let matchNumber = 1;
    for (let i = 0; i < numParticipants - 1; i++) {
      for (let j = i + 1; j < numParticipants; j++) {
        matches.push({
          tournamentId,
          phaseId,
          round: Math.floor(matchNumber / Math.ceil(numParticipants / 2)) + 1,
          matchNumber: matchNumber++,
          isLosersBracket: false,
          team1Id: undefined,
          team2Id: undefined,
          status: 'pending',
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
          tournamentId,
          phaseId,
          round,
          matchNumber: matchNumber++,
          isLosersBracket: false,
          team1Id: undefined,
          team2Id: undefined,
          status: 'pending',
        });
      }
    }
  } else if (format === 'gauntlet') {
    // Gauntlet: structure pyramidale
    const numMatches = size - 1;
    
    for (let m = 1; m <= numMatches; m++) {
      matches.push({
        tournamentId,
        phaseId,
        round: m,
        matchNumber: 1,
        isLosersBracket: false,
        team1Id: undefined,
        team2Id: undefined,
        status: 'pending',
      });
    }
  }

  // Insérer tous les matchs via la mutation batch
  if (matches.length > 0) {
    try {
      const result = await batchCreateMatchesMutation({ matches });
      return result;
    } catch (error) {
      console.error('Erreur génération matchs:', error);
      throw error;
    }
  }

  return [];
}

/**
 * Supprime tous les matchs d'une phase
 * @param {Function} deletePhaseMatchesMutation - The Convex mutation for deleting phase matches
 * @param {string} phaseId - Phase ID (Convex ID)
 */
export async function deletePhaseMatches(deletePhaseMatchesMutation, phaseId) {
  if (!deletePhaseMatchesMutation) {
    console.error('deletePhaseMatchesMutation is required');
    return;
  }

  try {
    await deletePhaseMatchesMutation({ phaseId });
  } catch (error) {
    console.error('Erreur suppression matchs:', error);
    throw error;
  }
}

/**
 * Regénère les matchs d'une phase (après modification de la config)
 * @param {Function} deletePhaseMatchesMutation - The Convex mutation for deleting phase matches
 * @param {Function} batchCreateMatchesMutation - The Convex mutation for batch creating matches
 * @param {Object} phase - Phase object
 * @param {string} tournamentId - Tournament ID
 */
export async function regeneratePhaseMatches(deletePhaseMatchesMutation, batchCreateMatchesMutation, phase, tournamentId) {
  // D'abord supprimer les matchs existants
  await deletePhaseMatches(deletePhaseMatchesMutation, phase.id);
  
  // Puis regénérer
  return generateBracketMatches(batchCreateMatchesMutation, phase, tournamentId);
}

/**
 * Calcule le nombre de matchs pour un format et une taille donnés
 * Note: Cette fonction est pure et ne nécessite pas de mutation
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
  }
  return 0;
}
