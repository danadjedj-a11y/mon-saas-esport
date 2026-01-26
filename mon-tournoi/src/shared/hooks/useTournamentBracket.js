import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { swissPairing, initializeSwissScores, recalculateBuchholzScores } from '../../swissUtils';

/**
 * Custom hook for tournament bracket operations
 * Extracted from Tournament.jsx to reduce complexity
 */
export function useTournamentBracket(tournament, participants) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [matches, setMatches] = useState([]);
    const [phases, setPhases] = useState([]);

    // Fetch phases and matches
    const fetchBracketData = useCallback(async () => {
        if (!tournament?.id) return;

        try {
            setLoading(true);
            setError(null);

            // Fetch phases
            const { data: phasesData, error: phasesError } = await supabase
                .from('tournament_phases')
                .select('*')
                .eq('tournament_id', tournament.id)
                .order('phase_order', { ascending: true });

            if (phasesError) throw phasesError;
            setPhases(phasesData || []);

            // Fetch matches
            const { data: matchesData, error: matchesError } = await supabase
                .from('matches')
                .select(`
          *,
          player1:participants!matches_player1_id_fkey(
            id, team_id, seed,
            team:teams(id, name, logo_url, tag)
          ),
          player2:participants!matches_player2_id_fkey(
            id, team_id, seed,
            team:teams(id, name, logo_url, tag)
          )
        `)
                .eq('tournament_id', tournament.id)
                .order('round_number', { ascending: true })
                .order('match_number', { ascending: true });

            if (matchesError) throw matchesError;
            setMatches(matchesData || []);

        } catch (err) {
            setError(err.message);
            console.error('Error fetching bracket data:', err);
        } finally {
            setLoading(false);
        }
    }, [tournament?.id]);

    // Generate bracket for elimination/double elimination
    const generateEliminationBracket = useCallback(async (participantsList, deleteExisting = true) => {
        if (!tournament?.id || !participantsList?.length) return;

        try {
            setLoading(true);
            setError(null);

            const size = participantsList.length;
            const rounds = Math.ceil(Math.log2(size));
            const bracketSize = Math.pow(2, rounds);

            // Determine format
            const format = tournament.format || 'elimination';
            const isDoubleElim = format === 'double_elimination';

            // Delete existing matches if needed
            if (deleteExisting) {
                await supabase
                    .from('matches')
                    .delete()
                    .eq('tournament_id', tournament.id);
            }

            // Seed participants
            const seeded = [...participantsList].sort((a, b) => (a.seed || 999) - (b.seed || 999));

            // Generate winners bracket matches
            const matchesToInsert = [];
            let matchNumber = 1;

            // First round - pair participants
            const firstRoundParticipants = seeded.slice(0, bracketSize);
            const firstRoundMatches = [];

            for (let i = 0; i < bracketSize / 2; i++) {
                const p1 = firstRoundParticipants[i];
                const p2 = firstRoundParticipants[bracketSize - 1 - i];

                firstRoundMatches.push({
                    tournament_id: tournament.id,
                    round_number: 1,
                    match_number: matchNumber++,
                    bracket_type: 'winners',
                    player1_id: p1?.id || null,
                    player2_id: p2?.id || null,
                    status: p1 && p2 ? 'pending' : 'completed',
                    winner_id: !p2 ? p1?.id : (!p1 ? p2?.id : null),
                });
            }

            matchesToInsert.push(...firstRoundMatches);

            // Generate remaining rounds
            let prevRoundMatchCount = firstRoundMatches.length;
            for (let round = 2; round <= rounds; round++) {
                const roundMatchCount = prevRoundMatchCount / 2;
                for (let i = 0; i < roundMatchCount; i++) {
                    matchesToInsert.push({
                        tournament_id: tournament.id,
                        round_number: round,
                        match_number: matchNumber++,
                        bracket_type: 'winners',
                        player1_id: null,
                        player2_id: null,
                        status: 'pending',
                    });
                }
                prevRoundMatchCount = roundMatchCount;
            }

            // Generate losers bracket for double elimination
            if (isDoubleElim) {
                const losersRounds = (rounds - 1) * 2;
                let losersMatchNumber = 1;

                for (let round = 1; round <= losersRounds; round++) {
                    // Calculate matches for this losers round
                    const matchesInRound = Math.max(1, Math.floor(bracketSize / Math.pow(2, Math.ceil(round / 2) + 1)));

                    for (let i = 0; i < matchesInRound; i++) {
                        matchesToInsert.push({
                            tournament_id: tournament.id,
                            round_number: round,
                            match_number: losersMatchNumber++,
                            bracket_type: 'losers',
                            player1_id: null,
                            player2_id: null,
                            status: 'pending',
                        });
                    }
                }

                // Grand Final
                matchesToInsert.push({
                    tournament_id: tournament.id,
                    round_number: 1,
                    match_number: 1,
                    bracket_type: 'grand_final',
                    player1_id: null,
                    player2_id: null,
                    status: 'pending',
                });
            }

            // Insert all matches
            const { error: insertError } = await supabase
                .from('matches')
                .insert(matchesToInsert);

            if (insertError) throw insertError;

            // Refresh bracket data
            await fetchBracketData();

            return { success: true };
        } catch (err) {
            setError(err.message);
            console.error('Error generating bracket:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [tournament, fetchBracketData]);

    // Generate Swiss round
    const generateSwissRound = useCallback(async (roundNumber = 1) => {
        if (!tournament?.id || !participants?.length) return;

        try {
            setLoading(true);
            setError(null);

            // Initialize Swiss scores if first round
            if (roundNumber === 1) {
                const teamIds = participants.map(p => p.team_id || p.id);
                await initializeSwissScores(supabase, tournament.id, teamIds);
            }

            // Get current Swiss scores
            const { data: swissScores } = await supabase
                .from('swiss_scores')
                .select('*')
                .eq('tournament_id', tournament.id);

            // Get all existing matches
            const { data: existingMatches } = await supabase
                .from('matches')
                .select('player1_id, player2_id')
                .eq('tournament_id', tournament.id);

            // Generate pairings
            const result = swissPairing(swissScores || [], existingMatches || [], { trackByes: true });
            const pairs = result.pairs || result;
            const byes = result.byes || [];

            // Create matches from pairs
            const matchesToInsert = pairs.map((pair, index) => ({
                tournament_id: tournament.id,
                round_number: roundNumber,
                match_number: index + 1,
                bracket_type: 'swiss',
                player1_id: pair[0],
                player2_id: pair[1],
                status: 'pending',
            }));

            if (matchesToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('matches')
                    .insert(matchesToInsert);

                if (insertError) throw insertError;
            }

            // Handle BYEs - automatically give wins
            for (const byeTeamId of byes) {
                const { data: score } = await supabase
                    .from('swiss_scores')
                    .select('*')
                    .eq('tournament_id', tournament.id)
                    .eq('team_id', byeTeamId)
                    .single();

                if (score) {
                    await supabase
                        .from('swiss_scores')
                        .update({ wins: score.wins + 1 })
                        .eq('id', score.id);
                }
            }

            // Recalculate Buchholz
            await recalculateBuchholzScores(supabase, tournament.id);

            await fetchBracketData();
            return { success: true, byes };
        } catch (err) {
            setError(err.message);
            console.error('Error generating Swiss round:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [tournament, participants, fetchBracketData]);

    // Update match result
    const updateMatchResult = useCallback(async (matchId, winnerId, score1, score2) => {
        try {
            setLoading(true);

            const { error: updateError } = await supabase
                .from('matches')
                .update({
                    winner_id: winnerId,
                    score_p1: score1,
                    score_p2: score2,
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', matchId);

            if (updateError) throw updateError;

            // Update Swiss scores if Swiss format
            if (tournament?.format === 'swiss') {
                const match = matches.find(m => m.id === matchId);
                if (match) {
                    const { updateSwissScores } = await import('../../swissUtils');
                    await updateSwissScores(supabase, tournament.id, {
                        ...match,
                        winner_id: winnerId,
                        status: 'completed',
                    });
                }
            }

            await fetchBracketData();
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [tournament, matches, fetchBracketData]);

    // Load bracket data on mount
    useEffect(() => {
        fetchBracketData();
    }, [fetchBracketData]);

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
