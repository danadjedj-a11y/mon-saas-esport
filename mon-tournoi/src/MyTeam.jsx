import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';

export default function MyTeam({ session, supabase }) {
  const [allTeams, setAllTeams] = useState([]); // Liste de toutes mes équipes
  const [currentTeam, setCurrentTeam] = useState(null); // L'équipe affichée actuellement
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) fetchAllMyTeams();
  }, [session]);

  // Si on change d'équipe via le menu déroulant, on charge ses membres
  useEffect(() => {
    if (currentTeam) {
      fetchMembers(currentTeam.id);
    }
  }, [currentTeam]);

  const fetchAllMyTeams = async () => {
    // 1. Récupérer les équipes où je suis CAPITAINE
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('captain_id', session.user.id)
      .order('created_at', { ascending: true }); // On fixe l'ordre pour éviter que ça bouge

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

    // 3. Fusionner les deux listes (en évitant les doublons si je suis capitaine et membre)
    // On utilise un Map pour filtrer par ID unique
    const mergedTeams = [...(captainTeams || []), ...memberTeams];
    const uniqueTeams = Array.from(new Map(mergedTeams.map(item => [item.id, item])).values());

    setAllTeams(uniqueTeams);

    // 4. Sélectionner la première équipe par défaut
    if (uniqueTeams.length > 0) {
      setCurrentTeam(uniqueTeams[0]);
    } else {
      setLoading(false); // Pas d'équipe
    }
  };

  const fetchMembers = async (teamId) => {
    const { data } = await supabase
        .from('team_members')
        .select('*, profiles(username, avatar_url)')
        .eq('team_id', teamId);
    setMembers(data || []);
    setLoading(false);
  };

  const handleTeamSwitch = (teamId) => {
    const selected = allTeams.find(t => t.id === teamId);
    setCurrentTeam(selected);
  };

  const uploadLogo = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Sélectionne une image !');

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTeam.id}-${Date.now()}.${fileExt}`; // Nom unique avec timestamp

      // Upload
      const { error: uploadError } = await supabase.storage.from('team-logos').upload(fileName, file);
      if (uploadError) throw uploadError;

      // URL Publique
      const { data: { publicUrl } } = supabase.storage.from('team-logos').getPublicUrl(fileName);

      // Update DB
      const { error: updateError } = await supabase
        .from('teams')
        .update({ logo_url: publicUrl })
        .eq('id', currentTeam.id);

      if (updateError) throw updateError;

      // Update Local State
      setCurrentTeam({ ...currentTeam, logo_url: publicUrl });
      
      // Mettre à jour aussi la liste globale pour que le logo change dans le sélecteur si besoin
      setAllTeams(prev => prev.map(t => t.id === currentTeam.id ? { ...t, logo_url: publicUrl } : t));
      
      toast.success("Logo mis à jour !");

    } catch (error) {
      toast.error('Erreur : ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join-team/${currentTeam.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien d'invitation copié !");
  };

  const kickMember = async (userId) => {
    if (!confirm("Virer ce joueur ?")) return;
    await supabase.from('team_members').delete().match({ team_id: currentTeam.id, user_id: userId });
    fetchMembers(currentTeam.id); // Rafraîchir juste la liste des membres
  };

  if (loading) return (
    <DashboardLayout session={session}>
      <div className="text-fluky-text font-body text-center py-20">Chargement...</div>
    </DashboardLayout>
  );

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

  const isCaptain = currentTeam?.captain_id === session.user.id;

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          {/* SÉLECTEUR D'ÉQUIPE (Visible seulement si plusieurs équipes) */}
          {allTeams.length > 1 && (
            <select 
              value={currentTeam.id} 
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
              
              {isCaptain && m.user_id !== session.user.id && (
                <button 
                  type="button"
                  onClick={() => kickMember(m.user_id)} 
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