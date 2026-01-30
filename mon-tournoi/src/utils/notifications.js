// Utilitaires pour le système de notifications
// Migré vers Convex - utilise api.notifications.create

/**
 * Crée une notification via Convex
 * @param {Function} createNotificationMutation - The Convex mutation (from useMutation(api.notifications.create))
 * @param {string} userId - ID de l'utilisateur qui recevra la notification (Convex ID)
 * @param {string} type - Type de notification (doit correspondre aux types Convex)
 * @param {string} title - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {string} link - URL vers la ressource (optionnel)
 * @param {string} relatedTournamentId - ID du tournoi concerné (optionnel)
 * @param {string} relatedMatchId - ID du match concerné (optionnel)
 * @param {string} relatedTeamId - ID de l'équipe concernée (optionnel)
 * @returns {Promise<string|null>} - ID de la notification créée ou null en cas d'erreur
 */
export async function createNotification(
  createNotificationMutation,
  userId,
  type,
  title,
  message,
  link = null,
  relatedTournamentId = null,
  relatedMatchId = null,
  relatedTeamId = null
) {
  if (!createNotificationMutation || !userId) return null;
  
  try {
    const notificationId = await createNotificationMutation({
      userId,
      type,
      title,
      message,
      link: link || undefined,
      relatedTournamentId: relatedTournamentId || undefined,
      relatedMatchId: relatedMatchId || undefined,
      relatedTeamId: relatedTeamId || undefined,
    });

    return notificationId;
  } catch (err) {
    console.error('Erreur création notification:', err);
    return null;
  }
}

/**
 * Envoie une notification pour un like sur un commentaire
 * Note: Le type 'comment_like' n'existe pas dans Convex, utilisez 'admin_message' ou ajoutez le type au schema
 * @param {Function} createNotificationMutation - The Convex mutation
 * @param {string} commentAuthorId - ID de l'auteur du commentaire
 * @param {string} likerId - ID de l'utilisateur qui a liké
 * @param {string} tournamentId - ID du tournoi
 * @param {string} likerUsername - Nom de l'utilisateur qui a liké
 */
export async function notifyCommentLike(createNotificationMutation, commentAuthorId, likerId, tournamentId, likerUsername) {
  // Ne pas notifier si l'utilisateur like son propre commentaire
  if (commentAuthorId === likerId) {
    return null;
  }

  const link = `/tournament/${tournamentId}/public?tab=comments`;
  
  return await createNotification(
    createNotificationMutation,
    commentAuthorId,
    'admin_message', // Type générique - à adapter si 'comment_like' est ajouté au schema
    'Nouveau like sur votre commentaire',
    `${likerUsername || 'Quelqu\'un'} a aimé votre commentaire`,
    link,
    tournamentId
  );
}

/**
 * Envoie une notification pour une réponse à un commentaire
 * Note: Le type 'comment_reply' n'existe pas dans Convex, utilisez 'admin_message' ou ajoutez le type au schema
 * @param {Function} createNotificationMutation - The Convex mutation
 * @param {string} commentAuthorId - ID de l'auteur du commentaire
 * @param {string} replierId - ID de l'utilisateur qui a répondu
 * @param {string} tournamentId - ID du tournoi
 * @param {string} replierUsername - Nom de l'utilisateur qui a répondu
 */
export async function notifyCommentReply(createNotificationMutation, commentAuthorId, replierId, tournamentId, replierUsername) {
  // Ne pas notifier si l'utilisateur répond à son propre commentaire
  if (commentAuthorId === replierId) {
    return null;
  }

  const link = `/tournament/${tournamentId}/public?tab=comments`;
  
  return await createNotification(
    createNotificationMutation,
    commentAuthorId,
    'admin_message', // Type générique - à adapter si 'comment_reply' est ajouté au schema
    'Nouvelle réponse à votre commentaire',
    `${replierUsername || 'Quelqu\'un'} a répondu à votre commentaire`,
    link,
    tournamentId
  );
}

/**
 * Récupère le nombre de notifications non lues pour un utilisateur
 * Note: Utilisez useQuery(api.notifications.countUnread, { userId }) à la place
 * @deprecated Utilisez directement le hook Convex useQuery(api.notifications.countUnread)
 */
export function getUnreadNotificationsCount() {
  console.warn('getUnreadNotificationsCount est déprécié. Utilisez useQuery(api.notifications.countUnread, { userId })');
  return 0;
}

/**
 * Marque une notification comme lue
 * @param {Function} markAsReadMutation - The Convex mutation (from useMutation(api.notifications.markAsRead))
 * @param {string} notificationId - ID de la notification
 */
export async function markNotificationAsRead(markAsReadMutation, notificationId) {
  if (!markAsReadMutation || !notificationId) return false;
  
  try {
    await markAsReadMutation({ notificationId });
    return true;
  } catch (err) {
    console.error('Erreur marquage notification comme lue:', err);
    return false;
  }
}

/**
 * Marque toutes les notifications comme lues pour un utilisateur
 * @param {Function} markAllAsReadMutation - The Convex mutation (from useMutation(api.notifications.markAllAsRead))
 */
export async function markAllNotificationsAsRead(markAllAsReadMutation) {
  if (!markAllAsReadMutation) return false;
  
  try {
    await markAllAsReadMutation();
    return true;
  } catch (err) {
    console.error('Erreur marquage toutes notifications comme lues:', err);
    return false;
  }
}

