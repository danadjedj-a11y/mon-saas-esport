import clsx from 'clsx';

/**
 * Utilitaire pour fusionner les classes CSS
 * Combine clsx pour plus de flexibilité
 * 
 * @param {...any} inputs - Classes CSS à fusionner
 * @returns {string} - Classes fusionnées
 */
export function cn(...inputs) {
  return clsx(inputs);
}

export default cn;
