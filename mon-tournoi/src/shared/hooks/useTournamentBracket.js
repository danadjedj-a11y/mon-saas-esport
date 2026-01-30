import { useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

/**
 * Custom hook for tournament bracket operations
 * Utilise Convex pour toutes les opérations de bracket
 */
export function useTournamentBracket(tournament, participants) {
    // Récupérer les matchs du tournoi via Convex (temps réel)
    const matches = useQuery(
        api.matches.listByTournament,
        tournament?._id ? { tournamentId: tournament._id } : "skip"
    ) || [];

    // Récupérer les phases du tournoi
    const phases = useQuery(
        api.tournamentPhases.listByTournament,
        tournament?._id ? { tournamentId: tournament._id } : "skip"
    ) || [];

    // Mutations Convex
    const batchCreateMatches = useMutation(api.matchesMutations.batchCreate);
    const deleteAllMatches = useMutation(api.matchesMutations.deleteAllByTournament);
    const updateMatchScore = useMutation(api.matchesMutations.updateScore);
    const handleMatchProgression = useMutation(api.matchesMutations.handleProgression);
    
    // Swiss mutations
    const initializeSwiss = useMutation(api.swissMutations.initializeScores);
    const generateSwiss = useMutation(api.swissMutations.generateNextRound);
    const updateSwissAfterMatch = useMutation(api.swissMutations.updateScoresAfterMatch);

    // Loading state basé sur les queries Convex
    const loading = tournament?._id && matches === undefined;
    const error = null; // Convex gère les erreurs internement

    // Generate bracket for elimination/double elimination
    const generateEliminationBracket = useCallback(async (participantsList, deleteExisting = true) => {
        if (!tournament?._id || !participantsList?.length) return { success: false };

        try {
            const size = participantsList.length;
            const rounds = Math.ceil(Math.log2(size));
            const bracketSize = Math.pow(2, rounds);

            // Determine format
            const format = tournament.format || 'elimination';
            const isDoubleElim = format === 'double_elimination';

            // Delete existing matches if needed
            if (deleteExisting) {
                await deleteAllMatches({ tournamentId: tournament._id });
            }

            // Seed participants
            const seeded = [...participantsList].sort((a, b) => (a.seed || 999) - (b.seed || 999));

            // Generate winners bracket matches
            const matchesToInsert = [];
            let matchNumber = 1;

            // First round - pair participants
            const firstRoundParticipants = seeded.slice(0, bracketSize);

            for (let i = 0; i < bracketSize / 2; i++) {
                const p1 = firstRoundParticipants[i];
                const p2 = firstRoundParticipants[bracketSize - 1 - i];

                matchesToInsert.push({
                    tournamentId: tournament._id,
                    round: 1,
                    matchNumber: matchNumber++,
                    isLosersBracket: false,
                    team1Id: p1?._id || null,
                    team2Id: p2?._id || null,
                    status: p1 && p2 ? 'pending' : 'completed',
                    winnerId: !p2 ? p1?._id : (!p1 ? p2?._id : null),
                    scoreTeam1: 0,
                    scoreTeam2: 0,
                    bestOf: tournament.bestOf || 1,
                    currentGame: 1,
                });
            }

            // Generate remaining rounds
            let prevRoundMatchCount = bracketSize / 2;
            for (let round = 2; round <= rounds; round++) {
                const roundMatchCount = prevRoundMatchCount / 2;
                for (let i = 0; i < roundMatchCount; i++) {
                    matchesToInsert.push({
                        tournamentId: tournament._id,
                        round: round,
                        matchNumber: matchNumber++,
                        isLosersBracket: false,
                        team1Id: null,
                        team2Id: null,
                        status: 'pending',
                        scoreTeam1: 0,
                        scoreTeam2: 0,
                        bestOf: tournament.bestOf || 1,
                        currentGame: 1,
                    });
                }
                prevRoundMatchCount = roundMatchCount;
            }

            // Generate losers bracket for double elimination
            if (isDoubleElim) {
                const losersRounds = (rounds - 1) * 2;
                let losersMatchNumber = 1;

                for (let round = 1; round <= losersRounds; round++) {
                    const matchesInRound = Math.max(1, Math.floor(bracketSize / Math.pow(2, Math.ceil(round / 2) + 1)));

                    for (let i = 0; i < matchesInRound; i++) {
                        matchesToInsert.push({
                            tournamentId: tournament._id,
                            round: round,
                            matchNumber: losersMatchNumber++,
                            isLosersBracket: true,
                            team1Id: null,
                            team2Id: null,
                            status: 'pending',
                            scoreTeam1: 0,
                            scoreTeam2: 0,
                            bestOf: tournament.bestOf || 1,
                            currentGame: 1,
                        });
                    }
                }

                // Grand Final
                matchesToInsert.push({
                    tournamentId: tournament._id,
                    round: 1,
                    matchNumber: 1,
                    bracketPosition: 'grand_final',
                    isLosersBracket: false,
                    team1Id: null,
                    team2Id: null,
                    status: 'pending',
                    scoreTeam1: 0,
                    scoreTeam2: 0,
                    bestOf: tournament.bestOf || 3,
                    currentGame: 1,
                });
            }

            // Insert all matches
            await batchCreateMatches({ matches: matchesToInsert });

            return { success: true };
        } catch (err) {
            console.error('Error generating bracket:', err);
            return { success: false, error: err.message };
        }
    }, [tournament, batchCreateMatches, deleteAllMatches]);

    // Generate Swiss round
    const generateSwissRound = useCallback(async (roundNumber = 1) => {
        if (!tournament?._id || !participants?.length) return { success: false };

        try {
            // Initialize Swiss scores if first round
            if (roundNumber === 1) {
                const teamIds = participants.map(p => p.teamId || p._id);
                await initializeSwiss({ 
                    tournamentId: tournament._id, 
                    teamIds 
                });
            }

            // Generate next round using Convex mutation
            const result = await generateSwiss({ 
                tournamentId: tournament._id,
                roundNumber 
            });

            return { success: true, byes: result.byes || [] };
        } catch (err) {
            console.error('Error generating Swiss round:', err);
            return { success: false, error: err.message };
        }
    }, [tournament, participants, initializeSwiss, generateSwiss]);

    // Update match result
    const updateMatchResult = useCallback(async (matchId, winnerId, score1, score2) => {
        try {
            await updateMatchScore({
                matchId,
                scoreTeam1: score1,
                scoreTeam2: score2,
                winnerId,
            });

            // Handle bracket progression for elimination formats
            if (tournament?.format === 'elimination' || tournament?.format === 'double_elimination') {
                await handleMatchProgression({ matchId });
            }

            // Update Swiss scores if Swiss format
            if (tournament?.format === 'swiss') {
                await updateSwissAfterMatch({
                    tournamentId: tournament._id,
                    matchId,
                });
            }

            return { success: true };
        } catch (err) {
            console.error('Error updating match result:', err);
            return { success: false, error: err.message };
        }
    }, [tournament, updateMatchScore, handleMatchProgression, updateSwissAfterMatch]);

    // Refetch is not needed with Convex - data is reactive
    const fetchBracketData = useCallback(() => {
        // No-op: Convex queries are automatically reactive
    }, []);

    return {
        matches,
        phases,
        loading,
        error,
        fetchBracketData,
        generateEliminationBracket,
        generateSwissRound,
        updateMatchResult,
    };
}

export default useTournamentBracket;
