/**
 * MY TEAM - Version Convex
 * 
 * Gestion des équipes utilisant Convex au lieu de Supabase
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import InvitePlayerModal from './components/InvitePlayerModal';
import { Card, Badge, Button, GradientButton, Avatar } from './shared/components/ui';
import MyTeamErrorBoundary from './shared/components/ErrorBoundary/MyTeamErrorBoundary';

export default function MyTeam() {
  const navigate = useNavigate();
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();

  // Données Convex
  const convexUser = useQuery(api.users.getCurrent);
  const allTeams = useQuery(
    api.teams.listByUser,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // États locaux
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Mutations Convex
  const inviteMember = useMutation(api.teamsMutations.inviteMember);
  const removeMember = useMutation(api.teamsMutations.removeMember);
  const updateMemberRole = useMutation(api.teamsMutations.updateMemberRole);
  const updateTeam = useMutation(api.teamsMutations.update);

  // Sélectionner automatiquement la première équipe
  useEffect(() => {
    if (allTeams && allTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(allTeams[0]._id);
    }
  }, [allTeams, selectedTeamId]);

  // Récupérer les données de l'équipe sélectionnée
  const currentTeam = useQuery(
    api.teams.getById,
    selectedTeamId ? { teamId: selectedTeamId } : "skip"
  );

  // Récupérer les membres de l'équipe
  const members = useQuery(
    api.teams.getMembers,
    selectedTeamId ? { teamId: selectedTeamId } : "skip"
  );

  // Récupérer les invitations en attente
  const pendingInvitations = useQuery(
    api.teams.getPendingInvitations,
    selectedTeamId ? { teamId: selectedTeamId } : "skip"
  );

  // Calculer si l'utilisateur est capitaine
  const isCaptain = useMemo(() => {
    if (!currentTeam || !convexUser) return false;
    return currentTeam.captainId === convexUser._id;
  }, [currentTeam, convexUser]);

  // Role de l'utilisateur actuel dans l'équipe
  const currentUserRole = useMemo(() => {
    if (!members || !convexUser) return 'player';
    if (isCaptain) return 'captain';
    const myMember = members.find(m => m.userId === convexUser._id);
    return myMember?.role || 'player';
  }, [members, convexUser, isCaptain]);

  const canManage = isCaptain || ['manager', 'coach'].includes(currentUserRole);

  // Handlers
  const handleInvitePlayer = async (userId, message) => {
    if (!selectedTeamId) return;

    try {
      setInviting(true);
      await inviteMember({
        teamId: selectedTeamId,
        inviteeId: userId,
        message,
      });
      toast.success('✅ Invitation envoyée avec succès !');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Erreur envoi invitation:', error);
      toast.error('Erreur lors de l\'envoi de l\'invitation: ' + error.message);
    } finally {
      setInviting(false);
    }
  };

  const handleTeamSwitch = (teamId) => {
    setSelectedTeamId(teamId);
  };

  const copyInviteLink = () => {
    if (!currentTeam) return;
    const link = `${window.location.origin}/join-team/${currentTeam._id}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien d'invitation copié !");
  };

  const handleKickMember = async (userId) => {
    if (!confirm("Virer ce joueur ?")) return;
    try {
      await removeMember({
        teamId: selectedTeamId,
        userId,
      });
      toast.success('Joueur exclu avec succès');
    } catch (error) {
      toast.error('Erreur : ' + error.message);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await updateMemberRole({
        teamId: selectedTeamId,
        userId,
        role: newRole,
      });
      toast.success('Rôle mis à jour avec succès');
    } catch (error) {
      toast.error('Erreur : ' + error.message);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'captain': return 'bg-orange-500 text-white';
      case 'manager': return 'bg-blue-500 text-white';
      case 'coach': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'captain': return 'CAPITAINE';
      case 'manager': return 'MANAGER';
      case 'coach': return 'COACH';
      default: return 'JOUEUR';
    }
  };

  // Chargement
  const loading = !isLoaded || allTeams === undefined || (selectedTeamId && currentTeam === undefined);

  if (loading) {
    return (
      <MyTeamErrorBoundary>
        <DashboardLayout>
          <div className="text-white font-body text-center py-20">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            Chargement...
          </div>
        </DashboardLayout>
      </MyTeamErrorBoundary>
    );
  }

  // Pas d'équipes
  if (!allTeams || allTeams.length === 0) {
    return (
      <MyTeamErrorBoundary>
        <DashboardLayout>
          <div className="text-center py-20">
            <h2 className="font-display text-4xl text-cyan-400 mb-6" style={{ textShadow: '0 0 15px rgba(139, 92, 246, 0.5)' }}>
              Tu n'as pas encore d'équipe.
            </h2>
            <GradientButton onClick={() => navigate('/create-team')} size="lg">
              Créer une Team
            </GradientButton>
          </div>
        </DashboardLayout>
      </MyTeamErrorBoundary>
    );
  }

  // Attente de l'équipe sélectionnée
  if (!currentTeam) {
    return (
      <MyTeamErrorBoundary>
        <DashboardLayout>
          <div className="text-white font-body text-center py-20">Chargement de l'équipe...</div>
        </DashboardLayout>
      </MyTeamErrorBoundary>
    );
  }

  const membersList = members || [];
  const invitationsList = pendingInvitations || [];

  return (
    <MyTeamErrorBoundary>
      <DashboardLayout>
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            {/* SÉLECTEUR D'ÉQUIPE */}
            {allTeams.length > 1 && (
              <select
                value={selectedTeamId || ''}
                onChange={(e) => handleTeamSwitch(e.target.value)}
                className="px-4 py-2 bg-black/50 border-2 border-violet-500 text-white rounded-lg font-body text-base transition-all duration-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20"
              >
                {allTeams.map(t => (
                  <option key={t._id} value={t._id}>{t.name} [{t.tag}]</option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-8">

            {/* EN-TÊTE AVEC LOGO */}
            <div className="flex items-center gap-5 mb-8">
              <div className="relative w-20 h-20 flex-shrink-0">
                <Avatar
                  src={currentTeam.logoUrl}
                  name={currentTeam.tag}
                  size="xl"
                />
              </div>

              <div className="flex-1 overflow-hidden">
                <h1 className="font-display text-3xl text-white mb-1 truncate">{currentTeam.name}</h1>
                <span className="text-lg text-cyan-400 font-bold font-body">[{currentTeam.tag}]</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="px-4 py-2 bg-transparent border-2 border-violet-500 text-white rounded-lg font-display font-bold whitespace-nowrap uppercase tracking-wide transition-all duration-300 hover:bg-violet-600 hover:border-cyan-500"
                >
                  🔗 Lien
                </button>
                {canManage && (
                  <GradientButton onClick={() => setShowInviteModal(true)}>
                    👥 Inviter Joueur
                  </GradientButton>
                )}
              </div>
            </div>

            {/* INVITATIONS EN ATTENTE */}
            {canManage && invitationsList.length > 0 && (
              <div className="mb-6">
                <h3 className="border-b-2 border-cyan-500 pb-3 font-display text-xl text-cyan-400 mb-4" style={{ textShadow: '0 0 10px rgba(139, 92, 246, 0.5)' }}>
                  Invitations envoyées ({invitationsList.length})
                </h3>
                <div className="space-y-2">
                  {invitationsList.map((inv) => (
                    <div key={inv._id} className="bg-black/30 border border-violet-500/30 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={inv.invitee?.avatarUrl}
                          name={inv.invitee?.username || 'User'}
                          size="sm"
                        />
                        <span className="text-sm font-body text-white">
                          {inv.invitee?.username || 'Joueur'}
                        </span>
                      </div>
                      <Badge variant="warning" size="sm">En attente</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LISTE DES MEMBRES */}
            <h3 className="border-b-2 border-cyan-500 pb-3 font-display text-2xl text-cyan-400 mb-6" style={{ textShadow: '0 0 10px rgba(139, 92, 246, 0.5)' }}>
              Roster ({membersList.length})
            </h3>
            <ul className="list-none p-0">
              {membersList.map(m => {
                const isCurrentUser = m.userId === convexUser?._id;
                const memberRole = m.userId === currentTeam.captainId ? 'captain' : (m.role || 'player');

                return (
                  <li key={m._id} className="flex justify-between items-center py-4 border-b border-white/5">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar
                        src={m.user?.avatarUrl}
                        name={m.user?.username || 'User'}
                        size="sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-body ${isCurrentUser ? 'text-cyan-400' : 'text-white'}`}>
                            {m.user?.username || 'Joueur sans pseudo'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded font-body ${getRoleBadgeColor(memberRole)}`}>
                            {getRoleLabel(memberRole)}
                          </span>
                        </div>
                        {/* Dropdown pour changer le rôle */}
                        {isCaptain && !isCurrentUser && memberRole !== 'captain' && (
                          <div className="mt-1">
                            <select
                              value={memberRole}
                              onChange={(e) => handleChangeRole(m.userId, e.target.value)}
                              className="px-2 py-1 text-xs bg-black/50 border border-violet-500/50 text-white rounded font-body transition-all duration-200 hover:border-cyan-500 focus:outline-none focus:border-cyan-500"
                            >
                              <option value="player">Joueur</option>
                              <option value="coach">Coach</option>
                              <option value="manager">Manager</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {canManage && !isCurrentUser && memberRole !== 'captain' && (
                      <button
                        type="button"
                        onClick={() => handleKickMember(m.userId)}
                        className="px-3 py-1 bg-transparent border-2 border-violet-500 text-white rounded-lg font-display text-xs uppercase tracking-wide transition-all duration-300 hover:bg-violet-600 hover:border-cyan-500"
                      >
                        Exclure
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* MODAL D'INVITATION */}
        <InvitePlayerModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvitePlayer}
          excludedUserIds={membersList.map(m => m.userId)}
          loading={inviting}
        />
      </DashboardLayout>
    </MyTeamErrorBoundary>
  );
}