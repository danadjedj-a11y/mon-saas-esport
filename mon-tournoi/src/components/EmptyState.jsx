import React from 'react';

/**
 * Composant EmptyState pour afficher des messages engageants quand il n'y a pas de données
 * Design System: Neon Glass
 */
export default function EmptyState({ 
  icon = '📭',
  title,
  message,
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`text-center py-16 px-10 glass-card border-violet-500/30 rounded-2xl ${className}`}>
      {/* Icône animée */}
      <div className="text-6xl mb-5 animate-float">
        {icon}
      </div>

      {/* Titre */}
      {title && (
        <h3 className="font-display text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4 drop-shadow-glow">
          {title}
        </h3>
      )}

      {/* Message */}
      {message && (
        <p className="text-gray-400 leading-relaxed max-w-md mx-auto mb-6">
          {message}
        </p>
      )}

      {/* Bouton d'action optionnel */}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-primary px-6 py-3 rounded-lg font-medium uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-glow-violet"
        >
          {actionLabel}
        </button>
      )}
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

