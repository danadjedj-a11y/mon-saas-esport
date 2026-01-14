import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth } from './shared/hooks';
import { useTeam } from './shared/hooks';
import { supabase } from './supabaseClient';

export default function MyTeam() {
  const navigate = useNavigate();
  const { session } = useAuth();
  
  // États pour toutes les équipes
  const [allTeams, setAllTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Utiliser useTeam pour l'équipe sélectionnée
  const {
    team: currentTeam,
    members,
    loading: teamLoading,
    refetch: refetchTeam,
    removeMember,
    updateTeam,
    isCaptain,
  } = useTeam(selectedTeamId, {
    enabled: !!selectedTeamId,
    subscribe: true,
    currentUserId: session?.user?.id,
  });

  // Charger toutes les équipes de l'utilisateur
  const fetchAllMyTeams = useCallback(async () => {
    if (!session?.user?.id) {
      setTeamsLoading(false);
      return;
    }

    try {
      // 1. Récupérer les équipes où je suis CAPITAINE
      const { data: captainTeams } = await supabase
        .from('teams')
        .select('*')
        .eq('captain_id', session.user.id)
        .order('created_at', { ascending: true });

      // 2. Récupérer les équipes où je suis MEMBRE
      const { data: memberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', session.user.id);

      let memberTeams = [];
      if (memberData && memberData.length > 0) {
        const ids = memberData.map(m => m.team_id);
        const { data: teams } = await supabase
          .from('teams')
          .select('*')
          .in('id', ids)
          .order('created_at', { ascending: true });
        memberTeams = teams || [];
      }

      // 3. Fusionner les deux listes (en évitant les doublons)
      const mergedTeams = [...(captainTeams || []), ...memberTeams];
      const uniqueTeams = Array.from(new Map(mergedTeams.map(item => [item.id, item])).values());

      setAllTeams(uniqueTeams);
    } catch (error) {
      console.error('Erreur chargement équipes:', error);
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

  const handleTeamSwitch = (teamId) => {
    setSelectedTeamId(teamId);
  };

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

  const loading = teamsLoading || teamLoading;

  // Si on charge les équipes ou si on charge l'équipe sélectionnée
  if (loading) return (
    <DashboardLayout session={session}>
      <div className="text-fluky-text font-body text-center py-20">Chargement...</div>
    </DashboardLayout>
  );

  // Si pas d'équipes du tout
  if (allTeams.length === 0) return (
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
  );

  // Si on a des équipes mais pas d'équipe sélectionnée OU si l'équipe est en cours de chargement
  if (allTeams.length > 0 && (!selectedTeamId || !currentTeam)) {
    return (
      <DashboardLayout session={session}>
        <div className="text-fluky-text font-body text-center py-20">Chargement de l'équipe...</div>
      </DashboardLayout>
    );
  }

  return (
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

          <button 
            type="button"
            onClick={copyInviteLink} 
            className="px-4 py-2 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display font-bold whitespace-nowrap uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50"
          >
            🔗 Inviter
          </button>
        </div>

        {/* LISTE DES MEMBRES */}
        <h3 className="border-b-2 border-fluky-secondary pb-3 font-display text-2xl text-fluky-secondary mb-6" style={{ textShadow: '0 0 10px rgba(193, 4, 104, 0.5)' }}>Roster ({members.length})</h3>
        <ul className="list-none p-0">
          {members.map(m => (
            <li key={m.id} className="flex justify-between items-center py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <img 
                  src={m.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${m.profiles?.username || 'User'}`} 
                  className="w-8 h-8 rounded-full object-cover border-2 border-fluky-secondary" 
                  alt="" 
                />
                <span className={`font-body ${m.user_id === session.user.id ? 'text-fluky-secondary' : 'text-fluky-text'}`}>
                  {m.profiles?.username || 'Joueur sans pseudo'} 
                  {m.role === 'captain' && (
                    <span className="ml-2 text-xs bg-fluky-accent-orange text-white px-2 py-1 rounded font-body">CAPTAIN</span>
                  )}
                </span>
              </div>
              
              {isCaptain && m.user_id !== session?.user?.id && (
                <button 
                  type="button"
                  onClick={() => handleKickMember(m.user_id)} 
                  className="px-3 py-1 bg-transparent border-2 border-fluky-primary text-fluky-text rounded-lg font-display text-xs uppercase tracking-wide transition-all duration-300 hover:bg-fluky-primary hover:border-fluky-secondary"
                >
                  Exclure
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      </div>
    </DashboardLayout>
  );
}