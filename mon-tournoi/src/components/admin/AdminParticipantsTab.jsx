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
  const cardStyle = {
    background: p.disqualified ? '#3a1a1a' : p.checked_in ? '#1a3a1a' : '#2a2a2a',
    padding: '15px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #333'
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
        {p.teams?.logo_url && (
          <img
            loading="lazy"
            src={p.teams.logo_url}
            alt=""
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
          />
        )}
        <div>
          <div style={nameStyle}>
            {p.teams?.name} [{p.teams?.tag}]
          </div>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '5px' }}>
            {p.checked_in ? '✅ Check-in' : '⏳ Pas check-in'} | 
            {p.disqualified ? ' ❌ Disqualifié' : ' ✅ Actif'}
            {p.seed_order && ` | Seed #${p.seed_order}`}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {!p.checked_in && (
          <button
            onClick={() => onManualCheckIn(p.id, p.team_id)}
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
