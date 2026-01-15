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
      <div className="text-fluky-text font-body text-center py-20">Chargement de l'invitation...</div>
    </DashboardLayout>
  );
  
  if (!team) return (
    <DashboardLayout session={session}>
      <div className="text-fluky-text font-body text-center py-20">Invitation invalide.</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout session={session}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-12 text-center max-w-md w-full">
          <h1 className="font-display text-5xl text-fluky-secondary mb-4" style={{ textShadow: '0 0 20px rgba(193, 4, 104, 0.5)' }}>{team.tag}</h1>
          <h2 className="font-display text-2xl text-fluky-text mb-6">Tu as été invité à rejoindre<br/>{team.name}</h2>
          
          <div className="mb-8 text-fluky-text/70 font-body">
            Connecte-toi et clique ci-dessous pour intégrer le roster.
          </div>

          <button 
            onClick={handleJoin} 
            className="w-full px-6 py-4 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display text-lg uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50"
          >
            Accepter l'invitation
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}