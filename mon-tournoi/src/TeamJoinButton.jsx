import React, { useState, useEffect } from 'react';

export default function TeamJoinButton({ tournamentId, supabase, session, onJoinSuccess }) {
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (session) {
      checkRegistration();
      fetchMyTeams();
    }
  }, [session, tournamentId]);

  // Vérifier si une de mes équipes est déjà inscrite
  const checkRegistration = async () => {
    // On récupère toutes les participations de ce tournoi
    const { data: participants } = await supabase
      .from('participants')
      .select('team_id')
      .eq('tournament_id', tournamentId);

    // On récupère mes équipes
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('captain_id', session.user.id);

    if (participants && teams) {
      // Est-ce qu'une de mes équipes est dans la liste des participants ?
      const myTeamIds = teams.map(t => t.id);
      const isAlreadyIn = participants.some(p => myTeamIds.includes(p.team_id));
      setIsJoined(isAlreadyIn);
    }
  };

  const fetchMyTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('captain_id', session.user.id);
    
    setMyTeams(data || []);
    if (data && data.length > 0) setSelectedTeamId(data[0].id); // Sélectionner la première par défaut
  };

  const handleJoin = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('participants')
      .insert([{ 
        tournament_id: tournamentId, 
        team_id: selectedTeamId,
        checked_in: false,
        disqualified: false
      }]);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      setIsJoined(true);
      if (onJoinSuccess) onJoinSuccess(); // Pour rafraîchir la liste
    }
    setLoading(false);
  };

  if (isJoined) {
    return <button disabled style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', opacity: 0.8 }}>✅ Ton équipe est inscrite</button>;
  }

  if (myTeams.length === 0) {
    return (
      <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
        Tu dois <a href="/create-team" style={{ color: '#3498db' }}>créer une équipe</a> pour t'inscrire.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <select 
        value={selectedTeamId} 
        onChange={(e) => setSelectedTeamId(e.target.value)}
        style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px' }}
      >
        {myTeams.map(team => (
          <option key={team.id} value={team.id}>Inscrire : {team.name} [{team.tag}]</option>
        ))}
      </select>

      <button 
        onClick={handleJoin} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          background: '#8e44ad', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        {loading ? '...' : 'Valider'}
      </button>
    </div>
  );
}