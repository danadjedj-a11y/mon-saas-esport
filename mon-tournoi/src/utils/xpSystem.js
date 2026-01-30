// Système d'attribution d'XP et de vérification de badges
// Migré vers Convex - utilise api.gamification.addXp

import { XP_REWARDS } from './badges';

/**
 * Attribue de l'XP à un utilisateur
 * @param {Function} addXpMutation - The Convex mutation (from useMutation(api.gamification.addXp))
 * @param {string} userId - User ID (Convex ID)
 * @param {number} xpAmount - Amount of XP to add
 * @param {string} _actionType - Type d'action (pour logging, optionnel)
 */
export async function awardXP(addXpMutation, userId, xpAmount, _actionType = 'general') {
  if (!userId || !addXpMutation) return;

  try {
    await addXpMutation({ userId, amount: xpAmount });
  } catch (err) {
    console.error('Erreur système XP:', err);
  }
}

/**
 * Attribue de l'XP pour une participation à un tournoi
 * @param {Function} addXpMutation - The Convex mutation
 * @param {string} userId - User ID
 */
export async function awardTournamentParticipationXP(addXpMutation, userId) {
  await awardXP(addXpMutation, userId, XP_REWARDS.TOURNAMENT_PARTICIPATION, 'tournament_participation');
}

/**
 * Attribue de l'XP pour une victoire de tournoi
 * @param {Function} addXpMutation - The Convex mutation
 * @param {string} userId - User ID
 */
export async function awardTournamentWinXP(addXpMutation, userId) {
  await awardXP(addXpMutation, userId, XP_REWARDS.TOURNAMENT_WIN, 'tournament_win');
}

/**
 * Attribue de l'XP pour une victoire de match
 * @param {Function} addXpMutation - The Convex mutation
 * @param {string} userId - User ID
 */
export async function awardMatchWinXP(addXpMutation, userId) {
  await awardXP(addXpMutation, userId, XP_REWARDS.MATCH_WIN, 'match_win');
}

/**
 * Attribue de l'XP pour avoir joué un match
 * @param {Function} addXpMutation - The Convex mutation
 * @param {string} userId - User ID
 */
export async function awardMatchPlayXP(addXpMutation, userId) {
  await awardXP(addXpMutation, userId, XP_REWARDS.MATCH_PLAY, 'match_play');
}

/**
 * Attribue de l'XP pour la création d'une équipe
 * @param {Function} addXpMutation - The Convex mutation
 * @param {string} userId - User ID
 */
export async function awardTeamCreationXP(addXpMutation, userId) {
  await awardXP(addXpMutation, userId, XP_REWARDS.TEAM_CREATION, 'team_creation');
}

/**
 * Attribue de l'XP pour la création d'un tournoi
 * @param {Function} addXpMutation - The Convex mutation
 * @param {string} userId - User ID
 */
export async function awardTournamentCreationXP(addXpMutation, userId) {
  await awardXP(addXpMutation, userId, XP_REWARDS.TOURNAMENT_CREATION, 'tournament_creation');
}

/**
 * Récupère tous les utilisateurs d'une équipe (capitaine + membres)
 * Note: Cette fonction nécessite d'être appelée depuis un composant avec useQuery
 * ou d'utiliser directement les données de l'équipe passées en paramètre
 * @param {Object} team - L'objet équipe avec captainId
 * @param {Array} teamMembers - Les membres de l'équipe avec userId
 * @returns {Array<string>} - Liste des IDs utilisateurs
 */
export function getTeamUsers(team, teamMembers = []) {
  const userIds = new Set();
  
  if (team?.captainId) {
    userIds.add(team.captainId);
  }
  
  if (teamMembers && Array.isArray(teamMembers)) {
    teamMembers.forEach(m => {
      if (m.userId) userIds.add(m.userId);
    });
  }

  return Array.from(userIds);
}

