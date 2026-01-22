/**
 * Générateur de brackets pour les tournois
 * Supporte: Single Elimination, Double Elimination, Round Robin, Swiss
 */

/**
 * Génère les matchs pour un tournoi Single Elimination
 */
export function generateSingleEliminationBracket(tournamentId, participantsList) {
  const matchesToCreate = [];
  let orderedParticipants = [...participantsList];
  
  // Gestion du Seeding
  const hasSeeding = participantsList.some(p => p.seed_order !== null && p.seed_order !== undefined);
  if (hasSeeding) {
    orderedParticipants.sort((a, b) => (a.seed_order ?? 999) - (b.seed_order ?? 999));
  } else {
    orderedParticipants.sort(() => 0.5 - Math.random());
  }

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
      status: pair[1] ? 'pending' : 'completed', // Auto-win si Bye
      bracket_type: null
    });
  });
  
  // Rounds suivants (vides)
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
 * Génère les matchs pour un tournoi Double Elimination
 */
export function generateDoubleEliminationBracket(tournamentId, participantsList) {
  const matchesToCreate = [];
  let orderedParticipants = [...participantsList];
  
  // Gestion du Seeding
  const hasSeeding = participantsList.some(p => p.seed_order !== null && p.seed_order !== undefined);
  if (hasSeeding) {
    orderedParticipants.sort((a, b) => (a.seed_order ?? 999) - (b.seed_order ?? 999));
  } else {
    orderedParticipants.sort(() => 0.5 - Math.random());
  }

  const teamIds = orderedParticipants.map(p => p.team_id);
  const numTeams = teamIds.length;
  let matchCount = 1;
  const winnersRounds = Math.ceil(Math.log2(numTeams));
  
  const winnersMatchesByRound = {}; 
  const losersMatchesByRound = {}; 

  // 1. Winners Bracket
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
  
  // 2. Losers Bracket
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
  
  const totalLosersRounds = 2 * winnersRounds - 2;
  let losersTeamsInRound = losersRound1Count;
  
  for (let round = 2; round <= totalLosersRounds; round++) {
    losersMatchesByRound[round] = [];
    const isDropInRound = round % 2 === 0;
    const matchesInRound = isDropInRound ? losersTeamsInRound : Math.ceil(losersTeamsInRound / 2);
    
    for (let i = 0; i < matchesInRound; i++) {
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
    
    if (!isDropInRound) losersTeamsInRound = matchesInRound;
  }
  
  // 3. Grande Finale
  const grandFinalNum = matchCount++;
  matchesToCreate.push({
    tournament_id: tournamentId,
    match_number: grandFinalNum,
    round_number: winnersRounds + 1,
    player1_id: null,
    player2_id: null,
    status: 'pending',
    bracket_type: 'grand_final',
    is_reset: false
  });
  
  // 4. Reset Match (optionnel)
  matchesToCreate.push({
    tournament_id: tournamentId,
    match_number: matchCount++,
    round_number: winnersRounds + 2,
    player1_id: null,
    player2_id: null,
    status: 'pending',
    bracket_type: 'grand_final',
    is_reset: true
  });

  return matchesToCreate;
}

/**
 * Génère les matchs pour un tournoi Round Robin
 */
export function generateRoundRobinBracket(tournamentId, participantsList) {
  const matchesToCreate = [];
  let orderedParticipants = [...participantsList];
  
  // Gestion du Seeding
  const hasSeeding = participantsList.some(p => p.seed_order !== null && p.seed_order !== undefined);
  if (hasSeeding) {
    orderedParticipants.sort((a, b) => (a.seed_order ?? 999) - (b.seed_order ?? 999));
  } else {
    orderedParticipants.sort(() => 0.5 - Math.random());
  }

  const teamIds = orderedParticipants.map(p => p.team_id);
  let matchCount = 1;
  
  // Round Robin : Chaque équipe joue contre toutes les autres
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matchesToCreate.push({
        tournament_id: tournamentId,
        match_number: matchCount++,
        round_number: 1,
        player1_id: teamIds[i],
        player2_id: teamIds[j],
        status: 'pending',
        bracket_type: 'round_robin'
      });
    }
  }

  return matchesToCreate;
}

/**
 * Génère les matchs initiaux pour le système Suisse (Round 1)
 */
export function generateSwissBracket(tournamentId, participantsList) {
  const matchesToCreate = [];
  let orderedParticipants = [...participantsList];
  
  // Gestion du Seeding
  const hasSeeding = participantsList.some(p => p.seed_order !== null && p.seed_order !== undefined);
  if (hasSeeding) {
    orderedParticipants.sort((a, b) => (a.seed_order ?? 999) - (b.seed_order ?? 999));
  } else {
    orderedParticipants.sort(() => 0.5 - Math.random());
  }

  const teamIds = orderedParticipants.map(p => p.team_id);
  let matchCount = 1;
  
  // Swiss Round 1 : Paires basiques (1v2, 3v4, etc.)
  for (let i = 0; i < teamIds.length; i += 2) {
    matchesToCreate.push({
      tournament_id: tournamentId,
      match_number: matchCount++,
      round_number: 1,
      player1_id: teamIds[i] || null,
      player2_id: teamIds[i + 1] || null,
      status: teamIds[i + 1] ? 'pending' : 'completed',
      bracket_type: 'swiss'
    });
  }

  return matchesToCreate;
}

/**
 * Génère les matchs pour un tournoi en fonction du format
 */
export function generateBracket(tournamentId, format, participantsList) {
  switch (format) {
    case 'elimination':
      return generateSingleEliminationBracket(tournamentId, participantsList);
    case 'double_elimination':
      return generateDoubleEliminationBracket(tournamentId, participantsList);
    case 'round_robin':
      return generateRoundRobinBracket(tournamentId, participantsList);
    case 'swiss':
      return generateSwissBracket(tournamentId, participantsList);
    default:
      throw new Error(`Format de tournoi inconnu: ${format}`);
  }
}
