// src/components/__tests__/GauntletBracket.test.jsx
// Tests unitaires pour les utilitaires Gauntlet avec composant

import { initializeGauntlet, processGauntletResult, getGauntletStats, getCurrentGauntletMatch } from '../../gauntletUtils';

// Données de test
const createTeams = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1
  }));
};

describe('GauntletBracket Logic', () => {
  const teams = createTeams(4);
  let initialState;

  beforeEach(() => {
    initialState = initializeGauntlet(teams);
    initialState.matches[0].player1_id = initialState.champion.id;
  });

  it('devrait avoir un champion initial', () => {
    expect(initialState.champion).toBeDefined();
    expect(initialState.champion.id).toBe('team-1');
  });

  it('devrait avoir le bon nombre de matchs', () => {
    expect(initialState.matches).toHaveLength(3);
  });

  it('devrait retourner les stats initiales correctes', () => {
    const stats = getGauntletStats(initialState);
    expect(stats.completedMatches).toBe(0);
    expect(stats.totalMatches).toBe(3);
    expect(stats.titleDefenses).toBe(0);
  });

  it('devrait retourner le match actuel', () => {
    const current = getCurrentGauntletMatch(initialState);
    expect(current).toBeDefined();
    expect(current.round).toBe(1);
    expect(current.champion.id).toBe('team-1');
  });

  it('devrait gérer une victoire du champion', () => {
    let state = processGauntletResult(initialState, 1, 'team-1');
    expect(state.champion.id).toBe('team-1');
    expect(state.championChanged).toBe(false);
    
    const stats = getGauntletStats(state);
    expect(stats.titleDefenses).toBe(1);
  });

  it('devrait gérer un changement de champion', () => {
    let state = processGauntletResult(initialState, 1, 'team-2');
    expect(state.champion.id).toBe('team-2');
    expect(state.championChanged).toBe(true);
    
    const stats = getGauntletStats(state);
    expect(stats.titleChanges).toBe(1);
  });

  it('devrait marquer le tournoi terminé après le dernier match', () => {
    let state = initialState;
    state = processGauntletResult(state, 1, 'team-1');
    state = processGauntletResult(state, 2, 'team-1');
    state = processGauntletResult(state, 3, 'team-1');

    expect(state.isCompleted).toBe(true);
    expect(state.finalChampion.id).toBe('team-1');
  });

  it('devrait calculer le streak correctement', () => {
    let state = initialState;
    state = processGauntletResult(state, 1, 'team-1');
    state = processGauntletResult(state, 2, 'team-1');

    const stats = getGauntletStats(state);
    expect(stats.currentStreak).toBe(2);
  });
});
