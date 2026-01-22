/**
 * Hook personnalisé pour gérer le check-in par round
 * Permet aux participants de confirmer leur présence avant chaque round
 * 
 * @module useRoundCheckIn
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from '../../utils/toast';

/**
 * Hook pour gérer le check-in par round d'un tournoi
 * 
 * @param {string} tournamentId - ID du tournoi
 * @param {string} participantId - ID du participant (optionnel, pour un participant spécifique)
 * @param {Object} options - Options de configuration
 * @param {boolean} options.subscribe - Activer la souscription temps réel
 * @returns {Object} État et fonctions pour gérer les check-ins
 * 
 * @example
 * const { 
 *   checkIns, 
 *   isCheckedIn, 
 *   performCheckIn, 
 *   cancelCheckIn,
 *   loading 
 * } = useRoundCheckIn(tournamentId, myParticipantId);
 * 
 * // Vérifier si check-in fait pour le round 2
 * const hasCheckedIn = isCheckedIn(2);
 * 
 * // Effectuer le check-in pour le round 2
 * await performCheckIn(2);
 */
export function useRoundCheckIn(tournamentId, participantId = null, options = {}) {
  const { subscribe = false } = options;
  
  const [checkIns, setCheckIns] = useState([]);
  const [roundCheckInSettings, setRoundCheckInSettings] = useState({
    enabled: false,
    deadlineMinutes: 15
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Charge les check-ins existants
   */
  const loadCheckIns = useCallback(async () => {
    if (!tournamentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('round_checkins')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true });
      
      if (participantId) {
        query = query.eq('participant_id', participantId);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setCheckIns(data || []);
    } catch (err) {
      console.error('[useRoundCheckIn] Erreur loadCheckIns:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, participantId]);

  /**
   * Charge les paramètres de check-in du tournoi
   */
  const loadSettings = useCallback(async () => {
    if (!tournamentId) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('tournaments')
        .select('round_checkin_enabled, round_checkin_deadline_minutes')
        .eq('id', tournamentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      setRoundCheckInSettings({
        enabled: data?.round_checkin_enabled || false,
        deadlineMinutes: data?.round_checkin_deadline_minutes || 15
      });
    } catch (err) {
      console.error('[useRoundCheckIn] Erreur loadSettings:', err);
    }
  }, [tournamentId]);

  /**
   * Vérifie si un participant a fait son check-in pour un round donné
   * 
   * @param {number} roundNumber - Numéro du round
   * @param {string} pId - ID du participant (utilise participantId par défaut)
   * @returns {boolean}
   */
  const isCheckedIn = useCallback((roundNumber, pId = participantId) => {
    return checkIns.some(
      c => c.round_number === roundNumber && c.participant_id === pId
    );
  }, [checkIns, participantId]);

  /**
   * Récupère le check-in d'un participant pour un round
   * 
   * @param {number} roundNumber - Numéro du round
   * @param {string} pId - ID du participant
   * @returns {Object|null}
   */
  const getCheckIn = useCallback((roundNumber, pId = participantId) => {
    return checkIns.find(
      c => c.round_number === roundNumber && c.participant_id === pId
    ) || null;
  }, [checkIns, participantId]);

  /**
   * Effectue le check-in pour un round
   * 
   * @param {number} roundNumber - Numéro du round
   * @param {string} pId - ID du participant (utilise participantId par défaut)
   * @returns {Promise<boolean>} Succès de l'opération
   */
  const performCheckIn = useCallback(async (roundNumber, pId = participantId) => {
    if (!tournamentId || !pId) {
      toast.error("Impossible de faire le check-in: données manquantes");
      return false;
    }

    if (isCheckedIn(roundNumber, pId)) {
      toast.info("Vous avez déjà fait votre check-in pour ce round");
      return true;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('round_checkins')
        .insert([{
          tournament_id: tournamentId,
          participant_id: pId,
          round_number: roundNumber,
          checked_in_by: user?.id || null
        }]);

      if (insertError) {
        if (insertError.code === '23505') {
          // Violation de contrainte unique - déjà check-in
          toast.info("Check-in déjà effectué");
          return true;
        }
        throw insertError;
      }

      toast.success(`✅ Check-in Round ${roundNumber} confirmé !`);
      await loadCheckIns();
      return true;
    } catch (err) {
      console.error('[useRoundCheckIn] Erreur performCheckIn:', err);
      toast.error("Erreur lors du check-in: " + err.message);
      return false;
    }
  }, [tournamentId, participantId, isCheckedIn, loadCheckIns]);

  /**
   * Annule le check-in d'un participant (admin uniquement)
   * 
   * @param {number} roundNumber - Numéro du round
   * @param {string} pId - ID du participant
   * @returns {Promise<boolean>}
   */
  const cancelCheckIn = useCallback(async (roundNumber, pId = participantId) => {
    if (!tournamentId || !pId) {
      toast.error("Impossible d'annuler le check-in: données manquantes");
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('round_checkins')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('participant_id', pId)
        .eq('round_number', roundNumber);

      if (deleteError) throw deleteError;

      toast.success(`Check-in Round ${roundNumber} annulé`);
      await loadCheckIns();
      return true;
    } catch (err) {
      console.error('[useRoundCheckIn] Erreur cancelCheckIn:', err);
      toast.error("Erreur: " + err.message);
      return false;
    }
  }, [tournamentId, participantId, loadCheckIns]);

  /**
   * Récupère tous les check-ins d'un round
   * 
   * @param {number} roundNumber - Numéro du round
   * @returns {Array}
   */
  const getCheckInsForRound = useCallback((roundNumber) => {
    return checkIns.filter(c => c.round_number === roundNumber);
  }, [checkIns]);

  /**
   * Compte le nombre de check-ins pour un round
   * 
   * @param {number} roundNumber - Numéro du round
   * @returns {number}
   */
  const getCheckInCount = useCallback((roundNumber) => {
    return checkIns.filter(c => c.round_number === roundNumber).length;
  }, [checkIns]);

  // Chargement initial
  useEffect(() => {
    loadCheckIns();
    loadSettings();
  }, [loadCheckIns, loadSettings]);

  // Souscription temps réel
  useEffect(() => {
    if (!subscribe || !tournamentId) return;

    const channel = supabase
      .channel(`round-checkins-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_checkins',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          loadCheckIns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subscribe, tournamentId, loadCheckIns]);

  return {
    // État
    checkIns,
    roundCheckInSettings,
    loading,
    error,
    
    // Fonctions de vérification
    isCheckedIn,
    getCheckIn,
    getCheckInsForRound,
    getCheckInCount,
    
    // Actions
    performCheckIn,
    cancelCheckIn,
    refetch: loadCheckIns
  };
}

export default useRoundCheckIn;
