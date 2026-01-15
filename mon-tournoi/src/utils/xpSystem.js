// Système d'attribution d'XP et de vérification de badges

import { supabase } from '../supabaseClient';
import { XP_REWARDS } from './badges';

/**
 * Attribue de l'XP à un utilisateur et vérifie les badges
 */
export async function awardXP(userId, xpAmount, _actionType = 'general') {
  if (!userId) return;

  try {
    // Ajouter l'XP via la fonction SQL
    const { error: xpError } = await supabase.rpc('add_xp', {
      p_user_id: userId,
      p_xp_amount: xpAmount
    });

    if (xpError) {
      console.error('Erreur attribution XP:', xpError);
      return;
    }

    // Vérifier et attribuer les badges automatiquement
    const { error: badgeError } = await supabase.rpc('check_and_award_badges', {
      p_user_id: userId
    });

    if (badgeError) {
      console.error('Erreur vérification badges:', badgeError);
    }
  } catch (err) {
    console.error('Erreur système XP:', err);
  }
}

/**
 * Attribue de l'XP pour une participation à un tournoi
 */
export async function awardTournamentParticipationXP(userId) {
  await awardXP(userId, XP_REWARDS.TOURNAMENT_PARTICIPATION, 'tournament_participation');
}

/**
 * Attribue de l'XP pour une victoire de tournoi
 */
export async function awardTournamentWinXP(userId) {
  await awardXP(userId, XP_REWARDS.TOURNAMENT_WIN, 'tournament_win');
}

/**
 * Attribue de l'XP pour une victoire de match
 */
export async function awardMatchWinXP(userId) {
  await awardXP(userId, XP_REWARDS.MATCH_WIN, 'match_win');
}

/**
 * Attribue de l'XP pour avoir joué un match
 */
export async function awardMatchPlayXP(userId) {
  await awardXP(userId, XP_REWARDS.MATCH_PLAY, 'match_play');
}

/**
 * Attribue de l'XP pour la création d'une équipe
 */
export async function awardTeamCreationXP(userId) {
  await awardXP(userId, XP_REWARDS.TEAM_CREATION, 'team_creation');
}

/**
 * Attribue de l'XP pour la création d'un tournoi
 */
export async function awardTournamentCreationXP(userId) {
  await awardXP(userId, XP_REWARDS.TOURNAMENT_CREATION, 'tournament_creation');
}

/**
 * Récupère tous les utilisateurs d'une équipe (capitaine + membres)
 */
export async function getTeamUsers(teamId) {
  try {
    const [teamResult, membersResult] = await Promise.all([
      supabase
        .from('teams')
        .select('captain_id')
        .eq('id', teamId)
        .single(),
      supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
    ]);

    const userIds = new Set();
    
    if (teamResult.data?.captain_id) {
      userIds.add(teamResult.data.captain_id);
    }
    
    if (membersResult.data) {
      membersResult.data.forEach(m => userIds.add(m.user_id));
    }

    return Array.from(userIds);
  } catch (err) {
    console.error('Erreur récupération utilisateurs équipe:', err);
    return [];
  }
}

