import {
  initializeSwissScores,
  getSwissScores,
  swissPairing,
  updateSwissScores,
  recalculateBuchholzScores,
  getSwissStandings
} from '../swissUtils';

// Mock Supabase client
const createMockSupabase = (mockData = {}) => {
  const mockClient = {
    from: jest.fn(() => mockClient),
    select: jest.fn(() => mockClient),
    insert: jest.fn(() => mockClient),
    update: jest.fn(() => mockClient),
    upsert: jest.fn(() => mockClient),
    eq: jest.fn(() => mockClient),
    order: jest.fn(() => mockClient),
    data: mockData.data || null,
    error: mockData.error || null,
  };

  // Make chainable methods return promises
  mockClient.select.mockReturnValue(Promise.resolve({ data: mockData.data, error: mockData.error }));
  mockClient.insert.mockReturnValue(Promise.resolve({ data: mockData.data, error: mockData.error }));
  mockClient.update.mockReturnValue(Promise.resolve({ data: mockData.data, error: mockData.error }));
  mockClient.upsert.mockReturnValue(Promise.resolve({ data: mockData.data, error: mockData.error }));
  mockClient.order.mockReturnValue(Promise.resolve({ data: mockData.data, error: mockData.error }));

  return mockClient;
};

describe('swissUtils', () => {
  describe('swissPairing', () => {
    it('pairs teams with similar scores', () => {
      const swissScores = [
        { team_id: 'team1', wins: 2, losses: 0, draws: 0, buchholz_score: 3 },
        { team_id: 'team2', wins: 2, losses: 0, draws: 0, buchholz_score: 2 },
        { team_id: 'team3', wins: 1, losses: 1, draws: 0, buchholz_score: 2 },
        { team_id: 'team4', wins: 1, losses: 1, draws: 0, buchholz_score: 1 },
        { team_id: 'team5', wins: 0, losses: 2, draws: 0, buchholz_score: 1 },
        { team_id: 'team6', wins: 0, losses: 2, draws: 0, buchholz_score: 0 },
      ];
      const allMatches = [];

      const pairs = swissPairing(swissScores, allMatches);

      expect(pairs).toHaveLength(3);
      // Top 2 teams should play each other (2-0 records)
      expect(pairs[0]).toContain('team1');
      expect(pairs[0]).toContain('team2');
    });

    it('avoids rematch between teams that already played', () => {
      const swissScores = [
        { team_id: 'team1', wins: 1, losses: 0, draws: 0, buchholz_score: 0 },
        { team_id: 'team2', wins: 1, losses: 0, draws: 0, buchholz_score: 0 },
        { team_id: 'team3', wins: 0, losses: 1, draws: 0, buchholz_score: 1 },
        { team_id: 'team4', wins: 0, losses: 1, draws: 0, buchholz_score: 1 },
      ];
      // team1 already played team2
      const allMatches = [
        { player1_id: 'team1', player2_id: 'team2' }
      ];

      const pairs = swissPairing(swissScores, allMatches);

      // team1 should NOT be paired with team2 again
      const team1Pair = pairs.find(p => p.includes('team1'));
      expect(team1Pair).not.toContain('team2');
    });

    it('handles empty swiss scores', () => {
      const pairs = swissPairing([], []);
      expect(pairs).toEqual([]);
    });

    it('handles single team (no pair possible)', () => {
      const swissScores = [
        { team_id: 'team1', wins: 0, losses: 0, draws: 0, buchholz_score: 0 },
      ];
      const pairs = swissPairing(swissScores, []);
      expect(pairs).toEqual([]);
    });

    it('handles odd number of teams (one team left without pair)', () => {
      const swissScores = [
        { team_id: 'team1', wins: 1, losses: 0, draws: 0, buchholz_score: 0 },
        { team_id: 'team2', wins: 1, losses: 0, draws: 0, buchholz_score: 0 },
        { team_id: 'team3', wins: 0, losses: 1, draws: 0, buchholz_score: 0 },
      ];
      const pairs = swissPairing(swissScores, []);

      // Only 1 pair possible, one team gets BYE (not paired)
      expect(pairs).toHaveLength(1);
    });

    it('handles all teams already played each other', () => {
      const swissScores = [
        { team_id: 'team1', wins: 2, losses: 0, draws: 0, buchholz_score: 2 },
        { team_id: 'team2', wins: 1, losses: 1, draws: 0, buchholz_score: 1 },
        { team_id: 'team3', wins: 0, losses: 2, draws: 0, buchholz_score: 0 },
      ];
      // All combinations already played
      const allMatches = [
        { player1_id: 'team1', player2_id: 'team2' },
        { player1_id: 'team1', player2_id: 'team3' },
        { player1_id: 'team2', player2_id: 'team3' },
      ];

      const pairs = swissPairing(swissScores, allMatches);
      expect(pairs).toEqual([]);
    });

    it('sorts by wins first, then by buchholz', () => {
      const swissScores = [
        { team_id: 'team1', wins: 1, losses: 0, draws: 0, buchholz_score: 5 },
        { team_id: 'team2', wins: 2, losses: 0, draws: 0, buchholz_score: 1 },
        { team_id: 'team3', wins: 2, losses: 0, draws: 0, buchholz_score: 3 },
        { team_id: 'team4', wins: 0, losses: 1, draws: 0, buchholz_score: 2 },
      ];
      const pairs = swissPairing(swissScores, []);

      // team2 and team3 have 2 wins, they should be paired first
      const firstPair = pairs[0];
      expect(firstPair).toContain('team2');
      expect(firstPair).toContain('team3');
    });
  });

  describe('getSwissStandings', () => {
    it('sorts by wins descending', () => {
      const scores = [
        { team_id: 'team1', wins: 1, buchholz_score: 0, opp_wins: 0 },
        { team_id: 'team2', wins: 3, buchholz_score: 0, opp_wins: 0 },
        { team_id: 'team3', wins: 2, buchholz_score: 0, opp_wins: 0 },
      ];

      const standings = getSwissStandings(scores);

      expect(standings[0].team_id).toBe('team2');
      expect(standings[1].team_id).toBe('team3');
      expect(standings[2].team_id).toBe('team1');
    });

    it('uses buchholz as tiebreaker', () => {
      const scores = [
        { team_id: 'team1', wins: 2, buchholz_score: 5, opp_wins: 0 },
        { team_id: 'team2', wins: 2, buchholz_score: 8, opp_wins: 0 },
        { team_id: 'team3', wins: 2, buchholz_score: 3, opp_wins: 0 },
      ];

      const standings = getSwissStandings(scores);

      expect(standings[0].team_id).toBe('team2'); // Highest buchholz
      expect(standings[1].team_id).toBe('team1');
      expect(standings[2].team_id).toBe('team3');
    });

    it('uses opp_wins as second tiebreaker', () => {
      const scores = [
        { team_id: 'team1', wins: 2, buchholz_score: 5, opp_wins: 3 },
        { team_id: 'team2', wins: 2, buchholz_score: 5, opp_wins: 7 },
        { team_id: 'team3', wins: 2, buchholz_score: 5, opp_wins: 5 },
      ];

      const standings = getSwissStandings(scores);

      expect(standings[0].team_id).toBe('team2'); // Highest opp_wins
      expect(standings[1].team_id).toBe('team3');
      expect(standings[2].team_id).toBe('team1');
    });

    it('handles empty array', () => {
      const standings = getSwissStandings([]);
      expect(standings).toEqual([]);
    });

    it('handles single team', () => {
      const scores = [{ team_id: 'team1', wins: 0, buchholz_score: 0, opp_wins: 0 }];
      const standings = getSwissStandings(scores);
      expect(standings).toHaveLength(1);
      expect(standings[0].team_id).toBe('team1');
    });
  });

  describe('initializeSwissScores', () => {
    it('calls upsert with correct data structure', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null });
      const tournamentId = 'tournament-123';
      const teamIds = ['team1', 'team2', 'team3'];

      await initializeSwissScores(mockSupabase, tournamentId, teamIds);

      expect(mockSupabase.from).toHaveBeenCalledWith('swiss_scores');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            tournament_id: tournamentId,
            team_id: 'team1',
            wins: 0,
            losses: 0,
            draws: 0,
            buchholz_score: 0,
            opp_wins: 0,
          }),
        ]),
        { onConflict: 'tournament_id,team_id' }
      );
    });

    it('handles error when upsert fails', async () => {
      const mockError = { message: 'Database error' };
      const mockSupabase = {
        from: jest.fn(() => ({
          upsert: jest.fn(() => Promise.resolve({ data: null, error: mockError }))
        }))
      };

      // Function throws after logging when there's an error
      await expect(
        initializeSwissScores(mockSupabase, 'tour-1', ['team1'])
      ).rejects.toEqual(mockError);
    });
  });

  describe('updateSwissScores', () => {
    it('does nothing if match is not completed', async () => {
      const mockSupabase = createMockSupabase({});
      const match = { status: 'pending', player1_id: 'team1', player2_id: 'team2' };

      await updateSwissScores(mockSupabase, 'tour-1', match);

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('does nothing if players are missing', async () => {
      const mockSupabase = createMockSupabase({});
      const match = { status: 'completed', player1_id: null, player2_id: 'team2' };

      await updateSwissScores(mockSupabase, 'tour-1', match);

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });
});
