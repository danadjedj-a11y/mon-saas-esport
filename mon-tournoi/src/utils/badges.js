// Utilitaires pour le système de badges et achievements

/**
 * Calcule l'XP à attribuer pour différentes actions
 */
export const XP_REWARDS = {
  TOURNAMENT_PARTICIPATION: 50,
  TOURNAMENT_WIN: 200,
  MATCH_WIN: 25,
  MATCH_PLAY: 10,
  TEAM_CREATION: 30,
  TOURNAMENT_CREATION: 100
};

/**
 * Calcule le niveau à partir de l'XP total
 * Formule : level = floor(sqrt(total_xp / 100)) + 1
 */
export function calculateLevel(totalXP) {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

/**
 * Calcule l'XP nécessaire pour le prochain niveau
 */
export function getXPForNextLevel(currentLevel) {
  const nextLevel = currentLevel + 1;
  const xpForNextLevel = Math.pow(nextLevel - 1, 2) * 100;
  const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
  return xpForNextLevel - xpForCurrentLevel;
}

/**
 * Calcule l'XP total nécessaire pour atteindre un niveau
 */
export function getTotalXPForLevel(level) {
  return Math.pow(level - 1, 2) * 100;
}

/**
 * Calcule la progression vers le prochain niveau (0-100%)
 */
export function getProgressToNextLevel(currentXP, currentLevel) {
  const xpForCurrentLevel = getTotalXPForLevel(currentLevel);
  const xpForNextLevel = getTotalXPForLevel(currentLevel + 1);
  const xpInCurrentLevel = currentXP - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
  
  return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNext) * 100));
}

/**
 * Obtient la couleur selon la rareté du badge
 */
export function getBadgeRarityColor(rarity) {
  switch (rarity) {
    case 'common': return '#F8F6F2';
    case 'rare': return '#3498db';
    case 'epic': return '#9b59b6';
    case 'legendary': return '#f1c40f';
    default: return '#F8F6F2';
  }
}

/**
 * Obtient le nom de la rareté en français
 */
export function getRarityLabel(rarity) {
  switch (rarity) {
    case 'common': return 'Commun';
    case 'rare': return 'Rare';
    case 'epic': return 'Épique';
    case 'legendary': return 'Légendaire';
    default: return 'Commun';
  }
}

/**
 * Obtient le nom de la catégorie en français
 */
export function getCategoryLabel(category) {
  switch (category) {
    case 'participation': return 'Participation';
    case 'victory': return 'Victoire';
    case 'tournament': return 'Tournoi';
    case 'team': return 'Équipe';
    case 'special': return 'Spécial';
    default: return category;
  }
}

