/**
 * Utilitaires de notifications - Version Convex
 * 
 * Ces fonctions sont des helpers pour créer des notifications via les mutations Convex.
 * Elles sont conçues pour être utilisées avec useMutation de Convex.
 * 
 * USAGE:
 * const createForMatch = useMutation(api.notifications.createForMatch);
 * await notifyMatchResult(createForMatch, matchId);
 */

import { api } from '../convex/_generated/api';

/**
 * Types de notifications disponibles
 */
export const NOTIFICATION_TYPES = {
  MATCH_READY: 'match_ready',
  TEAM_INVITATION: 'team_invitation',
  TOURNAMENT_UPDATE: 'tournament_update',
  CHECK_IN_REMINDER: 'check_in_reminder',
  MATCH_RESULT: 'match_result',
  TOURNAMENT_START: 'tournament_start',
  MATCH_UPCOMING: 'match_upcoming',
  SCORE_DISPUTE: 'score_dispute',
  SCORE_DECLARED: 'score_declared',
  ADMIN_MESSAGE: 'admin_message',
};

/**
 * Notification : Résultat de match
 * @param {Function} createForMatch - useMutation(api.notifications.createForMatch)
 * @param {string} matchId - ID du match
 * @param {number} score1 - Score équipe 1
 * @param {number} score2 - Score équipe 2
 */
export async function notifyMatchResult(createForMatch, matchId, score1, score2) {
  try {
    await createForMatch({
      matchId,
      type: 'match_result',
      title: '🏆 Match terminé',
      message: `Le match s'est terminé ${score1} - ${score2}`,
    });
  } catch (error) {
    console.error('Erreur notification match result:', error);
  }
}

/**
 * Notification : Conflit de score
 * @param {Function} createForMatch - useMutation(api.notifications.createForMatch)
 * @param {string} matchId - ID du match
 */
export async function notifyScoreDispute(createForMatch, matchId) {
  try {
    await createForMatch({
      matchId,
      type: 'score_dispute',
      title: '⚠️ Conflit de score',
      message: 'Les scores déclarés ne correspondent pas. Un admin va résoudre le conflit.',
    });
  } catch (error) {
    console.error('Erreur notification score dispute:', error);
  }
}

/**
 * Notification : Score déclaré par l'adversaire
 * @param {Function} createForTeam - useMutation(api.notifications.createForTeam)
 * @param {string} teamId - ID de l'équipe à notifier
 * @param {string} matchId - ID du match
 * @param {string} opponentName - Nom de l'équipe adverse
 * @param {string} scoreReported - Score déclaré (format "X - Y")
 */
export async function notifyOpponentScoreDeclared(createForTeam, teamId, matchId, opponentName, scoreReported) {
  try {
    await createForTeam({
      teamId,
      type: 'score_declared',
      title: '📝 Score déclaré',
      message: `${opponentName} a déclaré le score : ${scoreReported}. Confirme ou conteste !`,
      link: `/match/${matchId}`,
      relatedMatchId: matchId,
    });
  } catch (error) {
    console.error('Erreur notification score declared:', error);
  }
}

/**
 * Notification : Match à venir
 * @param {Function} createForMatch - useMutation(api.notifications.createForMatch)
 * @param {string} matchId - ID du match
 * @param {Date|number} scheduledAt - Date/heure du match
 */
export async function notifyMatchUpcoming(createForMatch, matchId, scheduledAt) {
  const formattedDate = new Date(scheduledAt).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  try {
    await createForMatch({
      matchId,
      type: 'match_upcoming',
      title: '⏰ Match à venir',
      message: `Votre match est programmé le ${formattedDate}`,
    });
  } catch (error) {
    console.error('Erreur notification match upcoming:', error);
  }
}

/**
 * Notification : Invitation équipe
 * @param {Function} createNotification - useMutation(api.notifications.create)
 * @param {string} userId - ID de l'utilisateur invité
 * @param {string} teamId - ID de l'équipe
 * @param {string} teamName - Nom de l'équipe
 * @param {string} invitedByUsername - Pseudo de l'utilisateur qui invite
 */
export async function notifyTeamInvitation(createNotification, userId, teamId, teamName, invitedByUsername) {
  try {
    await createNotification({
      userId,
      type: 'team_invitation',
      title: '👥 Nouvelle invitation d\'équipe',
      message: `${invitedByUsername} vous invite à rejoindre l'équipe ${teamName}`,
      link: '/player/dashboard',
      relatedTeamId: teamId,
    });
  } catch (error) {
    console.error('Erreur notification team invitation:', error);
  }
}

/**
 * Notification : Message admin
 * @param {Function} createForTeam - useMutation(api.notifications.createForTeam)
 * @param {string} teamId - ID de l'équipe
 * @param {string} tournamentId - ID du tournoi
 * @param {string} message - Message de l'admin
 */
export async function notifyAdminMessage(createForTeam, teamId, tournamentId, message) {
  try {
    await createForTeam({
      teamId,
      type: 'admin_message',
      title: '📢 Message de l\'organisateur',
      message,
      link: `/tournament/${tournamentId}`,
      relatedTournamentId: tournamentId,
    });
  } catch (error) {
    console.error('Erreur notification admin message:', error);
  }
}

// Export API references for convenience
export const notificationApi = {
  create: api.notifications.create,
  createForTeam: api.notifications.createForTeam,
  createForMatch: api.notifications.createForMatch,
  markAsRead: api.notifications.markAsRead,
  markAllAsRead: api.notifications.markAllAsRead,
};

