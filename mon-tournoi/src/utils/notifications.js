// Utilitaires pour le système de notifications avec protection anti-spam

import { supabase } from '../supabaseClient';

/**
 * Crée une notification avec protection anti-spam
 * @param {string} userId - ID de l'utilisateur qui recevra la notification
 * @param {string} type - Type de notification ('comment_like', 'comment_reply', etc.)
 * @param {string} title - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {string} link - URL vers la ressource (optionnel)
 * @param {string} relatedUserId - ID de l'utilisateur qui a déclenché la notification (optionnel)
 * @param {string} relatedCommentId - ID du commentaire concerné (optionnel)
 * @param {string} relatedTournamentId - ID du tournoi concerné (optionnel)
 * @param {number} cooldownMinutes - Cooldown en minutes (défaut: 5)
 * @returns {Promise<string|null>} - ID de la notification créée ou null si bloquée par anti-spam
 */
export async function createNotification(
  userId,
  type,
  title,
  message,
  link = null,
  relatedUserId = null,
  relatedCommentId = null,
  relatedTournamentId = null,
  cooldownMinutes = 5
) {
  try {
    const { data, error } = await supabase.rpc('create_notification_with_deduplication', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_link: link,
      p_related_user_id: relatedUserId,
      p_related_comment_id: relatedCommentId,
      p_related_tournament_id: relatedTournamentId,
      p_cooldown_minutes: cooldownMinutes
    });

    if (error) {
      console.error('Erreur création notification:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Erreur création notification:', err);
    return null;
  }
}

/**
 * Envoie une notification pour un like sur un commentaire
 * Protection anti-spam : ne notifie pas si l'utilisateur vient de retirer puis remettre son like
 */
export async function notifyCommentLike(commentAuthorId, likerId, commentId, tournamentId, likerUsername) {
  // Ne pas notifier si l'utilisateur like son propre commentaire
  if (commentAuthorId === likerId) {
    return null;
  }

  const link = `/tournament/${tournamentId}/public?tab=comments`;
  
  return await createNotification(
    commentAuthorId,
    'comment_like',
    'Nouveau like sur votre commentaire',
    `${likerUsername || 'Quelqu\'un'} a aimé votre commentaire`,
    link,
    likerId,
    commentId,
    tournamentId,
    5 // Cooldown de 5 minutes
  );
}

/**
 * Envoie une notification pour une réponse à un commentaire
 */
export async function notifyCommentReply(commentAuthorId, replierId, commentId, tournamentId, replierUsername) {
  // Ne pas notifier si l'utilisateur répond à son propre commentaire
  if (commentAuthorId === replierId) {
    return null;
  }

  const link = `/tournament/${tournamentId}/public?tab=comments`;
  
  return await createNotification(
    commentAuthorId,
    'comment_reply',
    'Nouvelle réponse à votre commentaire',
    `${replierUsername || 'Quelqu\'un'} a répondu à votre commentaire`,
    link,
    replierId,
    commentId,
    tournamentId,
    5 // Cooldown de 5 minutes
  );
}

/**
 * Récupère le nombre de notifications non lues pour un utilisateur
 */
export async function getUnreadNotificationsCount(userId) {
  try {
    const { data, error } = await supabase.rpc('get_unread_notifications_count', {
      p_user_id: userId
    });

    if (error) {
      console.error('Erreur récupération nombre notifications:', error);
      return 0;
    }

    return data || 0;
  } catch (err) {
    console.error('Erreur récupération nombre notifications:', err);
    return 0;
  }
}

/**
 * Marque une notification comme lue
 */
export async function markNotificationAsRead(notificationId, userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erreur marquage notification comme lue:', err);
    return false;
  }
}

/**
 * Marque toutes les notifications comme lues pour un utilisateur
 */
export async function markAllNotificationsAsRead(userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erreur marquage toutes notifications comme lues:', err);
    return false;
  }
}

