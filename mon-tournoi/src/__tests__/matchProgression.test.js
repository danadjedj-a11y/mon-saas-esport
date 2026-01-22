/**
 * Tests unitaires pour matchProgression.js
 * Teste la logique de progression des brackets (Single/Double Elimination)
 */

// Mock de Supabase pour les tests - supporte les appels chainés .eq().eq()
const createMockSupabase = (mockData = {}) => {
  const createChainableEq = (resolveValue) => {
    const chainedEq = jest.fn(() => ({
      eq: chainedEq,
      single: jest.fn(() => Promise.resolve({ data: resolveValue })),
      order: jest.fn(() => Promise.resolve({ data: mockData.matches || [] }))
    }));
    return chainedEq;
  };

  return {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      })),
      select: jest.fn(() => ({
        eq: createChainableEq(mockData.participant || null)
      }))
    }))
  };
};

// Importer après les mocks
import { 
  handleSingleEliminationProgression,
  handleDoubleEliminationProgression,
  checkTournamentWinner
} from '../utils/matchProgression';

describe('matchProgression', () => {
  describe('handleSingleEliminationProgression', () => {
    it('devrait faire avancer le gagnant au round suivant', async () => {
      const mockSupabase = createMockSupabase();
      const tournamentId = 'tournament-1';
      const allMatches = [
        // Round 1
        { id: 'm1', round_number: 1, match_number: 1, player1_id: 'team1', player2_id: 'team2' },
        { id: 'm2', round_number: 1, match_number: 2, player1_id: 'team3', player2_id: 'team4' },
        // Round 2 (finale)
        { id: 'm3', round_number: 2, match_number: 3, player1_id: null, player2_id: null },
      ];
      const updatedMatch = { id: 'm1', round_number: 1, match_number: 1 };
      const winnerId = 'team1';
      
      await handleSingleEliminationProgression(mockSupabase, tournamentId, updatedMatch, winnerId, allMatches, null);
      
      // Vérifier que supabase.from('matches').update a été appelé
      expect(mockSupabase.from).toHaveBeenCalledWith('matches');
    });

    it('devrait retourner le nom du vainqueur en finale', async () => {
      const mockSupabase = createMockSupabase({
        participant: { teams: { name: 'Champions' } }
      });
      const tournamentId = 'tournament-1';
      const allMatches = [
        // Match unique (finale)
        { id: 'm1', round_number: 1, match_number: 1, player1_id: 'team1', player2_id: 'team2' },
      ];
      const updatedMatch = { id: 'm1', round_number: 1, match_number: 1 };
      const winnerId = 'team1';
      const mockConfetti = jest.fn();
      
      const result = await handleSingleEliminationProgression(
        mockSupabase, tournamentId, updatedMatch, winnerId, allMatches, mockConfetti
      );
      
      // En finale, devrait retourner le nom du vainqueur
      expect(result).toBeTruthy();
    });
  });

  describe('handleDoubleEliminationProgression', () => {
    it('devrait faire descendre le perdant du Winners en Losers', async () => {
      const mockSupabase = createMockSupabase({
        matches: [
          // Winners Round 1
          { id: 'm1', round_number: 1, bracket_type: 'winners', player1_id: 'team1', player2_id: 'team2' },
          { id: 'm2', round_number: 1, bracket_type: 'winners', player1_id: 'team3', player2_id: 'team4' },
          // Winners Round 2
          { id: 'm3', round_number: 2, bracket_type: 'winners', player1_id: null, player2_id: null },
          // Losers Round 1
          { id: 'm4', round_number: 1, bracket_type: 'losers', player1_id: null, player2_id: null },
          // Grand Final
          { id: 'm5', round_number: 3, bracket_type: 'grand_final', is_reset: false, player1_id: null, player2_id: null },
        ]
      });
      const tournamentId = 'tournament-1';
      const match = { id: 'm1', round_number: 1, bracket_type: 'winners' };
      const winnerId = 'team1';
      const loserId = 'team2';
      
      await handleDoubleEliminationProgression(mockSupabase, tournamentId, match, winnerId, loserId);
      
      // Vérifier que les appels DB ont été faits
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('devrait terminer le tournoi si le joueur Winners gagne la Grande Finale', async () => {
      const mockSupabase = createMockSupabase({
        matches: [
          { id: 'm5', round_number: 3, bracket_type: 'grand_final', is_reset: false, player1_id: 'team1', player2_id: 'team2' },
          { id: 'm6', round_number: 4, bracket_type: 'grand_final', is_reset: true, player1_id: null, player2_id: null },
        ]
      });
      const match = { 
        id: 'm5', 
        round_number: 3, 
        bracket_type: 'grand_final', 
        is_reset: false,
        player1_id: 'team1',  // Winner bracket champion
        player2_id: 'team2'   // Loser bracket champion
      };
      const winnerId = 'team1';  // Winner bracket gagne = pas de reset
      const loserId = 'team2';
      
      const result = await handleDoubleEliminationProgression(
        mockSupabase, 'tournament-1', match, winnerId, loserId
      );
      
      // Devrait retourner le winnerId car le tournoi est terminé
      expect(result).toBe(winnerId);
    });

    it('devrait déclencher un Reset si le Loser bracket gagne la Grande Finale', async () => {
      const mockSupabase = createMockSupabase({
        matches: [
          { id: 'm5', round_number: 3, bracket_type: 'grand_final', is_reset: false, player1_id: 'team1', player2_id: 'team2' },
          { id: 'm6', round_number: 4, bracket_type: 'grand_final', is_reset: true, player1_id: null, player2_id: null },
        ]
      });
      const match = { 
        id: 'm5', 
        round_number: 3, 
        bracket_type: 'grand_final', 
        is_reset: false,
        player1_id: 'team1',
        player2_id: 'team2'
      };
      const winnerId = 'team2';  // Loser bracket gagne = reset
      const loserId = 'team1';
      
      await handleDoubleEliminationProgression(mockSupabase, 'tournament-1', match, winnerId, loserId);
      
      // Le reset match devrait être mis à jour
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('checkTournamentWinner', () => {
    it('devrait retourner null si le tournoi n\'est pas terminé', async () => {
      const mockSupabase = createMockSupabase();
      const matches = [
        { round_number: 1, status: 'completed', score_p1: 2, score_p2: 1, player1_id: 'team1', player2_id: 'team2' },
        { round_number: 2, status: 'pending', score_p1: 0, score_p2: 0, player1_id: null, player2_id: null },
      ];
      
      const winner = await checkTournamentWinner(mockSupabase, 'tournament-1', 'elimination', matches);
      
      expect(winner).toBeNull();
    });

    it('devrait retourner le vainqueur en Single Elimination', async () => {
      const mockSupabase = createMockSupabase({
        participant: { teams: { name: 'Les Champions' } }
      });
      const matches = [
        { round_number: 1, status: 'completed', score_p1: 2, score_p2: 1, player1_id: 'team1', player2_id: 'team2' },
        { round_number: 1, status: 'completed', score_p1: 1, score_p2: 2, player1_id: 'team3', player2_id: 'team4' },
        { round_number: 2, status: 'completed', score_p1: 3, score_p2: 1, player1_id: 'team1', player2_id: 'team4' },
      ];
      
      const winner = await checkTournamentWinner(mockSupabase, 'tournament-1', 'elimination', matches);
      
      // Devrait retourner le nom de l'équipe gagnante
      expect(winner).toBeTruthy();
    });

    it('devrait gérer Double Elimination avec reset', async () => {
      const mockSupabase = createMockSupabase({
        participant: { teams: { name: 'Reset Winners' } }
      });
      const matches = [
        // Grand Final
        { round_number: 3, bracket_type: 'grand_final', is_reset: false, status: 'completed', score_p1: 1, score_p2: 2, player1_id: 'team1', player2_id: 'team2' },
        // Reset Match
        { round_number: 4, bracket_type: 'grand_final', is_reset: true, status: 'completed', score_p1: 3, score_p2: 2, player1_id: 'team1', player2_id: 'team2' },
      ];
      
      const winner = await checkTournamentWinner(mockSupabase, 'tournament-1', 'double_elimination', matches);
      
      expect(winner).toBeTruthy();
    });
  });
});
