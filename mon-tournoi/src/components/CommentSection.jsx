import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from '../utils/toast';
import { handleRateLimitError } from '../utils/rateLimitHandler';
import { notifyCommentLike, notifyCommentReply } from '../utils/notifications';
import { CommentSkeleton } from './Skeleton';
import { EmptyComments } from './EmptyState';
import { CommentForm, CommentItem } from './comments';

export default function CommentSection({ tournamentId, session }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
    const channel = supabase
      .channel(`tournament_comments:${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_comments',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_comments')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les profils pour tous les utilisateurs uniques
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const profilesMap = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        
        if (profiles) {
          profiles.forEach(p => {
            profilesMap[p.id] = p;
          });
        }
      }

      // Charger les réponses pour chaque commentaire
      const commentsWithReplies = await Promise.all((data || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('comment_replies')
          .select('*')
          .eq('comment_id', comment.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: true });

        // Récupérer les profils pour les réponses
        const replyUserIds = [...new Set((replies || []).map(r => r.user_id))];
        const replyProfilesMap = {};
        
        if (replyUserIds.length > 0) {
          const { data: replyProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', replyUserIds);
          
          if (replyProfiles) {
            replyProfiles.forEach(p => {
              replyProfilesMap[p.id] = p;
            });
          }
        }

        // Enrichir les réponses avec les profils
        const enrichedReplies = (replies || []).map(reply => ({
          ...reply,
          profiles: replyProfilesMap[reply.user_id] || null
        }));

        // Charger les votes pour chaque commentaire
        const { data: votes } = await supabase
          .from('comment_votes')
          .select('*')
          .eq('comment_id', comment.id);

        const likes = votes?.filter(v => v.vote_type === 'like').length || 0;
        const dislikes = votes?.filter(v => v.vote_type === 'dislike').length || 0;
        const userVote = votes?.find(v => v.user_id === session?.user?.id);

        return {
          ...comment,
          profiles: profilesMap[comment.user_id] || null,
          replies: enrichedReplies,
          likes,
          dislikes,
          userVote: userVote?.vote_type || null
        };
      }));

      setComments(commentsWithReplies);
    } catch (err) {
      console.error('Erreur chargement commentaires:', err);
      toast.error('Erreur lors du chargement des commentaires');
    } finally {
      setLoading(false);
    }
  };

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
      const { error } = await supabase
        .from('tournament_comments')
        .insert([{
          tournament_id: tournamentId,
          user_id: session.user.id,
          content: content.trim(),
          rating: rating > 0 ? rating : null
        }]);

      if (error) throw error;

      toast.success('Commentaire ajouté !');
      fetchComments();
    } catch (err) {
      console.error('Erreur ajout commentaire:', err);
      const errorMessage = handleRateLimitError(err, 'commentaires');
      toast.error(errorMessage);
    }
  };

  const handleEditComment = async (commentId, newContent) => {
    if (!newContent?.trim()) {
      toast.error('Le commentaire ne peut pas être vide');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_comments')
        .update({ content: newContent.trim() })
        .eq('id', commentId)
        .eq('user_id', session.user.id);

      if (error) throw error;

      toast.success('Commentaire modifié !');
      fetchComments();
    } catch (err) {
      console.error('Erreur modification commentaire:', err);
      const errorMessage = handleRateLimitError(err, 'commentaires');
      toast.error(errorMessage);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_comments')
        .update({ is_deleted: true })
        .eq('id', commentId)
        .eq('user_id', session.user.id);

      if (error) throw error;

      toast.success('Commentaire supprimé');
      fetchComments();
    } catch (err) {
      console.error('Erreur suppression commentaire:', err);
      const errorMessage = handleRateLimitError(err, 'commentaires');
      toast.error(errorMessage);
    }
  };

  const handleVote = async (commentId, voteType) => {
    if (!session?.user) {
      toast.info('Connectez-vous pour voter');
      return;
    }

    try {
      const comment = comments.find(c => c.id === commentId);
      const currentVote = comment?.userVote;
      const _wasLiked = currentVote === 'like';
      const isLiking = voteType === 'like' && currentVote !== 'like';

      if (currentVote === voteType) {
        // Retirer le vote - pas de notification
        const { error } = await supabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', session.user.id);

        if (error) throw error;
      } else {
        // Ajouter ou modifier le vote
        const { error } = await supabase
          .from('comment_votes')
          .upsert([{
            comment_id: commentId,
            user_id: session.user.id,
            vote_type: voteType
          }], {
            onConflict: 'comment_id,user_id'
          });

        if (error) throw error;

        // Envoyer une notification seulement pour un nouveau like (pas pour dislike)
        // Et seulement si l'utilisateur n'avait pas déjà liké (pour éviter le spam)
        if (isLiking && comment?.user_id && comment.user_id !== session.user.id) {
          // Récupérer le nom d'utilisateur
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single();
          
          await notifyCommentLike(
            comment.user_id,
            session.user.id,
            commentId,
            tournamentId,
            profile?.username || 'Un utilisateur'
          );
        }
      }

      fetchComments();
    } catch (err) {
      console.error('Erreur vote:', err);
      const errorMessage = handleRateLimitError(err, 'commentaires');
      toast.error(errorMessage);
    }
  };

  const handleReply = async (commentId, content) => {
    if (!content?.trim()) {
      toast.error('La réponse ne peut pas être vide');
      return;
    }

    try {
      const comment = comments.find(c => c.id === commentId);
      
      const { error } = await supabase
        .from('comment_replies')
        .insert([{
          comment_id: commentId,
          user_id: session.user.id,
          content: content.trim()
        }]);

      if (error) throw error;

      // Envoyer une notification au propriétaire du commentaire
      if (comment?.user_id && comment.user_id !== session.user.id) {
        // Récupérer le nom d'utilisateur
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();
        
        await notifyCommentReply(
          comment.user_id,
          session.user.id,
          commentId,
          tournamentId,
          profile?.username || 'Un utilisateur'
        );
      }

      toast.success('Réponse ajoutée !');
      fetchComments();
    } catch (err) {
      console.error('Erreur ajout réponse:', err);
      const errorMessage = handleRateLimitError(err, 'commentaires');
      toast.error(errorMessage);
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
              key={comment.id}
              comment={comment}
              isOwner={session?.user?.id === comment.user_id}
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
