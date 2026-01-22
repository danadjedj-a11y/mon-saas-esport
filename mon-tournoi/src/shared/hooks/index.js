/**
 * Hooks réutilisables - Index
 * Export centralisé de tous les hooks
 */

export { useAuth } from './useAuth';
export { useSupabaseQuery } from './useSupabaseQuery';
export { useSupabaseSubscription } from './useSupabaseSubscription';
export { useDebounce } from './useDebounce';
export { useOnlineStatus } from './useOnlineStatus';
export { default as useActiveMatch } from './useActiveMatch';
export { useTournamentActions, triggerConfetti } from './useTournamentActions';
export { useMatchProgression } from './useMatchProgression';
export { useScoreReporting } from './useScoreReporting';
export { useTournamentAdmin } from './useTournamentAdmin';
export { useRoundCheckIn } from './useRoundCheckIn';

// Hooks features
export { useTournament } from '../../features/tournaments/hooks/useTournament';
export { useMatch } from '../../features/matches/hooks/useMatch';
export { useTeam } from '../../features/teams/hooks/useTeam';
