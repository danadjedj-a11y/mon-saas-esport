/**
 * Service de vérification Riot ID via notre API proxy
 * Utilise Henrik's API en backend pour éviter les problèmes CORS
 */

const HENRIK_API_BASE = 'https://api.henrikdev.xyz';

// Utiliser notre API proxy
const getValorantApiUrl = (name, tag, region = 'eu') => {
  return `/api/riot-verify?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}&region=${encodeURIComponent(region)}`;
};

const getLoLApiUrl = (name, tag, region = 'euw') => {
  return `/api/lol-verify?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}&region=${encodeURIComponent(region)}`;
};

/**
 * Vérifie un compte Valorant et récupère ses stats
 * @param {string} riotId - Format "GameName#TAG"
 * @param {string} region - Région Valorant (eu, na, ap, kr)
 * @returns {Promise<object>} - Infos du compte
 */
export async function verifyValorantAccount(riotId, region = 'eu') {
  const parts = riotId.split('#');
  if (parts.length !== 2) {
    throw new Error('Format invalide. Utilisez: GameName#TAG');
  }
  
  const [name, tag] = parts;
  
  if (!name || !tag) {
    throw new Error('Format invalide. Utilisez: GameName#TAG');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(getValorantApiUrl(name, tag, region), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    
    if (response.status === 404 || data.error) {
      throw new Error(data.message || 'Compte Valorant introuvable');
    }

    if (data.success) {
      const d = data.data;
      return {
        success: true,
        validated: data.validated !== false,
        account: {
          name: d?.name || name,
          tag: d?.tag || tag,
          puuid: d?.puuid,
          region: d?.region || region,
          accountLevel: d?.account_level,
          card: d?.card || null,
          cardWide: d?.card_wide || null,
          lastUpdate: d?.last_update || null,
          message: d?.message,
          currentRank: d?.current_rank || 'Unrated',
          currentRankTier: d?.current_rank_tier || null,
          rankingInTier: d?.ranking_in_tier || 0,
          elo: d?.elo || null,
          mmrChange: d?.mmr_change || null,
          rankImage: d?.rank_image || null,
          rankImageLarge: d?.rank_image_large || null,
          highestRank: d?.highest_rank || null,
          highestRankSeason: d?.highest_rank_season || null,
          stats: d?.stats || null,
          recentAgents: d?.recent_agents || [],
          recentMaps: d?.recent_maps || []
        }
      };
    }

    throw new Error('Réponse invalide de l\'API');
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Timeout - L\'API met trop de temps à répondre.');
    }
    throw error;
  }
}

/**
 * Vérifie un compte LoL et récupère ses stats
 * @param {string} riotId - Format "GameName#TAG"
 * @param {string} region - Région LoL (euw, eune, na, kr)
 * @returns {Promise<object>} - Infos du compte
 */
export async function verifyLoLAccount(riotId, region = 'euw') {
  const parts = riotId.split('#');
  if (parts.length !== 2) {
    throw new Error('Format invalide. Utilisez: GameName#TAG');
  }
  
  const [name, tag] = parts;
  
  if (!name || !tag) {
    throw new Error('Format invalide. Utilisez: GameName#TAG');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(getLoLApiUrl(name, tag, region), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    
    if (response.status === 404 || data.error) {
      throw new Error(data.message || 'Compte LoL introuvable');
    }

    if (data.success) {
      const d = data.data;
      return {
        success: true,
        validated: data.validated !== false,
        account: {
          name: d?.name || name,
          tag: d?.tag || tag,
          puuid: d?.puuid,
          region: d?.region || region,
          summonerLevel: d?.summoner_level,
          profileIcon: d?.profile_icon,
          message: d?.message,
          // Solo/Duo
          soloRank: d?.solo_rank || 'Unranked',
          soloLP: d?.solo_lp || 0,
          soloWins: d?.solo_wins || 0,
          soloLosses: d?.solo_losses || 0,
          soloWinrate: d?.solo_winrate,
          // Flex
          flexRank: d?.flex_rank || null,
          flexLP: d?.flex_lp || 0,
          flexWins: d?.flex_wins || 0,
          flexLosses: d?.flex_losses || 0,
          // Stats
          stats: d?.stats || null
        }
      };
    }

    throw new Error('Réponse invalide de l\'API');
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Timeout - L\'API met trop de temps à répondre.');
    }
    throw error;
  }
}

// Alias pour la rétro-compatibilité
export const verifyRiotAccount = verifyValorantAccount;
export const getValorantRank = async () => null; // Plus besoin, inclus dans verifyValorantAccount

// Tiers Valorant avec couleurs
export const VALORANT_TIERS = {
  'Iron 1': { color: '#4a4a4a', icon: '🔘' },
  'Iron 2': { color: '#4a4a4a', icon: '🔘' },
  'Iron 3': { color: '#4a4a4a', icon: '🔘' },
  'Bronze 1': { color: '#cd7f32', icon: '🥉' },
  'Bronze 2': { color: '#cd7f32', icon: '🥉' },
  'Bronze 3': { color: '#cd7f32', icon: '🥉' },
  'Silver 1': { color: '#c0c0c0', icon: '⬜' },
  'Silver 2': { color: '#c0c0c0', icon: '⬜' },
  'Silver 3': { color: '#c0c0c0', icon: '⬜' },
  'Gold 1': { color: '#ffd700', icon: '🥇' },
  'Gold 2': { color: '#ffd700', icon: '🥇' },
  'Gold 3': { color: '#ffd700', icon: '🥇' },
  'Platinum 1': { color: '#00bcd4', icon: '💎' },
  'Platinum 2': { color: '#00bcd4', icon: '💎' },
  'Platinum 3': { color: '#00bcd4', icon: '💎' },
  'Diamond 1': { color: '#b388ff', icon: '💠' },
  'Diamond 2': { color: '#b388ff', icon: '💠' },
  'Diamond 3': { color: '#b388ff', icon: '💠' },
  'Ascendant 1': { color: '#00e676', icon: '🌟' },
  'Ascendant 2': { color: '#00e676', icon: '🌟' },
  'Ascendant 3': { color: '#00e676', icon: '🌟' },
  'Immortal 1': { color: '#ff1744', icon: '🔥' },
  'Immortal 2': { color: '#ff1744', icon: '🔥' },
  'Immortal 3': { color: '#ff1744', icon: '🔥' },
  'Radiant': { color: '#ffeb3b', icon: '👑' },
  'Unranked': { color: '#666', icon: '❓' },
  'Unrated': { color: '#666', icon: '❓' },
};

// Tiers LoL avec couleurs
export const LOL_TIERS = {
  'IRON': { color: '#4a4a4a', icon: '🔘', name: 'Iron' },
  'BRONZE': { color: '#cd7f32', icon: '🥉', name: 'Bronze' },
  'SILVER': { color: '#c0c0c0', icon: '⬜', name: 'Silver' },
  'GOLD': { color: '#ffd700', icon: '🥇', name: 'Gold' },
  'PLATINUM': { color: '#00bcd4', icon: '💎', name: 'Platinum' },
  'EMERALD': { color: '#50c878', icon: '💚', name: 'Emerald' },
  'DIAMOND': { color: '#b388ff', icon: '💠', name: 'Diamond' },
  'MASTER': { color: '#9c27b0', icon: '🏆', name: 'Master' },
  'GRANDMASTER': { color: '#ff5722', icon: '🔥', name: 'Grandmaster' },
  'CHALLENGER': { color: '#00bcd4', icon: '👑', name: 'Challenger' },
};
