import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function JoinTeam({ session, supabase }) {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamInfo();
  }, [teamId]);

  const fetchTeamInfo = async () => {
    const { data } = await supabase.from('teams').select('*').eq('id', teamId).single();
    setTeam(data);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!session) return alert("Connecte-toi d'abord !");

    const { error } = await supabase
      .from('team_members')
      .insert([{ team_id: teamId, user_id: session.user.id }]);

    if (error) {
      if (error.code === '23505') alert("Tu es déjà dans cette équipe !");
      else alert("Erreur : " + error.message);
    } else {
      alert(`Bienvenue chez ${team.name} !`);
      navigate('/dashboard');
    }
  };

  if (loading) return <div style={{color:'white', padding:'20px'}}>Chargement de l'invitation...</div>;
  if (!team) return <div style={{color:'white'}}>Invitation invalide.</div>;

  return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a1a', padding: '50px', borderRadius: '15px', textAlign: 'center', border: '1px solid #333', color: 'white', maxWidth: '400px' }}>
        <h1 style={{ color: '#00d4ff', fontSize: '3rem', margin: 0 }}>{team.tag}</h1>
        <h2>Tu as été invité à rejoindre<br/>{team.name}</h2>
        
        <div style={{ margin: '30px 0', color: '#aaa' }}>
          Connecte-toi et clique ci-dessous pour intégrer le roster.
        </div>

        <button 
          onClick={handleJoin} 
          style={{ width: '100%', padding: '15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Accepter l'invitation
        </button>
      </div>
    </div>
  );
}