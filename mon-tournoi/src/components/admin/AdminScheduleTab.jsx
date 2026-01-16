import React from 'react';

/**
 * Onglet Planning du panneau admin
 * Permet de planifier les matchs
 */
export default function AdminScheduleTab({ matches, onScheduleMatch }) {
  const schedulableMatches = matches
    .filter(m => m.status === 'pending' || m.scheduled_at)
    .sort((a, b) => {
      if (a.scheduled_at && !b.scheduled_at) return -1;
      if (!a.scheduled_at && b.scheduled_at) return 1;
      if (a.scheduled_at && b.scheduled_at) {
        return new Date(a.scheduled_at) - new Date(b.scheduled_at);
      }
      if (a.round_number !== b.round_number) return a.round_number - b.round_number;
      return a.match_number - b.match_number;
    });

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>📅 Planning des Matchs</h3>
      <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#aaa' }}>
        Cliquez sur un match pour le planifier ou modifier sa date/heure.
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {schedulableMatches.map(match => (
          <ScheduleMatchCard
            key={match.id}
            match={match}
            onScheduleMatch={onScheduleMatch}
          />
        ))}
      </div>
      {schedulableMatches.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Aucun match à planifier
        </div>
      )}
    </div>
  );
}

function ScheduleMatchCard({ match, onScheduleMatch }) {
  const isScheduled = Boolean(match.scheduled_at);
  const matchInfo = match.bracket_type 
    ? `${match.bracket_type === 'winners' ? '🏆 Winners' : '💀 Losers'} - Round ${match.round_number}`
    : `Round ${match.round_number}`;
  
  const team1Name = match.p1_name ? match.p1_name.split(' [')[0] : 'En attente';
  const team2Name = match.p2_name ? match.p2_name.split(' [')[0] : 'En attente';

  const cardStyle = {
    background: isScheduled ? '#1a3a1a' : '#2a2a2a',
    padding: '15px',
    borderRadius: '8px',
    border: isScheduled ? '1px solid #27ae60' : '1px solid #444',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.background = isScheduled ? '#1a4a1a' : '#333';
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.background = isScheduled ? '#1a3a1a' : '#2a2a2a';
  };

  return (
    <div
      onClick={() => onScheduleMatch && onScheduleMatch(match)}
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '1.05rem' }}>
          Match #{match.match_number} - {matchInfo}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
          {team1Name} <span style={{ color: '#666' }}>vs</span> {team2Name}
        </div>
        {match.scheduled_at && (
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#4ade80', fontWeight: 'bold' }}>
            📅 {new Date(match.scheduled_at).toLocaleString('fr-FR', {
              dateStyle: 'short',
              timeStyle: 'short'
            })}
          </div>
        )}
      </div>
      <div style={{ fontSize: '1.5rem', color: isScheduled ? '#4ade80' : '#666' }}>
        📅
      </div>
    </div>
  );
}
