import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';

export default function JoinTeam({ session, supabase }) {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTeamInfo = useCallback(async () => {
    const { data } = await supabase.from('teams').select('*').eq('id', teamId).single();
    setTeam(data);
    setLoading(false);
  }, [supabase, teamId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTeamInfo();
  }, [fetchTeamInfo]);

  const handleJoin = async () => {
    if (!session) {
      toast.warning("Connecte-toi d'abord !");
      return;
    }

    const { error } = await supabase
      .from('team_members')
      .insert([{ team_id: teamId, user_id: session.user.id }]);

    if (error) {
      if (error.code === '23505') toast.warning("Tu es déjà dans cette équipe !");
      else toast.error("Erreur : " + error.message);
    } else {
      toast.success(`Bienvenue chez ${team.name} !`);
      navigate('/dashboard');
    }
  };

  if (loading) return (
    <DashboardLayout session={session}>
      <div className="text-gray-400 text-center py-20">Chargement de l'invitation...</div>
    </DashboardLayout>
  );
  
  if (!team) return (
    <DashboardLayout session={session}>
      <div className="text-gray-400 text-center py-20">Invitation invalide.</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout session={session}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card border-violet-500/30 p-12 text-center max-w-md w-full shadow-glow-violet">
          <h1 className="font-display text-5xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4 drop-shadow-glow">{team.tag}</h1>
          <h2 className="font-display text-2xl text-white mb-6">Tu as été invité à rejoindre<br/><span className="text-violet-400">{team.name}</span></h2>
          
          <div className="mb-8 text-gray-400">
            Connecte-toi et clique ci-dessous pour intégrer le roster.
          </div>

          <button 
            onClick={handleJoin} 
            className="w-full btn-primary px-6 py-4 rounded-lg font-display text-lg uppercase tracking-wide"
          >
            Accepter l'invitation
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
