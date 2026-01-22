// src/__tests__/groupStageUtils.test.js
// Tests unitaires pour le format Groupes (Pool Play)

import {
  initializeGroupStage,
  getGroupName,
  distributeTeamsToGroups,
  generateRoundRobinMatches,
  initializeGroupStandings,
  updateGroupStandings,
  sortGroupStandings,
  isGroupPhaseComplete,
  getQualifiedTeams,
  generatePlayoffBracket,
  getGroupStageStats,
  getGroupsSummary
} from '../groupStageUtils';

// Données de test
const createTeams = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1
  }));
};

describe('groupStageUtils', () => {
  describe('initializeGroupStage', () => {
    it('devrait initialiser 2 groupes avec 8 équipes', () => {
      const teams = createTeams(8);
      const result = initializeGroupStage(teams, { numGroups: 2 });

      expect(result.numGroups).toBe(2);
      expect(result.groups).toHaveLength(2);
      expect(result.groups[0]).toHaveLength(4);
      expect(result.groups[1]).toHaveLength(4);
      expect(result.format).toBe('group_stage');
      expect(result.phase).toBe('groups');
    });

    it('devrait initialiser 4 groupes avec 16 équipes', () => {
      const teams = createTeams(16);
      const result = initializeGroupStage(teams, { numGroups: 4, teamsAdvancing: 2 });

      expect(result.numGroups).toBe(4);
      expect(result.groups).toHaveLength(4);
      expect(result.groups.every(g => g.length === 4)).toBe(true);
      expect(result.totalAdvancing).toBe(8);
    });

    it('devrait lever une erreur si pas assez d\'équipes', () => {
      const teams = createTeams(3);
      expect(() => initializeGroupStage(teams, { numGroups: 4 })).toThrow(
        'Minimum 8 équipes requises pour 4 groupes'
      );
    });

    it('devrait lever une erreur pour teamsAdvancing invalide', () => {
      const teams = createTeams(8);
      expect(() => initializeGroupStage(teams, { numGroups: 2, teamsAdvancing: 5 })).toThrow(
        'Nombre d\'équipes qualifiées invalide'
      );
    });
  });

  describe('getGroupName', () => {
    it('devrait retourner A, B, C, D, etc.', () => {
      expect(getGroupName(0)).toBe('A');
      expect(getGroupName(1)).toBe('B');
      expect(getGroupName(2)).toBe('C');
      expect(getGroupName(3)).toBe('D');
      expect(getGroupName(7)).toBe('H');
    });
  });

  describe('distributeTeamsToGroups', () => {
    describe('méthode snake', () => {
      it('devrait distribuer en serpent pour 8 équipes en 2 groupes', () => {
        const teams = createTeams(8);
        const groups = distributeTeamsToGroups(teams, 2, 'snake');

        // Seed 1, 4, 5, 8 → Groupe A
        // Seed 2, 3, 6, 7 → Groupe B
        expect(groups[0].map(t => t.seed)).toEqual([1, 4, 5, 8]);
        expect(groups[1].map(t => t.seed)).toEqual([2, 3, 6, 7]);
      });

      it('devrait distribuer en serpent pour 16 équipes en 4 groupes', () => {
        const teams = createTeams(16);
        const groups = distributeTeamsToGroups(teams, 4, 'snake');

        // Groupe A: 1, 8, 9, 16
        // Groupe B: 2, 7, 10, 15
        // Groupe C: 3, 6, 11, 14
        // Groupe D: 4, 5, 12, 13
        expect(groups[0].map(t => t.seed)).toEqual([1, 8, 9, 16]);
        expect(groups[1].map(t => t.seed)).toEqual([2, 7, 10, 15]);
        expect(groups[2].map(t => t.seed)).toEqual([3, 6, 11, 14]);
        expect(groups[3].map(t => t.seed)).toEqual([4, 5, 12, 13]);
      });
    });

    describe('méthode sequential', () => {
      it('devrait distribuer séquentiellement', () => {
        const teams = createTeams(8);
        const groups = distributeTeamsToGroups(teams, 2, 'sequential');

        // Teams 1-4 → Groupe A, Teams 5-8 → Groupe B
        expect(groups[0].map(t => t.seed)).toEqual([1, 2, 3, 4]);
        expect(groups[1].map(t => t.seed)).toEqual([5, 6, 7, 8]);
      });
    });

    describe('méthode random', () => {
      it('devrait distribuer équitablement en random', () => {
        const teams = createTeams(8);
        const groups = distributeTeamsToGroups(teams, 2, 'random');

        expect(groups[0]).toHaveLength(4);
        expect(groups[1]).toHaveLength(4);
        
        // Toutes les équipes doivent être présentes
        const allTeams = [...groups[0], ...groups[1]];
        expect(allTeams.map(t => t.id).sort()).toEqual(teams.map(t => t.id).sort());
      });
    });
  });

  describe('generateRoundRobinMatches', () => {
    it('devrait générer 6 matchs pour 4 équipes (n*(n-1)/2)', () => {
      const teams = createTeams(4);
      const matches = generateRoundRobinMatches(teams, 0);

      expect(matches).toHaveLength(6); // 4*3/2 = 6
    });

    it('devrait générer 10 matchs pour 5 équipes', () => {
      const teams = createTeams(5);
      const matches = generateRoundRobinMatches(teams, 0);

      expect(matches).toHaveLength(10); // 5*4/2 = 10
    });

    it('devrait avoir tous les matchs en pending', () => {
      const teams = createTeams(4);
      const matches = generateRoundRobinMatches(teams, 0);

      expect(matches.every(m => m.status === 'pending')).toBe(true);
    });

    it('devrait inclure les infos de groupe', () => {
      const teams = createTeams(4);
      const matches = generateRoundRobinMatches(teams, 2);

      expect(matches[0].groupIndex).toBe(2);
      expect(matches[0].groupName).toBe('C');
    });
  });

  describe('initializeGroupStandings', () => {
    it('devrait initialiser tous les compteurs à 0', () => {
      const teams = createTeams(4);
      const standings = initializeGroupStandings(teams);

      expect(standings).toHaveLength(4);
      standings.forEach(s => {
        expect(s.played).toBe(0);
        expect(s.wins).toBe(0);
        expect(s.losses).toBe(0);
        expect(s.points).toBe(0);
        expect(s.goalsFor).toBe(0);
        expect(s.goalsAgainst).toBe(0);
      });
    });
  });

  describe('updateGroupStandings', () => {
    let standings;
    let match;

    beforeEach(() => {
      const teams = createTeams(4);
      standings = initializeGroupStandings(teams);
      match = {
        player1_id: 'team-1',
        player2_id: 'team-2'
      };
    });

    it('devrait mettre à jour pour une victoire de player1', () => {
      const result = { winner_id: 'team-1', score1: 2, score2: 0 };
      const updated = updateGroupStandings(standings, match, result);

      const team1 = updated.find(s => s.team_id === 'team-1');
      const team2 = updated.find(s => s.team_id === 'team-2');

      expect(team1.wins).toBe(1);
      expect(team1.points).toBe(3);
      expect(team1.goalsFor).toBe(2);
      expect(team1.goalsAgainst).toBe(0);

      expect(team2.losses).toBe(1);
      expect(team2.points).toBe(0);
      expect(team2.goalsFor).toBe(0);
      expect(team2.goalsAgainst).toBe(2);
    });

    it('devrait mettre à jour pour un match nul', () => {
      const result = { winner_id: null, score1: 1, score2: 1 };
      const updated = updateGroupStandings(standings, match, result);

      const team1 = updated.find(s => s.team_id === 'team-1');
      const team2 = updated.find(s => s.team_id === 'team-2');

      expect(team1.draws).toBe(1);
      expect(team1.points).toBe(1);
      expect(team2.draws).toBe(1);
      expect(team2.points).toBe(1);
    });

    it('devrait trier par points après mise à jour', () => {
      const result = { winner_id: 'team-2', score1: 0, score2: 3 };
      const updated = updateGroupStandings(standings, match, result);

      // Team 2 devrait être premier avec 3 points
      expect(updated[0].team_id).toBe('team-2');
    });
  });

  describe('sortGroupStandings', () => {
    it('devrait trier par points d\'abord', () => {
      const standings = [
        { team_id: 'a', points: 3, goalDiff: 0, goalsFor: 0 },
        { team_id: 'b', points: 6, goalDiff: 0, goalsFor: 0 }
      ];
      const sorted = standings.sort(sortGroupStandings);
      expect(sorted[0].team_id).toBe('b');
    });

    it('devrait utiliser goalDiff en cas d\'égalité de points', () => {
      const standings = [
        { team_id: 'a', points: 6, goalDiff: 2, goalsFor: 5 },
        { team_id: 'b', points: 6, goalDiff: 5, goalsFor: 5 }
      ];
      const sorted = standings.sort(sortGroupStandings);
      expect(sorted[0].team_id).toBe('b');
    });

    it('devrait utiliser goalsFor en cas d\'égalité parfaite', () => {
      const standings = [
        { team_id: 'a', points: 6, goalDiff: 3, goalsFor: 4 },
        { team_id: 'b', points: 6, goalDiff: 3, goalsFor: 7 }
      ];
      const sorted = standings.sort(sortGroupStandings);
      expect(sorted[0].team_id).toBe('b');
    });
  });

  describe('isGroupPhaseComplete', () => {
    it('devrait retourner false si des matchs sont en attente', () => {
      const teams = createTeams(8);
      const state = initializeGroupStage(teams, { numGroups: 2 });
      
      expect(isGroupPhaseComplete(state)).toBe(false);
    });

    it('devrait retourner true si tous les matchs sont terminés', () => {
      const teams = createTeams(8);
      const state = initializeGroupStage(teams, { numGroups: 2 });
      
      // Marquer tous les matchs comme terminés
      state.groupMatches.forEach(group => {
        group.matches.forEach(match => {
          match.status = 'completed';
        });
      });
      
      expect(isGroupPhaseComplete(state)).toBe(true);
    });
  });

  describe('getQualifiedTeams', () => {
    it('devrait retourner les bonnes équipes qualifiées', () => {
      const teams = createTeams(8);
      const state = initializeGroupStage(teams, { numGroups: 2, teamsAdvancing: 2 });
      
      // Simuler un classement
      state.standings[0] = [
        { team_id: 'team-1', team: teams[0], points: 9, goalDiff: 5, goalsFor: 8 },
        { team_id: 'team-4', team: teams[3], points: 6, goalDiff: 2, goalsFor: 5 },
        { team_id: 'team-5', team: teams[4], points: 3, goalDiff: -2, goalsFor: 3 },
        { team_id: 'team-8', team: teams[7], points: 0, goalDiff: -5, goalsFor: 1 }
      ];
      state.standings[1] = [
        { team_id: 'team-2', team: teams[1], points: 9, goalDiff: 6, goalsFor: 9 },
        { team_id: 'team-3', team: teams[2], points: 6, goalDiff: 3, goalsFor: 6 },
        { team_id: 'team-6', team: teams[5], points: 3, goalDiff: -3, goalsFor: 2 },
        { team_id: 'team-7', team: teams[6], points: 0, goalDiff: -6, goalsFor: 0 }
      ];

      const qualified = getQualifiedTeams(state);

      expect(qualified).toHaveLength(4);
      // 1ers de chaque groupe, puis 2èmes
      expect(qualified.map(q => q.team_id)).toEqual(['team-1', 'team-2', 'team-4', 'team-3']);
      expect(qualified[0].qualifiedFrom).toBe('A');
      expect(qualified[0].groupPosition).toBe(1);
    });
  });

  describe('generatePlayoffBracket', () => {
    it('devrait générer un bracket single elimination pour 4 équipes', () => {
      const qualifiedTeams = [
        { team_id: 'team-1', team: { id: 'team-1', name: 'Team 1' } },
        { team_id: 'team-2', team: { id: 'team-2', name: 'Team 2' } },
        { team_id: 'team-3', team: { id: 'team-3', name: 'Team 3' } },
        { team_id: 'team-4', team: { id: 'team-4', name: 'Team 4' } }
      ];

      const bracket = generatePlayoffBracket(qualifiedTeams, 'single_elimination');

      expect(bracket.format).toBe('single_elimination');
      expect(bracket.numRounds).toBe(2); // Semi + Finale
      expect(bracket.bracketSize).toBe(4);
      expect(bracket.matches).toHaveLength(2); // Premier round = 2 matchs
    });

    it('devrait générer des byes pour 3 équipes', () => {
      const qualifiedTeams = [
        { team_id: 'team-1', team: { id: 'team-1', name: 'Team 1' } },
        { team_id: 'team-2', team: { id: 'team-2', name: 'Team 2' } },
        { team_id: 'team-3', team: { id: 'team-3', name: 'Team 3' } }
      ];

      const bracket = generatePlayoffBracket(qualifiedTeams);

      expect(bracket.bracketSize).toBe(4);
      // Un match avec bye
      const byeMatch = bracket.matches.find(m => m.status === 'bye');
      expect(byeMatch).toBeDefined();
    });
  });

  describe('getGroupStageStats', () => {
    it('devrait calculer les statistiques correctement', () => {
      const teams = createTeams(8);
      const state = initializeGroupStage(teams, { numGroups: 2 });
      
      // Simuler quelques matchs terminés
      state.groupMatches[0].matches[0].status = 'completed';
      state.groupMatches[0].matches[1].status = 'completed';
      state.standings[0][0].goalsFor = 5;
      state.standings[0][1].goalsFor = 3;

      const stats = getGroupStageStats(state);

      expect(stats.totalMatches).toBe(12); // 2 groupes x 6 matchs
      expect(stats.completedMatches).toBe(2);
      expect(stats.remainingMatches).toBe(10);
      expect(stats.progress).toBe(17); // 2/12 arrondi
      expect(stats.isComplete).toBe(false);
    });
  });

  describe('getGroupsSummary', () => {
    it('devrait retourner un résumé correct', () => {
      const teams = createTeams(8);
      const state = initializeGroupStage(teams, { numGroups: 2 });
      
      // Simuler un classement dans le groupe A
      state.standings[0] = [
        { team_id: 'team-1', team: teams[0], points: 6, goalDiff: 3, goalsFor: 5, played: 2 },
        { team_id: 'team-4', team: teams[3], points: 3, goalDiff: 0, goalsFor: 2, played: 2 }
      ];
      state.groupMatches[0].matches[0].status = 'completed';

      const summary = getGroupsSummary(state);

      expect(summary).toHaveLength(2);
      expect(summary[0].name).toBe('A');
      expect(summary[0].matchesPlayed).toBe(1);
      expect(summary[0].matchesTotal).toBe(6);
      expect(summary[0].leader).toEqual(teams[0]);
    });
  });
});
