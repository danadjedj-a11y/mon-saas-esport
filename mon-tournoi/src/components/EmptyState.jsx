import React from 'react';

/**
 * Composant EmptyState pour afficher des messages engageants quand il n'y a pas de données
 */
export default function EmptyState({ 
  icon = '📭',
  title,
  message,
  actionLabel,
  onAction,
  style = {}
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 40px',
      background: 'rgba(3, 9, 19, 0.6)',
      borderRadius: '15px',
      border: '2px solid #FF36A3',
      ...style
    }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '20px',
        animation: 'float 3s ease-in-out infinite'
      }}>
        {icon}
      </div>
      {title && (
        <h3 style={{
          margin: '0 0 15px 0',
          color: '#FF36A3',
          fontFamily: "'Shadows Into Light', cursive",
          fontSize: '1.5rem'
        }}>
          {title}
        </h3>
      )}
      {message && (
        <p style={{
          margin: '0 0 25px 0',
          color: '#F8F6F2',
          fontFamily: "'Protest Riot', sans-serif",
          fontSize: '1rem',
          lineHeight: '1.6',
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          {message}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            background: '#C10468',
            color: '#F8F6F2',
            border: '2px solid #FF36A3',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: "'Shadows Into Light', cursive",
            fontSize: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FF36A3';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(255, 54, 163, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#C10468';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {actionLabel}
        </button>
      )}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * EmptyState prédéfinis pour différents cas d'usage
 */
export function EmptyTournaments() {
  return (
    <EmptyState
      icon="🏆"
      title="Aucun tournoi disponible"
      message="Il n'y a pas de tournois pour le moment. Revenez plus tard ou créez-en un !"
    />
  );
}

export function EmptyComments() {
  return (
    <EmptyState
      icon="💭"
      title="Aucun commentaire"
      message="Soyez le premier à partager votre expérience sur ce tournoi !"
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon="🔔"
      title="Aucune notification"
      message="Vous êtes à jour ! Vous recevrez des notifications lorsque quelque chose se passe."
    />
  );
}

export function EmptyBadges() {
  return (
    <EmptyState
      icon="🎯"
      title="Aucun badge obtenu"
      message="Participez à des tournois pour débloquer vos premiers badges et achievements !"
    />
  );
}

export function EmptyTeams() {
  return (
    <EmptyState
      icon="👥"
      title="Aucune équipe"
      message="Créez votre première équipe ou rejoignez une équipe existante pour commencer à jouer !"
      actionLabel="Créer une équipe"
      onAction={() => window.location.href = '/create-team'}
    />
  );
}

export function EmptyMatches() {
  return (
    <EmptyState
      icon="⚔️"
      title="Aucun match"
      message="Les matchs apparaîtront ici une fois le tournoi lancé."
    />
  );
}

