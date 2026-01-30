// Proxy API pour Henrik's Valorant API
// Récupère le compte + rang + stats

export default async function handler(req, res) {
  // Activer CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { name, tag, region = 'eu' } = req.query;

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

  try {
    // 1. Récupérer les infos du compte
    const accountResponse = await fetchWithTimeout(
      `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      headers,
      8000
    );

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
        if (text.startsWith('{')) {
          accountData = JSON.parse(text);
        }
      } catch (e) {
        console.log('Account parse error:', e);
      }
    }

    // 2. Récupérer le rang/MMR
    let mmrData = null;
    try {
      const mmrResponse = await fetchWithTimeout(
        `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
        headers,
        8000
      );
      
      if (mmrResponse.ok) {
        const text = await mmrResponse.text();
        if (text.startsWith('{')) {
          mmrData = JSON.parse(text);
        }
      }
    } catch (e) {
      console.log('MMR fetch error:', e);
    }

    // 3. Récupérer les stats de match (lifetime)
    let lifetimeData = null;
    try {
      const lifetimeResponse = await fetchWithTimeout(
        `https://api.henrikdev.xyz/valorant/v1/lifetime/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=5`,
        headers,
        8000
      );
      
      if (lifetimeResponse.ok) {
        const text = await lifetimeResponse.text();
        if (text.startsWith('{')) {
          lifetimeData = JSON.parse(text);
        }
      }
    } catch (e) {
      console.log('Lifetime fetch error:', e);
    }

    // Si on n'a pas pu récupérer le compte
    if (!accountData?.data) {
      return res.status(200).json({
        success: true,
        validated: false,
        data: {
          name: name,
          tag: tag,
          message: 'Format valide - API temporairement indisponible'
        }
      });
    }

    // Construire la réponse complète
    const account = accountData.data;
    const mmr = mmrData?.data?.current_data;
    const highestRank = mmrData?.data?.highest_rank;
    
    // Calculer les stats depuis les derniers matchs
    let stats = null;
    if (lifetimeData?.data?.length > 0) {
      const matches = lifetimeData.data;
      const totalKills = matches.reduce((acc, m) => acc + (m.stats?.kills || 0), 0);
      const totalDeaths = matches.reduce((acc, m) => acc + (m.stats?.deaths || 0), 0);
      const totalAssists = matches.reduce((acc, m) => acc + (m.stats?.assists || 0), 0);
      const wins = matches.filter(m => m.stats?.team === m.teams?.red?.has_won ? 'Red' : 'Blue').length;
      
      stats = {
        matches: matches.length,
        kills: totalKills,
        deaths: totalDeaths,
        assists: totalAssists,
        kd: totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills,
        winRate: matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0
      };
    }

    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        // Infos compte
        name: account.name,
        tag: account.tag,
        puuid: account.puuid,
        region: account.region,
        account_level: account.account_level,
        card: account.card?.small || account.card?.large || null,
        card_wide: account.card?.wide || null,
        
        // Rang actuel
        current_rank: mmr?.currenttierpatched || null,
        current_rank_tier: mmr?.currenttier || null,
        ranking_in_tier: mmr?.ranking_in_tier || 0,
        elo: mmr?.elo || null,
        mmr_change: mmr?.mmr_change_to_last_game || null,
        rank_image: mmr?.images?.small || null,
        rank_image_large: mmr?.images?.large || null,
        
        // Plus haut rang
        highest_rank: highestRank?.patched_tier || null,
        highest_rank_season: highestRank?.season || null,
        
        // Stats récentes
        stats: stats
      }
    });

  } catch (error) {
    console.error('Henrik API error:', error);

    return res.status(200).json({
      success: true,
      validated: false,
      data: {
        name: name,
        tag: tag,
        message: 'API indisponible - format validé'
      }
    });
  }
}

// Fetch avec timeout
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
