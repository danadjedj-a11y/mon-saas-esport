import { calculateMatchWinner, getAvailableMaps, getNextVetoTeam } from '../bofUtils';

describe('bofUtils', () => {
  describe('calculateMatchWinner', () => {
    const team1Id = 'team1';
    const team2Id = 'team2';

    it('returns null winner when games are empty', () => {
      const result = calculateMatchWinner([], 3, team1Id, team2Id);
      expect(result.winner).toBeNull();
      expect(result.isCompleted).toBe(false);
      expect(result.team1Wins).toBe(0);
      expect(result.team2Wins).toBe(0);
    });

    it('returns null winner when no games are completed', () => {
      const games = [
        { status: 'pending', winner_team_id: null },
        { status: 'pending', winner_team_id: null }
      ];
      const result = calculateMatchWinner(games, 3, team1Id, team2Id);
      expect(result.winner).toBeNull();
      expect(result.isCompleted).toBe(false);
    });

    it('returns team1 when they win majority in BO3', () => {
      const games = [
        { status: 'completed', winner_team_id: team1Id },
        { status: 'completed', winner_team_id: team1Id },
        { status: 'pending', winner_team_id: null }
      ];
      const result = calculateMatchWinner(games, 3, team1Id, team2Id);
      expect(result.winner).toBe(team1Id);
      expect(result.isCompleted).toBe(true);
      expect(result.team1Wins).toBe(2);
    });

    it('returns team2 when they win majority in BO3', () => {
      const games = [
        { status: 'completed', winner_team_id: team2Id },
        { status: 'completed', winner_team_id: team2Id },
        { status: 'pending', winner_team_id: null }
      ];
      const result = calculateMatchWinner(games, 3, team1Id, team2Id);
      expect(result.winner).toBe(team2Id);
      expect(result.isCompleted).toBe(true);
      expect(result.team2Wins).toBe(2);
    });

    it('returns null when match is not decided yet', () => {
      const games = [
        { status: 'completed', winner_team_id: team1Id },
        { status: 'completed', winner_team_id: team2Id },
        { status: 'pending', winner_team_id: null }
      ];
      const result = calculateMatchWinner(games, 3, team1Id, team2Id);
      expect(result.winner).toBeNull();
      expect(result.isCompleted).toBe(false);
      expect(result.team1Wins).toBe(1);
      expect(result.team2Wins).toBe(1);
    });
  });

  describe('getAvailableMaps', () => {
    const mapsPool = ['Dust2', 'Mirage', 'Inferno', 'Nuke', 'Overpass'];

    it('returns all maps when no vetos', () => {
      const result = getAvailableMaps(mapsPool, []);
      expect(result).toEqual(mapsPool);
    });

    it('filters out banned maps', () => {
      const vetos = [
        { map_name: 'Dust2', veto_phase: 'ban1' },
        { map_name: 'Nuke', veto_phase: 'ban2' }
      ];
      const result = getAvailableMaps(mapsPool, vetos);
      expect(result).toEqual(['Mirage', 'Inferno', 'Overpass']);
    });
  });

  describe('getNextVetoTeam', () => {
    const vetoOrder = ['ban1', 'ban2', 'pick1', 'pick2'];

    it('returns team1 for first ban', () => {
      const result = getNextVetoTeam([], vetoOrder);
      expect(result).toBe('team1');
    });

    it('returns team2 for second ban', () => {
      const vetos = [{ veto_phase: 'ban1' }];
      const result = getNextVetoTeam(vetos, vetoOrder);
      expect(result).toBe('team2');
    });

    it('returns null when all vetos done', () => {
      const vetos = [
        { veto_phase: 'ban1' },
        { veto_phase: 'ban2' },
        { veto_phase: 'pick1' },
        { veto_phase: 'pick2' }
      ];
      const result = getNextVetoTeam(vetos, vetoOrder);
      expect(result).toBeNull();
    });
  });
});
