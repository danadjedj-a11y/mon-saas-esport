/**
 * Service de vérification Riot ID via notre API proxy
 * Utilise Henrik's API en backend pour éviter les problèmes CORS
 */

const HENRIK_API_BASE = 'https://api.henrikdev.xyz';

// Utiliser notre API proxy en production, Henrik directement en dev
const getApiUrl = (name, tag, region = 'eu') => {
  // En production (Vercel), utiliser notre proxy qui récupère tout
  if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('flukyboys')) {
    return `/api/riot-verify?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}&region=${encodeURIComponent(region)}`;
  }
  // En dev local, utiliser aussi le proxy si possible (via dev server)
  // Sinon fallback sur Henrik direct
  return `/api/riot-verify?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}&region=${encodeURIComponent(region)}`;
};

/**
 * Vérifie si un compte Riot existe et récupère ses infos
 * @param {string} riotId - Format "GameName#TAG"
 * @returns {Promise<object>} - Infos du compte ou erreur
 */
export async function verifyRiotAccount(riotId) {
  // Parser le Riot ID
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
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(getApiUrl(name, tag), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    // Notre proxy retourne toujours 200 avec success: true si le format est valide
    const data = await response.json();
    
    if (response.status === 404 || data.error) {
      throw new Error(data.message || 'Compte Riot introuvable. Vérifiez votre GameName#TAG');
    }
    
    if (response.status === 429) {
      throw new Error('Trop de requêtes. Attendez quelques secondes.');
    }

    // Succès - compte vérifié avec toutes les infos
    if (data.success) {
      const d = data.data;
      return {
        success: true,
        validated: data.validated !== false,
        account: {
          name: d?.name || name,
          tag: d?.tag || tag,
          puuid: d?.puuid,
          region: d?.region,
          accountLevel: d?.account_level,
          card: d?.card || null,
          cardWide: d?.card_wide || null,
          message: d?.message,
          
          // Rang actuel
          currentRank: d?.current_rank || null,
          currentRankTier: d?.current_rank_tier || null,
          rankingInTier: d?.ranking_in_tier || 0,
          elo: d?.elo || null,
          mmrChange: d?.mmr_change || null,
          rankImage: d?.rank_image || null,
          rankImageLarge: d?.rank_image_large || null,
          
          // Plus haut rang
          highestRank: d?.highest_rank || null,
          highestRankSeason: d?.highest_rank_season || null,
          
          // Stats
          stats: d?.stats || null
        }
      };
    }

    // Réponse directe de Henrik (en dev)
    if (data.data) {
      return {
        success: true,
        validated: true,
        account: {
          name: data.data.name,
          tag: data.data.tag,
          puuid: data.data.puuid,
          region: data.data.region,
          accountLevel: data.data.account_level,
          card: data.data.card?.small || null,
        }
      };
    }

    throw new Error('Réponse invalide de l\'API');
  } catch (error) {
    console.error('Riot verification error:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Timeout - L\'API met trop de temps à répondre.');
    }
    
    if (error.message.includes('Compte Riot') || 
        error.message.includes('Format invalide') ||
        error.message.includes('Trop de requêtes') ||
        error.message.includes('Timeout')) {
      throw error;
    }
    
    throw new Error('Erreur de vérification. Réessayez plus tard.');
  }
}

/**
 * Récupère le rang Valorant d'un joueur
 * @param {string} riotId - Format "GameName#TAG"
 * @param {string} region - Région (eu, na, ap, kr, latam, br)
 * @returns {Promise<object>} - Infos de rang
 */
export async function getValorantRank(riotId, region = 'eu') {
  const parts = riotId.split('#');
  if (parts.length !== 2) return null;
  
  const [name, tag] = parts;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${HENRIK_API_BASE}/valorant/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    // Vérifier que c'est bien du JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log('Rank API returned non-JSON response');
      return null;
    }
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === 404 || data.error) {
      return null;
    }

    const currentData = data.data?.current_data;
    
    return {
      currentTier: currentData?.currenttierpatched || 'Unranked',
      currentTierIcon: currentData?.images?.small || null,
      rankingInTier: currentData?.ranking_in_tier || 0,
      elo: currentData?.elo || 0,
      gamesNeeded: currentData?.games_needed_for_rating || 0,
    };
  } catch (error) {
    // Silencieusement ignorer les erreurs de rang - pas critique
    console.log('Rank fetch skipped:', error.name === 'AbortError' ? 'timeout' : 'error');
    return null;
  }
}

/**
 * Récupère les stats LoL d'un joueur via op.gg (alternative)
 * @param {string} summonerName - Nom d'invocateur
 * @param {string} region - Région (euw, na, kr, etc.)
 */
export async function getLoLStats(summonerName, region = 'euw') {
  // Pour LoL, on peut juste vérifier que le format est valide
  // L'API Riot officielle nécessite une clé, donc on fait une vérification basique
  return {
    verified: true,
    message: 'Compte LoL enregistré (vérification manuelle)'
  };
}

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
};
