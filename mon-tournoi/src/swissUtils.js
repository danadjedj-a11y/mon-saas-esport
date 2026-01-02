// src/swissUtils.js
// Utilitaires pour le système de tournoi suisse

/**
 * Initialise les scores suisses pour toutes les équipes d'un tournoi
 */
export async function initializeSwissScores(supabase, tournamentId, teamIds) {
  // Créer ou mettre à jour les scores suisses pour chaque équipe
  const scoresToInsert = teamIds.map(teamId => ({
    tournament_id: tournamentId,
    team_id: teamId,
    wins: 0,
    losses: 0,
    draws: 0,
    buchholz_score: 0,
    opp_wins: 0
  }));

  // Utiliser upsert pour créer ou mettre à jour
  const { error } = await supabase
    .from('swiss_scores')
    .upsert(scoresToInsert, { onConflict: 'tournament_id,team_id' });

  if (error) {
    console.error('Error initializing swiss scores:', error);
    throw error;
  }
}

/**
 * Récupère les scores suisses pour toutes les équipes d'un tournoi
 */
export async function getSwissScores(supabase, tournamentId) {
  const { data, error } = await supabase
    .from('swiss_scores')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('wins', { ascending: false })
    .order('buchholz_score', { ascending: false });

  if (error) {
    console.error('Error fetching swiss scores:', error);
    return [];
  }

  return data || [];
}

/**
 * Calcule le score d'une équipe pour le tri (wins * 1000 + buchholz)
 */
function getTeamScore(swissScore) {
  return swissScore.wins * 1000 + swissScore.buchholz_score;
}

/**
 * Vérifie si deux équipes ont déjà joué ensemble
 */
function havePlayedTogether(team1Id, team2Id, allMatches) {
  return allMatches.some(m => 
    (m.player1_id === team1Id && m.player2_id === team2Id) ||
    (m.player1_id === team2Id && m.player2_id === team1Id)
  );
}

/**
 * Algorithme de pairing suisse
 * Apparie les équipes en fonction de leur score (wins, buchholz)
 * Évite les matchs déjà joués
 */
export function swissPairing(swissScores, allMatches) {
  // Créer une map pour accès rapide
  const scoresMap = new Map(swissScores.map(s => [s.team_id, s]));
  
  // Trier par score (wins desc, puis buchholz desc)
  const sortedTeams = [...swissScores].sort((a, b) => {
    const scoreA = getTeamScore(a);
    const scoreB = getTeamScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    // En cas d'égalité, on garde l'ordre (ou on peut ajouter d'autres critères)
    return a.team_id.localeCompare(b.team_id);
  });

  const pairs = [];
  const used = new Set();

  for (let i = 0; i < sortedTeams.length; i++) {
    if (used.has(sortedTeams[i].team_id)) continue;

    const team1 = sortedTeams[i];
    let bestOpponent = null;
    let bestScoreDiff = Infinity;

    // Chercher le meilleur adversaire (score le plus proche)
    for (let j = i + 1; j < sortedTeams.length; j++) {
      if (used.has(sortedTeams[j].team_id)) continue;
      if (havePlayedTogether(team1.team_id, sortedTeams[j].team_id, allMatches)) continue;

      const scoreDiff = Math.abs(getTeamScore(team1) - getTeamScore(sortedTeams[j]));
      if (scoreDiff < bestScoreDiff) {
        bestScoreDiff = scoreDiff;
        bestOpponent = sortedTeams[j];
      }
    }

    if (bestOpponent) {
      pairs.push([team1.team_id, bestOpponent.team_id]);
      used.add(team1.team_id);
      used.add(bestOpponent.team_id);
    } else {
      // Pas d'adversaire trouvé (peut arriver avec nombre impair ou tous déjà joués)
      // On laisse cette équipe sans paire (bye)
      // Dans un vrai système suisse, on gère les byes différemment, mais pour simplifier on laisse comme ça
    }
  }

  return pairs;
}

/**
 * Met à jour les scores suisses après un match
 */
export async function updateSwissScores(supabase, tournamentId, match) {
  if (match.status !== 'completed') return;
  if (!match.player1_id || !match.player2_id) return;

  // Récupérer les scores suisses actuels depuis la DB
  const { data: allSwissScores } = await supabase
    .from('swiss_scores')
    .select('*')
    .eq('tournament_id', tournamentId);

  if (!allSwissScores || allSwissScores.length === 0) {
    console.error('No swiss scores found for tournament', tournamentId);
    return;
  }

  const team1Score = allSwissScores.find(s => s.team_id === match.player1_id);
  const team2Score = allSwissScores.find(s => s.team_id === match.player2_id);

  if (!team1Score || !team2Score) {
    console.error('Swiss scores not found for teams', match.player1_id, match.player2_id);
    return;
  }

  // Calculer les nouveaux scores (utiliser les valeurs actuelles depuis la DB)
  let newTeam1Wins = team1Score.wins;
  let newTeam1Losses = team1Score.losses;
  let newTeam1Draws = team1Score.draws;
  let newTeam2Wins = team2Score.wins;
  let newTeam2Losses = team2Score.losses;
  let newTeam2Draws = team2Score.draws;

  // Mettre à jour wins/losses/draws selon le résultat
  if (match.score_p1 > match.score_p2) {
    newTeam1Wins++;
    newTeam2Losses++;
  } else if (match.score_p2 > match.score_p1) {
    newTeam2Wins++;
    newTeam1Losses++;
  } else {
    newTeam1Draws++;
    newTeam2Draws++;
  }

  // Sauvegarder les mises à jour
  const { error: error1 } = await supabase
    .from('swiss_scores')
    .update({ wins: newTeam1Wins, losses: newTeam1Losses, draws: newTeam1Draws })
    .eq('id', team1Score.id);

  if (error1) {
    console.error('Error updating team1 swiss score:', error1);
    return;
  }

  const { error: error2 } = await supabase
    .from('swiss_scores')
    .update({ wins: newTeam2Wins, losses: newTeam2Losses, draws: newTeam2Draws })
    .eq('id', team2Score.id);

  if (error2) {
    console.error('Error updating team2 swiss score:', error2);
    return;
  }

  // Recalculer les Buchholz scores
  await recalculateBuchholzScores(supabase, tournamentId);
}

/**
 * Recalcule les scores Buchholz pour toutes les équipes
 * Buchholz = somme des victoires de tous les adversaires rencontrés
 */
export async function recalculateBuchholzScores(supabase, tournamentId) {
  // Récupérer tous les matchs terminés
  const { data: completedMatches } = await supabase
    .from('matches')
    .select('player1_id, player2_id, score_p1, score_p2')
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed');

  if (!completedMatches) return;

  // Récupérer tous les scores suisses
  const { data: allSwissScores } = await supabase
    .from('swiss_scores')
    .select('*')
    .eq('tournament_id', tournamentId);

  if (!allSwissScores) return;

  // Pour chaque équipe, calculer son Buchholz
  for (const teamScore of allSwissScores) {
    let buchholz = 0;

    // Trouver tous les adversaires de cette équipe
    const opponents = completedMatches
      .filter(m => m.player1_id === teamScore.team_id || m.player2_id === teamScore.team_id)
      .map(m => m.player1_id === teamScore.team_id ? m.player2_id : m.player1_id);

    // Pour chaque adversaire, ajouter ses victoires au Buchholz
    for (const opponentId of opponents) {
      const opponentScore = allSwissScores.find(s => s.team_id === opponentId);
      if (opponentScore) {
        buchholz += opponentScore.wins;
      }
    }

    // Mettre à jour le score Buchholz
    await supabase
      .from('swiss_scores')
      .update({ buchholz_score: buchholz })
      .eq('id', teamScore.id);
  }
}

/**
 * Génère le classement final suisse
 */
export function getSwissStandings(swissScores) {
  return [...swissScores].sort((a, b) => {
    // 1. Trier par wins (desc)
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 2. Trier par Buchholz (desc)
    if (b.buchholz_score !== a.buchholz_score) return b.buchholz_score - a.buchholz_score;
    // 3. Trier par opp_wins (desc) si implémenté
    if (b.opp_wins !== a.opp_wins) return b.opp_wins - a.opp_wins;
    // 4. En dernier recours, par team_id (pour stabilité)
    return a.team_id.localeCompare(b.team_id);
  });
}

