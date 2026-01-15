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
      // Match where user's team is either player1 OR player2
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          tournaments:tournament_id (
            id,
            name,
            game,
            status
          )
        `)
        .or(`player1_id.in.(${teamIds.join(',')}),player2_id.in.(${teamIds.join(',')})`)
        .in('status', ['pending', 'ongoing'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (matchError) throw matchError;

      // Fetch team details separately if match found
      let team1Data = null;
      let team2Data = null;
      if (matches && matches.length > 0) {
        const match = matches[0];
        const teamIdsToFetch = [match.player1_id, match.player2_id].filter(Boolean);
        if (teamIdsToFetch.length > 0) {
          const { data: teamsData } = await supabase
            .from('teams')
            .select('id, name, tag, logo_url')
            .in('id', teamIdsToFetch);
          if (teamsData) {
            team1Data = teamsData.find(t => t.id === match.player1_id) || null;
            team2Data = teamsData.find(t => t.id === match.player2_id) || null;
          }
        }
      }

      if (matches && matches.length > 0) {
        const match = matches[0];
        
        // Determine if user's team is team1 or team2
        const isTeam1 = teamIds.includes(match.player1_id);
        
        setActiveMatch({
          ...match,
          team1: team1Data,
          team2: team2Data,
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
