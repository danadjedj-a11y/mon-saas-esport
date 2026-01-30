import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function StreamDashboard() {
  const { id } = useParams();
  
  // Convex queries - automatically reactive, no subscriptions needed
  const tournoi = useQuery(api.tournaments.getById, id ? { tournamentId: id } : "skip");
  const matchesData = useQuery(api.matches.listByTournament, id ? { tournamentId: id } : "skip");
  const participantsData = useQuery(api.tournamentRegistrations.listByTournament, id ? { tournamentId: id } : "skip");
  
  const loading = tournoi === undefined || matchesData === undefined || participantsData === undefined;
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'recent', 'stats'

  // Process participants and matches with useMemo for performance
  const { participants, matches, swissScores } = useMemo(() => {
    if (!participantsData || !matchesData) {
      return { participants: [], matches: [], swissScores: [] };
    }

    // Build participants map
    const participantsMap = new Map();
    participantsData.forEach(p => {
      if (p.teamId) participantsMap.set(p.teamId, p);
      if (p.temporaryTeamId) participantsMap.set(p.temporaryTeamId, p);
    });
    
    const enrichedMatches = matchesData.map(match => {
      const p1 = match.team1Id ? participantsMap.get(match.team1Id) : null;
      const p2 = match.team2Id ? participantsMap.get(match.team2Id) : null;
      
      const getTeamData = (p) => {
        if (!p) return null;
        return p.team || null;
      };
      
      const getTeamName = (p) => {
        if (!p) return 'En attente';
        const team = getTeamData(p);
        return `${team?.name || 'Inconnu'} [${team?.tag || '?'}]`;
      };
      
      const getTeamLogo = (p) => {
        const team = getTeamData(p);
        return team?.logoUrl || `https://ui-avatars.com/api/?name=${team?.tag || '?'}&background=random&size=64`;
      };

      return {
        ...match,
        // Map Convex fields to expected field names for UI
        id: match._id,
        player1_id: match.team1Id,
        player2_id: match.team2Id,
        match_number: match.matchNumber,
        round_number: match.roundNumber,
        score_p1: match.scoreTeam1,
        score_p2: match.scoreTeam2,
        bracket_type: match.bracketType,
        scheduled_at: match.scheduledAt,
        p1_name: match.team1Id ? getTeamName(p1) : 'En attente',
        p1_avatar: getTeamLogo(p1),
        p2_name: match.team2Id ? getTeamName(p2) : 'En attente',
        p2_avatar: getTeamLogo(p2),
      };
    }).sort((a, b) => a.match_number - b.match_number);

    // Swiss scores (computed from matches if format is swiss)
    let swissScoresData = [];
    if (tournoi?.format === 'swiss') {
      const scoreMap = new Map();
      participantsData.forEach(p => {
        if (p.teamId) {
          scoreMap.set(p.teamId, {
            id: p.teamId,
            teamId: p.teamId,
            wins: 0,
            losses: 0,
            draws: 0,
            buchholzScore: 0,
          });
        }
      });

      enrichedMatches.filter(m => m.status === 'completed').forEach(m => {
        if (m.player1_id && scoreMap.has(m.player1_id)) {
          const stats = scoreMap.get(m.player1_id);
          if ((m.score_p1 || 0) > (m.score_p2 || 0)) stats.wins++;
          else if ((m.score_p1 || 0) < (m.score_p2 || 0)) stats.losses++;
          else stats.draws++;
        }
        if (m.player2_id && scoreMap.has(m.player2_id)) {
          const stats = scoreMap.get(m.player2_id);
          if ((m.score_p2 || 0) > (m.score_p1 || 0)) stats.wins++;
          else if ((m.score_p2 || 0) < (m.score_p1 || 0)) stats.losses++;
          else stats.draws++;
        }
      });

      swissScoresData = Array.from(scoreMap.values());
    }

    return { 
      participants: participantsData, 
      matches: enrichedMatches, 
      swissScores: swissScoresData 
    };
  }, [matchesData, participantsData, tournoi?.format]);

  if (loading) {
    return (
      <div style={{ padding: '50px', color: 'white', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem' }}>Chargement...</div>
      </div>
    );
  }

  if (!tournoi) {
    return (
      <div style={{ padding: '50px', color: 'white', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', color: '#e74c3c' }}>Tournoi introuvable</div>
      </div>
    );
  }

  const upcomingMatches = matches
    .filter(m => m.status === 'pending' && m.player1_id && m.player2_id)
    .sort((a, b) => {
      if (a.scheduled_at && !b.scheduled_at) return -1;
      if (!a.scheduled_at && b.scheduled_at) return 1;
      if (a.scheduled_at && b.scheduled_at) return new Date(a.scheduled_at) - new Date(b.scheduled_at);
      return a.match_number - b.match_number;
    });

  const recentMatches = matches
    .filter(m => m.status === 'completed')
    .sort((a, b) => b.match_number - a.match_number)
    .slice(0, 10);

  const baseStyle = {
    background: '#1a1a1a',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    minHeight: '100vh',
    padding: '20px'
  };

  return (
    <div style={baseStyle}>
      {/* Header */}
      <div style={{ marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', color: '#00d4ff' }}>📺 Dashboard Streamer</h1>
        <div style={{ fontSize: '1.5rem', color: '#aaa', marginTop: '10px' }}>{tournoi.name} - {tournoi.game}</div>
        <div style={{ marginTop: '15px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <a
            href={`/stream/overlay/${id}?type=bracket`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#3498db',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            📊 Overlay Bracket
          </a>
          <a
            href={`/stream/overlay/${id}?type=score`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#8e44ad',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            🎮 Overlay Score
          </a>
          <a
            href={`/stream/overlay/${id}?type=standings`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#2ecc71',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            🏆 Overlay Standings
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #333' }}>
        {[
          { id: 'upcoming', label: '📅 Matchs à venir', count: upcomingMatches.length },
          { id: 'recent', label: '✅ Matchs récents', count: recentMatches.length },
          { id: 'stats', label: '📊 Statistiques' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? '#2a2a2a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #8e44ad' : 'none',
              color: activeTab === tab.id ? 'white' : '#aaa',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            {tab.label} {tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'upcoming' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>📅 Matchs à venir</h2>
            {upcomingMatches.length > 0 ? (
              <div style={{ display: 'grid', gap: '15px' }}>
                {upcomingMatches.map(match => (
                  <div
                    key={match.id}
                    style={{
                      background: '#2a2a2a',
                      padding: '20px',
                      borderRadius: '8px',
                      border: match.scheduled_at ? '1px solid #3498db' : '1px solid #444',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '15px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '300px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '10px' }}>
                        Match #{match.match_number} - Round {match.round_number}
                        {match.bracket_type && ` (${match.bracket_type === 'winners' ? 'Winners' : 'Losers'})`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {match.p1_avatar && <img loading="lazy" src={match.p1_avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />}
                          <span style={{ fontSize: '1.1rem' }}>{match.p1_name.split(' [')[0]}</span>
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#666' }}>VS</div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '1.1rem' }}>{match.p2_name.split(' [')[0]}</span>
                          {match.p2_avatar && <img loading="lazy" src={match.p2_avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />}
                        </div>
                      </div>
                      {match.scheduled_at && (
                        <div style={{ fontSize: '0.9rem', color: '#3498db', marginTop: '5px' }}>
                          📅 {new Date(match.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                Aucun match à venir
              </div>
            )}
          </div>
        )}

        {activeTab === 'recent' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>✅ Matchs récents</h2>
            {recentMatches.length > 0 ? (
              <div style={{ display: 'grid', gap: '15px' }}>
                {recentMatches.map(match => (
                  <div
                    key={match.id}
                    style={{
                      background: '#1a3a1a',
                      padding: '20px',
                      borderRadius: '8px',
                      border: '1px solid #4ade80',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '15px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '300px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '10px' }}>
                        Match #{match.match_number} - Round {match.round_number}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {match.p1_avatar && <img loading="lazy" src={match.p1_avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />}
                          <span style={{ fontSize: '1.1rem', fontWeight: (match.score_p1 || 0) > (match.score_p2 || 0) ? 'bold' : 'normal' }}>
                            {match.p1_name.split(' [')[0]}
                          </span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80', minWidth: '80px', textAlign: 'center' }}>
                          {match.score_p1 || 0} - {match.score_p2 || 0}
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: (match.score_p2 || 0) > (match.score_p1 || 0) ? 'bold' : 'normal' }}>
                            {match.p2_name.split(' [')[0]}
                          </span>
                          {match.p2_avatar && <img loading="lazy" src={match.p2_avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                Aucun match terminé
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>📊 Statistiques</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>Participants</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3498db' }}>{participants.length}</div>
              </div>
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>Matchs totaux</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8e44ad' }}>{matches.length}</div>
              </div>
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>Matchs terminés</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4ade80' }}>
                  {matches.filter(m => m.status === 'completed').length}
                </div>
              </div>
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>En attente</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f39c12' }}>
                  {matches.filter(m => m.status === 'pending').length}
                </div>
              </div>
            </div>

            {tournoi?.format === 'swiss' && swissScores.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '20px' }}>🇨🇭 Classement Suisse (Top 5)</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {swissScores
                    .sort((a, b) => {
                      if (b.wins !== a.wins) return b.wins - a.wins;
                      if (b.buchholzScore !== a.buchholzScore) return b.buchholzScore - a.buchholzScore;
                      return 0;
                    })
                    .slice(0, 5)
                    .map((score, index) => {
                      const participant = participants.find(p => p.teamId === score.teamId);
                      return (
                        <div
                          key={score.id}
                          style={{
                            background: index === 0 ? 'rgba(241, 196, 15, 0.2)' : '#2a2a2a',
                            border: index === 0 ? '2px solid #f1c40f' : '1px solid #333',
                            borderRadius: '8px',
                            padding: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px'
                          }}
                        >
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: '50px', textAlign: 'center', color: index === 0 ? '#f1c40f' : '#fff' }}>
                            #{index + 1}
                          </div>
                          {participant?.team?.logoUrl && (
                            <img loading="lazy" src={participant.team.logoUrl} alt="" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                          )}
                          <div style={{ flex: 1, fontSize: '1.2rem', fontWeight: 'bold' }}>{participant?.team?.name || 'Inconnu'}</div>
                          <div style={{ display: 'flex', gap: '15px', fontSize: '1rem' }}>
                            <span style={{ color: '#2ecc71' }}>V: {score.wins}</span>
                            <span style={{ color: '#e74c3c' }}>D: {score.losses}</span>
                            <span style={{ color: '#3498db', fontWeight: 'bold' }}>BH: {parseFloat(score.buchholzScore || 0).toFixed(1)}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

