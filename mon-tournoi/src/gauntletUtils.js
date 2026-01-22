// src/gauntletUtils.js
// Utilitaires pour le format Gauntlet (Le Gant)
// Dans ce format, un champion défend son titre contre des challengers successifs

/**
 * Initialise un tournoi Gauntlet
 * @param {Array} teams - Liste des équipes participantes (au moins 2)
 * @param {Object} options - Options de configuration
 * @param {String} options.championId - ID de l'équipe champion (première si non spécifié)
 * @param {String} options.challengerOrder - 'seeded' | 'random' | 'manual'
 * @returns {Object} { champion, challengers, matches }
 */
export function initializeGauntlet(teams, options = {}) {
  if (!teams || teams.length < 2) {
    throw new Error('Le format Gauntlet nécessite au moins 2 équipes');
  }

  const { championId, challengerOrder = 'seeded' } = options;
  
  // Déterminer le champion initial
  let champion;
  let challengers;
  
  if (championId) {
    champion = teams.find(t => t.id === championId);
    challengers = teams.filter(t => t.id !== championId);
  } else {
    // Par défaut, le premier (meilleur seed) est champion
    champion = teams[0];
    challengers = teams.slice(1);
  }

  if (!champion) {
    throw new Error('Champion non trouvé parmi les équipes');
  }

  // Ordonner les challengers
  const orderedChallengers = orderChallengers(challengers, challengerOrder);

  // Générer les matchs
  const matches = generateGauntletMatches(champion, orderedChallengers);

  return {
    champion,
    challengers: orderedChallengers,
    matches,
    format: 'gauntlet',
    totalMatches: orderedChallengers.length
  };
}

/**
 * Ordonne les challengers selon la stratégie choisie
 * @param {Array} challengers - Liste des challengers
 * @param {String} order - Type d'ordre ('seeded', 'random', 'manual')
 * @returns {Array} Challengers ordonnés
 */
export function orderChallengers(challengers, order) {
  switch (order) {
    case 'random':
      return shuffleArray([...challengers]);
    case 'reverse_seeded':
      // Plus faibles d'abord (pour que le champion affronte les plus forts à la fin)
      return [...challengers].reverse();
    case 'seeded':
    case 'manual':
    default:
      // Garder l'ordre existant (seeding ou ordre manuel)
      return [...challengers];
  }
}

/**
 * Mélange un tableau de manière aléatoire (Fisher-Yates)
 * @param {Array} array - Tableau à mélanger
 * @returns {Array} Tableau mélangé
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Génère les matchs du Gauntlet
 * @param {Object} champion - Équipe champion
 * @param {Array} challengers - Liste des challengers ordonnés
 * @returns {Array} Liste des matchs
 */
export function generateGauntletMatches(champion, challengers) {
  return challengers.map((challenger, index) => ({
    round: index + 1,
    matchNumber: index + 1,
    player1_id: null, // Sera rempli dynamiquement (le champion actuel)
    player2_id: challenger.id,
    challenger,
    status: index === 0 ? 'pending' : 'waiting',
    bracket_position: index,
    description: `Match ${index + 1}: vs ${challenger.name || `Challenger #${index + 1}`}`
  }));
}

/**
 * Traite le résultat d'un match Gauntlet
 * @param {Object} gauntletState - État actuel du Gauntlet
 * @param {Number} matchNumber - Numéro du match terminé
 * @param {String} winnerId - ID du gagnant
 * @returns {Object} Nouvel état du Gauntlet
 */
export function processGauntletResult(gauntletState, matchNumber, winnerId) {
  const { champion, challengers, matches } = gauntletState;
  const matchIndex = matchNumber - 1;
  
  if (matchIndex < 0 || matchIndex >= matches.length) {
    throw new Error('Numéro de match invalide');
  }

  const currentMatch = matches[matchIndex];
  const challenger = challengers[matchIndex];
  
  // Déterminer le nouveau champion
  let newChampion;
  let championChanged = false;

  if (winnerId === champion.id) {
    // Le champion garde son titre
    newChampion = champion;
  } else if (winnerId === challenger.id) {
    // Le challenger devient le nouveau champion
    newChampion = challenger;
    championChanged = true;
  } else {
    throw new Error('Le gagnant doit être le champion ou le challenger');
  }

  // Mettre à jour le match
  const updatedMatches = matches.map((m, i) => {
    if (i === matchIndex) {
      return {
        ...m,
        status: 'completed',
        winner_id: winnerId,
        loser_id: winnerId === champion.id ? challenger.id : champion.id
      };
    }
    if (i === matchIndex + 1) {
      // Activer le prochain match
      return { ...m, status: 'pending', player1_id: newChampion.id };
    }
    return m;
  });

  // Vérifier si le tournoi est terminé
  const isCompleted = matchIndex === matches.length - 1;

  return {
    ...gauntletState,
    champion: newChampion,
    matches: updatedMatches,
    currentMatchNumber: isCompleted ? null : matchNumber + 1,
    isCompleted,
    championChanged,
    finalChampion: isCompleted ? newChampion : null,
    history: [
      ...(gauntletState.history || []),
      {
        matchNumber,
        previousChampion: champion,
        challenger,
        winner: winnerId === champion.id ? champion : challenger,
        championChanged
      }
    ]
  };
}

/**
 * Calcule les statistiques du Gauntlet
 * @param {Object} gauntletState - État du Gauntlet
 * @returns {Object} Statistiques
 */
export function getGauntletStats(gauntletState) {
  const { matches, history = [] } = gauntletState;
  
  const completedMatches = matches.filter(m => m.status === 'completed');
  const titleDefenses = history.filter(h => !h.championChanged).length;
  const titleChanges = history.filter(h => h.championChanged).length;

  // Calculer le streak actuel du champion
  let currentStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].championChanged) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculer le meilleur streak de l'historique
  let bestStreak = 0;
  let tempStreak = 0;
  let bestStreakHolder = null;
  let currentStreakHolder = null;

  history.forEach((h, index) => {
    if (!h.championChanged) {
      tempStreak++;
      if (index === 0 || history[index - 1].championChanged) {
        currentStreakHolder = h.winner;
      }
    } else {
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
        bestStreakHolder = currentStreakHolder;
      }
      tempStreak = 0;
    }
  });

  // Vérifier le streak final
  if (tempStreak > bestStreak) {
    bestStreak = tempStreak;
    bestStreakHolder = currentStreakHolder;
  }

  return {
    totalMatches: matches.length,
    completedMatches: completedMatches.length,
    remainingMatches: matches.length - completedMatches.length,
    titleDefenses,
    titleChanges,
    currentStreak,
    bestStreak,
    bestStreakHolder,
    progress: Math.round((completedMatches.length / matches.length) * 100)
  };
}

/**
 * Calcule le classement final d'un Gauntlet terminé
 * @param {Object} gauntletState - État final du Gauntlet
 * @returns {Array} Classement [{team, rank, eliminatedAt}]
 */
export function getGauntletStandings(gauntletState) {
  const { champion, history = [], challengers, isCompleted } = gauntletState;
  
  if (!isCompleted) {
    return null;
  }

  const standings = [];
  const eliminated = new Map();

  // Parcourir l'historique pour trouver l'ordre d'élimination
  history.forEach((h, index) => {
    if (h.championChanged) {
      // L'ancien champion est éliminé à ce round
      eliminated.set(h.previousChampion.id, {
        team: h.previousChampion,
        eliminatedAt: index + 1
      });
    } else {
      // Le challenger est éliminé
      eliminated.set(h.challenger.id, {
        team: h.challenger,
        eliminatedAt: index + 1
      });
    }
  });

  // 1er place : le champion final
  standings.push({
    rank: 1,
    team: champion,
    eliminatedAt: null,
    status: 'champion'
  });

  // Autres places : ordre inverse d'élimination (dernier éliminé = 2ème)
  const eliminatedArray = Array.from(eliminated.values())
    .sort((a, b) => b.eliminatedAt - a.eliminatedAt);

  eliminatedArray.forEach((e, index) => {
    standings.push({
      rank: index + 2,
      team: e.team,
      eliminatedAt: e.eliminatedAt,
      status: 'eliminated'
    });
  });

  return standings;
}

/**
 * Obtient les détails du match actuel
 * @param {Object} gauntletState - État du Gauntlet
 * @returns {Object|null} Match actuel ou null si terminé
 */
export function getCurrentGauntletMatch(gauntletState) {
  const { matches, champion } = gauntletState;
  const pendingMatch = matches.find(m => m.status === 'pending');
  
  if (!pendingMatch) {
    return null;
  }

  return {
    ...pendingMatch,
    champion,
    player1: champion,
    player2: pendingMatch.challenger
  };
}
