/**
 * Design System - Index
 * Export centralisé de toutes les constantes
 */

export { colors } from './colors';
export { default as spacing, containerWidths, breakpoints } from './spacing';
export { default as typography, fonts, fontSizes, fontWeights } from './typography';
export { default as animations, durations, easings } from './animations';

// Configuration globale
export const config = {
  appName: 'Fluky Boys',
  appVersion: '2.0.0',
  apiUrl: import.meta.env.VITE_API_URL || '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
  environment: import.meta.env.MODE || 'development',
};

// Limites et contraintes
export const limits = {
  maxTeamNameLength: 50,
  maxTeamTagLength: 10,
  maxTournamentNameLength: 100,
  maxMessageLength: 500,
  maxParticipants: 1000,
  minParticipants: 2,
  maxUploadSize: 5 * 1024 * 1024, // 5MB
  maxBestOf: 7, // Best-of-7 maximum
};

// Formats de tournoi
export const tournamentFormats = {
  ELIMINATION: 'elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
  ROUND_ROBIN: 'round_robin',
  SWISS: 'swiss',
};

export const tournamentFormatLabels = {
  [tournamentFormats.ELIMINATION]: 'Élimination Simple',
  [tournamentFormats.DOUBLE_ELIMINATION]: 'Double Élimination',
  [tournamentFormats.ROUND_ROBIN]: 'Championnat (Round Robin)',
  [tournamentFormats.SWISS]: 'Système Suisse',
};

// Statuts de tournoi
export const tournamentStatuses = {
  DRAFT: 'draft',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const tournamentStatusLabels = {
  [tournamentStatuses.DRAFT]: 'Brouillon',
  [tournamentStatuses.ONGOING]: 'En cours',
  [tournamentStatuses.COMPLETED]: 'Terminé',
  [tournamentStatuses.CANCELLED]: 'Annulé',
};

// Statuts de match
export const matchStatuses = {
  PENDING: 'pending',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
};

export const matchStatusLabels = {
  [matchStatuses.PENDING]: 'En attente',
  [matchStatuses.ONGOING]: 'En cours',
  [matchStatuses.COMPLETED]: 'Terminé',
  [matchStatuses.DISPUTED]: 'En conflit',
  [matchStatuses.CANCELLED]: 'Annulé',
};

// Rôles utilisateur
export const userRoles = {
  PLAYER: 'player',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
};

export const userRoleLabels = {
  [userRoles.PLAYER]: 'Joueur',
  [userRoles.ORGANIZER]: 'Organisateur',
  [userRoles.ADMIN]: 'Administrateur',
};
