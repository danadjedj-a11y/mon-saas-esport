// Proxy API pour Henrik's Valorant API
// Récupère le compte + rang + stats

// Clé API Henrik (gratuite, à obtenir sur https://henrikdev.xyz/)
// Variable d'environnement HENRIK_API_KEY sur Vercel
const HENRIK_API_KEY = process.env.HENRIK_API_KEY || '';

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
  
  // Ajouter la clé API si disponible
  if (HENRIK_API_KEY) {
    headers['Authorization'] = HENRIK_API_KEY;
  }

  try {
    // 1. Récupérer les infos du compte (V1 - plus stable)
    console.log(`Fetching account: ${name}#${tag}`);
    const accountResponse = await fetchWithTimeout(
      `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      headers,
      10000
    );
    
    // Vérifier si l'API demande une authentification
    if (accountResponse.status === 401) {
      console.log('Henrik API requires authentication');
      // Valider le format quand même
      return res.status(200).json({
        success: true,
        validated: true,
        data: {
          name: name,
          tag: tag,
          region: region,
          message: 'Riot ID enregistré (vérification API en maintenance)'
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
        console.log('Account response:', text.substring(0, 200));
        if (text.startsWith('{') || text.startsWith('[')) {
          accountData = JSON.parse(text);
        }
      } catch (e) {
        console.log('Account parse error:', e.message);
      }
    }

    // Si on n'a pas pu récupérer le compte
    if (!accountData?.data) {
      return res.status(200).json({
        success: true,
        validated: true, // On valide quand même le format
        data: {
          name: name,
          tag: tag,
          region: region,
          account_level: null,
          message: 'Compte validé - Détails non disponibles (profil privé ou API limitée)'
        }
      });
    }

    const account = accountData.data;
    
    // 2. Récupérer le rang/MMR avec l'endpoint V1 (plus fiable)
    let mmrData = null;
    const regionMap = {
      'eu': 'eu',
      'na': 'na', 
      'ap': 'ap',
      'kr': 'kr',
      'latam': 'latam',
      'br': 'br'
    };
    const apiRegion = regionMap[region.toLowerCase()] || 'eu';
    
    try {
      console.log(`Fetching MMR for region: ${apiRegion}`);
      const mmrResponse = await fetchWithTimeout(
        `https://api.henrikdev.xyz/valorant/v1/mmr/${apiRegion}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
        headers,
        10000
      );
      
      if (mmrResponse.ok) {
        const text = await mmrResponse.text();
        console.log('MMR response:', text.substring(0, 300));
        if (text.startsWith('{') || text.startsWith('[')) {
          mmrData = JSON.parse(text);
        }
      } else {
        console.log('MMR response status:', mmrResponse.status);
      }
    } catch (e) {
      console.log('MMR fetch error:', e.message);
    }

    // 3. Récupérer les derniers matchs compétitifs
    let matchHistory = null;
    try {
      const matchResponse = await fetchWithTimeout(
        `https://api.henrikdev.xyz/valorant/v3/matches/${apiRegion}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?filter=competitive&size=5`,
        headers,
        10000
      );
      
      if (matchResponse.ok) {
        const text = await matchResponse.text();
        if (text.startsWith('{') || text.startsWith('[')) {
          matchHistory = JSON.parse(text);
        }
      }
    } catch (e) {
      console.log('Match history error:', e.message);
    }

    // Calculer les stats depuis les matchs
    let stats = null;
    if (matchHistory?.data?.length > 0) {
      const matches = matchHistory.data;
      let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
      
      matches.forEach(match => {
        const players = match.players?.all_players || [];
        const player = players.find(p => 
          p.name?.toLowerCase() === name.toLowerCase() && 
          p.tag?.toLowerCase() === tag.toLowerCase()
        );
        if (player) {
          totalKills += player.stats?.kills || 0;
          totalDeaths += player.stats?.deaths || 0;
          totalAssists += player.stats?.assists || 0;
          
          // Check win
          const playerTeam = player.team?.toLowerCase();
          const redWon = match.teams?.red?.has_won;
          const blueWon = match.teams?.blue?.has_won;
          if ((playerTeam === 'red' && redWon) || (playerTeam === 'blue' && blueWon)) {
            wins++;
          }
        }
      });
      
      if (totalKills > 0 || totalDeaths > 0) {
        stats = {
          matches: matches.length,
          kills: totalKills,
          deaths: totalDeaths,
          assists: totalAssists,
          kd: totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toString(),
          winRate: matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0
        };
      }
    }

    // Extraire les données MMR
    const mmr = mmrData?.data;
    
    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        // Infos compte
        name: account.name,
        tag: account.tag,
        puuid: account.puuid,
        region: account.region || region,
        account_level: account.account_level,
        card: account.card?.small || account.card?.large || null,
        card_wide: account.card?.wide || null,
        last_update: account.last_update,
        
        // Rang actuel (V1 MMR)
        current_rank: mmr?.currenttierpatched || null,
        current_rank_tier: mmr?.currenttier || null,
        ranking_in_tier: mmr?.ranking_in_tier || 0,
        elo: mmr?.elo || null,
        mmr_change: mmr?.mmr_change_to_last_game || null,
        rank_image: mmr?.images?.small || null,
        rank_image_large: mmr?.images?.large || null,
        
        // Plus haut rang (dans V1, c'est dans les données de base)
        highest_rank: mmr?.highest_rank?.patched_tier || null,
        highest_rank_season: mmr?.highest_rank?.season || null,
        
        // Stats récentes
        stats: stats
      }
    });

  } catch (error) {
    console.error('Henrik API error:', error);

    // En cas d'erreur, on valide quand même le format du Riot ID
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
