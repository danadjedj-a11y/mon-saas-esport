import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from '../utils/toast';
import { handleRateLimitError } from '../utils/rateLimitHandler';
import { notifyCommentLike, notifyCommentReply } from '../utils/notifications';
import { CommentSkeleton } from './Skeleton';
import { EmptyComments } from './EmptyState';

export default function CommentSection({ tournamentId, session }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [replyContent, setReplyContent] = useState({});

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

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!session?.user) {
      toast.info('Connectez-vous pour commenter');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Le commentaire ne peut pas être vide');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_comments')
        .insert([{
          tournament_id: tournamentId,
          user_id: session.user.id,
          content: newComment.trim(),
          rating: rating > 0 ? rating : null
        }]);

      if (error) throw error;

      setNewComment('');
      setRating(0);
      toast.success('Commentaire ajouté !');
      fetchComments();
    } catch (err) {
      console.error('Erreur ajout commentaire:', err);
      const errorMessage = handleRateLimitError(err, 'commentaires');
      toast.error(errorMessage);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) {
      toast.error('Le commentaire ne peut pas être vide');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setEditingCommentId(null);
      setEditContent('');
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

  const handleReply = async (commentId) => {
    const content = replyContent[commentId];
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

      setReplyContent({ ...replyContent, [commentId]: '' });
      setExpandedReplies(new Set([...expandedReplies, commentId]));
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
      border: '2px solid #FF36A3',
      boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)'
    }}>
      <h3 style={{
        margin: '0 0 20px 0',
        color: '#FF36A3',
        fontFamily: "'Shadows Into Light', cursive",
        fontSize: '1.5rem'
      }}>
        💬 Commentaires ({comments.length})
      </h3>

      {/* Formulaire d'ajout de commentaire */}
      {session?.user && (
        <form onSubmit={handleSubmitComment} style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#F8F6F2',
              fontFamily: "'Protest Riot', sans-serif"
            }}>
              Votre note (optionnel)
            </label>
            <div style={{ display: 'flex', gap: '5px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    padding: '0',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <span style={{
                    color: (hoveredRating >= star || rating >= star) ? '#F8EC54' : '#FF36A3',
                    filter: (hoveredRating >= star || rating >= star) ? 'drop-shadow(0 0 8px #F8EC54)' : 'none'
                  }}>
                    ⭐
                  </span>
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Partagez votre expérience..."
            rows={4}
            maxLength={1000}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(3, 9, 19, 0.8)',
              border: '2px solid #C10468',
              color: '#F8F6F2',
              borderRadius: '8px',
              fontFamily: "'Protest Riot', sans-serif",
              resize: 'vertical',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FF36A3';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#C10468';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '10px'
          }}>
            <span style={{
              fontSize: '0.85rem',
              color: '#F8F6F2',
              fontFamily: "'Protest Riot', sans-serif",
              opacity: 0.7
            }}>
              {newComment.length}/1000 caractères
            </span>
            <button
              type="submit"
              style={{
                background: '#C10468',
                color: '#F8F6F2',
                border: '2px solid #FF36A3',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: "'Shadows Into Light', cursive",
                fontSize: '1rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FF36A3';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#C10468';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Publier
            </button>
          </div>
        </form>
      )}

      {/* Liste des commentaires */}
      {comments.length === 0 ? (
        <EmptyComments />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                background: 'rgba(3, 9, 19, 0.8)',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #C10468',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FF36A3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#C10468';
              }}
            >
              {/* En-tête du commentaire */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {comment.profiles?.avatar_url && (
                    <img
                      src={comment.profiles.avatar_url}
                      alt=""
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #FF36A3'
                      }}
                    />
                  )}
                  <div>
                    <div style={{
                      fontWeight: 'bold',
                      color: '#F8F6F2',
                      fontFamily: "'Shadows Into Light', cursive",
                      fontSize: '1.1rem'
                    }}>
                      {comment.profiles?.username || 'Utilisateur anonyme'}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#FF36A3',
                      fontFamily: "'Protest Riot', sans-serif"
                    }}>
                      {new Date(comment.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {comment.is_edited && <span style={{ marginLeft: '8px', opacity: 0.7 }}>(modifié)</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {comment.rating && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          style={{
                            color: star <= comment.rating ? '#F8EC54' : '#FF36A3',
                            fontSize: '1rem'
                          }}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                  )}
                  {session?.user?.id === comment.user_id && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditContent(comment.content);
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid #FF36A3',
                          color: '#FF36A3',
                          padding: '5px 10px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontFamily: "'Protest Riot', sans-serif"
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #C10468',
                          color: '#C10468',
                          padding: '5px 10px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontFamily: "'Protest Riot', sans-serif"
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Contenu du commentaire */}
              {editingCommentId === comment.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(3, 9, 19, 0.8)',
                      border: '2px solid #FF36A3',
                      color: '#F8F6F2',
                      borderRadius: '8px',
                      fontFamily: "'Protest Riot', sans-serif"
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleEditComment(comment.id)}
                      style={{
                        background: '#C10468',
                        color: '#F8F6F2',
                        border: '2px solid #FF36A3',
                        padding: '8px 15px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontFamily: "'Protest Riot', sans-serif"
                      }}
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditContent('');
                      }}
                      style={{
                        background: 'transparent',
                        color: '#F8F6F2',
                        border: '2px solid #C10468',
                        padding: '8px 15px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontFamily: "'Protest Riot', sans-serif"
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{
                  color: '#F8F6F2',
                  fontFamily: "'Protest Riot', sans-serif",
                  lineHeight: '1.6',
                  margin: '0 0 15px 0'
                }}>
                  {comment.content}
                </p>
              )}

              {/* Actions (votes, réponse) */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '15px',
                borderTop: '1px solid rgba(255, 54, 163, 0.3)'
              }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleVote(comment.id, 'like')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: comment.userVote === 'like' ? '#C10468' : '#FF36A3',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontFamily: "'Protest Riot', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    👍 {comment.likes}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote(comment.id, 'dislike')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: comment.userVote === 'dislike' ? '#C10468' : '#FF36A3',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontFamily: "'Protest Riot', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    👎 {comment.dislikes}
                  </button>
                  {session?.user && (
                    <button
                      type="button"
                      onClick={() => {
                        const newExpanded = new Set(expandedReplies);
                        if (newExpanded.has(comment.id)) {
                          newExpanded.delete(comment.id);
                        } else {
                          newExpanded.add(comment.id);
                        }
                        setExpandedReplies(newExpanded);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#FF36A3',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontFamily: "'Protest Riot', sans-serif"
                      }}
                    >
                      💬 Répondre ({comment.replies.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Zone de réponse */}
              {expandedReplies.has(comment.id) && session?.user && (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 54, 163, 0.2)' }}>
                  <textarea
                    value={replyContent[comment.id] || ''}
                    onChange={(e) => setReplyContent({ ...replyContent, [comment.id]: e.target.value })}
                    placeholder="Écrivez votre réponse..."
                    rows={2}
                    maxLength={500}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(3, 9, 19, 0.8)',
                      border: '2px solid #C10468',
                      color: '#F8F6F2',
                      borderRadius: '8px',
                      fontFamily: "'Protest Riot', sans-serif",
                      marginBottom: '10px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleReply(comment.id)}
                    style={{
                      background: '#C10468',
                      color: '#F8F6F2',
                      border: '2px solid #FF36A3',
                      padding: '8px 15px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontFamily: "'Protest Riot', sans-serif"
                    }}
                  >
                    Publier la réponse
                  </button>
                </div>
              )}

              {/* Réponses */}
              {comment.replies.length > 0 && (
                <div style={{ marginTop: '15px', paddingLeft: '20px', borderLeft: '3px solid #FF36A3' }}>
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      style={{
                        background: 'rgba(3, 9, 19, 0.6)',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        {reply.profiles?.avatar_url && (
                          <img
                            src={reply.profiles.avatar_url}
                            alt=""
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #FF36A3'
                            }}
                          />
                        )}
                        <span style={{
                          fontWeight: 'bold',
                          color: '#FF36A3',
                          fontFamily: "'Shadows Into Light', cursive",
                          fontSize: '0.9rem'
                        }}>
                          {reply.profiles?.username || 'Utilisateur anonyme'}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#F8F6F2',
                          fontFamily: "'Protest Riot', sans-serif",
                          opacity: 0.7
                        }}>
                          {new Date(reply.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p style={{
                        color: '#F8F6F2',
                        fontFamily: "'Protest Riot', sans-serif",
                        fontSize: '0.9rem',
                        margin: 0,
                        lineHeight: '1.5'
                      }}>
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

