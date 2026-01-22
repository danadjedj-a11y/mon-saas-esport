/**
 * Tests unitaires pour swissUtils.js
 * Teste la logique métier du système suisse (pairing, scores, Buchholz)
 */

import { swissPairing } from '../swissUtils';

describe('swissUtils', () => {
  describe('swissPairing', () => {
    it('devrait pairer les équipes avec des scores similaires', () => {
      const swissScores = [
        { team_id: 'team1', wins: 2, losses: 0, draws: 0, buchholz_score: 5 },
        { team_id: 'team2', wins: 2, losses: 0, draws: 0, buchholz_score: 4 },
        { team_id: 'team3', wins: 1, losses: 1, draws: 0, buchholz_score: 3 },
        { team_id: 'team4', wins: 1, losses: 1, draws: 0, buchholz_score: 2 },
        { team_id: 'team5', wins: 0, losses: 2, draws: 0, buchholz_score: 1 },
        { team_id: 'team6', wins: 0, losses: 2, draws: 0, buchholz_score: 0 },
      ];
      const allMatches = [];
      
      const pairs = swissPairing(swissScores, allMatches);
      
      expect(pairs).toHaveLength(3);
      // Les deux meilleures équipes devraient être pairées ensemble
      expect(pairs[0]).toContain('team1');
      expect(pairs[0]).toContain('team2');
      // Les équipes moyennes ensemble
      expect(pairs[1]).toContain('team3');
      expect(pairs[1]).toContain('team4');
      // Les équipes faibles ensemble
      expect(pairs[2]).toContain('team5');
      expect(pairs[2]).toContain('team6');
    });

    it('devrait éviter de pairer des équipes qui ont déjà joué', () => {
      const swissScores = [
        { team_id: 'team1', wins: 1, losses: 0, draws: 0, buchholz_score: 2 },
        { team_id: 'team2', wins: 1, losses: 0, draws: 0, buchholz_score: 1 },
        { team_id: 'team3', wins: 0, losses: 1, draws: 0, buchholz_score: 1 },
        { team_id: 'team4', wins: 0, losses: 1, draws: 0, buchholz_score: 0 },
      ];
      
      // team1 a déjà joué contre team2
      const allMatches = [
        { player1_id: 'team1', player2_id: 'team2', status: 'completed' },
        { player1_id: 'team3', player2_id: 'team4', status: 'completed' },
      ];
      
      const pairs = swissPairing(swissScores, allMatches);
      
      expect(pairs).toHaveLength(2);
      // team1 ne devrait pas être avec team2 (déjà joué)
      const team1Pair = pairs.find(p => p.includes('team1'));
      expect(team1Pair).not.toContain('team2');
    });

    it('devrait retourner un tableau vide si aucun score', () => {
      const swissScores = [];
      const allMatches = [];
      
      const pairs = swissPairing(swissScores, allMatches);
      
      expect(pairs).toEqual([]);
    });

    it('devrait gérer un nombre impair d\'équipes (une équipe sans adversaire)', () => {
      const swissScores = [
        { team_id: 'team1', wins: 2, losses: 0, draws: 0, buchholz_score: 4 },
        { team_id: 'team2', wins: 1, losses: 1, draws: 0, buchholz_score: 2 },
        { team_id: 'team3', wins: 0, losses: 2, draws: 0, buchholz_score: 0 },
      ];
      const allMatches = [];
      
      const pairs = swissPairing(swissScores, allMatches);
      
      // Seulement 1 paire possible avec 3 équipes
      expect(pairs.length).toBeLessThanOrEqual(1);
    });

    it('devrait prioriser le Buchholz en cas d\'égalité de victoires', () => {
      const swissScores = [
        { team_id: 'team1', wins: 1, losses: 0, draws: 0, buchholz_score: 10 },
        { team_id: 'team2', wins: 1, losses: 0, draws: 0, buchholz_score: 5 },
        { team_id: 'team3', wins: 1, losses: 0, draws: 0, buchholz_score: 3 },
        { team_id: 'team4', wins: 1, losses: 0, draws: 0, buchholz_score: 1 },
      ];
      const allMatches = [];
      
      const pairs = swissPairing(swissScores, allMatches);
      
      expect(pairs).toHaveLength(2);
      // team1 (Buchholz=10) devrait jouer contre team2 (Buchholz=5)
      const team1Pair = pairs.find(p => p.includes('team1'));
      expect(team1Pair).toContain('team2');
    });

    it('devrait gérer les matchs nuls dans l\'historique', () => {
      const swissScores = [
        { team_id: 'team1', wins: 0, losses: 0, draws: 1, buchholz_score: 1 },
        { team_id: 'team2', wins: 0, losses: 0, draws: 1, buchholz_score: 1 },
        { team_id: 'team3', wins: 0, losses: 0, draws: 0, buchholz_score: 0 },
        { team_id: 'team4', wins: 0, losses: 0, draws: 0, buchholz_score: 0 },
      ];
      
      // team1 et team2 ont fait match nul
      const allMatches = [
        { player1_id: 'team1', player2_id: 'team2', status: 'completed' },
      ];
      
      const pairs = swissPairing(swissScores, allMatches);
      
      // team1 et team2 ne devraient pas être pairées à nouveau
      const team1Pair = pairs.find(p => p.includes('team1'));
      if (team1Pair) {
        expect(team1Pair).not.toContain('team2');
      }
    });
  });
});
