import React from 'react';

/**
 * Onglet Conflits du panneau admin
 * Permet de résoudre les conflits de scores (matchs et manches Best-of-X)
 */
export default function AdminConflictsTab({
  conflicts,
  gameConflicts,
  onResolveConflict,
  onResolveGameConflict,
  onViewMatch
}) {
  if (conflicts.length === 0 && gameConflicts.length === 0) {
    return (
      <div>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Résolution de Conflits</h3>
        <div style={{ textAlign: 'center', padding: '40px', color: '#4ade80', fontSize: '1.1rem' }}>
          ✅ Aucun conflit en cours
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Résolution de Conflits</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {/* Conflits de matchs (single game) */}
        {conflicts.length > 0 && (
          <div>
            <h4 style={{ marginBottom: '15px', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
              Conflits de Matchs
            </h4>
            <div style={{ display: 'grid', gap: '15px' }}>
              {conflicts.map(match => (
                <MatchConflictCard
                  key={match.id}
                  match={match}
                  onResolve={onResolveConflict}
                  onViewMatch={onViewMatch}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Conflits de manches (Best-of-X) */}
        {gameConflicts.length > 0 && (
          <div>
            <h4 style={{ marginBottom: '15px', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
              Conflits de Manches (Best-of-X)
            </h4>
            <div style={{ display: 'grid', gap: '15px' }}>
              {gameConflicts.map(game => (
                <GameConflictCard
                  key={game.id}
                  game={game}
                  onResolve={onResolveGameConflict}
                  onViewMatch={onViewMatch}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchConflictCard({ match, onResolve, onViewMatch }) {
  const handleResolve = () => {
    const score1 = parseInt(document.getElementById(`score1-${match.id}`).value);
    const score2 = parseInt(document.getElementById(`score2-${match.id}`).value);
    onResolve(match.id, score1, score2);
  };

  const inputStyle = {
    padding: '8px',
    width: '80px',
    background: '#1a1a1a',
    border: '1px solid #444',
    color: 'white',
    borderRadius: '5px',
    fontSize: '1rem'
  };

  const buttonStyle = {
    padding: '10px 20px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem'
  };

  return (
    <div style={{
      background: '#2a2a2a',
      padding: '20px',
      borderRadius: '8px',
      border: '2px solid #e74c3c'
    }}>
      <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '1.1rem' }}>
        {match.team1?.name || 'Équipe 1'} [{match.team1?.tag}] vs {match.team2?.name || 'Équipe 2'} [{match.team2?.tag}]
      </div>
      <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#aaa' }}>
        Match #{match.match_number} - Round {match.round_number}
      </div>
      <div style={{ marginBottom: '15px', fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>
        Scores déclarés : {match.score_p1_reported || '?'} - {match.score_p2_reported || '?'}
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          placeholder="Score 1"
          defaultValue={match.score_p1_reported || 0}
          style={inputStyle}
          id={`score1-${match.id}`}
        />
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>-</span>
        <input
          type="number"
          placeholder="Score 2"
          defaultValue={match.score_p2_reported || 0}
          style={inputStyle}
          id={`score2-${match.id}`}
        />
        <button
          onClick={handleResolve}
          style={{ ...buttonStyle, background: '#8e44ad' }}
        >
          ✅ Résoudre
        </button>
        <button
          onClick={() => onViewMatch(match.id)}
          style={{ ...buttonStyle, background: '#3498db' }}
        >
          👁️ Voir le match
        </button>
      </div>
    </div>
  );
}

function GameConflictCard({ game, onResolve, onViewMatch }) {
  const handleResolve = () => {
    const score1 = parseInt(document.getElementById(`game-score1-${game.id}`).value);
    const score2 = parseInt(document.getElementById(`game-score2-${game.id}`).value);
    onResolve(game.id, game.match_id, score1, score2);
  };

  const inputStyle = {
    padding: '8px',
    width: '80px',
    background: '#1a1a1a',
    border: '1px solid #444',
    color: 'white',
    borderRadius: '5px',
    fontSize: '1rem'
  };

  const buttonStyle = {
    padding: '10px 20px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem'
  };

  return (
    <div style={{
      background: '#2a2a2a',
      padding: '20px',
      borderRadius: '8px',
      border: '2px solid #e74c3c'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '1.1rem' }}>
        {game.team1?.name || 'Équipe 1'} [{game.team1?.tag}] vs {game.team2?.name || 'Équipe 2'} [{game.team2?.tag}]
      </div>
      <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#888' }}>
        Match #{game.match?.match_number} - Round {game.match?.round_number} - Manche {game.game_number}
      </div>
      {game.map_name && (
        <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#aaa' }}>
          🗺️ Map: {game.map_name}
        </div>
      )}
      <div style={{ marginBottom: '15px', fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>
        Scores déclarés : {game.team1_score_reported || '?'} - {game.team2_score_reported || '?'}
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          placeholder="Score 1"
          defaultValue={game.team1_score_reported || 0}
          style={inputStyle}
          id={`game-score1-${game.id}`}
        />
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>-</span>
        <input
          type="number"
          placeholder="Score 2"
          defaultValue={game.team2_score_reported || 0}
          style={inputStyle}
          id={`game-score2-${game.id}`}
        />
        <button
          onClick={handleResolve}
          style={{ ...buttonStyle, background: '#8e44ad' }}
        >
          ✅ Résoudre
        </button>
        <button
          onClick={() => onViewMatch(game.match_id)}
          style={{ ...buttonStyle, background: '#3498db' }}
        >
          👁️ Voir le match
        </button>
      </div>
    </div>
  );
}
