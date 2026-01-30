import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from '../utils/toast';
import { notifyCommentLike, notifyCommentReply } from '../utils/notifications';
import { CommentSkeleton } from './Skeleton';
import { EmptyComments } from './EmptyState';
import { CommentForm, CommentItem } from './comments';

export default function CommentSection({ tournamentId, session }) {
  // Convex queries - comments are auto-refreshed via reactivity
  const commentsData = useQuery(
    api.comments.listByTournament,
    tournamentId ? { tournamentId, userId: session?.user?.id } : "skip"
  );
  
  // Convex mutations
  const createComment = useMutation(api.comments.create);
  const updateComment = useMutation(api.comments.update);
  const deleteComment = useMutation(api.comments.delete);
  const voteComment = useMutation(api.comments.vote);
  const createReply = useMutation(api.comments.createReply);

  const loading = commentsData === undefined;
  const comments = commentsData || [];

  const handleSubmitComment = async (content, rating) => {
    if (!session?.user) {
      toast.info('Connectez-vous pour commenter');
      return;
    }

    if (!content?.trim()) {
      toast.error('Le commentaire ne peut pas être vide');
      return;
    }

    try {
      await createComment({
        tournamentId,
        userId: session.user.id,
        content: content.trim(),
        rating: rating > 0 ? rating : undefined
      });

      toast.success('Commentaire ajouté !');
    } catch (err) {
      console.error('Erreur ajout commentaire:', err);
      toast.error(err.message || 'Erreur lors de l\'ajout du commentaire');
    }
  };

  const handleEditComment = async (commentId, newContent) => {
    if (!newContent?.trim()) {
      toast.error('Le commentaire ne peut pas être vide');
      return;
    }

    try {
      await updateComment({
        commentId,
        content: newContent.trim()
      });

      toast.success('Commentaire modifié !');
    } catch (err) {
      console.error('Erreur modification commentaire:', err);
      toast.error(err.message || 'Erreur lors de la modification du commentaire');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      return;
    }

    try {
      await deleteComment({ commentId });
      toast.success('Commentaire supprimé');
    } catch (err) {
      console.error('Erreur suppression commentaire:', err);
      toast.error(err.message || 'Erreur lors de la suppression du commentaire');
    }
  };

  const handleVote = async (commentId, voteType) => {
    if (!session?.user) {
      toast.info('Connectez-vous pour voter');
      return;
    }

    try {
      const comment = comments.find(c => c._id === commentId);
      const isLiking = voteType === 'like' && comment?.userVote !== 'like';

      await voteComment({
        commentId,
        userId: session.user.id,
        voteType
      });

      // Envoyer une notification seulement pour un nouveau like
      if (isLiking && comment?.userId && comment.userId !== session.user.id) {
        await notifyCommentLike(
          comment.userId,
          session.user.id,
          commentId,
          tournamentId,
          session.user.username || 'Un utilisateur'
        );
      }
    } catch (err) {
      console.error('Erreur vote:', err);
      toast.error(err.message || 'Erreur lors du vote');
    }
  };

  const handleReply = async (commentId, content) => {
    if (!content?.trim()) {
      toast.error('La réponse ne peut pas être vide');
      return;
    }

    try {
      const comment = comments.find(c => c._id === commentId);
      
      await createReply({
        commentId,
        userId: session.user.id,
        content: content.trim()
      });

      // Envoyer une notification au propriétaire du commentaire
      if (comment?.userId && comment.userId !== session.user.id) {
        await notifyCommentReply(
          comment.userId,
          session.user.id,
          commentId,
          tournamentId,
          session.user.username || 'Un utilisateur'
        );
      }

      toast.success('Réponse ajoutée !');
    } catch (err) {
      console.error('Erreur ajout réponse:', err);
      toast.error(err.message || 'Erreur lors de l\'ajout de la réponse');
    }
  };

  if (loading) {
    return (
      <div>
        {Array.from({ length: 3 }).map((_, i) => (
          <CommentSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(3, 9, 19, 0.95)',
      padding: '30px',
      borderRadius: '15px',
      border: '2px solid #06B6D4',
      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
    }}>
      <h3 style={{
        margin: '0 0 20px 0',
        color: '#06B6D4',
        fontFamily: "'Shadows Into Light', cursive",
        fontSize: '1.5rem'
      }}>
        💬 Commentaires ({comments.length})
      </h3>

      {/* Formulaire d'ajout de commentaire */}
      {session?.user && (
        <CommentForm onSubmit={handleSubmitComment} />
      )}

      {/* Liste des commentaires */}
      {comments.length === 0 ? (
        <EmptyComments />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              isOwner={session?.user?.id === comment.userId}
              isLoggedIn={!!session?.user}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              onVote={handleVote}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
