import React from 'react';

/**
 * Actions d'un commentaire (votes, répondre)
 */
export default function CommentActions({
  likes,
  dislikes,
  userVote,
  repliesCount,
  onVote,
  onToggleReply,
  showReplyButton = true
}) {
  return (
    <div className="flex justify-between items-center pt-4 border-t border-primary/30">
      <div className="flex gap-4 items-center">
        <button
          type="button"
          onClick={() => onVote('like')}
          className={`bg-transparent border-none cursor-pointer text-base font-heading flex items-center gap-1 hover:scale-110 transition-transform ${
            userVote === 'like' ? 'text-secondary' : 'text-primary'
          }`}
        >
          👍 {likes}
        </button>
        <button
          type="button"
          onClick={() => onVote('dislike')}
          className={`bg-transparent border-none cursor-pointer text-base font-heading flex items-center gap-1 hover:scale-110 transition-transform ${
            userVote === 'dislike' ? 'text-secondary' : 'text-primary'
          }`}
        >
          👎 {dislikes}
        </button>
        {showReplyButton && (
          <button
            type="button"
            onClick={onToggleReply}
            className="bg-transparent border-none text-primary cursor-pointer text-sm font-heading hover:text-secondary transition-colors"
          >
            💬 Répondre ({repliesCount})
          </button>
        )}
      </div>
    </div>
  );
}
