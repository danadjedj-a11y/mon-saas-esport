// src/groupStageUtils.js
// Utilitaires pour le format Groupes (Pool Play)
// Format où les équipes sont divisées en groupes, jouent en round-robin, 
// puis les meilleurs avancent vers un bracket d'élimination

/**
 * Initialise un tournoi en phase de groupes
 * @param {Array} teams - Liste des équipes participantes
 * @param {Object} options - Options de configuration
 * @param {Number} options.numGroups - Nombre de groupes (2, 4, 8)
 * @param {Number} options.teamsAdvancing - Nombre d'équipes qualifiées par groupe
 * @param {String} options.seedingMethod - 'snake' | 'sequential' | 'random'
 * @param {String} options.playoffFormat - 'single_elimination' | 'double_elimination'
 * @returns {Object} { groups, groupMatches, playoffBracket }
 */
export function initializeGroupStage(teams, options = {}) {
  const {
    numGroups = 2,
    teamsAdvancing = 2,
    seedingMethod = 'snake',
    playoffFormat = 'single_elimination'
  } = options;

  if (!teams || teams.length < numGroups * 2) {
    throw new Error(`Minimum ${numGroups * 2} équipes requises pour ${numGroups} groupes`);
  }

  if (teamsAdvancing < 1 || teamsAdvancing > Math.floor(teams.length / numGroups)) {
    throw new Error('Nombre d\'équipes qualifiées invalide');
  }

  // Distribuer les équipes dans les groupes
  const groups = distributeTeamsToGroups(teams, numGroups, seedingMethod);

  // Générer les matchs round-robin pour chaque groupe
  const groupMatches = groups.map((group, index) => ({
    groupIndex: index,
    groupName: getGroupName(index),
    teams: group,
    matches: generateRoundRobinMatches(group, index)
  }));

  // Calculer le nombre total d'équipes qualifiées
  const totalAdvancing = numGroups * teamsAdvancing;

  return {
    format: 'group_stage',
    numGroups,
    teamsAdvancing,
    playoffFormat,
    groups,
    groupMatches,
    totalAdvancing,
    phase: 'groups', // 'groups' | 'playoffs'
    standings: groups.map(group => initializeGroupStandings(group))
  };
}

/**
 * Retourne le nom d'un groupe (A, B, C, ...)
 * @param {Number} index - Index du groupe
 * @returns {String} Nom du groupe
 */
export function getGroupName(index) {
  return String.fromCharCode(65 + index); // A, B, C, ...
}

/**
 * Distribue les équipes dans les groupes selon la méthode de seeding
 * @param {Array} teams - Équipes triées par seed
 * @param {Number} numGroups - Nombre de groupes
 * @param {String} method - Méthode de distribution
 * @returns {Array} Groupes avec leurs équipes
 */
export function distributeTeamsToGroups(teams, numGroups, method = 'snake') {
  const groups = Array.from({ length: numGroups }, () => []);

  switch (method) {
    case 'snake':
      // Méthode serpent : 1→A, 2→B, 3→C, 4→D, 5→D, 6→C, 7→B, 8→A, etc.
      teams.forEach((team, index) => {
        const round = Math.floor(index / numGroups);
        let groupIndex;
        if (round % 2 === 0) {
          groupIndex = index % numGroups;
        } else {
          groupIndex = numGroups - 1 - (index % numGroups);
        }
        groups[groupIndex].push({ ...team, groupSeed: groups[groupIndex].length + 1 });
      });
      break;

    case 'sequential':
      // Méthode séquentielle : 1-4→A, 5-8→B, etc.
      const teamsPerGroup = Math.ceil(teams.length / numGroups);
      teams.forEach((team, index) => {
        const groupIndex = Math.floor(index / teamsPerGroup);
        if (groupIndex < numGroups) {
          groups[groupIndex].push({ ...team, groupSeed: groups[groupIndex].length + 1 });
        }
      });
      break;

    case 'random':
      // Mélange aléatoire puis distribution équitable
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      shuffled.forEach((team, index) => {
        const groupIndex = index % numGroups;
        groups[groupIndex].push({ ...team, groupSeed: groups[groupIndex].length + 1 });
      });
      break;

    default:
      throw new Error(`Méthode de seeding inconnue: ${method}`);
  }

  return groups;
}

/**
 * Génère les matchs round-robin pour un groupe
 * @param {Array} teams - Équipes du groupe
 * @param {Number} groupIndex - Index du groupe
 * @returns {Array} Liste des matchs
 */
export function generateRoundRobinMatches(teams, groupIndex) {
  const matches = [];
  const n = teams.length;
  
  // Algorithme round-robin classique
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      matches.push({
        id: `group-${groupIndex}-match-${matches.length + 1}`,
        groupIndex,
        groupName: getGroupName(groupIndex),
        player1_id: teams[i].id,
        player2_id: teams[j].id,
        player1: teams[i],
        player2: teams[j],
        round: calculateRound(i, j, n),
        status: 'pending',
        score1: null,
        score2: null,
        winner_id: null
      });
    }
  }

  return matches;
}

/**
 * Calcule le round d'un match round-robin
 * @param {Number} i - Index équipe 1
 * @param {Number} j - Index équipe 2
 * @param {Number} n - Nombre total d'équipes
 * @returns {Number} Numéro du round
 */
function calculateRound(i, j, n) {
  // Algorithme simplifié : basé sur la différence d'index
  return Math.min(i, j) + 1;
}

/**
 * Initialise le classement d'un groupe
 * @param {Array} teams - Équipes du groupe
 * @returns {Array} Classement initial
 */
export function initializeGroupStandings(teams) {
  return teams.map(team => ({
    team_id: team.id,
    team: team,
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    goalsFor: 0,     // Maps/games gagnés
    goalsAgainst: 0, // Maps/games perdus
    goalDiff: 0      // Différence
  }));
}

/**
 * Met à jour le classement après un match
 * @param {Array} standings - Classement actuel
 * @param {Object} match - Match terminé
 * @param {Object} result - Résultat {winner_id, score1, score2}
 * @returns {Array} Nouveau classement trié
 */
export function updateGroupStandings(standings, match, result) {
  const { winner_id, score1, score2 } = result;
  
  return standings.map(s => {
    if (s.team_id === match.player1_id) {
      const isWinner = winner_id === match.player1_id;
      const isDraw = winner_id === null;
      return {
        ...s,
        played: s.played + 1,
        wins: s.wins + (isWinner ? 1 : 0),
        losses: s.losses + (!isWinner && !isDraw ? 1 : 0),
        draws: s.draws + (isDraw ? 1 : 0),
        points: s.points + (isWinner ? 3 : isDraw ? 1 : 0),
        goalsFor: s.goalsFor + (score1 || 0),
        goalsAgainst: s.goalsAgainst + (score2 || 0),
        goalDiff: s.goalsFor + (score1 || 0) - s.goalsAgainst - (score2 || 0)
      };
    }
    if (s.team_id === match.player2_id) {
      const isWinner = winner_id === match.player2_id;
      const isDraw = winner_id === null;
      return {
        ...s,
        played: s.played + 1,
        wins: s.wins + (isWinner ? 1 : 0),
        losses: s.losses + (!isWinner && !isDraw ? 1 : 0),
        draws: s.draws + (isDraw ? 1 : 0),
        points: s.points + (isWinner ? 3 : isDraw ? 1 : 0),
        goalsFor: s.goalsFor + (score2 || 0),
        goalsAgainst: s.goalsAgainst + (score1 || 0),
        goalDiff: s.goalsFor + (score2 || 0) - s.goalsAgainst - (score1 || 0)
      };
    }
    return s;
  }).sort(sortGroupStandings);
}

/**
 * Fonction de tri du classement
 * Priorité: points > différence > goals marqués > confrontation directe
 */
export function sortGroupStandings(a, b) {
  // 1. Points
  if (b.points !== a.points) return b.points - a.points;
  // 2. Différence de buts/maps
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  // 3. Buts/maps marqués
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  // 4. Moins de matchs joués (équipe qui a joué moins a priorité en cas d'égalité parfaite)
  return a.played - b.played;
}

/**
 * Vérifie si la phase de groupes est terminée
 * @param {Object} groupStageState - État du tournoi
 * @returns {Boolean}
 */
export function isGroupPhaseComplete(groupStageState) {
  const { groupMatches } = groupStageState;
  return groupMatches.every(group => 
    group.matches.every(match => match.status === 'completed')
  );
}

/**
 * Récupère les équipes qualifiées pour les playoffs
 * @param {Object} groupStageState - État du tournoi
 * @returns {Array} Équipes qualifiées triées par position
 */
export function getQualifiedTeams(groupStageState) {
  const { standings, teamsAdvancing, numGroups } = groupStageState;
  const qualified = [];

  // Pour chaque position (1er, 2ème, etc.)
  for (let pos = 0; pos < teamsAdvancing; pos++) {
    for (let groupIdx = 0; groupIdx < numGroups; groupIdx++) {
      const groupStandings = standings[groupIdx].sort(sortGroupStandings);
      if (groupStandings[pos]) {
        qualified.push({
          ...groupStandings[pos],
          qualifiedFrom: getGroupName(groupIdx),
          groupPosition: pos + 1,
          playoffSeed: pos * numGroups + groupIdx + 1
        });
      }
    }
  }

  return qualified;
}

/**
 * Génère le bracket des playoffs
 * @param {Array} qualifiedTeams - Équipes qualifiées
 * @param {String} format - 'single_elimination' | 'double_elimination'
 * @returns {Array} Matchs du bracket
 */
export function generatePlayoffBracket(qualifiedTeams, format = 'single_elimination') {
  const numTeams = qualifiedTeams.length;
  
  // Calculer le nombre de rounds
  const numRounds = Math.ceil(Math.log2(numTeams));
  const bracketSize = Math.pow(2, numRounds);
  
  // Seeding classique pour les playoffs
  // 1er groupe A vs 2ème groupe B, etc.
  const seededTeams = seedPlayoffTeams(qualifiedTeams, bracketSize);
  
  // Générer les matchs du premier round
  const firstRoundMatches = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const team1 = seededTeams[i];
    const team2 = seededTeams[bracketSize - 1 - i];
    
    firstRoundMatches.push({
      id: `playoff-round-1-match-${i + 1}`,
      round: 1,
      matchNumber: i + 1,
      player1_id: team1?.team_id || null,
      player2_id: team2?.team_id || null,
      player1: team1?.team || null,
      player2: team2?.team || null,
      status: team1 && team2 ? 'pending' : (team1 || team2 ? 'bye' : 'waiting'),
      bracket_type: 'winners',
      next_match: Math.floor(i / 2) + 1
    });
  }

  return {
    format,
    numRounds,
    bracketSize,
    matches: firstRoundMatches,
    currentRound: 1
  };
}

/**
 * Applique le seeding pour les playoffs
 * @param {Array} teams - Équipes qualifiées
 * @param {Number} bracketSize - Taille du bracket (puissance de 2)
 * @returns {Array} Équipes ordonnées pour le bracket
 */
function seedPlayoffTeams(teams, bracketSize) {
  // Créer un tableau avec des byes si nécessaire
  const seeded = new Array(bracketSize).fill(null);
  
  // Placer les équipes selon le seeding standard
  // Seed 1 vs Seed 8, Seed 2 vs Seed 7, etc.
  teams.forEach((team, index) => {
    seeded[index] = team;
  });
  
  return seeded;
}

/**
 * Calcule les statistiques globales de la phase de groupes
 * @param {Object} groupStageState - État du tournoi
 * @returns {Object} Statistiques
 */
export function getGroupStageStats(groupStageState) {
  const { groupMatches, standings } = groupStageState;
  
  let totalMatches = 0;
  let completedMatches = 0;
  let totalGoals = 0;

  groupMatches.forEach(group => {
    totalMatches += group.matches.length;
    completedMatches += group.matches.filter(m => m.status === 'completed').length;
  });

  standings.forEach(groupStandings => {
    groupStandings.forEach(s => {
      totalGoals += s.goalsFor;
    });
  });

  return {
    totalMatches,
    completedMatches,
    remainingMatches: totalMatches - completedMatches,
    progress: Math.round((completedMatches / totalMatches) * 100),
    totalGoals: totalGoals / 2, // Chaque goal est compté 2 fois
    isComplete: completedMatches === totalMatches
  };
}

/**
 * Récupère un résumé des groupes pour l'affichage
 * @param {Object} groupStageState - État du tournoi
 * @returns {Array} Résumé par groupe
 */
export function getGroupsSummary(groupStageState) {
  const { groups, standings, groupMatches } = groupStageState;

  return groups.map((group, index) => {
    const groupStandings = standings[index].sort(sortGroupStandings);
    const matches = groupMatches[index].matches;
    const completedMatches = matches.filter(m => m.status === 'completed').length;

    return {
      name: getGroupName(index),
      teams: group.length,
      standings: groupStandings,
      matchesPlayed: completedMatches,
      matchesTotal: matches.length,
      leader: groupStandings[0]?.team || null,
      isComplete: completedMatches === matches.length
    };
  });
}
