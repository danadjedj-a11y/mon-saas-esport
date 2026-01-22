/**
 * Helpers pour les tournois
 * Fonctions utilitaires réutilisables
 */

export const getFormatLabel = (format) => {
  switch (format) {
    case 'elimination': return 'Élimination Directe';
    case 'double_elimination': return 'Double Elimination';
    case 'round_robin': return 'Championnat';
    case 'swiss': return 'Système Suisse';
    case 'gauntlet': return 'Gauntlet';
    case 'group_stage': return 'Phase de Groupes';
    default: return format;
  }
};

export const getFormatDescription = (format) => {
  switch (format) {
    case 'elimination': return 'Une défaite et vous êtes éliminé';
    case 'double_elimination': return 'Deux défaites pour être éliminé';
    case 'round_robin': return 'Tous contre tous';
    case 'swiss': return 'Appariements dynamiques basés sur le score';
    case 'gauntlet': return 'Le champion défend son titre contre tous les challengers';
    case 'group_stage': return 'Groupes en Round Robin puis phase finale';
    default: return '';
  }
};

export const getStatusStyle = (status) => {
  switch (status) {
    case 'draft': return { bg: 'bg-gradient-to-r from-orange-500 to-amber-500', text: 'Inscriptions ouvertes', icon: '📝' };
    case 'completed': return { bg: 'bg-gradient-to-r from-pink-500 to-rose-500', text: 'Terminé', icon: '🏁' };
    default: return { bg: 'bg-gradient-to-r from-violet-600 to-cyan-500', text: 'En cours', icon: '⚔️' };
  }
};

/**
 * Liste des formats de tournoi disponibles
 */
export const TOURNAMENT_FORMATS = [
  { value: 'elimination', label: 'Élimination Directe', minTeams: 2 },
  { value: 'double_elimination', label: 'Double Élimination', minTeams: 4 },
  { value: 'round_robin', label: 'Championnat (Round Robin)', minTeams: 3 },
  { value: 'swiss', label: 'Système Suisse', minTeams: 4 },
  { value: 'gauntlet', label: 'Gauntlet', minTeams: 2 },
  { value: 'group_stage', label: 'Phase de Groupes', minTeams: 8 }
];

