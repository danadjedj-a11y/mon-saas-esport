import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from '../utils/toast';
import { handleRateLimitError } from '../utils/rateLimitHandler';

export default function FollowButton({ session, tournamentId, teamId, type = 'tournament' }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    checkFollowStatus();
    fetchFollowersCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tournamentId, teamId, type]);

  const checkFollowStatus = async () => {
    if (!session?.user) return;

    try {
      const table = type === 'tournament' ? 'tournament_follows' : 'team_follows';
      const idField = type === 'tournament' ? 'tournament_id' : 'team_id';

      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('user_id', session.user.id)
        .eq(idField, type === 'tournament' ? tournamentId : teamId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erreur vérification follow:', error);
      } else {
        setIsFollowing(!!data);
      }
    } catch (err) {
      console.error('Erreur vérification follow:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowersCount = async () => {
    try {
      const table = type === 'tournament' ? 'tournament_follows' : 'team_follows';
      const idField = type === 'tournament' ? 'tournament_id' : 'team_id';

      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq(idField, type === 'tournament' ? tournamentId : teamId);

      if (error) {
        console.error('Erreur comptage followers:', error);
      } else {
        setFollowersCount(count || 0);
      }
    } catch (err) {
      console.error('Erreur comptage followers:', err);
    }
  };

  const handleToggleFollow = async () => {
    if (!session?.user) {
      toast.error('Vous devez être connecté pour suivre');
      return;
    }

    setLoading(true);

    try {
      const table = type === 'tournament' ? 'tournament_follows' : 'team_follows';
      const idField = type === 'tournament' ? 'tournament_id' : 'team_id';
      const idValue = type === 'tournament' ? tournamentId : teamId;

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', session.user.id)
          .eq(idField, idValue);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        toast.success(`Vous ne suivez plus ce ${type === 'tournament' ? 'tournoi' : 'équipe'}`);
      } else {
        // Follow
        const { error } = await supabase
          .from(table)
          .insert([{
            user_id: session.user.id,
            [idField]: idValue
          }]);

        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success(`Vous suivez maintenant ce ${type === 'tournament' ? 'tournoi' : 'équipe'}`);
      }
    } catch (err) {
      console.error('Erreur toggle follow:', err);
      const errorMessage = handleRateLimitError(err, 'actions de suivi');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) {
    return null; // Ne pas afficher le bouton si non connecté
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleToggleFollow}
        disabled={loading}
        className={`
          px-5 py-2.5 rounded-lg font-medium text-sm uppercase tracking-wide
          transition-all duration-300 flex items-center gap-2
          disabled:opacity-60 disabled:cursor-not-allowed
          ${isFollowing 
            ? 'bg-gradient-to-r from-violet-600 to-violet-700 border-2 border-violet-400 text-white shadow-glow-violet hover:from-violet-500 hover:to-violet-600' 
            : 'bg-transparent border-2 border-violet-500/50 text-violet-400 hover:bg-violet-500/20 hover:border-violet-400'
          }
          hover:-translate-y-0.5
        `}
      >
        {loading ? (
          <span className="animate-spin">⏳</span>
        ) : isFollowing ? (
          <>
            <span className="text-cyan-400">✓</span> Suivi
          </>
        ) : (
          <>
            <span>+</span> Suivre
          </>
        )}
      </button>
      {followersCount > 0 && (
        <span className="text-violet-400 text-sm">
          {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
        </span>
      )}
    </div>
  );
}

