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

export default {
  getUserTeams,
  getTeamById,
  getTeamMembers,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
};
