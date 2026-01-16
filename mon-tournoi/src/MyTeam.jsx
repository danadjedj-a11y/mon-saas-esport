import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth } from './shared/hooks';
import { useTeam } from './features/teams/hooks/useTeam';
import { supabase } from './supabaseClient';
import InvitePlayerModal from './components/InvitePlayerModal';
import { sendTeamInvitation, getPendingInvitations } from './shared/services/api/teams';
import { notifyTeamInvitation } from './notificationUtils';
import { sendTeamInvitationEmail } from './shared/services/emailService';
import { Card, Badge, Button } from './shared/components/ui';
import MyTeamErrorBoundary from './shared/components/ErrorBoundary/MyTeamErrorBoundary';

export default function MyTeam() {
  const navigate = useNavigate();
  const { session } = useAuth();
  
  // États pour toutes les équipes
  const [allTeams, setAllTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState('player');

  // Utiliser useTeam pour l'équipe sélectionnée
  const {
    team: currentTeam,
    members,
    loading: teamLoading,
    error: teamError,
    refetch: _refetchTeam,
    removeMember,
    updateTeam,
    updateMemberRole,
    isCaptain,
    canManageMembers,
  } = useTeam(selectedTeamId, {
    enabled: !!selectedTeamId,
    subscribe: true,
    currentUserId: session?.user?.id,
  });

  // Gestion d'erreur pour le chargement de l'équipe
  useEffect(() => {
    if (teamError) {
      console.error('Erreur chargement équipe:', teamError);
      // Ne pas afficher de toast car l'ErrorBoundary gère l'affichage
    }
  }, [teamError]);

  // Calculer si l'utilisateur peut gérer les membres (inviter/exclure)
  const canManage = isCaptain || canManageMembers(currentUserRole);

  // Charger toutes les équipes de l'utilisateur
  const fetchAllMyTeams = useCallback(async () => {
    if (!session?.user?.id) {
      setTeamsLoading(false);
      return;
    }

    try {
      // 1. Récupérer les équipes où je suis CAPITAINE
      const { data: captainTeams, error: captainError } = await supabase
        .from('teams')
        .select('*')
        .eq('captain_id', session.user.id)
        .order('created_at', { ascending: true });

      if (captainError) {
        console.error('Erreur chargement équipes capitaine:', captainError);
      }

      // 2. Récupérer les équipes où je suis MEMBRE
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', session.user.id);

      if (memberError) {
        console.error('Erreur chargement membres:', memberError);
      }

      let memberTeams = [];
      if (memberData && memberData.length > 0) {
        const ids = memberData.map(m => m.team_id).filter(Boolean);
        if (ids.length > 0) {
          const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('*')
            .in('id', ids)
            .order('created_at', { ascending: true });
          
          if (teamsError) {
            console.error('Erreur chargement équipes membres:', teamsError);
          }
          memberTeams = teams || [];
        }
      }

      // 3. Fusionner les deux listes (en évitant les doublons)
      const mergedTeams = [...(captainTeams || []), ...memberTeams].filter(Boolean);
      const uniqueTeams = Array.from(new Map(mergedTeams.map(item => [item.id, item])).values());

      setAllTeams(uniqueTeams);
    } catch (error) {
      console.error('Erreur chargement équipes:', error);
      // Toast seulement si c'est une erreur réseau/API, pas une erreur fatale
      if (error.message && !error.message.includes('lexical declaration')) {
        toast.error('Erreur lors du chargement des équipes');
      }
    } finally {
      setTeamsLoading(false);
    }
  }, [session]);

  // Charger les équipes au montage
  useEffect(() => {
    fetchAllMyTeams();
  }, [fetchAllMyTeams]);

  // Sélectionner la première équipe par défaut quand les équipes sont chargées
  useEffect(() => {
    if (allTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(allTeams[0].id);
    }
  }, [allTeams.length, selectedTeamId]);

  // Charger les invitations en attente quand l'équipe change
  useEffect(() => {
    if (selectedTeamId) {
      loadPendingInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  const loadPendingInvitations = async () => {
    if (!selectedTeamId) return;
    
    try {
      const invitations = await getPendingInvitations(selectedTeamId);
      setPendingInvitations(invitations || []);
    } catch (error) {
      console.error('Erreur chargement invitations:', error);
      // Ne pas afficher de toast ici pour éviter trop de notifications
    }
  };

  const handleInvitePlayer = async (userId, message) => {
    try {
      setInviting(true);
      
      // Envoyer l'invitation
      await sendTeamInvitation(selectedTeamId, userId, session.user.id, message);
      
      // Récupérer les infos de l'équipe et de l'utilisateur invitant
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
      
      // Récupérer les infos de l'utilisateur invité
      const { data: invitedUserData } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', userId)
        .single();
      
      // Envoyer la notification in-app
      await notifyTeamInvitation(
        userId,
        selectedTeamId,
        currentTeam.name,
        profileData?.username || session.user.email
      );
      
      // Envoyer l'email d'invitation
      // L'email est stocké dans profiles.email (synchronisé depuis auth.users)
      const recipientEmail = invitedUserData?.email;
      
      if (recipientEmail) {
        try {
          await sendTeamInvitationEmail({
            recipientEmail: recipientEmail,
            recipientName: invitedUserData.username,
            teamName: currentTeam.name,
            inviterName: profileData?.username || 'Un capitaine',
            message: message,
            invitationUrl: `${window.location.origin}/player/invitations`
          });
          console.log('✅ Email envoyé à:', recipientEmail);
        } catch (emailError) {
          console.warn('Email non envoyé:', emailError);
        }
      } else {
        console.warn('⚠️ Pas d\'email trouvé pour le joueur invité');
      }
      
      toast.success('✅ Invitation envoyée avec succès !');
      setShowInviteModal(false);
      
      // Recharger les invitations
      await loadPendingInvitations();
    } catch (error) {
      console.error('Erreur envoi invitation:', error);
      toast.error('Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleTeamSwitch = (teamId) => {
    setSelectedTeamId(teamId);
  };

  // Mettre à jour le rôle de l'utilisateur actuel quand les membres changent
  useEffect(() => {
    if (currentTeam && members.length > 0 && session?.user?.id) {
      const myMember = members.find(m => m.user_id === session.user.id);
      if (myMember) {
        // Si on est le capitaine
        if (currentTeam.captain_id === session.user.id) {
          setCurrentUserRole('captain');
        } else {
          setCurrentUserRole(myMember.role || 'player');
        }
      }
    }
  }, [members, currentTeam, session]);

  const uploadLogo = async (event) => {
    if (!currentTeam || !isCaptain) return;
    
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Sélectionne une image !');

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTeam.id}-${Date.now()}.${fileExt}`;

      // Upload
      const { error: uploadError } = await supabase.storage.from('team-logos').upload(fileName, file);
      if (uploadError) throw uploadError;

      // URL Publique
      const { data: { publicUrl } } = supabase.storage.from('team-logos').getPublicUrl(fileName);

      // Update DB via useTeam hook
      const { error: updateError } = await updateTeam({ logo_url: publicUrl });
      if (updateError) throw updateError;

      // Mettre à jour aussi la liste globale
      setAllTeams(prev => prev.map(t => t.id === currentTeam.id ? { ...t, logo_url: publicUrl } : t));
      
      toast.success("Logo mis à jour !");
    } catch (error) {
      toast.error('Erreur : ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const copyInviteLink = () => {
    if (!currentTeam) return;
    const link = `${window.location.origin}/join-team/${currentTeam.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien d'invitation copié !");
  };

  const handleKickMember = async (userId) => {
    if (!confirm("Virer ce joueur ?")) return;
    const { error } = await removeMember(userId);
    if (error) {
      toast.error('Erreur : ' + error.message);
    } else {
      toast.success('Joueur exclu avec succès');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    const { error } = await updateMemberRole(userId, newRole);
    if (error) {
      toast.error('Erreur : ' + error.message);
    } else {
      toast.success('Rôle mis à jour avec succès');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'captain':
        return 'bg-fluky-accent-orange text-white';
      case 'manager':
        return 'bg-blue-500 text-white';
      case 'coach':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'captain':
        return 'CAPITAINE';
      case 'manager':
        return 'MANAGER';
      case 'coach':
        return 'COACH';
      default:
        return 'JOUEUR';
    }
  };

  const loading = teamsLoading || teamLoading;

  // Si on charge les équipes ou si on charge l'équipe sélectionnée
  if (loading) return (
    <MyTeamErrorBoundary>
      <DashboardLayout session={session}>
        <div className="text-fluky-text font-body text-center py-20">Chargement...</div>
      </DashboardLayout>
    </MyTeamErrorBoundary>
  );

  // Si pas d'équipes du tout
  if (allTeams.length === 0) return (
    <MyTeamErrorBoundary>
      <DashboardLayout session={session}>
        <div className="text-center py-20">
          <h2 className="font-display text-4xl text-fluky-secondary mb-6" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>Tu n'as pas encore d'équipe.</h2>
          <button 
            type="button"
            onClick={() => navigate('/create-team')} 
            className="px-8 py-4 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display text-base uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50"
          >
            Créer une Team
          </button>
        </div>
      </DashboardLayout>
    </MyTeamErrorBoundary>
  );

  // Si on a des équipes mais pas d'équipe sélectionnée OU si l'équipe est en cours de chargement
  if (allTeams.length > 0 && (!selectedTeamId || !currentTeam)) {
    return (
      <MyTeamErrorBoundary>
        <DashboardLayout session={session}>
          <div className="text-fluky-text font-body text-center py-20">Chargement de l'équipe...</div>
        </DashboardLayout>
      </MyTeamErrorBoundary>
    );
  }

  return (
    <MyTeamErrorBoundary>
      <DashboardLayout session={session}>
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            {/* SÉLECTEUR D'ÉQUIPE (Visible seulement si plusieurs équipes) */}
            {allTeams.length > 1 && (
              <select 
                value={selectedTeamId || ''} 
                onChange={(e) => handleTeamSwitch(e.target.value)}
                className="px-4 py-2 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              >
                {allTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>
                ))}
              </select>
            )}
          </div>
        
        <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-8">
        
        {/* EN-TÊTE AVEC LOGO */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative w-20 h-20 flex-shrink-0">
            <img 
              src={currentTeam.logo_url || `https://ui-avatars.com/api/?name=${currentTeam.tag}&background=random&size=128`} 
              alt="Team Logo" 
              className="w-full h-full rounded-xl object-cover border-2 border-fluky-secondary"
            />
            
            {isCaptain && (
              <>
                <label 
                  htmlFor="logo-upload" 
                  className={`absolute -bottom-1 -right-1 bg-fluky-secondary text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-2 border-fluky-bg font-bold text-lg transition-all duration-300 hover:bg-fluky-primary hover:scale-110`}
                >
                  {uploading ? '⏳' : '+'}
                </label>
                <input 
                  type="file" 
                  id="logo-upload" 
                  accept="image/*" 
                  onChange={uploadLogo} 
                  disabled={uploading}
                  className="hidden" 
                />
              </>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <h1 className="font-display text-3xl text-fluky-text mb-1 truncate">{currentTeam.name}</h1>
            <span className="text-lg text-fluky-secondary font-bold font-body">[{currentTeam.tag}]</span>
          </div>

          <div className="flex gap-2">
            <button 
              type="button"
              onClick={copyInviteLink} 
              className="px-4 py-2 bg-transparent border-2 border-fluky-primary text-fluky-text rounded-lg font-display font-bold whitespace-nowrap uppercase tracking-wide transition-all duration-300 hover:bg-fluky-primary hover:border-fluky-secondary"
            >
              🔗 Lien
            </button>
            {canManage && (
              <button 
                type="button"
                onClick={() => setShowInviteModal(true)} 
                className="px-4 py-2 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display font-bold whitespace-nowrap uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50"
              >
                👥 Inviter Joueur
              </button>
            )}
          </div>
        </div>

        {/* INVITATIONS EN ATTENTE */}
        {canManage && pendingInvitations.length > 0 && (
          <div className="mb-6">
            <h3 className="border-b-2 border-fluky-secondary pb-3 font-display text-xl text-fluky-secondary mb-4" style={{ textShadow: '0 0 10px rgba(193, 4, 104, 0.5)' }}>
              Invitations envoyées ({pendingInvitations.length})
            </h3>
            <div className="space-y-2">
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="bg-black/30 border border-fluky-primary/30 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={inv.invited_user?.avatar_url || `https://ui-avatars.com/api/?name=${inv.invited_user?.username || 'User'}`} 
                      className="w-6 h-6 rounded-full object-cover border border-fluky-secondary" 
                      alt="" 
                    />
                    <span className="text-sm font-body text-fluky-text">
                      {inv.invited_user?.username || 'Joueur'}
                    </span>
                  </div>
                  <Badge variant="warning" size="sm">En attente</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTE DES MEMBRES */}
        <h3 className="border-b-2 border-fluky-secondary pb-3 font-display text-2xl text-fluky-secondary mb-6" style={{ textShadow: '0 0 10px rgba(193, 4, 104, 0.5)' }}>Roster ({members.length})</h3>
        <ul className="list-none p-0">
          {members.map(m => {
            const isCurrentUser = m.user_id === session.user.id;
            const memberRole = m.user_id === currentTeam.captain_id ? 'captain' : (m.role || 'player');
            
            return (
              <li key={m.id} className="flex justify-between items-center py-4 border-b border-white/5">
                <div className="flex items-center gap-3 flex-1">
                  <img 
                    src={m.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${m.profiles?.username || 'User'}`} 
                    className="w-8 h-8 rounded-full object-cover border-2 border-fluky-secondary" 
                    alt="" 
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-body ${isCurrentUser ? 'text-fluky-secondary' : 'text-fluky-text'}`}>
                        {m.profiles?.username || 'Joueur sans pseudo'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-body ${getRoleBadgeColor(memberRole)}`}>
                        {getRoleLabel(memberRole)}
                      </span>
                    </div>
                    {/* Dropdown pour changer le rôle (uniquement capitaine et non pour lui-même) */}
                    {isCaptain && !isCurrentUser && memberRole !== 'captain' && (
                      <div className="mt-1">
                        <select
                          value={memberRole}
                          onChange={(e) => handleChangeRole(m.user_id, e.target.value)}
                          className="px-2 py-1 text-xs bg-black/50 border border-fluky-primary/50 text-fluky-text rounded font-body transition-all duration-200 hover:border-fluky-secondary focus:outline-none focus:border-fluky-secondary"
                        >
                          <option value="player">Joueur</option>
                          <option value="coach">Coach</option>
                          <option value="manager">Manager</option>
                        </select>
                        <span className="ml-2 text-xs text-fluky-text/50 font-body">
                          {canManageMembers(memberRole) && '🔑 Peut inviter/exclure'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {canManage && !isCurrentUser && (
                  <button 
                    type="button"
                    onClick={() => handleKickMember(m.user_id)} 
                    className="px-3 py-1 bg-transparent border-2 border-fluky-primary text-fluky-text rounded-lg font-display text-xs uppercase tracking-wide transition-all duration-300 hover:bg-fluky-primary hover:border-fluky-secondary"
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
        excludedUserIds={members.map(m => m.user_id)}
        loading={inviting}
      />
    </DashboardLayout>
    </MyTeamErrorBoundary>
  );
}