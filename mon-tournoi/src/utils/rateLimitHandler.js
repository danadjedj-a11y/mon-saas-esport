/**
 * Utilitaires pour gérer les erreurs de rate limiting
 */

/**
 * Vérifie si une erreur est liée au rate limiting
 * @param {Error|Object} error - L'erreur à vérifier
 * @returns {boolean} - True si c'est une erreur de rate limiting
 */
export function isRateLimitError(error) {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  return errorMessage.includes('Rate limit exceeded') || 
         errorMessage.includes('rate limit') ||
         errorMessage.includes('Rate limit');
}

/**
 * Extrait les informations du rate limiting depuis l'erreur
 * @param {Error|Object} error - L'erreur
 * @returns {Object|null} - Objet avec max_requests, window_minutes, operation_type, ou null
 */
export function extractRateLimitInfo(error) {
  if (!isRateLimitError(error)) return null;
  
  const errorMessage = error.message || error.toString() || '';
  
  // Pattern: "Rate limit exceeded: Maximum X requests per Y minutes for operation Z"
  const match = errorMessage.match(/Maximum (\d+) requests per (\d+) minutes for operation (.+)/);
  
  if (match) {
    return {
      max_requests: parseInt(match[1], 10),
      window_minutes: parseInt(match[2], 10),
      operation_type: match[3].trim()
    };
  }
  
  return null;
}

/**
 * Génère un message d'erreur utilisateur-friendly pour le rate limiting
 * @param {Error|Object} error - L'erreur
 * @param {string} operationName - Nom de l'opération en français (optionnel)
 * @returns {string} - Message d'erreur formaté
 */
export function getRateLimitMessage(error, operationName = null) {
  const info = extractRateLimitInfo(error);
  
  if (!info) {
    return 'Vous avez atteint la limite de requêtes. Veuillez réessayer plus tard.';
  }
  
  const { max_requests, window_minutes, operation_type } = info;
  
  // Messages personnalisés par type d'opération
  const operationMessages = {
    'tournament_create': `Vous avez créé ${max_requests} tournois dans les dernières ${window_minutes} minutes. Veuillez attendre avant d'en créer un nouveau.`,
    'team_create': `Vous avez créé ${max_requests} équipes dans les dernières ${window_minutes} minutes. Veuillez attendre avant d'en créer une nouvelle.`,
    'comment_post': `Vous avez posté ${max_requests} commentaires dans les dernières ${window_minutes} minutes. Veuillez attendre avant d'en poster un nouveau.`,
    'registration': `Vous vous êtes inscrit à ${max_requests} tournois dans les dernières ${window_minutes} minutes. Veuillez attendre avant de vous inscrire à un autre.`,
    'template_create': `Vous avez créé ${max_requests} templates dans les dernières ${window_minutes} minutes. Veuillez attendre avant d'en créer un nouveau.`,
    'follow_toggle': `Vous avez effectué ${max_requests} actions de suivi dans les dernières ${window_minutes} minutes. Veuillez attendre avant d'en effectuer une autre.`,
    'score_report': `Vous avez déclaré ${max_requests} scores dans les dernières ${window_minutes} minutes. Veuillez attendre avant d'en déclarer un autre.`,
    'check_in': `Vous avez effectué ${max_requests} check-ins dans les dernières ${window_minutes} minutes. Veuillez attendre avant d'en effectuer un autre.`
  };
  
  // Message par défaut si l'opération n'est pas dans la liste
  if (operationMessages[operation_type]) {
    return operationMessages[operation_type];
  }
  
  // Message générique avec le nom de l'opération si fourni
  if (operationName) {
    return `Vous avez atteint la limite de ${max_requests} ${operationName} par ${window_minutes} minutes. Veuillez attendre avant de réessayer.`;
  }
  
  // Message générique
  return `Limite atteinte : ${max_requests} requêtes maximum par ${window_minutes} minutes. Veuillez réessayer plus tard.`;
}

/**
 * Gère une erreur et retourne un message approprié
 * @param {Error|Object} error - L'erreur à gérer
 * @param {string} operationName - Nom de l'opération en français (optionnel)
 * @returns {string} - Message d'erreur formaté
 */
export function handleRateLimitError(error, operationName = null) {
  if (isRateLimitError(error)) {
    return getRateLimitMessage(error, operationName);
  }
  
  // Si ce n'est pas une erreur de rate limiting, retourner le message d'erreur original
  return error.message || 'Une erreur est survenue. Veuillez réessayer.';
}

