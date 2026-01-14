/**
 * Gaming Accounts API Service
 * Handles all gaming account-related API calls
 */

import { supabase } from '../../../supabaseClient';

/**
 * Get all gaming accounts for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of gaming accounts
 */
export async function getUserGamingAccounts(userId) {
  try {
    const { data, error } = await supabase
      .from('player_game_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching gaming accounts:', error);
    throw error;
  }
}

/**
 * Add a new gaming account
 * @param {string} userId - User ID
 * @param {string} platform - Platform identifier (riot_games, epic_games, etc.)
 * @param {string} username - Gaming username
 * @param {string} tag - Tag (optional, for Riot/Battle.net)
 * @returns {Promise<Object>} - Created gaming account
 */
export async function addGamingAccount(userId, platform, username, tag = null) {
  try {
    const { data, error } = await supabase
      .from('player_game_accounts')
      .insert([
        {
          user_id: userId,
          platform: platform,
          game_username: username.trim(),
          game_tag: tag ? tag.trim() : null,
          verified: false,
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding gaming account:', error);
    throw error;
  }
}

/**
 * Update an existing gaming account
 * @param {string} accountId - Account ID
 * @param {string} username - New username
 * @param {string} tag - New tag (optional)
 * @returns {Promise<Object>} - Updated gaming account
 */
export async function updateGamingAccount(accountId, username, tag = null) {
  try {
    const { data, error } = await supabase
      .from('player_game_accounts')
      .update({
        game_username: username.trim(),
        game_tag: tag ? tag.trim() : null,
      })
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating gaming account:', error);
    throw error;
  }
}

/**
 * Delete a gaming account
 * @param {string} accountId - Account ID
 * @returns {Promise<void>}
 */
export async function deleteGamingAccount(accountId) {
  try {
    const { error } = await supabase
      .from('player_game_accounts')
      .delete()
      .eq('id', accountId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting gaming account:', error);
    throw error;
  }
}

/**
 * Check if user has a gaming account for a specific platform
 * @param {string} userId - User ID
 * @param {string} platform - Platform identifier
 * @returns {Promise<Object|null>} - Gaming account or null
 */
export async function checkUserHasPlatformAccount(userId, platform) {
  try {
    const { data, error } = await supabase
      .from('player_game_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking platform account:', error);
    throw error;
  }
}

/**
 * Get gaming account for a user and platform
 * @param {string} userId - User ID
 * @param {string} platform - Platform identifier
 * @returns {Promise<Object|null>} - Gaming account or null
 */
export async function getGamingAccountByPlatform(userId, platform) {
  return checkUserHasPlatformAccount(userId, platform);
}
