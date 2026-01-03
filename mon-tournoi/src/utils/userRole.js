// Utilitaires pour gérer les rôles utilisateur

/**
 * Récupère le rôle d'un utilisateur depuis la base de données
 * @param {Object} supabase - Instance Supabase
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<string>} - 'player' ou 'organizer'
 */
export async function getUserRole(supabase, userId) {
  if (!userId) return 'player';
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle(); // Utiliser maybeSingle au lieu de single pour éviter les erreurs
    
    // Si la table n'existe pas ou s'il n'y a pas de résultat, retourner 'player' par défaut
    if (error) {
      // Code 42P01 = table doesn't exist, PGRST116 = no rows returned
      // 42703 = column doesn't exist
      if (error.code === '42P01' || error.code === 'PGRST116' || error.code === '42703' || error.message?.includes('does not exist')) {
        // Table n'existe pas ou colonne n'existe pas - retourner player par défaut
        return 'player';
      }
      console.error('Erreur lors de la récupération du rôle:', error);
      return 'player'; // Par défaut
    }
    
    // Si pas de données, retourner 'player' par défaut
    return data?.role || 'player';
  } catch (error) {
    // En cas d'erreur quelconque, retourner 'player' par défaut
    return 'player';
  }
}

/**
 * Vérifie si un utilisateur est organisateur
 * @param {Object} supabase - Instance Supabase
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<boolean>}
 */
export async function isOrganizer(supabase, userId) {
  const role = await getUserRole(supabase, userId);
  return role === 'organizer';
}

/**
 * Vérifie si un utilisateur est joueur
 * @param {Object} supabase - Instance Supabase
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<boolean>}
 */
export async function isPlayer(supabase, userId) {
  const role = await getUserRole(supabase, userId);
  return role === 'player';
}

