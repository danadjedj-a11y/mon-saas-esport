import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from '../utils/toast';

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
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) {
    return null; // Ne pas afficher le bouton si non connecté
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        type="button"
        onClick={handleToggleFollow}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: isFollowing ? '#C10468' : 'transparent',
          border: `2px solid ${isFollowing ? '#FF36A3' : '#C10468'}`,
          color: '#F8F6F2',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Shadows Into Light', cursive",
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          transition: 'all 0.3s ease',
          opacity: loading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = isFollowing ? '#FF36A3' : '#C10468';
            e.currentTarget.style.borderColor = isFollowing ? '#C10468' : '#FF36A3';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = isFollowing ? '#C10468' : 'transparent';
            e.currentTarget.style.borderColor = isFollowing ? '#FF36A3' : '#C10468';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        {loading ? (
          '⏳'
        ) : isFollowing ? (
          <>
            <span>✓</span> Suivi
          </>
        ) : (
          <>
            <span>+</span> Suivre
          </>
        )}
      </button>
      {followersCount > 0 && (
        <span style={{
          color: '#FF36A3',
          fontSize: '0.85rem',
          fontFamily: "'Protest Riot', sans-serif"
        }}>
          {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
        </span>
      )}
    </div>
  );
}

