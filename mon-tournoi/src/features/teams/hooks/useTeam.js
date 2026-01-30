import { useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

/**
 * Hook personnalisé pour gérer une équipe
 * Utilise Convex pour la réactivité temps réel
 */
export const useTeam = (teamId, options = {}) => {
  const { enabled = true, currentUserId, isAdmin = false } = options;

  // Récupérer l'équipe via Convex (temps réel automatique)
  const team = useQuery(
    api.teams.getById,
    enabled && teamId ? { teamId } : "skip"
  );

  // Récupérer les membres de l'équipe
  const members = useQuery(
    api.teams.getMembers,
    enabled && teamId ? { teamId } : "skip"
  ) || [];

  // Loading state
  const loading = enabled && teamId && team === undefined;
  const error = null; // Convex gère les erreurs internement

  // Mutations Convex
  const addMemberMutation = useMutation(api.teamsMutations.addMember);
  const removeMemberMutation = useMutation(api.teamsMutations.removeMember);
  const updateTeamMutation = useMutation(api.teamsMutations.update);
  const updateMemberRoleMutation = useMutation(api.teamsMutations.updateMemberRole);

  // Fonction pour ajouter un membre
  const addMember = useCallback(async (userId) => {
    if (!teamId) return { error: 'No team ID' };

    try {
      const data = await addMemberMutation({ teamId, userId, role: 'member' });
      return { data, error: null };
    } catch (err) {
      console.error('Erreur ajout membre:', err);
      return { data: null, error: err };
    }
  }, [teamId, addMemberMutation]);

  // Fonction pour retirer un membre
  const removeMember = useCallback(async (userId) => {
    if (!teamId) return { error: 'No team ID' };

    try {
      await removeMemberMutation({ teamId, userId });
      return { error: null };
    } catch (err) {
      console.error('Erreur retrait membre:', err);
      return { error: err };
    }
  }, [teamId, removeMemberMutation]);

  // Fonction pour mettre à jour l'équipe
  const updateTeam = useCallback(async (updates) => {
    if (!teamId) return { error: 'No team ID' };

    try {
      const data = await updateTeamMutation({ teamId, ...updates });
      return { data, error: null };
    } catch (err) {
      console.error('Erreur mise à jour équipe:', err);
      return { data: null, error: err };
    }
  }, [teamId, updateTeamMutation]);

  // Fonction pour mettre à jour le rôle d'un membre
  const updateMemberRole = useCallback(async (userId, newRole) => {
    if (!teamId) return { error: 'No team ID' };

    // Vérifier que l'utilisateur actuel est le capitaine
    const userIsCaptain = team?.captainId === currentUserId;
    if (!userIsCaptain && !isAdmin) {
      return { error: 'Seul le capitaine peut changer les rôles' };
    }

    // Vérifier que le rôle est valide
    const validRoles = ['player', 'coach', 'manager', 'member'];
    if (!validRoles.includes(newRole)) {
      return { error: 'Rôle invalide' };
    }

    try {
      const data = await updateMemberRoleMutation({ teamId, userId, role: newRole });
      return { data, error: null };
    } catch (err) {
      console.error('Erreur mise à jour rôle membre:', err);
      return { data: null, error: err };
    }
  }, [teamId, team?.captainId, currentUserId, isAdmin, updateMemberRoleMutation]);

  // Fonction pour forcer un refresh (no-op avec Convex car réactif)
  const refetch = useCallback(() => {
    // No-op: Convex queries are automatically reactive
  }, []);

  // Helpers
  const isCaptain = team?.captainId === currentUserId;
  const isMember = members.some(m => m.userId === currentUserId);
  const canEdit = isCaptain || isAdmin;
  
  // Helper pour vérifier si un membre a les permissions pour inviter/exclure
  const canManageMembers = useCallback((memberRole) => {
    return ['captain', 'manager', 'coach'].includes(memberRole);
  }, []);

  return {
    team,
    members,
    loading,
    error,
    refetch,
    addMember,
    removeMember,
    updateTeam,
    updateMemberRole,
    // Helpers
    isCaptain,
    isMember,
    canEdit,
    canManageMembers,
  };
};

export default useTeam;
