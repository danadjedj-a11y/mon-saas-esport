import React from 'react';

/**
 * Modal pour modifier le score d'un match
 */
export default function EditScoreModal({
  isOpen,
  match,
  score1,
  score2,
  onScore1Change,
  onScore2Change,
  onSave,
  onClose
}) {
  if (!isOpen || !match) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  };

  const modalStyle = {
    background: '#2a2a2a',
    padding: '30px',
    borderRadius: '12px',
    border: '1px solid #444',
    minWidth: '400px',
    maxWidth: '500px'
  };

  const inputStyle = {
    width: '100px',
    padding: '12px',
    background: '#1a1a1a',
    border: '1px solid #444',
    color: 'white',
    borderRadius: '5px',
    fontSize: '1.5rem',
    textAlign: 'center',
    fontWeight: 'bold'
  };

  const team1Name = match.p1_name ? match.p1_name.split(' [')[0] : 'Équipe 1';
  const team2Name = match.p2_name ? match.p2_name.split(' [')[0] : 'Équipe 2';

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Modifier le score</h3>
        <div style={{ marginBottom: '20px', color: '#aaa', fontSize: '0.9rem' }}>
          {team1Name} vs {team2Name}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '20px' }}>
          <input
            type="number"
            value={score1}
            onChange={(e) => onScore1Change(e.target.value)}
            style={inputStyle}
          />
          <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>-</span>
          <input
            type="number"
            value={score2}
            onChange={(e) => onScore2Change(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid #666',
              color: '#aaa',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            style={{
              padding: '12px 24px',
              background: '#8e44ad',
              border: 'none',
              color: 'white',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
