import React from 'react';

/**
 * Onglet Participants du panneau admin
 * Permet la gestion du check-in et de la disqualification
 */
export default function AdminParticipantsTab({
  participants,
  onManualCheckIn,
  onDisqualify,
  onUnDisqualify
}) {
  const checkedInCount = participants.filter(p => p.checked_in).length;

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Gestion des Participants</h3>
      <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#aaa' }}>
        {checkedInCount} check-in sur {participants.length} participants
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {participants.map(p => (
          <ParticipantCard
            key={p.id}
            participant={p}
            onManualCheckIn={onManualCheckIn}
            onDisqualify={onDisqualify}
            onUnDisqualify={onUnDisqualify}
          />
        ))}
      </div>
    </div>
  );
}

function ParticipantCard({ participant: p, onManualCheckIn, onDisqualify, onUnDisqualify }) {
  // Supporter équipes permanentes ET temporaires
  const isTemporaryTeam = !!p.temporary_team_id && !p.team_id;
  const team = isTemporaryTeam ? p.temporary_teams : p.teams;
  
  const cardStyle = {
    background: p.disqualified ? '#3a1a1a' : p.checked_in ? '#1a3a1a' : '#2a2a2a',
    padding: '15px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: isTemporaryTeam ? '1px solid #06b6d4' : '1px solid #333'
  };

  const nameStyle = {
    fontWeight: 'bold',
    color: p.disqualified ? '#e74c3c' : p.checked_in ? '#4ade80' : 'white',
    fontSize: '1.05rem'
  };

  const buttonBaseStyle = {
    padding: '8px 15px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold'
  };

  return (
    <div style={cardStyle}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
        {team?.logo_url ? (
          <img
            loading="lazy"
            src={team.logo_url}
            alt=""
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: isTemporaryTeam ? '#06b6d4' : '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {team?.tag?.[0] || team?.name?.[0] || '?'}
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={nameStyle}>
              {team?.name || 'Inconnu'} [{team?.tag || '?'}]
            </span>
            {isTemporaryTeam && (
              <span style={{ 
                fontSize: '10px', 
                padding: '2px 6px', 
                background: '#06b6d4', 
                color: 'white',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                TEMP
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '5px' }}>
            {p.checked_in ? '✅ Check-in' : '⏳ Pas check-in'} | 
            {p.disqualified ? ' ❌ Disqualifié' : ' ✅ Actif'}
            {p.seed_order && ` | Seed #${p.seed_order}`}
            {isTemporaryTeam && p.temporary_teams?.temporary_team_players && 
              ` | ${p.temporary_teams.temporary_team_players.length} joueurs`
            }
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {!p.checked_in && (
          <button
            onClick={() => onManualCheckIn(p.id, p.team_id || p.temporary_team_id)}
            style={{ ...buttonBaseStyle, background: '#2ecc71' }}
          >
            ✓ Check-in
          </button>
        )}
        {!p.disqualified ? (
          <button
            onClick={() => onDisqualify(p.id)}
            style={{ ...buttonBaseStyle, background: '#e74c3c' }}
          >
            ✕ DQ
          </button>
        ) : (
          <button
            onClick={() => onUnDisqualify(p.id)}
            style={{ ...buttonBaseStyle, background: '#3498db' }}
          >
            ↻ Réintégrer
          </button>
        )}
      </div>
    </div>
  );
}
