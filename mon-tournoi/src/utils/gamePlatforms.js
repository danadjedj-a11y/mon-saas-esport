/**
 * Game Platforms Mapping
 * Maps games to their respective gaming platforms
 */

export const GAME_PLATFORMS = {
  'Valorant': 'riot_games',
  'VALORANT': 'riot_games',
  'League of Legends': 'riot_games',
  'LoL': 'riot_games',
  'Rocket League': 'epic_games',
  'Fortnite': 'epic_games',
  'Rainbow Six Siege': 'ubisoft',
  'R6': 'ubisoft',
  'CS2': 'steam',
  'Counter-Strike 2': 'steam',
  'CS:GO': 'steam',
  'Counter-Strike': 'steam',
  'Overwatch 2': 'battlenet',
  'Overwatch': 'battlenet',
  'Dota 2': 'steam',
  'DOTA 2': 'steam',
};

/**
 * Platform logos (inline SVG as data URLs for performance)
 * Using simple iconic representations
 */
export const PLATFORM_LOGOS = {
  riot_games: `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23EB0029">
      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
    </svg>
  `)}`,
  epic_games: `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23313131">
      <circle cx="12" cy="12" r="10"/>
      <path fill="%23FFFFFF" d="M12 6l-6 6h4v6l6-6h-4z"/>
    </svg>
  `)}`,
  ubisoft: `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230082C9">
      <circle cx="12" cy="12" r="10"/>
      <path fill="%23FFFFFF" d="M8 8h8v8H8z"/>
    </svg>
  `)}`,
  steam: `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23000000">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="15" cy="9" r="3" fill="%23FFFFFF"/>
      <path fill="%23FFFFFF" d="M7 15l5-3v6z"/>
    </svg>
  `)}`,
  battlenet: `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300AEFF">
      <path d="M12 2L3 7v6l9 5 9-5V7l-9-5zm0 14l-6-3.5V8l6-3.5L18 8v4.5l-6 3.5z"/>
    </svg>
  `)}`,
};

/**
 * Platform display names
 */
export const PLATFORM_NAMES = {
  riot_games: 'Riot Games',
  epic_games: 'Epic Games',
  ubisoft: 'Ubisoft',
  steam: 'Steam',
  battlenet: 'Battle.net',
};

/**
 * Platform games associations
 */
export const PLATFORM_GAMES = {
  riot_games: ['VALORANT', 'League of Legends'],
  epic_games: ['Rocket League', 'Fortnite'],
  ubisoft: ['Rainbow Six Siege'],
  steam: ['CS2', 'Counter-Strike 2', 'Dota 2'],
  battlenet: ['Overwatch 2'],
};

/**
 * Get platform for a specific game
 * @param {string} game - Game name
 * @returns {string|null} - Platform identifier or null
 */
export function getPlatformForGame(game) {
  if (!game) return null;
  return GAME_PLATFORMS[game] || null;
}

/**
 * Get required platform name for a game
 * @param {string} game - Game name
 * @returns {string|null} - Platform display name or null
 */
export function getRequiredPlatformName(game) {
  const platform = getPlatformForGame(game);
  return platform ? PLATFORM_NAMES[platform] : null;
}

/**
 * Check if a platform requires a tag (like Riot #TAG)
 * @param {string} platform - Platform identifier
 * @returns {boolean}
 */
export function platformRequiresTag(platform) {
  return platform === 'riot_games' || platform === 'battlenet';
}

/**
 * Format gamertag for display
 * @param {string} username - Username
 * @param {string} tag - Tag (optional)
 * @param {string} platform - Platform identifier
 * @returns {string} - Formatted gamertag
 */
export function formatGamertag(username, tag, platform) {
  if (!username) return '';
  
  if (platformRequiresTag(platform)) {
    if (!tag) {
      // Platform requires tag but none provided - show warning
      return `${username} (⚠️ Tag requis)`;
    }
    return `${username}#${tag}`;
  }
  
  return username;
}
