import { supabase } from '../../../supabaseClient';

/**
 * Service pour les opérations sur les équipes
 */

/**
 * Récupérer toutes les équipes d'un utilisateur (capitaine ou membre)
 */
export const getUserTeams = async (userId) => {
  try {
    // Équipes où l'utilisateur est capitaine
    const { data: captainTeams, error: captainError } = await supabase
      .from('teams')
      .select('*')
      .eq('captain_id', userId);

    if (captainError) throw captainError;

    // Équipes où l'utilisateur est membre
    const { data: memberTeams, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, teams(*)')
      .eq('user_id', userId);

    if (memberError) throw memberError;

    // Fusionner et dédupliquer
    const allTeams = [
      ...(captainTeams || []),
      ...(memberTeams?.map(m => m.teams).filter(Boolean) || [])
    ];

    const uniqueTeams = Array.from(
      new Map(allTeams.map(t => [t.id, t])).values()
    );

    return uniqueTeams;
  } catch (error) {
    console.error('Erreur getUserTeams:', error);
    throw error;
  }
};

/**
 * Récupérer une équipe par ID
 */
export const getTeamById = async (teamId) => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error) {
    console.error('Erreur getTeamById:', error);
    throw error;
  }

  return data;
};

/**
 * Récupérer les membres d'une équipe
 */
export const getTeamMembers = async (teamId) => {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, profiles(username, avatar_url)')
    .eq('team_id', teamId);

  if (error) {
    console.error('Erreur getTeamMembers:', error);
    throw error;
  }

  return data || [];
};

/**
 * Créer une équipe
 */
export const createTeam = async (teamData) => {
  const { data, error } = await supabase
    .from('teams')
    .insert([teamData])
    .select()
    .single();

  if (error) {
    console.error('Erreur createTeam:', error);
    throw error;
  }

  return data;
};

/**
 * Mettre à jour une équipe
 */
export const updateTeam = async (teamId, updates) => {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    console.error('Erreur updateTeam:', error);
    throw error;
  }

  return data;
};

/**
 * Supprimer une équipe
 */
export const deleteTeam = async (teamId) => {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    console.error('Erreur deleteTeam:', error);
    throw error;
  }

  return true;
};

/**
 * Ajouter un membre à une équipe
 */
export const addTeamMember = async (teamId, userId) => {
  const { data, error } = await supabase
    .from('team_members')
    .insert([{ team_id: teamId, user_id: userId }])
    .select()
    .single();

  if (error) {
    console.error('Erreur addTeamMember:', error);
    throw error;
  }

  return data;
};

/**
 * Retirer un membre d'une équipe
 */
export const removeTeamMember = async (teamId, userId) => {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) {
    console.error('Erreur removeTeamMember:', error);
    throw error;
  }

  return true;
};

/**
 * Envoyer une invitation à rejoindre une équipe
 */
export const sendTeamInvitation = async (teamId, userId, invitedBy, message = '') => {
  const { data, error } = await supabase
    .from('team_invitations')
    .insert([{
      team_id: teamId,
      invited_user_id: userId,
      invited_by: invitedBy,
      message,
      status: 'pending',
    }])
    .select()
    .single();

  if (error) {
    console.error('Erreur sendTeamInvitation:', error);
    throw error;
  }

  return data;
};

/**
 * Annuler une invitation
 */
export const cancelInvitation = async (invitationId) => {
  const { error } = await supabase
    .from('team_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) {
    console.error('Erreur cancelInvitation:', error);
    throw error;
  }

  return true;
};

/**
 * Récupérer les invitations en attente d'une équipe
 */
export const getPendingInvitations = async (teamId) => {
  const { data, error } = await supabase
    .from('team_invitations')
    .select(`
      *,
      invited_user:profiles!team_invitations_invited_user_id_fkey(id, username, avatar_url),
      invited_by_user:profiles!team_invitations_invited_by_fkey(id, username, avatar_url)
    `)
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur getPendingInvitations:', error);
    throw error;
  }

  return data || [];
};

/**
 * Récupérer les invitations reçues par un utilisateur
 */
export const getUserInvitations = async (userId) => {
  const { data, error } = await supabase
    .from('team_invitations')
    .select(`
      *,
      team:teams(id, name, tag, logo_url),
      invited_by_user:profiles!team_invitations_invited_by_fkey(id, username, avatar_url)
    `)
    .eq('invited_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur getUserInvitations:', error);
    throw error;
  }

  return data || [];
};

/**
 * Accepter une invitation d'équipe
 */
export const acceptInvitation = async (invitationId) => {
  // Récupérer l'invitation
  const { data: invitation, error: fetchError } = await supabase
    .from('team_invitations')
    .select('team_id, invited_user_id')
    .eq('id', invitationId)
    .single();

  if (fetchError) {
    console.error('Erreur fetchInvitation:', fetchError);
    throw fetchError;
  }

  // Ajouter le joueur à l'équipe
  const { error: addError } = await supabase
    .from('team_members')
    .insert([{
      team_id: invitation.team_id,
      user_id: invitation.invited_user_id,
      role: 'player',
    }]);

  if (addError) {
    console.error('Erreur addTeamMember:', addError);
    throw addError;
  }

  // Marquer l'invitation comme acceptée
  const { error: updateError } = await supabase
    .from('team_invitations')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
    })
    .eq('id', invitationId);

  if (updateError) {
    console.error('Erreur updateInvitation:', updateError);
    throw updateError;
  }

  return true;
};

/**
 * Refuser une invitation d'équipe
 */
export const declineInvitation = async (invitationId) => {
  const { error } = await supabase
    .from('team_invitations')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', invitationId);

  if (error) {
    console.error('Erreur declineInvitation:', error);
    throw error;
  }

  return true;
};

export default {
  getUserTeams,
  getTeamById,
  getTeamMembers,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  sendTeamInvitation,
  cancelInvitation,
  getPendingInvitations,
  getUserInvitations,
  acceptInvitation,
  declineInvitation,
};
