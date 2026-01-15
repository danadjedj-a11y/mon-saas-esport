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
  try {
    // Fetch invitations first
    const { data: invitations, error: invError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invError) {
      console.error('Erreur getPendingInvitations:', invError);
      throw invError;
    }

    if (!invitations || invitations.length === 0) {
      return [];
    }

    // Get unique user IDs for profiles
    const userIds = [...new Set([
      ...invitations.map(i => i.invited_user_id),
      ...invitations.map(i => i.invited_by)
    ].filter(Boolean))];

    // Fetch profiles separately
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    const profilesMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    // Map profiles to invitations
    return invitations.map(inv => ({
      ...inv,
      invited_user: profilesMap[inv.invited_user_id] || null,
      invited_by_user: profilesMap[inv.invited_by] || null,
    }));
  } catch (error) {
    console.error('Erreur getPendingInvitations:', error);
    throw error;
  }
};

/**
 * Récupérer les invitations reçues par un utilisateur
 */
export const getUserInvitations = async (userId) => {
  try {
    // Fetch invitations first
    const { data: invitations, error: invError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invError) {
      console.error('Erreur getUserInvitations:', invError);
      throw invError;
    }

    if (!invitations || invitations.length === 0) {
      return [];
    }

    // Get unique team IDs and user IDs
    const teamIds = [...new Set(invitations.map(i => i.team_id).filter(Boolean))];
    const inviterIds = [...new Set(invitations.map(i => i.invited_by).filter(Boolean))];

    // Fetch teams and profiles separately
    const [teamsResult, profilesResult] = await Promise.all([
      teamIds.length > 0 
        ? supabase.from('teams').select('id, name, tag, logo_url').in('id', teamIds)
        : { data: [] },
      inviterIds.length > 0
        ? supabase.from('profiles').select('id, username, avatar_url').in('id', inviterIds)
        : { data: [] }
    ]);

    const teamsMap = (teamsResult.data || []).reduce((acc, t) => { acc[t.id] = t; return acc; }, {});
    const profilesMap = (profilesResult.data || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

    // Map data to invitations
    return invitations.map(inv => ({
      ...inv,
      team: teamsMap[inv.team_id] || null,
      invited_by_user: profilesMap[inv.invited_by] || null,
    }));
  } catch (error) {
    console.error('Erreur getUserInvitations:', error);
    throw error;
  }
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
