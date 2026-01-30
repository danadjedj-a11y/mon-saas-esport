import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

/**
 * Hook to get the active match for the current user
 * Uses Convex for real-time updates (automatic via useQuery)
 */
export default function useActiveMatch(session) {
  // Get user's active match via Convex query
  const activeMatch = useQuery(
    api.matches.getActiveMatch,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  // Loading state: undefined means still loading
  const loading = session?.user?.id && activeMatch === undefined;
  
  return {
    activeMatch: activeMatch || null,
    loading,
    error: null, // Convex handles errors internally
    refetch: () => {}, // Not needed with Convex - data is reactive
  };
}
