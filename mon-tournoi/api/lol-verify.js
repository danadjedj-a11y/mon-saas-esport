// Proxy API pour Henrik's League of Legends API
// Récupère le compte + rang + stats LoL

const HENRIK_API_KEY = process.env.HENRIK_API_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { name, tag, region = 'euw' } = req.query;

  if (!name || !tag) {
    return res.status(400).json({ 
      error: true, 
      message: 'Name and tag are required' 
    });
  }

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'FlukyBoys-Tournament-Platform/1.0'
  };
  
  if (HENRIK_API_KEY) {
    headers['Authorization'] = HENRIK_API_KEY;
  }

  try {
    // 1. Récupérer les infos du compte Riot (même endpoint)
    console.log(`Fetching LoL account: ${name}#${tag}`);
    const accountResponse = await fetchWithTimeout(
      `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      headers,
      10000
    );
    
    if (accountResponse.status === 401) {
      return res.status(200).json({
        success: true,
        validated: true,
        data: {
          name: name,
          tag: tag,
          region: region,
          message: 'Riot ID enregistré (API en maintenance)'
        }
      });
    }

    if (accountResponse.status === 404) {
      return res.status(404).json({
        error: true,
        message: 'Compte introuvable'
      });
    }

    let accountData = null;
    if (accountResponse.ok) {
      try {
        const text = await accountResponse.text();
        if (text.startsWith('{') || text.startsWith('[')) {
          accountData = JSON.parse(text);
        }
      } catch (e) {
        console.log('Account parse error:', e.message);
      }
    }

    if (!accountData?.data) {
      return res.status(200).json({
        success: true,
        validated: true,
        data: {
          name: name,
          tag: tag,
          region: region,
          message: 'Compte validé - Détails non disponibles'
        }
      });
    }

    const account = accountData.data;
    const puuid = account.puuid;
    
    // 2. Récupérer le profil LoL via l'API Henrik
    let lolProfile = null;
    const lolRegionMap = {
      'euw': 'euw1',
      'eune': 'eun1',
      'na': 'na1',
      'kr': 'kr',
      'jp': 'jp1',
      'br': 'br1',
      'lan': 'la1',
      'las': 'la2',
      'oce': 'oc1',
      'tr': 'tr1',
      'ru': 'ru'
    };
    const lolRegion = lolRegionMap[region.toLowerCase()] || 'euw1';
    
    try {
      const lolResponse = await fetchWithTimeout(
        `https://api.henrikdev.xyz/lol/v1/profile/${lolRegion}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
        headers,
        10000
      );
      
      if (lolResponse.ok) {
        const text = await lolResponse.text();
        if (text.startsWith('{') || text.startsWith('[')) {
          lolProfile = JSON.parse(text);
        }
      }
    } catch (e) {
      console.log('LoL profile error:', e.message);
    }

    // 3. Récupérer les rangs LoL
    let lolRanked = null;
    try {
      const rankedResponse = await fetchWithTimeout(
        `https://api.henrikdev.xyz/lol/v1/ranked/${lolRegion}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
        headers,
        10000
      );
      
      if (rankedResponse.ok) {
        const text = await rankedResponse.text();
        if (text.startsWith('{') || text.startsWith('[')) {
          lolRanked = JSON.parse(text);
        }
      }
    } catch (e) {
      console.log('LoL ranked error:', e.message);
    }

    // 4. Récupérer l'historique des matchs LoL
    let lolMatches = null;
    try {
      const matchResponse = await fetchWithTimeout(
        `https://api.henrikdev.xyz/lol/v1/matches/${lolRegion}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?count=10`,
        headers,
        10000
      );
      
      if (matchResponse.ok) {
        const text = await matchResponse.text();
        if (text.startsWith('{') || text.startsWith('[')) {
          lolMatches = JSON.parse(text);
        }
      }
    } catch (e) {
      console.log('LoL matches error:', e.message);
    }

    // Calculer les stats depuis les matchs
    let stats = null;
    if (lolMatches?.data?.length > 0) {
      const matches = lolMatches.data;
      let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
      
      matches.forEach(match => {
        const participant = match.info?.participants?.find(p => 
          p.puuid === puuid || 
          (p.riotIdGameName?.toLowerCase() === name.toLowerCase() && 
           p.riotIdTagline?.toLowerCase() === tag.toLowerCase())
        );
        if (participant) {
          totalKills += participant.kills || 0;
          totalDeaths += participant.deaths || 0;
          totalAssists += participant.assists || 0;
          if (participant.win) wins++;
        }
      });
      
      if (totalKills > 0 || totalDeaths > 0) {
        stats = {
          matches: matches.length,
          kills: totalKills,
          deaths: totalDeaths,
          assists: totalAssists,
          kd: totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toString(),
          kda: totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toString(),
          winRate: matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0
        };
      }
    }

    // Extraire les rangs
    const soloQ = lolRanked?.data?.find(r => r.queueType === 'RANKED_SOLO_5x5');
    const flexQ = lolRanked?.data?.find(r => r.queueType === 'RANKED_FLEX_SR');
    const profile = lolProfile?.data;

    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        // Infos compte
        name: account.name,
        tag: account.tag,
        puuid: puuid,
        region: region,
        
        // Profil LoL
        summoner_level: profile?.summonerLevel || null,
        profile_icon: profile?.profileIconId ? `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${profile.profileIconId}.png` : null,
        
        // Solo/Duo
        solo_rank: soloQ ? `${soloQ.tier} ${soloQ.rank}` : null,
        solo_lp: soloQ?.leaguePoints || 0,
        solo_wins: soloQ?.wins || 0,
        solo_losses: soloQ?.losses || 0,
        solo_winrate: soloQ ? Math.round((soloQ.wins / (soloQ.wins + soloQ.losses)) * 100) : null,
        
        // Flex
        flex_rank: flexQ ? `${flexQ.tier} ${flexQ.rank}` : null,
        flex_lp: flexQ?.leaguePoints || 0,
        flex_wins: flexQ?.wins || 0,
        flex_losses: flexQ?.losses || 0,
        
        // Stats récentes
        stats: stats
      }
    });

  } catch (error) {
    console.error('Henrik LoL API error:', error);

    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        name: name,
        tag: tag,
        region: region,
        message: 'Compte validé - API temporairement indisponible'
      }
    });
  }
}

async function fetchWithTimeout(url, headers, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
