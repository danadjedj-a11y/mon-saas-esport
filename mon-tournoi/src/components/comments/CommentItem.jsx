import React, { useState } from 'react';
import StarRating from './StarRating';
import CommentActions from './CommentActions';
import ReplyForm from './ReplyForm';
import ReplyItem from './ReplyItem';

/**
 * Affichage d'un commentaire individuel
 */
export default function CommentItem({
  comment,
  isOwner,
  isLoggedIn,
  onEdit,
  onDelete,
  onVote,
  onReply
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(comment.id, editContent);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleReply = (content) => {
    if (onReply) {
      onReply(comment.id, content);
    }
  };

  return (
    <div className="bg-background/80 p-5 rounded-xl border-2 border-secondary transition-all duration-300 hover:border-primary">
      {/* En-tête du commentaire */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          {comment.profiles?.avatar_url && (
            <img
              src={comment.profiles.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover border-2 border-primary"
            />
          )}
          <div>
            <div className="font-bold text-text font-body text-lg">
              {comment.profiles?.username || 'Utilisateur anonyme'}
            </div>
            <div className="text-sm text-primary font-heading">
              {new Date(comment.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
              {comment.is_edited && <span className="ml-2 opacity-70">(modifié)</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 items-center">
          {comment.rating && (
            <StarRating rating={comment.rating} readOnly size="sm" />
          )}
          {isOwner && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="bg-transparent border border-primary text-primary px-2.5 py-1 rounded cursor-pointer text-xs font-heading hover:bg-primary/10"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => onDelete && onDelete(comment.id)}
                className="bg-transparent border border-secondary text-secondary px-2.5 py-1 rounded cursor-pointer text-xs font-heading hover:bg-secondary/10"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenu du commentaire */}
      {isEditing ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full p-2.5 bg-background/80 border-2 border-primary text-text rounded-lg font-heading"
          />
          <div className="flex gap-2.5 mt-2.5">
            <button
              type="button"
              onClick={handleSaveEdit}
              className="bg-secondary text-text border-2 border-primary px-4 py-2 rounded-lg cursor-pointer font-heading hover:bg-primary"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-transparent text-text border-2 border-secondary px-4 py-2 rounded-lg cursor-pointer font-heading hover:bg-secondary/10"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <p className="text-text font-heading leading-relaxed mb-4">
          {comment.content}
        </p>
      )}

      {/* Actions (votes, réponse) */}
      <CommentActions
        likes={comment.likes}
        dislikes={comment.dislikes}
        userVote={comment.userVote}
        repliesCount={comment.replies?.length || 0}
        onVote={(voteType) => onVote && onVote(comment.id, voteType)}
        onToggleReply={() => setShowReplies(!showReplies)}
        showReplyButton={isLoggedIn}
      />

      {/* Zone de réponse */}
      {showReplies && isLoggedIn && (
        <ReplyForm onSubmit={handleReply} />
      )}

      {/* Réponses */}
      {comment.replies?.length > 0 && (
        <div className="mt-4 pl-5 border-l-4 border-primary">
          {comment.replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} />
          ))}
        </div>
      )}
    </div>
  );
}
