/**
 * Utilitaires de validation
 * Utilise Zod pour la validation de schémas
 */

/**
 * Validation d'email simple
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validation de mot de passe
 * Min 8 caractères, au moins une majuscule, une minuscule, un chiffre
 */
export const isValidPassword = (password) => {
  if (password.length < 8) return { valid: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Le mot de passe doit contenir au moins une majuscule' };
  if (!/[a-z]/.test(password)) return { valid: false, error: 'Le mot de passe doit contenir au moins une minuscule' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre' };
  return { valid: true };
};

/**
 * Validation de nom d'équipe
 */
export const isValidTeamName = (name) => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Le nom est requis' };
  }
  if (name.length < 2) {
    return { valid: false, error: 'Le nom doit contenir au moins 2 caractères' };
  }
  if (name.length > 50) {
    return { valid: false, error: 'Le nom ne peut pas dépasser 50 caractères' };
  }
  return { valid: true };
};

/**
 * Validation de tag d'équipe
 */
export const isValidTeamTag = (tag) => {
  if (!tag || tag.trim().length === 0) {
    return { valid: false, error: 'Le tag est requis' };
  }
  if (tag.length < 2) {
    return { valid: false, error: 'Le tag doit contenir au moins 2 caractères' };
  }
  if (tag.length > 10) {
    return { valid: false, error: 'Le tag ne peut pas dépasser 10 caractères' };
  }
  if (!/^[A-Z0-9]+$/.test(tag)) {
    return { valid: false, error: 'Le tag ne peut contenir que des majuscules et des chiffres' };
  }
  return { valid: true };
};

/**
 * Validation de nom de tournoi
 */
export const isValidTournamentName = (name) => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Le nom du tournoi est requis' };
  }
  if (name.length < 3) {
    return { valid: false, error: 'Le nom doit contenir au moins 3 caractères' };
  }
  if (name.length > 100) {
    return { valid: false, error: 'Le nom ne peut pas dépasser 100 caractères' };
  }
  return { valid: true };
};

export default {
  isValidEmail,
  isValidPassword,
  isValidTeamName,
  isValidTeamTag,
  isValidTournamentName,
};
