import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StatsDashboard({ session, supabase }) {
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [tournamentStats, setTournamentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      fetchMyTeams();
    }
  }, [session]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamStats();
    }
  }, [selectedTeam]);

  const fetchMyTeams = async () => {
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('captain_id', session.user.id);
    
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id, teams(*)')
      .eq('user_id', session.user.id);

    const allTeams = [
      ...(captainTeams || []),
      ...(memberTeams?.map(m => m.teams).filter(Boolean) || [])
    ];

    const uniqueTeams = Array.from(new Map(allTeams.map(t => [t.id, t])).values());
    setMyTeams(uniqueTeams);
    
    if (uniqueTeams.length > 0) {
      setSelectedTeam(uniqueTeams[0].id);
    }
    
    setLoading(false);
  };

  const fetchTeamStats = async () => {
    if (!selectedTeam) return;

    // Récupérer tous les tournois où l'équipe a participé
    const { data: participations } = await supabase
      .from('participants')
      .select('*, tournaments(name, game, format, status)')
      .eq('team_id', selectedTeam);

    // Pour chaque participation, calculer les stats
    const stats = await Promise.all((participations || []).map(async (participation) => {
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${selectedTeam},player2_id.eq.${selectedTeam}`)
        .eq('tournament_id', participation.tournament_id);

      const wins = (matches || []).filter(m => {
        const isTeam1 = m.player1_id === selectedTeam;
        const winner = m.score_p1 > m.score_p2 ? m.player1_id : m.player2_id;
        return winner === selectedTeam && m.status === 'completed';
      }).length;

      const losses = (matches || []).filter(m => {
        const isTeam1 = m.player1_id === selectedTeam;
        const winner = m.score_p1 > m.score_p2 ? m.player1_id : m.player2_id;
        return winner !== selectedTeam && m.status === 'completed';
      }).length;

      return {
        tournament: participation.tournaments,
        participation,
        totalMatches: matches?.length || 0,
        wins,
        losses,
        winRate: matches?.length > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : 0
      };
    }));

    setTournamentStats(stats);
  };

  if (loading) return <div style={{color:'white', padding:'20px'}}>Chargement...</div>;

  if (myTeams.length === 0) {
    return (
      <div style={{ padding: '40px', color: 'white', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h2>📊 Statistiques</h2>
        <p>Vous n'avez pas encore d'équipe. <a href="/create-team" style={{color:'#3498db'}}>Créer une équipe</a></p>
      </div>
    );
  }

  const currentTeam = myTeams.find(t => t.id === selectedTeam);

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>📊 Mes Statistiques</h2>
        <button onClick={() => navigate('/dashboard')} style={{background:'transparent', border:'1px solid #555', color:'white', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>
          ← Retour
        </button>
      </div>

      {/* Sélection d'équipe */}
      <div style={{ marginBottom: '30px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Équipe :</label>
        <select
          value={selectedTeam || ''}
          onChange={(e) => setSelectedTeam(e.target.value)}
          style={{
            padding: '10px',
            background: '#2a2a2a',
            border: '1px solid #444',
            color: 'white',
            borderRadius: '5px',
            minWidth: '300px'
          }}
        >
          {myTeams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name} [{team.tag}]
            </option>
          ))}
        </select>
      </div>

      {/* Stats globales de l'équipe */}
      {currentTeam && tournamentStats.length > 0 && (
        <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #333' }}>
          <h3 style={{ marginTop: 0 }}>Statistiques Globales</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '15px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db' }}>
                {tournamentStats.reduce((acc, s) => acc + s.totalMatches, 0)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Matchs totaux</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2ecc71' }}>
                {tournamentStats.reduce((acc, s) => acc + s.wins, 0)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Victoires</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e74c3c' }}>
                {tournamentStats.reduce((acc, s) => acc + s.losses, 0)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Défaites</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f39c12' }}>
                {tournamentStats.length > 0 
                  ? ((tournamentStats.reduce((acc, s) => acc + s.wins, 0) / 
                      (tournamentStats.reduce((acc, s) => acc + s.wins, 0) + tournamentStats.reduce((acc, s) => acc + s.losses, 0))) * 100).toFixed(1)
                  : 0}%
              </div>
              <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Win Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats par tournoi */}
      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
        <h3 style={{ marginTop: 0 }}>Statistiques par Tournoi</h3>
        {tournamentStats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
            Aucune participation à un tournoi pour cette équipe.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
            {tournamentStats.map((stat, index) => (
              <div
                key={index}
                style={{
                  background: '#2a2a2a',
                  padding: '15px',
                  borderRadius: '5px',
                  border: '1px solid #333',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {stat.tournament?.name || 'Tournoi'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '5px' }}>
                    {stat.tournament?.game} | {stat.tournament?.format === 'elimination' ? 'Élimination' : 'Round Robin'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '30px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>{stat.totalMatches}</div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Matchs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2ecc71' }}>{stat.wins}</div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Victoires</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e74c3c' }}>{stat.losses}</div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Défaites</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f39c12' }}>{stat.winRate}%</div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Win Rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



