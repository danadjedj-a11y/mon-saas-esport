import { supabase } from '../../../supabaseClient';
import { getSwissScores } from '../../../swissUtils';

/**
 * Service pour les opérations sur les tournois
 * Abstraction des appels Supabase pour meilleure maintenabilité
 */

/**
 * Récupérer tous les tournois
 */
export const getAllTournaments = async (filters = {}) => {
  let query = supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  // Appliquer les filtres
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters.game) {
    query = query.eq('game', filters.game);
  }

  if (filters.format) {
    query = query.eq('format', filters.format);
  }

  if (filters.ownerId) {
    query = query.eq('owner_id', filters.ownerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erreur getAllTournaments:', error);
    throw error;
  }

  return data;
};

/**
 * Récupérer un tournoi par ID
 */
export const getTournamentById = async (tournamentId) => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (error) {
    console.error('Erreur getTournamentById:', error);
    throw error;
  }

  return data;
};

/**
 * Récupérer les participants d'un tournoi
 */
export const getTournamentParticipants = async (tournamentId) => {
  const { data, error } = await supabase
    .from('participants')
    .select('*, teams(*)')
    .eq('tournament_id', tournamentId)
    .order('seed_order', { ascending: true, nullsLast: true });

  if (error) {
    console.error('Erreur getTournamentParticipants:', error);
    throw error;
  }

  return data || [];
};

/**
 * Récupérer les matchs d'un tournoi
 */
export const getTournamentMatches = async (tournamentId) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('match_number', { ascending: true });

  if (error) {
    console.error('Erreur getTournamentMatches:', error);
    throw error;
  }

  return data || [];
};

/**
 * Récupérer les scores suisses d'un tournoi
 */
export const getTournamentSwissScores = async (tournamentId) => {
  try {
    const scores = await getSwissScores(supabase, tournamentId);
    return scores || [];
  } catch (error) {
    console.error('Erreur getTournamentSwissScores:', error);
    throw error;
  }
};

/**
 * Récupérer la waitlist d'un tournoi
 */
export const getTournamentWaitlist = async (tournamentId) => {
  const { data, error } = await supabase
    .from('waitlist')
    .select('*, teams(*)')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur getTournamentWaitlist:', error);
    throw error;
  }

  return data || [];
};

/**
 * Créer un tournoi
 */
export const createTournament = async (tournamentData) => {
  const { data, error } = await supabase
    .from('tournaments')
    .insert([tournamentData])
    .select()
    .single();

  if (error) {
    console.error('Erreur createTournament:', error);
    throw error;
  }

  return data;
};

/**
 * Mettre à jour un tournoi
 */
export const updateTournament = async (tournamentId, updates) => {
  const { data, error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', tournamentId)
    .select()
    .single();

  if (error) {
    console.error('Erreur updateTournament:', error);
    throw error;
  }

  return data;
};

/**
 * Supprimer un tournoi
 */
export const deleteTournament = async (tournamentId) => {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId);

  if (error) {
    console.error('Erreur deleteTournament:', error);
    throw error;
  }

  return true;
};

/**
 * Récupérer toutes les données d'un tournoi (complet)
 */
export const getTournamentComplete = async (tournamentId) => {
  try {
    const [tournament, participants, matches, waitlist] = await Promise.all([
      getTournamentById(tournamentId),
      getTournamentParticipants(tournamentId),
      getTournamentMatches(tournamentId),
      getTournamentWaitlist(tournamentId),
    ]);

    let swissScores = [];
    if (tournament.format === 'swiss') {
      swissScores = await getTournamentSwissScores(tournamentId);
    }

    return {
      tournament,
      participants,
      matches,
      waitlist,
      swissScores,
    };
  } catch (error) {
    console.error('Erreur getTournamentComplete:', error);
    throw error;
  }
};

export default {
  getAllTournaments,
  getTournamentById,
  getTournamentParticipants,
  getTournamentMatches,
  getTournamentSwissScores,
  getTournamentWaitlist,
  createTournament,
  updateTournament,
  deleteTournament,
  getTournamentComplete,
};
