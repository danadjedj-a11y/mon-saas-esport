import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';

const TournamentCard = memo(({ tournament, getStatusStyle, getFormatLabel }) => {
  const navigate = useNavigate();

  const statusStyle = getStatusStyle(tournament.status);

  return (
    <div
      onClick={() => navigate(`/tournament/${tournament.id}/public`)}
      style={{
        background: 'rgba(3, 9, 19, 0.9)',
        padding: '25px',
        borderRadius: '12px',
        border: '2px solid #FF36A3',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#C10468';
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(193, 4, 104, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#FF36A3';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>
            {tournament.name}
          </h3>
          <div style={{ fontSize: '0.85rem', color: '#F8F6F2', display: 'flex', gap: '15px', marginTop: '8px', flexWrap: 'wrap', fontFamily: "'Protest Riot', sans-serif" }}>
            <span>🎮 {tournament.game}</span>
            <span>📊 {getFormatLabel(tournament.format)}</span>
          </div>
        </div>
        <span style={{
          background: statusStyle.bg === '#f39c12' ? '#E7632C' : statusStyle.bg === '#27ae60' ? '#C10468' : '#FF36A3',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          color: '#F8F6F2',
          fontFamily: "'Protest Riot', sans-serif"
        }}>
          {statusStyle.icon} {statusStyle.text}
        </span>
      </div>

      <div style={{ 
        marginTop: '15px', 
        paddingTop: '15px', 
        borderTop: '2px solid #FF36A3',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '0.85rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
          Créé le {new Date(tournament.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <div style={{
          padding: '6px 12px',
          background: '#C10468',
          borderRadius: '5px',
          fontSize: '0.85rem',
          color: '#F8F6F2',
          fontWeight: 'bold',
          fontFamily: "'Protest Riot', sans-serif"
        }}>
          Voir le tournoi →
        </div>
      </div>
    </div>
  );
});

TournamentCard.displayName = 'TournamentCard';

export default TournamentCard;

