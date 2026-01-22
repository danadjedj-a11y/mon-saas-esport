// Export all match components
export { default as TeamDisplay } from './TeamDisplay';
export { default as ScoreDisplay } from './ScoreDisplay';
export { default as MatchStatusBanner } from './MatchStatusBanner';
export { default as SingleGameScoreForm } from './SingleGameScoreForm';
export { default as AdminConflictResolver } from './AdminConflictResolver';
export { default as ProofSection } from './ProofSection';
export { default as ScoreReportsHistory } from './ScoreReportsHistory';
export { default as GameRoundItem } from './GameRoundItem';
export { default as GameRoundsList } from './GameRoundsList';
export { default as AdminMatchDetails } from './AdminMatchDetails';
export { default as MatchResultEditor } from './MatchResultEditor';

// Utilitaires pour les matchs
export const MATCH_STATUS = {
  pending: { value: 'pending', label: 'À venir', color: 'gray' },
  scheduled: { value: 'scheduled', label: 'Programmé', color: 'blue' },
  in_progress: { value: 'in_progress', label: 'En cours', color: 'amber' },
  completed: { value: 'completed', label: 'Terminé', color: 'green' },
  cancelled: { value: 'cancelled', label: 'Annulé', color: 'red' },
};

// Calcul du vainqueur d'un match Best-of
export function calculateBestOfWinner(games, bestOf) {
  if (!games || !Array.isArray(games)) return null;
  
  const winsNeeded = Math.ceil(bestOf / 2);
  let team1Wins = 0;
  let team2Wins = 0;
  
  for (const game of games) {
    if (game.team1_score > game.team2_score) team1Wins++;
    else if (game.team2_score > game.team1_score) team2Wins++;
    
    if (team1Wins >= winsNeeded) return 'team1';
    if (team2Wins >= winsNeeded) return 'team2';
  }
  
  return null;
}

// Formater le score d'un match
export function formatMatchScore(match, format = 'simple') {
  if (!match) return '-';
  
  const t1 = match.team1_score ?? 0;
  const t2 = match.team2_score ?? 0;
  
  if (format === 'detailed' && match.games?.length > 0) {
    const gameScores = match.games.map(g => `${g.team1_score}-${g.team2_score}`).join(', ');
    return `${t1}-${t2} (${gameScores})`;
  }
  
  return `${t1}-${t2}`;
}
