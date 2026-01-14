import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { useSupabaseSubscription } from '../../../shared/hooks';

/**
 * Hook personnalisé pour gérer une équipe
 * Simplifie la logique de chargement, membres, et mises à jour
 */
export const useTeam = (teamId, options = {}) => {
  const { enabled = true, subscribe = true } = options;
  
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(!!teamId); // Commencer à charger si teamId est présent
  const [error, setError] = useState(null);
  
  const fetchVersionRef = useRef(0);
  const fetchTeamRef = useRef(null); // Ref pour stocker fetchTeam pour les callbacks

  // Charger l'équipe
  const fetchTeam = useCallback(async () => {
    if (!teamId) return;

    const currentVersion = ++fetchVersionRef.current;
    setLoading(true);
    setError(null);

    try {
      // Charger l'équipe
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      // Charger les membres
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .eq('team_id', teamId);

      if (membersError) throw membersError;

      // Vérifier si c'est toujours la requête la plus récente
      if (currentVersion !== fetchVersionRef.current) {
        return;
      }

      setTeam(teamData);
      setMembers(membersData || []);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement équipe:', err);
      // Vérifier si c'est toujours la requête la plus récente
      if (currentVersion === fetchVersionRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [teamId, enabled]);

  // Garder une ref à fetchTeam pour l'utiliser dans le callback
  useEffect(() => {
    fetchTeamRef.current = fetchTeam;
  }, [fetchTeam]);

  // Charger au montage ou quand teamId change
  useEffect(() => {
    if (teamId) {
      setLoading(true);
      fetchTeam();
    } else {
      setLoading(false);
      setTeam(null);
    }
  }, [teamId, fetchTeam]);

  // Subscription Realtime pour les mises à jour
  useSupabaseSubscription(
    `team-${teamId}`,
    subscribe ? [
      {
        table: 'teams',
        filter: `id=eq.${teamId}`,
        event: 'UPDATE',
        callback: (payload) => {
          if (payload.new) {
            setTeam((prev) => ({ ...prev, ...payload.new }));
          }
        },
      },
      {
        table: 'teams',
        filter: `id=eq.${teamId}`,
        event: 'DELETE',
        callback: () => {
          setTeam(null);
        },
      },
      {
        table: 'team_members',
        filter: `team_id=eq.${teamId}`,
        event: '*',
        callback: () => {
          if (fetchTeamRef.current) {
            fetchTeamRef.current();
          }
        },
      },
    ] : [],
    { enabled: subscribe && !!teamId }
  );

  // Fonction pour ajouter un membre
  const addMember = useCallback(async (userId) => {
    if (!teamId) return { error: 'No team ID' };

    try {
      const { data, error: addError } = await supabase
        .from('team_members')
        .insert([{ team_id: teamId, user_id: userId }])
        .select()
        .single();

      if (addError) throw addError;

      await fetchTeam(); // Recharger les membres

      return { data, error: null };
    } catch (err) {
      console.error('Erreur ajout membre:', err);
      return { data: null, error: err };
    }
  }, [teamId, fetchTeam]);

  // Fonction pour retirer un membre
  const removeMember = useCallback(async (userId) => {
    if (!teamId) return { error: 'No team ID' };

    try {
      const { error: removeError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (removeError) throw removeError;

      await fetchTeam(); // Recharger les membres

      return { error: null };
    } catch (err) {
      console.error('Erreur retrait membre:', err);
      return { error: err };
    }
  }, [teamId, fetchTeam]);

  // Fonction pour mettre à jour l'équipe
  const updateTeam = useCallback(async (updates) => {
    if (!teamId) return { error: 'No team ID' };

    try {
      const { data, error: updateError } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single();

      if (updateError) throw updateError;

      setTeam(data);

      return { data, error: null };
    } catch (err) {
      console.error('Erreur mise à jour équipe:', err);
      return { data: null, error: err };
    }
  }, [teamId]);

  // Fonction pour forcer un refresh
  const refetch = useCallback(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Helpers
  const isCaptain = team?.captain_id === options.currentUserId;
  const isMember = members.some(m => m.user_id === options.currentUserId);
  const canEdit = isCaptain || options.isAdmin;

  return {
    team,
    members,
    loading,
    error,
    refetch,
    addMember,
    removeMember,
    updateTeam,
    // Helpers
    isCaptain,
    isMember,
    canEdit,
  };
};

export default useTeam;
