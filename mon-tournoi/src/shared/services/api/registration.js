/**
 * Service API pour l'inscription aux tournois
 * Gère les inscriptions avec équipe existante ou équipe temporaire
 */

import { supabase } from '../../../supabaseClient';

/**
 * Vérifie si un utilisateur peut s'inscrire à un tournoi
 * @param {string} tournamentId - ID du tournoi
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{canRegister: boolean, reason: string|null, tournament: object}>}
 */
export async function checkRegistrationEligibility(tournamentId, userId) {
  try {
    // Récupérer les infos du tournoi
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return { canRegister: false, reason: 'Tournoi introuvable', tournament: null };
    }

    // Vérifier le statut du tournoi
    if (tournament.status !== 'draft') {
      return { 
        canRegister: false, 
        reason: 'Les inscriptions sont fermées (tournoi en cours ou terminé)', 
        tournament 
      };
    }

    // Vérifier la date limite d'inscription
    if (tournament.registration_deadline) {
      const deadline = new Date(tournament.registration_deadline);
      if (deadline < new Date()) {
        return { 
          canRegister: false, 
          reason: 'La date limite d\'inscription est dépassée', 
          tournament 
        };
      }
    }

    // Vérifier si l'utilisateur est déjà inscrit (via équipe permanente)
    const { data: existingParticipation } = await supabase
      .from('participants')
      .select('id, team_id, temporary_team_id')
      .eq('tournament_id', tournamentId)
      .or(`team_id.in.(${await getUserTeamIds(userId)}),temporary_team_id.in.(${await getUserTempTeamIds(tournamentId, userId)})`)
      .maybeSingle();

    if (existingParticipation) {
      return { 
        canRegister: false, 
        reason: 'Vous êtes déjà inscrit à ce tournoi', 
        tournament,
        existingParticipation
      };
    }

    // Vérifier le nombre de participants
    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);

    const isFull = tournament.max_participants && count >= tournament.max_participants;

    return { 
      canRegister: true, 
      reason: null, 
      tournament,
      currentCount: count || 0,
      maxParticipants: tournament.max_participants,
      isFull,
      spotsLeft: tournament.max_participants ? tournament.max_participants - (count || 0) : null
    };
  } catch (error) {
    console.error('Erreur vérification éligibilité:', error);
    return { canRegister: false, reason: 'Erreur lors de la vérification', tournament: null };
  }
}

/**
 * Récupère les IDs des équipes permanentes d'un utilisateur (en tant que capitaine)
 */
async function getUserTeamIds(userId) {
  const { data } = await supabase
    .from('teams')
    .select('id')
    .eq('captain_id', userId);
  
  return data?.map(t => t.id).join(',') || 'null';
}

/**
 * Récupère les IDs des équipes temporaires d'un utilisateur pour un tournoi
 */
async function getUserTempTeamIds(tournamentId, userId) {
  const { data } = await supabase
    .from('temporary_teams')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('captain_id', userId);
  
  return data?.map(t => t.id).join(',') || 'null';
}

/**
 * Récupère les équipes permanentes d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>}
 */
export async function getUserTeams(userId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('captain_id', userId)
    .order('name');

  if (error) {
    console.error('Erreur récupération équipes:', error);
    return [];
  }

  return data || [];
}

/**
 * Inscrit une équipe existante à un tournoi
 * @param {string} tournamentId - ID du tournoi
 * @param {string} teamId - ID de l'équipe
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function registerExistingTeam(tournamentId, teamId) {
  try {
    const { data, error } = await supabase
      .from('participants')
      .insert([{
        tournament_id: tournamentId,
        team_id: teamId,
        checked_in: false,
        disqualified: false
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Cette équipe est déjà inscrite à ce tournoi' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Erreur inscription équipe:', error);
    return { success: false, error: 'Erreur lors de l\'inscription' };
  }
}

/**
 * Crée une équipe temporaire et l'inscrit au tournoi
 * @param {string} tournamentId - ID du tournoi
 * @param {object} teamData - Données de l'équipe temporaire
 * @param {Array} players - Liste des joueurs
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function registerTemporaryTeam(tournamentId, teamData, players) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Vous devez être connecté' };
    }

    // 1. Créer l'équipe temporaire
    const { data: tempTeam, error: tempTeamError } = await supabase
      .from('temporary_teams')
      .insert([{
        tournament_id: tournamentId,
        name: teamData.name,
        tag: teamData.tag || null,
        logo_url: teamData.logoUrl || null,
        captain_id: user.id,
        captain_email: teamData.captainEmail || user.email,
        discord_contact: teamData.discordContact || null,
        status: 'pending'
      }])
      .select()
      .single();

    if (tempTeamError) {
      if (tempTeamError.code === '23505') {
        return { success: false, error: 'Vous avez déjà créé une équipe pour ce tournoi' };
      }
      return { success: false, error: tempTeamError.message };
    }

    // 2. Ajouter les joueurs
    if (players && players.length > 0) {
      const playersToInsert = players.map((player, index) => ({
        temporary_team_id: tempTeam.id,
        player_name: player.name,
        player_email: player.email || null,
        game_account: player.gameAccount || null,
        game_account_platform: player.gameAccountPlatform || null,
        role: player.role || null,
        user_id: player.userId || null,
        position: index
      }));

      const { error: playersError } = await supabase
        .from('temporary_team_players')
        .insert(playersToInsert);

      if (playersError) {
        // Rollback : supprimer l'équipe temporaire
        await supabase.from('temporary_teams').delete().eq('id', tempTeam.id);
        return { success: false, error: `Erreur ajout joueurs: ${playersError.message}` };
      }
    }

    // 3. Créer la participation
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert([{
        tournament_id: tournamentId,
        temporary_team_id: tempTeam.id,
        checked_in: false,
        disqualified: false
      }])
      .select()
      .single();

    if (participantError) {
      // Rollback
      await supabase.from('temporary_teams').delete().eq('id', tempTeam.id);
      return { success: false, error: `Erreur inscription: ${participantError.message}` };
    }

    return { 
      success: true, 
      data: { 
        temporaryTeam: tempTeam, 
        participant 
      } 
    };
  } catch (error) {
    console.error('Erreur création équipe temporaire:', error);
    return { success: false, error: 'Erreur lors de la création de l\'équipe' };
  }
}

/**
 * Ajoute une équipe à la liste d'attente
 * @param {string} tournamentId - ID du tournoi
 * @param {string} teamId - ID de l'équipe (permanente ou temporaire)
 * @param {boolean} isTemporary - Si c'est une équipe temporaire
 * @returns {Promise<{success: boolean, position?: number, error?: string}>}
 */
export async function addToWaitlist(tournamentId, teamId, isTemporary = false) {
  try {
    // Récupérer la dernière position
    const { data: lastInWaitlist } = await supabase
      .from('waitlist')
      .select('position')
      .eq('tournament_id', tournamentId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = lastInWaitlist ? lastInWaitlist.position + 1 : 1;

    const { error } = await supabase
      .from('waitlist')
      .insert([{
        tournament_id: tournamentId,
        team_id: isTemporary ? null : teamId,
        temporary_team_id: isTemporary ? teamId : null,
        position: nextPosition
      }]);

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Déjà en liste d\'attente' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, position: nextPosition };
  } catch (error) {
    console.error('Erreur ajout waitlist:', error);
    return { success: false, error: 'Erreur lors de l\'ajout à la liste d\'attente' };
  }
}

/**
 * Récupère les équipes temporaires d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} tournamentId - ID du tournoi (optionnel)
 * @returns {Promise<Array>}
 */
export async function getUserTemporaryTeams(userId, tournamentId = null) {
  let query = supabase
    .from('temporary_teams')
    .select(`
      *,
      temporary_team_players (*)
    `)
    .eq('captain_id', userId);

  if (tournamentId) {
    query = query.eq('tournament_id', tournamentId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur récupération équipes temporaires:', error);
    return [];
  }

  return data || [];
}

/**
 * Met à jour une équipe temporaire
 * @param {string} tempTeamId - ID de l'équipe temporaire
 * @param {object} updates - Données à mettre à jour
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function updateTemporaryTeam(tempTeamId, updates) {
  try {
    const { data, error } = await supabase
      .from('temporary_teams')
      .update({
        name: updates.name,
        tag: updates.tag,
        logo_url: updates.logoUrl,
        discord_contact: updates.discordContact,
        updated_at: new Date().toISOString()
      })
      .eq('id', tempTeamId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Erreur mise à jour équipe temporaire:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}

/**
 * Met à jour les joueurs d'une équipe temporaire
 * @param {string} tempTeamId - ID de l'équipe temporaire
 * @param {Array} players - Nouvelle liste de joueurs
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateTemporaryTeamPlayers(tempTeamId, players) {
  try {
    // Supprimer les anciens joueurs
    await supabase
      .from('temporary_team_players')
      .delete()
      .eq('temporary_team_id', tempTeamId);

    // Ajouter les nouveaux
    if (players && players.length > 0) {
      const playersToInsert = players.map((player, index) => ({
        temporary_team_id: tempTeamId,
        player_name: player.name,
        player_email: player.email || null,
        game_account: player.gameAccount || null,
        game_account_platform: player.gameAccountPlatform || null,
        role: player.role || null,
        user_id: player.userId || null,
        position: index
      }));

      const { error } = await supabase
        .from('temporary_team_players')
        .insert(playersToInsert);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur mise à jour joueurs:', error);
    return { success: false, error: 'Erreur lors de la mise à jour des joueurs' };
  }
}

/**
 * Supprime une inscription (équipe temporaire + participation)
 * @param {string} tempTeamId - ID de l'équipe temporaire
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelTemporaryTeamRegistration(tempTeamId) {
  try {
    // La suppression en cascade fera le reste
    const { error } = await supabase
      .from('temporary_teams')
      .delete()
      .eq('id', tempTeamId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur annulation inscription:', error);
    return { success: false, error: 'Erreur lors de l\'annulation' };
  }
}

/**
 * Convertit une équipe temporaire en équipe permanente
 * @param {string} tempTeamId - ID de l'équipe temporaire
 * @returns {Promise<{success: boolean, teamId?: string, error?: string}>}
 */
export async function convertToPermanentTeam(tempTeamId) {
  try {
    const { data, error } = await supabase
      .rpc('convert_temporary_team_to_permanent', {
        p_temporary_team_id: tempTeamId
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, teamId: data };
  } catch (error) {
    console.error('Erreur conversion équipe:', error);
    return { success: false, error: 'Erreur lors de la conversion' };
  }
}
