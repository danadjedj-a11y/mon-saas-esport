import { supabase } from './supabaseClient';

/**
 * Créer une notification pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} type - Type de notification
 * @param {string} title - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {string} link - URL relative (ex: '/match/123')
 * @param {object} metadata - Métadonnées supplémentaires (optionnel)
 */
export async function createNotification(userId, type, title, message, link = null, metadata = null) {
  const { error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: userId,
        type,
        title,
        message,
        link,
        metadata
      }
    ]);

  if (error) {
    console.error('Erreur création notification:', error);
    return false;
  }
  return true;
}

/**
 * Créer une notification pour plusieurs utilisateurs (équipe)
 * @param {string[]} userIds - IDs des utilisateurs
 * @param {string} type - Type de notification
 * @param {string} title - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {string} link - URL relative
 * @param {object} metadata - Métadonnées supplémentaires
 */
export async function createNotificationsForUsers(userIds, type, title, message, link = null, metadata = null) {
  if (!userIds || userIds.length === 0) return;

  const notifications = userIds.map(userId => ({
    user_id: userId,
    type,
    title,
    message,
    link,
    metadata
  }));

  const { error } = await supabase
    .from('notifications')
    .insert(notifications);

  if (error) {
    console.error('Erreur création notifications:', error);
    return false;
  }
  return true;
}

/**
 * Obtenir tous les membres d'une équipe (user IDs)
 * @param {string} teamId - ID de l'équipe
 * @returns {Promise<string[]>} Liste des user IDs
 */
export async function getTeamMemberIds(teamId) {
  // Récupérer les membres de l'équipe
  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  if (membersError) {
    console.error('Erreur récupération membres:', membersError);
    return [];
  }

  // Récupérer le capitaine
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('captain_id')
    .eq('id', teamId)
    .single();

  if (teamError) {
    console.error('Erreur récupération équipe:', teamError);
    return [];
  }

  // Combiner membres et capitaine (sans doublons)
  const userIds = new Set();
  if (team.captain_id) userIds.add(team.captain_id);
  members.forEach(m => userIds.add(m.user_id));

  return Array.from(userIds);
}

/**
 * Notification : Match à venir
 * @param {string} matchId - ID du match
 * @param {string} team1Id - ID équipe 1
 * @param {string} team2Id - ID équipe 2
 * @param {Date} scheduledAt - Date/heure du match
 */
export async function notifyMatchUpcoming(matchId, team1Id, team2Id, scheduledAt) {
  const userIds1 = await getTeamMemberIds(team1Id);
  const userIds2 = await getTeamMemberIds(team2Id);
  const allUserIds = [...userIds1, ...userIds2];

  if (allUserIds.length === 0) return;

  const formattedDate = new Date(scheduledAt).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  await createNotificationsForUsers(
    allUserIds,
    'match_upcoming',
    '⏰ Match à venir',
    `Votre match est programmé le ${formattedDate}`,
    `/match/${matchId}`,
    { match_id: matchId, scheduled_at: scheduledAt }
  );
}

/**
 * Notification : Résultat de match
 * @param {string} matchId - ID du match
 * @param {string} winnerTeamId - ID de l'équipe gagnante
 * @param {string} loserTeamId - ID de l'équipe perdante
 * @param {number} score1 - Score équipe 1
 * @param {number} score2 - Score équipe 2
 */
export async function notifyMatchResult(matchId, winnerTeamId, loserTeamId, score1, score2) {
  const winnerUserIds = await getTeamMemberIds(winnerTeamId);
  const loserUserIds = await getTeamMemberIds(loserTeamId);

  // Notification pour les gagnants
  await createNotificationsForUsers(
    winnerUserIds,
    'match_result',
    '🏆 Victoire !',
    `Vous avez remporté votre match ${score1} - ${score2}`,
    `/match/${matchId}`,
    { match_id: matchId, won: true, score1, score2 }
  );

  // Notification pour les perdants
  await createNotificationsForUsers(
    loserUserIds,
    'match_result',
    '📊 Match terminé',
    `Votre match s'est terminé ${score1} - ${score2}`,
    `/match/${matchId}`,
    { match_id: matchId, won: false, score1, score2 }
  );
}

/**
 * Notification : Conflit de score
 * @param {string} matchId - ID du match
 * @param {string} team1Id - ID équipe 1
 * @param {string} team2Id - ID équipe 2
 */
export async function notifyScoreDispute(matchId, team1Id, team2Id) {
  const userIds1 = await getTeamMemberIds(team1Id);
  const userIds2 = await getTeamMemberIds(team2Id);
  const allUserIds = [...userIds1, ...userIds2];

  await createNotificationsForUsers(
    allUserIds,
    'score_dispute',
    '⚠️ Conflit de score',
    'Les scores déclarés ne correspondent pas. Un admin va résoudre le conflit.',
    `/match/${matchId}`,
    { match_id: matchId }
  );
}

/**
 * Notification : Message admin
 * @param {string} tournamentId - ID du tournoi
 * @param {string[]} userIds - IDs des utilisateurs à notifier
 * @param {string} message - Message de l'admin
 */
export async function notifyAdminMessage(tournamentId, userIds, message) {
  await createNotificationsForUsers(
    userIds,
    'admin_message',
    '📢 Message de l\'organisateur',
    message,
    `/tournament/${tournamentId}`,
    { tournament_id: tournamentId }
  );
}

/**
 * Notification : Mise à jour du tournoi
 * @param {string} tournamentId - ID du tournoi
 * @param {string} tournamentName - Nom du tournoi
 * @param {string} message - Message de mise à jour
 */
export async function notifyTournamentUpdate(tournamentId, tournamentName, message) {
  // Récupérer tous les participants du tournoi
  const { data: participants, error } = await supabase
    .from('participants')
    .select('team_id')
    .eq('tournament_id', tournamentId);

  if (error || !participants) return;

  // Récupérer tous les user IDs des équipes participantes
  const allUserIds = new Set();
  for (const participant of participants) {
    const userIds = await getTeamMemberIds(participant.team_id);
    userIds.forEach(id => allUserIds.add(id));
  }

  await createNotificationsForUsers(
    Array.from(allUserIds),
    'tournament_update',
    `📊 Mise à jour : ${tournamentName}`,
    message,
    `/tournament/${tournamentId}`,
    { tournament_id: tournamentId }
  );
}

