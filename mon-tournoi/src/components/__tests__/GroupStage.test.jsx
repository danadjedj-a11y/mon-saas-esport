// src/components/__tests__/GroupStage.test.jsx
// Tests unitaires pour la logique GroupStage

import { 
  initializeGroupStage, 
  updateGroupStandings,
  getGroupStageStats,
  getGroupsSummary,
  isGroupPhaseComplete,
  getQualifiedTeams,
  sortGroupStandings
} from '../../groupStageUtils';

// Données de test
const createTeams = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1
  }));
};

describe('GroupStage Logic', () => {
  const teams = createTeams(8);
  let initialState;

  beforeEach(() => {
    initialState = initializeGroupStage(teams, { numGroups: 2, teamsAdvancing: 2 });
  });

  it('devrait créer 2 groupes avec 4 équipes chacun', () => {
    expect(initialState.groups).toHaveLength(2);
    expect(initialState.groups[0]).toHaveLength(4);
    expect(initialState.groups[1]).toHaveLength(4);
  });

  it('devrait initialiser avec 12 matchs au total', () => {
    const stats = getGroupStageStats(initialState);
    expect(stats.totalMatches).toBe(12); // 6 matchs par groupe
  });

  it('devrait retourner la progression à 0%', () => {
    const stats = getGroupStageStats(initialState);
    expect(stats.progress).toBe(0);
    expect(stats.completedMatches).toBe(0);
  });

  it('devrait retourner les résumés des groupes', () => {
    const summary = getGroupsSummary(initialState);
    expect(summary).toHaveLength(2);
    expect(summary[0].name).toBe('A');
    expect(summary[1].name).toBe('B');
  });

  it('devrait détecter que la phase n\'est pas terminée', () => {
    expect(isGroupPhaseComplete(initialState)).toBe(false);
  });

  it('devrait détecter que la phase est terminée', () => {
    initialState.groupMatches.forEach(group => {
      group.matches.forEach(match => {
        match.status = 'completed';
      });
    });
    expect(isGroupPhaseComplete(initialState)).toBe(true);
  });

  it('devrait mettre à jour les standings après un match', () => {
    const match = { player1_id: 'team-1', player2_id: 'team-4' };
    const result = { winner_id: 'team-1', score1: 2, score2: 0 };
    
    const updated = updateGroupStandings(initialState.standings[0], match, result);
    
    const team1 = updated.find(s => s.team_id === 'team-1');
    expect(team1.wins).toBe(1);
    expect(team1.points).toBe(3);
    expect(team1.goalsFor).toBe(2);
  });

  it('devrait trier les standings par points', () => {
    const standings = [
      { team_id: 'a', points: 3, goalDiff: 0, goalsFor: 0 },
      { team_id: 'b', points: 6, goalDiff: 0, goalsFor: 0 }
    ];
    const sorted = standings.sort(sortGroupStandings);
    expect(sorted[0].team_id).toBe('b');
  });

  it('devrait récupérer les équipes qualifiées', () => {
    // Simuler des standings
    initialState.standings[0] = [
      { team_id: 'team-1', team: teams[0], points: 9, goalDiff: 5, goalsFor: 8 },
      { team_id: 'team-4', team: teams[3], points: 6, goalDiff: 2, goalsFor: 5 }
    ];
    initialState.standings[1] = [
      { team_id: 'team-2', team: teams[1], points: 9, goalDiff: 6, goalsFor: 9 },
      { team_id: 'team-3', team: teams[2], points: 6, goalDiff: 3, goalsFor: 6 }
    ];

    const qualified = getQualifiedTeams(initialState);
    expect(qualified).toHaveLength(4);
    expect(qualified[0].qualifiedFrom).toBe('A');
    expect(qualified[0].groupPosition).toBe(1);
  });
});
