/**
 * Service de gestion des erreurs avec messages user-friendly
 * Transforme les erreurs techniques en messages compréhensibles
 */

// Mapping des codes d'erreur Supabase vers des messages français
const SUPABASE_ERROR_MESSAGES = {
  // Erreurs d'authentification
  'invalid_credentials': 'Email ou mot de passe incorrect',
  'email_not_confirmed': 'Veuillez confirmer votre email avant de vous connecter',
  'user_not_found': 'Aucun compte trouvé avec cet email',
  'invalid_grant': 'Session expirée, veuillez vous reconnecter',
  'user_already_exists': 'Un compte existe déjà avec cet email',
  'weak_password': 'Le mot de passe doit contenir au moins 6 caractères',
  'same_password': 'Le nouveau mot de passe doit être différent de l\'ancien',
  
  // Erreurs de base de données
  '23505': 'Cet élément existe déjà',
  '23503': 'Impossible de supprimer : des éléments liés existent encore',
  '42501': 'Vous n\'avez pas les permissions nécessaires',
  '42P01': 'Une erreur technique est survenue (table introuvable)',
  'PGRST116': 'Élément introuvable',
  'PGRST301': 'Vous n\'avez pas les permissions pour cette action',
  
  // Erreurs de rate limiting
  'over_request_rate_limit': 'Trop de requêtes, veuillez patienter quelques secondes',
  'over_email_send_rate_limit': 'Trop d\'emails envoyés, veuillez patienter',
  
  // Erreurs réseau
  'fetch_failed': 'Problème de connexion, vérifiez votre internet',
  'network_error': 'Erreur réseau, veuillez réessayer',
};

// Messages génériques par catégorie
const CATEGORY_MESSAGES = {
  auth: 'Erreur de connexion',
  database: 'Erreur lors de l\'enregistrement',
  network: 'Problème de connexion',
  permission: 'Action non autorisée',
  validation: 'Données invalides',
  unknown: 'Une erreur est survenue',
};

/**
 * Transforme une erreur technique en message user-friendly
 * @param {Error|object|string} error - L'erreur à transformer
 * @param {string} context - Contexte de l'erreur (ex: 'inscription', 'connexion')
 * @returns {string} Message user-friendly
 */
export function getUserFriendlyError(error, context = '') {
  // Si c'est déjà un string simple, le retourner
  if (typeof error === 'string') {
    // Vérifier si c'est un message technique connu
    const knownMessage = SUPABASE_ERROR_MESSAGES[error];
    if (knownMessage) return knownMessage;
    
    // Si le message contient des termes techniques, le génériciser
    if (containsTechnicalTerms(error)) {
      return getGenericMessage(context);
    }
    return error;
  }
  
  // Extraire le code et message d'erreur
  const errorCode = error?.code || error?.error?.code || '';
  const errorMessage = error?.message || error?.error?.message || error?.error_description || '';
  
  // Chercher un message connu par code
  if (errorCode && SUPABASE_ERROR_MESSAGES[errorCode]) {
    return SUPABASE_ERROR_MESSAGES[errorCode];
  }
  
  // Chercher dans le message
  for (const [key, message] of Object.entries(SUPABASE_ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  
  // Analyser le type d'erreur pour donner un message contextuel
  if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
    return 'Cet élément existe déjà';
  }
  
  if (errorMessage.includes('foreign key') || errorMessage.includes('reference')) {
    return 'Impossible de supprimer : des éléments liés existent';
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
    return 'Vous n\'avez pas les permissions pour cette action';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Problème de connexion, vérifiez votre internet';
  }
  
  // Si le message contient des termes techniques, utiliser un message générique
  if (containsTechnicalTerms(errorMessage)) {
    return getGenericMessage(context);
  }
  
  // Si le message est court et lisible, le retourner
  if (errorMessage.length > 0 && errorMessage.length < 100) {
    return errorMessage;
  }
  
  return getGenericMessage(context);
}

/**
 * Vérifie si un message contient des termes techniques
 */
function containsTechnicalTerms(message) {
  const technicalTerms = [
    'PGRST', 'SQL', 'postgres', 'supabase', 'JWT', 'token', 
    'undefined', 'null', 'NaN', 'TypeError', 'ReferenceError',
    'stack trace', 'at line', 'column', 'FATAL', 'ERROR:',
    'relation', 'schema', 'constraint', 'violates', 'bytea',
    'uuid', 'jsonb', 'timestamp', 'boolean'
  ];
  
  const lowerMessage = message.toLowerCase();
  return technicalTerms.some(term => lowerMessage.includes(term.toLowerCase()));
}

/**
 * Retourne un message générique basé sur le contexte
 */
function getGenericMessage(context) {
  const contextMessages = {
    'login': 'Erreur lors de la connexion, veuillez réessayer',
    'signup': 'Erreur lors de l\'inscription, veuillez réessayer',
    'register': 'Erreur lors de l\'inscription, veuillez réessayer',
    'inscription': 'Erreur lors de l\'inscription, veuillez réessayer',
    'connexion': 'Erreur lors de la connexion, veuillez réessayer',
    'team': 'Erreur lors de l\'opération sur l\'équipe',
    'equipe': 'Erreur lors de l\'opération sur l\'équipe',
    'tournament': 'Erreur lors de l\'opération sur le tournoi',
    'tournoi': 'Erreur lors de l\'opération sur le tournoi',
    'match': 'Erreur lors de l\'opération sur le match',
    'score': 'Erreur lors de l\'enregistrement du score',
    'upload': 'Erreur lors de l\'envoi du fichier',
    'delete': 'Erreur lors de la suppression',
    'supprimer': 'Erreur lors de la suppression',
    'update': 'Erreur lors de la mise à jour',
    'save': 'Erreur lors de l\'enregistrement',
    'load': 'Erreur lors du chargement des données',
    'fetch': 'Erreur lors du chargement des données',
  };
  
  const lowerContext = context.toLowerCase();
  for (const [key, message] of Object.entries(contextMessages)) {
    if (lowerContext.includes(key)) {
      return message;
    }
  }
  
  return 'Une erreur est survenue, veuillez réessayer';
}

/**
 * Log l'erreur en mode développement sans l'exposer à l'utilisateur
 */
export function logError(error, context = '') {
  if (import.meta.env.DEV) {
    console.group(`🔴 Error${context ? ` (${context})` : ''}`);
    console.error('Details:', error);
    console.groupEnd();
  }
  
  // En production, on pourrait envoyer à Sentry ici
  // if (import.meta.env.PROD && window.Sentry) {
  //   window.Sentry.captureException(error, { extra: { context } });
  // }
}

/**
 * Wrapper pour gérer les erreurs dans les appels async
 * @param {Function} asyncFn - Fonction async à exécuter
 * @param {string} context - Contexte pour le message d'erreur
 * @returns {Promise<{data: any, error: string|null}>}
 */
export async function safeAsync(asyncFn, context = '') {
  try {
    const result = await asyncFn();
    return { data: result, error: null };
  } catch (error) {
    logError(error, context);
    return { data: null, error: getUserFriendlyError(error, context) };
  }
}

export default {
  getUserFriendlyError,
  logError,
  safeAsync,
};
