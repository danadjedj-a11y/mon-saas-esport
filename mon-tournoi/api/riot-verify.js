// Proxy API pour Henrik's Valorant API
// Récupère le compte + rang + stats + matchs récents (ranked ET unrated)

const HENRIK_API_KEY = process.env.HENRIK_API_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { name, tag, region = 'eu' } = req.query;

  if (!name || !tag) {
    return res.status(400).json({ error: true, message: 'Name and tag are required' });
  }

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'FlukyBoys-Tournament-Platform/1.0'
  };
  
  if (HENRIK_API_KEY) {
    headers['Authorization'] = HENRIK_API_KEY;
  }

  const regionMap = { 'eu': 'eu', 'na': 'na', 'ap': 'ap', 'kr': 'kr', 'latam': 'latam', 'br': 'br' };
  const apiRegion = regionMap[region.toLowerCase()] || 'eu';

  try {
    // 1. Récupérer les infos du compte
    const accountResponse = await fetchWithTimeout(
      `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      headers, 15000
    );

    if (accountResponse.status === 401) {
      return res.status(200).json({
        success: true, validated: true,
        data: { name, tag, region, message: 'API Key invalide' }
      });
    }

    if (accountResponse.status === 404) {
      return res.status(404).json({ error: true, message: 'Compte introuvable' });
    }

    let accountData = null;
    if (accountResponse.ok) {
      const text = await accountResponse.text();
      if (text.startsWith('{')) accountData = JSON.parse(text);
    }

    if (!accountData?.data) {
      return res.status(200).json({
        success: true, validated: true,
        data: { name, tag, region, message: 'Compte validé - API indisponible' }
      });
    }

    const account = accountData.data;

    // 2. Récupérer le rang MMR
    let mmrData = null;
    try {
      const mmrResponse = await fetchWithTimeout(
        `https://api.henrikdev.xyz/valorant/v1/mmr/${apiRegion}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
        headers, 10000
      );
      if (mmrResponse.ok) {
        const text = await mmrResponse.text();
        if (text.startsWith('{')) mmrData = JSON.parse(text);
      }
    } catch (e) { console.log('MMR error:', e.message); }

    // 3. Récupérer les matchs compétitifs
    let compMatches = [];
    try {
      const compResponse = await fetchWithTimeout(
        `https://api.henrikdev.xyz/valorant/v3/matches/${apiRegion}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?filter=competitive&size=10`,
        headers, 10000
      );
      if (compResponse.ok) {
        const text = await compResponse.text();
        if (text.startsWith('{')) {
          const data = JSON.parse(text);
          compMatches = data.data || [];
        }
      }
    } catch (e) { console.log('Comp matches error:', e.message); }

    // 4. Si pas de matchs ranked, récupérer les unrated
    let unratedMatches = [];
    if (compMatches.length === 0) {
      try {
        const unratedResponse = await fetchWithTimeout(
          `https://api.henrikdev.xyz/valorant/v3/matches/${apiRegion}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?filter=unrated&size=10`,
          headers, 10000
        );
        if (unratedResponse.ok) {
          const text = await unratedResponse.text();
          if (text.startsWith('{')) {
            const data = JSON.parse(text);
            unratedMatches = data.data || [];
          }
        }
      } catch (e) { console.log('Unrated matches error:', e.message); }
    }

    // 5. Récupérer TOUS les matchs récents (peu importe le mode)
    let allMatches = [];
    try {
      const allResponse = await fetchWithTimeout(
        `https://api.henrikdev.xyz/valorant/v3/matches/${apiRegion}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=20`,
        headers, 10000
      );
      if (allResponse.ok) {
        const text = await allResponse.text();
        if (text.startsWith('{')) {
          const data = JSON.parse(text);
          allMatches = data.data || [];
        }
      }
    } catch (e) { console.log('All matches error:', e.message); }

    // Utiliser les matchs disponibles pour les stats
    const matchesForStats = compMatches.length > 0 ? compMatches : (unratedMatches.length > 0 ? unratedMatches : allMatches);
    
    // Calculer les stats
    let stats = null;
    let recentAgents = [];
    let recentMaps = [];
    
    if (matchesForStats.length > 0) {
      let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
      let headshots = 0, bodyshots = 0, legshots = 0;
      const agentCount = {};
      const mapCount = {};
      
      matchesForStats.forEach(match => {
        const players = match.players?.all_players || [];
        const player = players.find(p => 
          p.name?.toLowerCase() === name.toLowerCase() && 
          p.tag?.toLowerCase() === tag.toLowerCase()
        );
        
        if (player) {
          totalKills += player.stats?.kills || 0;
          totalDeaths += player.stats?.deaths || 0;
          totalAssists += player.stats?.assists || 0;
          headshots += player.stats?.headshots || 0;
          bodyshots += player.stats?.bodyshots || 0;
          legshots += player.stats?.legshots || 0;
          
          // Agent
          if (player.character) {
            agentCount[player.character] = (agentCount[player.character] || 0) + 1;
          }
          
          // Map
          if (match.metadata?.map) {
            mapCount[match.metadata.map] = (mapCount[match.metadata.map] || 0) + 1;
          }
          
          // Win check
          const playerTeam = player.team?.toLowerCase();
          const redWon = match.teams?.red?.has_won;
          const blueWon = match.teams?.blue?.has_won;
          if ((playerTeam === 'red' && redWon) || (playerTeam === 'blue' && blueWon)) {
            wins++;
          }
        }
      });
      
      const totalShots = headshots + bodyshots + legshots;
      
      stats = {
        matches: matchesForStats.length,
        matchType: compMatches.length > 0 ? 'Competitive' : (unratedMatches.length > 0 ? 'Unrated' : 'All modes'),
        kills: totalKills,
        deaths: totalDeaths,
        assists: totalAssists,
        kd: totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toString(),
        kda: totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toString(),
        winRate: matchesForStats.length > 0 ? Math.round((wins / matchesForStats.length) * 100) : 0,
        wins: wins,
        losses: matchesForStats.length - wins,
        headshotPct: totalShots > 0 ? Math.round((headshots / totalShots) * 100) : 0,
        avgKills: matchesForStats.length > 0 ? (totalKills / matchesForStats.length).toFixed(1) : 0,
        avgDeaths: matchesForStats.length > 0 ? (totalDeaths / matchesForStats.length).toFixed(1) : 0,
      };
      
      // Top agents
      recentAgents = Object.entries(agentCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([agent, count]) => ({ agent, count }));
      
      // Top maps
      recentMaps = Object.entries(mapCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([map, count]) => ({ map, count }));
    }

    const mmr = mmrData?.data;

    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        // Compte
        name: account.name,
        tag: account.tag,
        puuid: account.puuid,
        region: account.region || region,
        account_level: account.account_level,
        card: account.card?.small || account.card?.large || null,
        card_wide: account.card?.wide || null,
        last_update: account.last_update,
        last_update_raw: account.last_update_raw,
        
        // Rang
        current_rank: mmr?.currenttierpatched || 'Unrated',
        current_rank_tier: mmr?.currenttier || 0,
        ranking_in_tier: mmr?.ranking_in_tier || 0,
        elo: mmr?.elo || null,
        mmr_change: mmr?.mmr_change_to_last_game || null,
        rank_image: mmr?.images?.small || null,
        rank_image_large: mmr?.images?.large || null,
        
        // Plus haut rang
        highest_rank: mmr?.highest_rank?.patched_tier || null,
        highest_rank_season: mmr?.highest_rank?.season || null,
        
        // Stats
        stats: stats,
        recent_agents: recentAgents,
        recent_maps: recentMaps,
      }
    });

  } catch (error) {
    console.error('Henrik API error:', error);
    return res.status(200).json({
      success: true, validated: true,
      data: { name, tag, region, message: 'API temporairement indisponible' }
    });
  }
}

async function fetchWithTimeout(url, headers, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
