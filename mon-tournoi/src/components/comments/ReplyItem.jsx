import React from 'react';

/**
 * Affichage d'une réponse à un commentaire
 */
export default function ReplyItem({ reply }) {
  return (
    <div className="bg-background/60 p-4 rounded-lg mb-2.5">
      <div className="flex items-center gap-2.5 mb-2">
        {reply.profiles?.avatar_url && (
          <img
            src={reply.profiles.avatar_url}
            alt=""
            className="w-8 h-8 rounded-full object-cover border-2 border-primary"
          />
        )}
        <span className="font-bold text-primary font-body text-sm">
          {reply.profiles?.username || 'Utilisateur anonyme'}
        </span>
        <span className="text-xs text-text/70 font-heading">
          {new Date(reply.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
      <p className="text-text font-heading text-sm m-0 leading-relaxed">
        {reply.content}
      </p>
    </div>
  );
}
