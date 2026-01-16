import React from 'react';

/**
 * Onglet Matchs du panneau admin
 * Affiche et permet la gestion de tous les matchs
 */
export default function AdminMatchesTab({
  matches,
  onViewMatch,
  onEditScore,
  onResetMatch,
  onScheduleMatch
}) {
  const completedCount = matches.filter(m => m.status === 'completed').length;
  const sortedMatches = [...matches].sort((a, b) => {
    if (a.round_number !== b.round_number) return a.round_number - b.round_number;
    return a.match_number - b.match_number;
  });

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Gestion des Matchs</h3>
      <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#aaa' }}>
        {completedCount} terminés sur {matches.length} matchs
      </div>
      <div style={{ display: 'grid', gap: '12px' }}>
        {sortedMatches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            onViewMatch={onViewMatch}
            onEditScore={onEditScore}
            onResetMatch={onResetMatch}
            onScheduleMatch={onScheduleMatch}
          />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, onViewMatch, onEditScore, onResetMatch, onScheduleMatch }) {
  const isCompleted = match.status === 'completed';
  const isPending = match.status === 'pending';
  const isDisputed = match.score_status === 'disputed';

  const matchInfo = match.bracket_type 
    ? `${match.bracket_type === 'winners' ? '🏆 Winners' : match.bracket_type === 'losers' ? '💀 Losers' : '🇨🇭 Swiss'} - Round ${match.round_number}`
    : match.bracket_type === 'swiss' ? `🇨🇭 Round ${match.round_number}` : `Round ${match.round_number}`;

  const cardStyle = {
    background: isDisputed ? '#3a1a1a' : isCompleted ? '#1a3a1a' : '#2a2a2a',
    padding: '15px',
    borderRadius: '8px',
    border: isDisputed ? '1px solid #e74c3c' : isCompleted ? '1px solid #4ade80' : '1px solid #444',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
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
      <div style={{ flex: 1, minWidth: '250px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1.05rem' }}>
          Match #{match.match_number} - {matchInfo}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
          {/* Équipe 1 */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
            {match.p1_avatar && (
              <img
                loading="lazy"
                src={match.p1_avatar}
                alt=""
                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
              />
            )}
            <span style={{ fontWeight: isCompleted && (match.score_p1 || 0) > (match.score_p2 || 0) ? 'bold' : 'normal' }}>
              {match.p1_name ? match.p1_name.split(' [')[0] : 'En attente'}
            </span>
          </div>

          {/* Score */}
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: isCompleted ? '#4ade80' : '#666', minWidth: '60px', textAlign: 'center' }}>
            {isCompleted ? `${match.score_p1 || 0} - ${match.score_p2 || 0}` : 'vs'}
          </div>

          {/* Équipe 2 */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
            <span style={{ fontWeight: isCompleted && (match.score_p2 || 0) > (match.score_p1 || 0) ? 'bold' : 'normal' }}>
              {match.p2_name ? match.p2_name.split(' [')[0] : 'En attente'}
            </span>
            {match.p2_avatar && (
              <img
                loading="lazy"
                src={match.p2_avatar}
                alt=""
                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
              />
            )}
          </div>
        </div>

        {match.scheduled_at && (
          <div style={{ fontSize: '0.85rem', color: '#3498db', marginTop: '5px' }}>
            📅 {new Date(match.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
          </div>
        )}

        {isDisputed && (
          <div style={{ fontSize: '0.85rem', color: '#e74c3c', marginTop: '5px', fontWeight: 'bold' }}>
            ⚠️ Conflit de score
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onViewMatch(match.id)}
          style={{ ...buttonBaseStyle, background: '#3498db' }}
        >
          👁️ Voir
        </button>
        {isCompleted && (
          <>
            <button
              onClick={() => onEditScore(match)}
              style={{ ...buttonBaseStyle, background: '#f39c12' }}
            >
              ✏️ Modifier
            </button>
            <button
              onClick={() => onResetMatch(match.id)}
              style={{ ...buttonBaseStyle, background: '#e74c3c' }}
            >
              ↻ Réinit.
            </button>
          </>
        )}
        {onScheduleMatch && isPending && (
          <button
            onClick={() => onScheduleMatch(match)}
            style={{ ...buttonBaseStyle, background: '#9b59b6' }}
          >
            📅 Planifier
          </button>
        )}
      </div>
    </div>
  );
}
