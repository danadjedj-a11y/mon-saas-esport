import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from '../utils/toast';

export default function FollowButton({ tournamentId, teamId, type = 'tournament' }) {
  const [loading, setLoading] = useState(false);

  // Get current user from Convex
  const currentUser = useQuery(api.users.getCurrent);

  // Query for follow status (tournament)
  const isFollowingTournament = useQuery(
    api.follows.isFollowingTournament,
    currentUser && type === 'tournament' && tournamentId
      ? { userId: currentUser._id, tournamentId }
      : 'skip'
  );

  // Query for follow status (team)
  const isFollowingTeam = useQuery(
    api.follows.isFollowingTeam,
    currentUser && type === 'team' && teamId
      ? { userId: currentUser._id, teamId }
      : 'skip'
  );

  // Query for followers count (tournament)
  const tournamentFollowersCount = useQuery(
    api.follows.getTournamentFollowersCount,
    type === 'tournament' && tournamentId ? { tournamentId } : 'skip'
  );

  // Query for followers count (team)
  const teamFollowersCount = useQuery(
    api.follows.getTeamFollowersCount,
    type === 'team' && teamId ? { teamId } : 'skip'
  );

  // Mutations
  const toggleTournamentFollow = useMutation(api.follows.toggleTournamentFollow);
  const toggleTeamFollow = useMutation(api.follows.toggleTeamFollow);

  // Derived state
  const isFollowing = type === 'tournament' ? isFollowingTournament : isFollowingTeam;
  const followersCount = type === 'tournament' ? tournamentFollowersCount : teamFollowersCount;
  const isLoading = isFollowing === undefined || followersCount === undefined;

  const handleToggleFollow = async () => {
    if (!currentUser) {
      toast.error('Vous devez être connecté pour suivre');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (type === 'tournament' && tournamentId) {
        result = await toggleTournamentFollow({
          userId: currentUser._id,
          tournamentId,
        });
      } else if (type === 'team' && teamId) {
        result = await toggleTeamFollow({
          userId: currentUser._id,
          teamId,
        });
      }

      if (result?.action === 'unfollowed') {
        toast.success(`Vous ne suivez plus ${type === 'tournament' ? 'ce tournoi' : 'cette équipe'}`);
      } else if (result?.action === 'followed') {
        toast.success(`Vous suivez maintenant ${type === 'tournament' ? 'ce tournoi' : 'cette équipe'}`);
      }
    } catch (err) {
      console.error('Erreur toggle follow:', err);
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no user or still loading user
  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleToggleFollow}
        disabled={loading || isLoading}
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
        {loading || isLoading ? (
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
      {followersCount != null && followersCount > 0 && (
        <span className="text-violet-400 text-sm">
          {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
        </span>
      )}
    </div>
  );
}

