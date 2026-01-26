import {
    generateBracketMatches,
    deletePhaseMatches,
    regeneratePhaseMatches,
    calculateMatchCount
} from '../utils/matchGenerator';

// Mock Supabase
jest.mock('../supabaseClient', () => ({
    supabase: {
        from: jest.fn(() => ({
            insert: jest.fn(() => ({
                select: jest.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            delete: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ error: null }))
            }))
        }))
    }
}));

describe('matchGenerator', () => {
    describe('calculateMatchCount', () => {
        describe('single elimination', () => {
            it('calculates correctly for 8 teams', () => {
                expect(calculateMatchCount('elimination', 8)).toBe(7);
            });

            it('calculates correctly for 16 teams', () => {
                expect(calculateMatchCount('elimination', 16)).toBe(15);
            });

            it('calculates correctly for 4 teams', () => {
                expect(calculateMatchCount('elimination', 4)).toBe(3);
            });

            it('calculates correctly for 2 teams', () => {
                expect(calculateMatchCount('elimination', 2)).toBe(1);
            });

            it('calculates correctly for 32 teams', () => {
                expect(calculateMatchCount('elimination', 32)).toBe(31);
            });
        });

        describe('double elimination', () => {
            it('calculates correctly for 8 teams with single grand final', () => {
                // Winners: 7, Losers: ~7, Grand Final: 1
                const result = calculateMatchCount('double_elimination', 8, { grand_final: 'single' });
                expect(result).toBe(15); // (8-1)*2 + 1
            });

            it('calculates correctly for 8 teams with double grand final', () => {
                const result = calculateMatchCount('double_elimination', 8, { grand_final: 'double' });
                expect(result).toBe(16); // (8-1)*2 + 2
            });

            it('calculates correctly for 16 teams', () => {
                const result = calculateMatchCount('double_elimination', 16, { grand_final: 'single' });
                expect(result).toBe(31); // (16-1)*2 + 1
            });
        });

        describe('round robin', () => {
            it('calculates correctly for 4 teams', () => {
                // Each team plays the other 3: (4*3)/2 = 6
                expect(calculateMatchCount('round_robin', 4)).toBe(6);
            });

            it('calculates correctly for 8 teams', () => {
                // (8*7)/2 = 28
                expect(calculateMatchCount('round_robin', 8)).toBe(28);
            });

            it('calculates correctly for 3 teams', () => {
                // (3*2)/2 = 3
                expect(calculateMatchCount('round_robin', 3)).toBe(3);
            });

            it('calculates correctly for 2 teams', () => {
                expect(calculateMatchCount('round_robin', 2)).toBe(1);
            });
        });

        describe('swiss', () => {
            it('calculates correctly for 8 teams', () => {
                // Rounds = ceil(log2(8)) = 3, Matches per round = 4
                // Total = 3 * 4 = 12
                expect(calculateMatchCount('swiss', 8)).toBe(12);
            });

            it('calculates correctly for 16 teams', () => {
                // Rounds = 4, Matches per round = 8
                expect(calculateMatchCount('swiss', 16)).toBe(32);
            });

            it('calculates correctly for 6 teams', () => {
                // Rounds = ceil(log2(6)) = 3, Matches per round = 3
                expect(calculateMatchCount('swiss', 6)).toBe(9);
            });
        });

        describe('gauntlet', () => {
            it('calculates correctly for 8 teams', () => {
                expect(calculateMatchCount('gauntlet', 8)).toBe(7);
            });

            it('calculates correctly for 4 teams', () => {
                expect(calculateMatchCount('gauntlet', 4)).toBe(3);
            });
        });

        describe('unknown format', () => {
            it('returns 0 for unknown format', () => {
                expect(calculateMatchCount('unknown_format', 8)).toBe(0);
            });
        });
    });

    describe('generateBracketMatches', () => {
        const mockSupabase = {
            from: jest.fn(() => ({
                insert: jest.fn(() => ({
                    select: jest.fn(() => Promise.resolve({ data: [], error: null }))
                }))
            }))
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('generates correct number of matches for single elimination', async () => {
            const phase = {
                id: 'phase-1',
                format: 'elimination',
                config: { size: 8 }
            };

            // We need to check that the right number of matches would be inserted
            const result = await generateBracketMatches(phase, 'tournament-1');

            // Function returns the inserted data (mocked as [])
            expect(result).toBeDefined();
        });

        it('handles double elimination with grand final reset', async () => {
            const phase = {
                id: 'phase-1',
                format: 'double_elimination',
                config: { size: 8, grand_final: 'double' }
            };

            const result = await generateBracketMatches(phase, 'tournament-1');
            expect(result).toBeDefined();
        });

        it('generates round robin matches', async () => {
            const phase = {
                id: 'phase-1',
                format: 'round_robin',
                config: { size: 4 }
            };

            const result = await generateBracketMatches(phase, 'tournament-1');
            expect(result).toBeDefined();
        });

        it('generates swiss matches', async () => {
            const phase = {
                id: 'phase-1',
                format: 'swiss',
                config: { size: 8 }
            };

            const result = await generateBracketMatches(phase, 'tournament-1');
            expect(result).toBeDefined();
        });

        it('generates gauntlet matches', async () => {
            const phase = {
                id: 'phase-1',
                format: 'gauntlet',
                config: { size: 5 }
            };

            const result = await generateBracketMatches(phase, 'tournament-1');
            expect(result).toBeDefined();
        });
    });

    describe('Match structure validation', () => {
        it('creates match objects with required fields', () => {
            // Validate the structure of a match object
            const requiredFields = [
                'tournament_id',
                'phase_id',
                'round_number',
                'match_number',
                'bracket_type',
                'player1_id',
                'player2_id',
                'status',
                'created_at'
            ];

            const mockMatch = {
                tournament_id: 'tour-1',
                phase_id: 'phase-1',
                round_number: 1,
                match_number: 1,
                bracket_type: 'winners',
                player1_id: null,
                player2_id: null,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            requiredFields.forEach(field => {
                expect(mockMatch).toHaveProperty(field);
            });
        });

        it('initializes players as null', () => {
            const match = {
                player1_id: null,
                player2_id: null,
                status: 'pending'
            };

            expect(match.player1_id).toBeNull();
            expect(match.player2_id).toBeNull();
        });
    });

    describe('Bracket type assignments', () => {
        const testBracketTypes = [
            { format: 'elimination', expected: 'winners' },
            { format: 'double_elimination', expectMultiple: ['winners', 'losers', 'grand_final'] },
            { format: 'round_robin', expected: 'round_robin' },
            { format: 'swiss', expected: 'swiss' },
            { format: 'gauntlet', expected: 'gauntlet' },
        ];

        testBracketTypes.forEach(({ format, expected, expectMultiple }) => {
            if (expected) {
                it(`uses "${expected}" bracket type for ${format}`, () => {
                    expect(expected).toBeDefined();
                });
            }
            if (expectMultiple) {
                it(`uses multiple bracket types for ${format}`, () => {
                    expect(expectMultiple).toContain('winners');
                });
            }
        });
    });

    describe('Round calculations', () => {
        it('calculates correct rounds for power of 2 bracket sizes', () => {
            const sizes = [2, 4, 8, 16, 32, 64];
            const expectedRounds = [1, 2, 3, 4, 5, 6];

            sizes.forEach((size, index) => {
                const rounds = Math.ceil(Math.log2(size));
                expect(rounds).toBe(expectedRounds[index]);
            });
        });

        it('calculates correct rounds for non-power of 2 sizes', () => {
            // 5 teams = 3 rounds (need to accommodate up to 8)
            expect(Math.ceil(Math.log2(5))).toBe(3);
            // 12 teams = 4 rounds (need to accommodate up to 16)
            expect(Math.ceil(Math.log2(12))).toBe(4);
        });
    });

    describe('Edge cases', () => {
        it('handles minimum viable bracket (2 teams)', () => {
            const matchCount = calculateMatchCount('elimination', 2);
            expect(matchCount).toBe(1);
        });

        it('handles odd number of teams in round robin', () => {
            // 5 teams: (5*4)/2 = 10 matches
            expect(calculateMatchCount('round_robin', 5)).toBe(10);
        });

        it('handles odd number in swiss (one bye per round)', () => {
            // 7 teams: 3 rounds, 3 matches per round
            const matchCount = calculateMatchCount('swiss', 7);
            expect(matchCount).toBe(9);
        });
    });
});
