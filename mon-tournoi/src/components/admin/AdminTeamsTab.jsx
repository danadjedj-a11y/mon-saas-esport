import React from 'react';

/**
 * Onglet Équipes du panneau admin
 * Affiche le classement et statistiques par équipe
 */
export default function AdminTeamsTab({ teamStats }) {
  if (!teamStats || teamStats.length === 0) {
    return (
      <div>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Statistiques par Équipe</h3>
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Aucune statistique disponible
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Statistiques par Équipe</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
          <thead>
            <tr style={{ background: '#2a2a2a', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderRadius: '5px 0 0 5px' }}>Rang</th>
              <th style={{ padding: '12px' }}>Équipe</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>J</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>V</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>N</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>D</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>%V</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Pour</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Contre</th>
              <th style={{ padding: '12px', textAlign: 'center', borderRadius: '0 5px 5px 0' }}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {teamStats.map((team, index) => (
              <TeamRow key={team.teamId} team={team} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamRow({ team, index }) {
  const isFirst = index === 0;
  const rowStyle = {
    borderBottom: '1px solid #333',
    background: index % 2 === 0 ? '#1a1a1a' : '#222'
  };

  return (
    <tr style={rowStyle}>
      <td style={{
        padding: '12px',
        fontWeight: isFirst ? 'bold' : 'normal',
        color: isFirst ? '#f1c40f' : 'white',
        fontSize: isFirst ? '1.1rem' : '1rem'
      }}>
        #{index + 1}
      </td>
      <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {team.teamLogo && (
          <img
            loading="lazy"
            src={team.teamLogo}
            alt=""
            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
          />
        )}
        <div>
          <div style={{ fontWeight: 'bold' }}>{team.teamName}</div>
          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>[{team.teamTag}]</div>
        </div>
      </td>
      <td style={{ padding: '12px', textAlign: 'center' }}>{team.matchesPlayed}</td>
      <td style={{ padding: '12px', textAlign: 'center', color: '#2ecc71', fontWeight: 'bold' }}>{team.wins}</td>
      <td style={{ padding: '12px', textAlign: 'center', color: '#f39c12' }}>{team.draws}</td>
      <td style={{ padding: '12px', textAlign: 'center', color: '#e74c3c' }}>{team.losses}</td>
      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#3498db' }}>{team.winRate}%</td>
      <td style={{ padding: '12px', textAlign: 'center', color: '#4ade80' }}>{team.totalScoreFor}</td>
      <td style={{ padding: '12px', textAlign: 'center', color: '#e74c3c' }}>{team.totalScoreAgainst}</td>
      <td style={{
        padding: '12px',
        textAlign: 'center',
        fontWeight: 'bold',
        color: team.scoreDiff > 0 ? '#4ade80' : team.scoreDiff < 0 ? '#e74c3c' : '#aaa'
      }}>
        {team.scoreDiff > 0 ? '+' : ''}{team.scoreDiff}
      </td>
    </tr>
  );
}
