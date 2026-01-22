// src/__tests__/gauntletUtils.test.js
// Tests unitaires pour le format Gauntlet

import {
  initializeGauntlet,
  orderChallengers,
  generateGauntletMatches,
  processGauntletResult,
  getGauntletStats,
  getGauntletStandings,
  getCurrentGauntletMatch
} from '../gauntletUtils';

// Données de test
const createTeams = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1
  }));
};

describe('gauntletUtils', () => {
  describe('initializeGauntlet', () => {
    it('devrait initialiser un gauntlet avec le premier comme champion par défaut', () => {
      const teams = createTeams(4);
      const result = initializeGauntlet(teams);

      expect(result.champion.id).toBe('team-1');
      expect(result.challengers).toHaveLength(3);
      expect(result.matches).toHaveLength(3);
      expect(result.format).toBe('gauntlet');
    });

    it('devrait utiliser le champion spécifié', () => {
      const teams = createTeams(4);
      const result = initializeGauntlet(teams, { championId: 'team-3' });

      expect(result.champion.id).toBe('team-3');
      expect(result.challengers).toHaveLength(3);
      expect(result.challengers.find(c => c.id === 'team-3')).toBeUndefined();
    });

    it('devrait lever une erreur si moins de 2 équipes', () => {
      expect(() => initializeGauntlet([{ id: '1', name: 'Solo' }])).toThrow(
        'Le format Gauntlet nécessite au moins 2 équipes'
      );
    });

    it('devrait lever une erreur si le champion n\'existe pas', () => {
      const teams = createTeams(3);
      expect(() => initializeGauntlet(teams, { championId: 'inexistant' })).toThrow(
        'Champion non trouvé'
      );
    });

    it('devrait gérer l\'ordre reverse_seeded', () => {
      const teams = createTeams(4);
      const result = initializeGauntlet(teams, { challengerOrder: 'reverse_seeded' });

      // Les challengers devraient être inversés (4, 3, 2)
      expect(result.challengers[0].id).toBe('team-4');
      expect(result.challengers[1].id).toBe('team-3');
      expect(result.challengers[2].id).toBe('team-2');
    });
  });

  describe('orderChallengers', () => {
    it('devrait garder l\'ordre pour seeded', () => {
      const challengers = createTeams(3);
      const result = orderChallengers(challengers, 'seeded');
      expect(result.map(c => c.id)).toEqual(['team-1', 'team-2', 'team-3']);
    });

    it('devrait inverser pour reverse_seeded', () => {
      const challengers = createTeams(3);
      const result = orderChallengers(challengers, 'reverse_seeded');
      expect(result.map(c => c.id)).toEqual(['team-3', 'team-2', 'team-1']);
    });

    it('devrait mélanger pour random (résultat différent ou même longueur)', () => {
      const challengers = createTeams(10);
      const result = orderChallengers(challengers, 'random');
      expect(result).toHaveLength(10);
      // Vérifie que tous les éléments sont présents
      expect(result.map(c => c.id).sort()).toEqual(challengers.map(c => c.id).sort());
    });
  });

  describe('generateGauntletMatches', () => {
    it('devrait générer un match par challenger', () => {
      const champion = { id: 'champ', name: 'Champion' };
      const challengers = createTeams(3);
      const matches = generateGauntletMatches(champion, challengers);

      expect(matches).toHaveLength(3);
      expect(matches[0].round).toBe(1);
      expect(matches[0].status).toBe('pending');
      expect(matches[1].status).toBe('waiting');
      expect(matches[2].status).toBe('waiting');
    });

    it('devrait avoir le bon format de description', () => {
      const champion = { id: 'champ', name: 'Champion' };
      const challengers = [{ id: 'c1', name: 'Challenger A' }];
      const matches = generateGauntletMatches(champion, challengers);

      expect(matches[0].description).toBe('Match 1: vs Challenger A');
    });
  });

  describe('processGauntletResult', () => {
    let initialState;

    beforeEach(() => {
      const teams = createTeams(4);
      initialState = initializeGauntlet(teams);
      // Set le champion comme player1 du premier match
      initialState.matches[0].player1_id = initialState.champion.id;
    });

    it('devrait garder le champion si il gagne', () => {
      const result = processGauntletResult(initialState, 1, 'team-1');

      expect(result.champion.id).toBe('team-1');
      expect(result.championChanged).toBe(false);
      expect(result.matches[0].status).toBe('completed');
      expect(result.matches[0].winner_id).toBe('team-1');
    });

    it('devrait changer le champion si le challenger gagne', () => {
      const result = processGauntletResult(initialState, 1, 'team-2');

      expect(result.champion.id).toBe('team-2');
      expect(result.championChanged).toBe(true);
      expect(result.matches[0].winner_id).toBe('team-2');
    });

    it('devrait activer le match suivant', () => {
      const result = processGauntletResult(initialState, 1, 'team-1');

      expect(result.matches[1].status).toBe('pending');
      expect(result.matches[1].player1_id).toBe('team-1');
    });

    it('devrait marquer le tournoi comme terminé au dernier match', () => {
      // Simuler jusqu'au dernier match
      let state = initialState;
      state = processGauntletResult(state, 1, 'team-1');
      state = processGauntletResult(state, 2, 'team-1');
      state = processGauntletResult(state, 3, 'team-1');

      expect(state.isCompleted).toBe(true);
      expect(state.finalChampion.id).toBe('team-1');
    });

    it('devrait enregistrer l\'historique', () => {
      const result = processGauntletResult(initialState, 1, 'team-2');

      expect(result.history).toHaveLength(1);
      expect(result.history[0].matchNumber).toBe(1);
      expect(result.history[0].championChanged).toBe(true);
      expect(result.history[0].winner.id).toBe('team-2');
    });

    it('devrait lever une erreur pour un numéro de match invalide', () => {
      expect(() => processGauntletResult(initialState, 0, 'team-1')).toThrow();
      expect(() => processGauntletResult(initialState, 10, 'team-1')).toThrow();
    });

    it('devrait lever une erreur si le gagnant n\'est ni champion ni challenger', () => {
      expect(() => processGauntletResult(initialState, 1, 'team-99')).toThrow(
        'Le gagnant doit être le champion ou le challenger'
      );
    });
  });

  describe('getGauntletStats', () => {
    it('devrait calculer les stats initiales', () => {
      const teams = createTeams(4);
      const state = initializeGauntlet(teams);
      const stats = getGauntletStats(state);

      expect(stats.totalMatches).toBe(3);
      expect(stats.completedMatches).toBe(0);
      expect(stats.remainingMatches).toBe(3);
      expect(stats.titleDefenses).toBe(0);
      expect(stats.titleChanges).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.progress).toBe(0);
    });

    it('devrait calculer les défenses de titre', () => {
      const teams = createTeams(4);
      let state = initializeGauntlet(teams);
      state.matches[0].player1_id = state.champion.id;
      
      state = processGauntletResult(state, 1, 'team-1');
      state = processGauntletResult(state, 2, 'team-1');
      
      const stats = getGauntletStats(state);

      expect(stats.titleDefenses).toBe(2);
      expect(stats.titleChanges).toBe(0);
      expect(stats.currentStreak).toBe(2);
      expect(stats.progress).toBe(67); // 2/3 arrondi
    });

    it('devrait calculer les changements de titre', () => {
      const teams = createTeams(4);
      let state = initializeGauntlet(teams);
      state.matches[0].player1_id = state.champion.id;
      
      state = processGauntletResult(state, 1, 'team-2'); // Changement
      state = processGauntletResult(state, 2, 'team-2'); // Défense par nouveau champion
      
      const stats = getGauntletStats(state);

      expect(stats.titleDefenses).toBe(1);
      expect(stats.titleChanges).toBe(1);
      expect(stats.currentStreak).toBe(1);
    });
  });

  describe('getGauntletStandings', () => {
    it('devrait retourner null si pas terminé', () => {
      const teams = createTeams(4);
      const state = initializeGauntlet(teams);
      
      expect(getGauntletStandings(state)).toBeNull();
    });

    it('devrait retourner le classement correct quand le champion défend', () => {
      const teams = createTeams(4);
      let state = initializeGauntlet(teams);
      state.matches[0].player1_id = state.champion.id;
      
      // Champion gagne tous les matchs
      state = processGauntletResult(state, 1, 'team-1');
      state = processGauntletResult(state, 2, 'team-1');
      state = processGauntletResult(state, 3, 'team-1');
      
      const standings = getGauntletStandings(state);

      expect(standings).toHaveLength(4);
      expect(standings[0].rank).toBe(1);
      expect(standings[0].team.id).toBe('team-1');
      expect(standings[0].status).toBe('champion');
      
      // Le dernier éliminé est 2ème
      expect(standings[1].rank).toBe(2);
      expect(standings[1].team.id).toBe('team-4');
    });

    it('devrait retourner le classement correct avec changements de titre', () => {
      const teams = createTeams(4);
      let state = initializeGauntlet(teams);
      state.matches[0].player1_id = state.champion.id;
      
      // Team 1 perd contre Team 2
      state = processGauntletResult(state, 1, 'team-2');
      // Team 2 gagne contre Team 3
      state = processGauntletResult(state, 2, 'team-2');
      // Team 2 perd contre Team 4
      state = processGauntletResult(state, 3, 'team-4');
      
      const standings = getGauntletStandings(state);

      expect(standings[0].rank).toBe(1);
      expect(standings[0].team.id).toBe('team-4'); // Champion final
      
      // Team 2 éliminé au round 3 (2ème)
      expect(standings[1].rank).toBe(2);
      expect(standings[1].team.id).toBe('team-2');
      expect(standings[1].eliminatedAt).toBe(3);
    });
  });

  describe('getCurrentGauntletMatch', () => {
    it('devrait retourner le premier match initialement', () => {
      const teams = createTeams(4);
      const state = initializeGauntlet(teams);
      const current = getCurrentGauntletMatch(state);

      expect(current).not.toBeNull();
      expect(current.round).toBe(1);
      expect(current.champion.id).toBe('team-1');
      expect(current.player2.id).toBe('team-2');
    });

    it('devrait retourner le match suivant après un résultat', () => {
      const teams = createTeams(4);
      let state = initializeGauntlet(teams);
      state.matches[0].player1_id = state.champion.id;
      state = processGauntletResult(state, 1, 'team-1');
      
      const current = getCurrentGauntletMatch(state);

      expect(current.round).toBe(2);
      expect(current.champion.id).toBe('team-1');
      expect(current.player2.id).toBe('team-3');
    });

    it('devrait retourner null quand terminé', () => {
      const teams = createTeams(3);
      let state = initializeGauntlet(teams);
      state.matches[0].player1_id = state.champion.id;
      state = processGauntletResult(state, 1, 'team-1');
      state = processGauntletResult(state, 2, 'team-1');
      
      const current = getCurrentGauntletMatch(state);
      expect(current).toBeNull();
    });
  });
});
