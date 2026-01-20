// Export des composants de phases
export { default as PhaseCreator } from './PhaseCreator';
export { default as PlacementManager } from './PlacementManager';
export { default as PhaseStatsCard } from './PhaseStatsCard';
export { default as GroupConfigEditor } from './GroupConfigEditor';

// Constantes pour les types de phases
export const PHASE_FORMATS = {
  elimination: {
    id: 'elimination',
    label: 'Élimination directe',
    description: 'Arbre dans lequel les participants sont éliminés après une défaite.',
  },
  double_elimination: {
    id: 'double_elimination',
    label: 'Double élimination',
    description: 'Arbre dans lequel un participant doit perdre deux matchs pour être éliminé.',
  },
  round_robin: {
    id: 'round_robin',
    label: 'Groupes "round-robin"',
    description: 'Petits groupes dans lesquels les participants affrontent tous les adversaires.',
  },
  swiss: {
    id: 'swiss',
    label: 'Système suisse',
    description: 'Phase dans laquelle les participants affrontent des adversaires avec des résultats similaires.',
  },
  gauntlet: {
    id: 'gauntlet',
    label: 'Gauntlet',
    description: 'Arbre dans lequel les participants moins bien classés rencontrent progressivement des adversaires mieux classés.',
  },
  groups: {
    id: 'groups',
    label: 'Groupes d\'arbres',
    description: 'Groupes dans lesquels les participants jouent dans de petits arbres.',
  },
  league: {
    id: 'league',
    label: 'Système de ligue',
    description: 'Grandes divisions dans lesquelles les participants jouent sur plusieurs journées.',
  },
  custom: {
    id: 'custom',
    label: 'Arbre personnalisé',
    description: 'Arbre dans lequel la progression des participants peut être personnalisée.',
  },
};

// Constantes pour les formats de match
export const MATCH_FORMATS = {
  none: { value: 'none', label: 'Aucune manche' },
  single: { value: 'single', label: 'Manche unique' },
  home_away: { value: 'home_away', label: 'Aller-Retour' },
  best_of: { value: 'best_of', label: 'Best-of' },
  fixed: { value: 'fixed', label: 'Manches fixes' },
};

// Options Best-of
export const BEST_OF_OPTIONS = [
  { value: 1, label: 'BO1' },
  { value: 3, label: 'BO3' },
  { value: 5, label: 'BO5' },
  { value: 7, label: 'BO7' },
  { value: 9, label: 'BO9' },
];

// Statuts de phase
export const PHASE_STATUS = {
  draft: { value: 'draft', label: 'Brouillon', color: 'gray' },
  ready: { value: 'ready', label: 'Prêt', color: 'blue' },
  ongoing: { value: 'ongoing', label: 'En cours', color: 'cyan' },
  completed: { value: 'completed', label: 'Terminé', color: 'green' },
};
