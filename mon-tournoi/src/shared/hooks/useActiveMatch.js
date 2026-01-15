import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

/**
 * Hook to get the active match for the current user
 * Returns match details and real-time updates
 */
export default function useActiveMatch(session) {
  const [activeMatch, setActiveMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActiveMatch = useCallback(async () => {
    if (!session?.user?.id) {
      setActiveMatch(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user's teams
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', session.user.id);

      if (teamError) throw teamError;

      if (!teamMembers || teamMembers.length === 0) {
        setActiveMatch(null);
        setLoading(false);
        return;
      }

      const teamIds = teamMembers.map(tm => tm.team_id);

      // Find active matches for user's teams
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          tournaments:tournament_id (
            id,
            name,
            game,
            status
          ),
          team1:player1_id (
            id,
            name,
            tag,
            logo_url
          ),
          team2:player2_id (
            id,
            name,
            tag,
            logo_url
          )
        `)
        .in('player1_id', teamIds)
        .or(`player2_id.in.(${teamIds.join(',')})`)
        .in('status', ['pending', 'ongoing'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (matchError) throw matchError;

      if (matches && matches.length > 0) {
        const match = matches[0];
        
        // Determine if user's team is team1 or team2
        const isTeam1 = teamIds.includes(match.player1_id);
        
        setActiveMatch({
          ...match,
          isUserTeam1: isTeam1,
          userTeamId: isTeam1 ? match.player1_id : match.player2_id,
          opponentTeamId: isTeam1 ? match.player2_id : match.player1_id,
        });
      } else {
        setActiveMatch(null);
      }
    } catch (err) {
      console.error('Error fetching active match:', err);
      setError(err.message);
      setActiveMatch(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchActiveMatch();
  }, [fetchActiveMatch]);

  // Set up real-time subscription
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('active-match-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          // Refetch when matches change
          fetchActiveMatch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchActiveMatch]);

  return {
    activeMatch,
    loading,
    error,
    refetch: fetchActiveMatch,
  };
}
