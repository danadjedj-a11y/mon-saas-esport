// Utilitaires pour Best-of-X et Maps Pool

/**
 * Calcule le gagnant d'un match Best-of-X
 * @param {Array} games - Liste des match_games
 * @param {Number} bestOf - Format Best-of-X (3, 5, 7, etc.)
 * @returns {Object} { winner: team_id ou null, team1Wins, team2Wins, isCompleted }
 */
export function calculateMatchWinner(games, bestOf, team1Id, team2Id) {
  if (!games || games.length === 0) {
    return { winner: null, team1Wins: 0, team2Wins: 0, isCompleted: false };
  }

  const completedGames = games.filter(g => g.status === 'completed');
  let team1Wins = 0;
  let team2Wins = 0;

  completedGames.forEach(game => {
    if (game.winner_team_id === team1Id) {
      team1Wins++;
    } else if (game.winner_team_id === team2Id) {
      team2Wins++;
    }
  });

  const winsNeeded = Math.ceil(bestOf / 2);
  let winner = null;
  let isCompleted = false;

  if (team1Wins >= winsNeeded) {
    winner = team1Id;
    isCompleted = true;
  } else if (team2Wins >= winsNeeded) {
    winner = team2Id;
    isCompleted = true;
  } else if (completedGames.length >= bestOf) {
    // Toutes les manches jouées mais pas de gagnant (devrait pas arriver)
    isCompleted = true;
    winner = team1Wins > team2Wins ? team1Id : team2Id;
  }

  return { winner, team1Wins, team2Wins, isCompleted };
}

/**
 * Génère l'ordre des phases de veto
 * @param {Number} numMaps - Nombre de cartes dans le pool
 * @param {Number} bestOf - Format Best-of-X
 * @returns {Array} Ordre des phases ['ban1', 'ban2', 'pick1', 'pick2', ...]
 */
export function generateVetoOrder(numMaps, bestOf) {
  const order = [];
  const mapsNeeded = bestOf;
  
  // Pour BO3 : ban1, ban2, pick1, pick2, ban3, ban4, pick3 (si nécessaire)
  // Pour BO5 : ban1, ban2, pick1, pick2, ban3, ban4, pick3, ban5, ban6, pick4, pick5
  
  let currentPhase = 1;
  const phasesPerRound = 4; // 2 bans + 2 picks par round
  
  while (order.length < mapsNeeded && order.length < numMaps) {
    // Round 1 : 2 bans (équipe 1, équipe 2)
    if (order.length < 2) {
      order.push(`ban${currentPhase}`);
      currentPhase++;
    }
    // Round 1 : 2 picks (équipe 2, équipe 1) - inversé
    else if (order.length < 4) {
      order.push(`pick${currentPhase - 2}`);
    }
    // Round 2+ : alternance bans puis picks
    else {
      const round = Math.floor((order.length - 4) / 2) + 2;
      const posInRound = (order.length - 4) % 2;
      if (posInRound === 0) {
        order.push(`ban${currentPhase}`);
        currentPhase++;
      } else {
        order.push(`pick${currentPhase - 1}`);
      }
    }
  }
  
  return order.slice(0, mapsNeeded);
}

/**
 * Détermine quelle équipe doit jouer le prochain veto
 * @param {Array} vetos - Liste des vetos déjà effectués
 * @param {Array} vetoOrder - Ordre des phases généré
 * @returns {String} 'team1' ou 'team2' ou null si terminé
 */
export function getNextVetoTeam(vetos, vetoOrder, team1Id, team2Id) {
  const nextPhaseIndex = vetos.length;
  
  if (nextPhaseIndex >= vetoOrder.length) {
    return null; // Tous les vetos sont faits
  }
  
  const nextPhase = vetoOrder[nextPhaseIndex];
  const isBan = nextPhase.startsWith('ban');
  const phaseNum = parseInt(nextPhase.replace(/\D/g, ''));
  
  // Pattern : ban1 (team1), ban2 (team2), pick1 (team2), pick2 (team1), ban3 (team1), ban4 (team2), ...
  if (isBan) {
    // Bans alternent : team1, team2, team1, team2, ...
    return phaseNum % 2 === 1 ? 'team1' : 'team2';
  } else {
    // Picks alternent inversés : team2, team1, team2, team1, ...
    return phaseNum % 2 === 1 ? 'team2' : 'team1';
  }
}

/**
 * Récupère les cartes disponibles après les vetos
 * @param {Array} mapsPool - Pool de cartes initial
 * @param {Array} vetos - Liste des vetos effectués
 * @returns {Array} Cartes encore disponibles
 */
export function getAvailableMaps(mapsPool, vetos) {
  const bannedMaps = new Set(vetos.map(v => v.map_name));
  return mapsPool.filter(map => !bannedMaps.has(map));
}

/**
 * Récupère la carte sélectionnée pour une manche donnée
 * @param {Array} games - Liste des match_games
 * @param {Number} gameNumber - Numéro de la manche
 * @param {Array} mapsPool - Pool de cartes
 * @param {Array} vetos - Liste des vetos
 * @returns {String} Nom de la carte ou null
 */
export function getMapForGame(games, gameNumber, mapsPool, vetos) {
  // Chercher si la carte est déjà assignée
  const game = games.find(g => g.game_number === gameNumber);
  if (game && game.map_name) {
    return game.map_name;
  }
  
  // Sinon, déterminer la carte selon l'ordre de veto
  const availableMaps = getAvailableMaps(mapsPool, vetos.filter(v => v.veto_phase.startsWith('ban')));
  const picks = vetos.filter(v => v.veto_phase.startsWith('pick')).sort((a, b) => {
    const numA = parseInt(a.veto_phase.replace(/\D/g, ''));
    const numB = parseInt(b.veto_phase.replace(/\D/g, ''));
    return numA - numB;
  });
  
  if (picks.length >= gameNumber) {
    return picks[gameNumber - 1].map_name;
  }
  
  return null;
}

