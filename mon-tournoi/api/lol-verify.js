// API pour vérifier un compte League of Legends
// Utilise l'API officielle Riot Games

const RIOT_API_KEY = process.env.RIOT_LOL_API_KEY || process.env.RIOT_API_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { name, region = 'euw1' } = req.query;

  if (!name) {
    return res.status(400).json({ error: true, message: 'Summoner name is required' });
  }

  // Mapping des régions pour l'API Riot
  const regionRouting = {
    'euw1': 'europe',
    'eun1': 'europe',
    'tr1': 'europe',
    'ru': 'europe',
    'na1': 'americas',
    'br1': 'americas',
    'la1': 'americas',
    'la2': 'americas',
    'kr': 'asia',
    'jp1': 'asia',
    'oc1': 'sea',
    'ph2': 'sea',
    'sg2': 'sea',
    'th2': 'sea',
    'tw2': 'sea',
    'vn2': 'sea',
  };

  const routingRegion = regionRouting[region] || 'europe';
  const platformRegion = region;

  // Si pas de clé API Riot, on utilise des données de démonstration
  if (!RIOT_API_KEY) {
    console.log('No RIOT_API_KEY found, returning demo data');
    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        name: name,
        region: region,
        summonerLevel: null,
        profileIcon: null,
        soloRank: 'Unranked',
        flexRank: 'Unranked',
        message: 'Clé API Riot non configurée. Ajoutez RIOT_LOL_API_KEY dans Vercel.'
      }
    });
  }

  const headers = {
    'X-Riot-Token': RIOT_API_KEY,
    'Accept': 'application/json'
  };

  try {
    // 1. Chercher le compte par nom d'invocateur (Summoner-V4)
    console.log(`Fetching summoner: ${name} on ${platformRegion}`);
    
    const summonerResponse = await fetchWithTimeout(
      `https://${platformRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`,
      headers,
      10000
    );

    if (summonerResponse.status === 404) {
      return res.status(404).json({ error: true, message: 'Invocateur introuvable' });
    }

    if (summonerResponse.status === 401 || summonerResponse.status === 403) {
      return res.status(200).json({
        success: true,
        validated: true,
        data: {
          name: name,
          region: region,
          message: 'Clé API Riot expirée ou invalide'
        }
      });
    }

    if (!summonerResponse.ok) {
      const errorText = await summonerResponse.text();
      console.log('Summoner API error:', summonerResponse.status, errorText);
      return res.status(200).json({
        success: true,
        validated: true,
        data: {
          name: name,
          region: region,
          message: 'API temporairement indisponible'
        }
      });
    }

    const summoner = await summonerResponse.json();
    
    // 2. Récupérer les rangs (League-V4)
    let rankedData = [];
    try {
      const rankedResponse = await fetchWithTimeout(
        `https://${platformRegion}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
        headers,
        10000
      );
      
      if (rankedResponse.ok) {
        rankedData = await rankedResponse.json();
      }
    } catch (e) {
      console.log('Ranked API error:', e.message);
    }

    // Parser les rangs
    const soloQueue = rankedData.find(r => r.queueType === 'RANKED_SOLO_5x5');
    const flexQueue = rankedData.find(r => r.queueType === 'RANKED_FLEX_SR');

    const formatRank = (queue) => {
      if (!queue) return null;
      return `${queue.tier} ${queue.rank}`;
    };

    const soloRank = formatRank(soloQueue);
    const flexRank = formatRank(flexQueue);

    // 3. Récupérer les matchs récents (Match-V5)
    let matchStats = null;
    try {
      // D'abord récupérer les IDs des matchs
      const matchIdsResponse = await fetchWithTimeout(
        `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${summoner.puuid}/ids?start=0&count=20`,
        headers,
        10000
      );

      if (matchIdsResponse.ok) {
        const matchIds = await matchIdsResponse.json();
        
        // Récupérer les détails des 10 premiers matchs
        let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
        let champCount = {};
        let matchCount = 0;

        for (const matchId of matchIds.slice(0, 10)) {
          try {
            const matchResponse = await fetchWithTimeout(
              `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
              headers,
              5000
            );

            if (matchResponse.ok) {
              const match = await matchResponse.json();
              const participant = match.info.participants.find(p => p.puuid === summoner.puuid);
              
              if (participant) {
                totalKills += participant.kills;
                totalDeaths += participant.deaths;
                totalAssists += participant.assists;
                if (participant.win) wins++;
                matchCount++;

                // Comptage des champions
                const champ = participant.championName;
                champCount[champ] = (champCount[champ] || 0) + 1;
              }
            }
          } catch (e) {
            // Ignorer les erreurs individuelles de match
          }
        }

        if (matchCount > 0) {
          matchStats = {
            matches: matchCount,
            kills: totalKills,
            deaths: totalDeaths,
            assists: totalAssists,
            kda: totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toString(),
            winRate: Math.round((wins / matchCount) * 100),
            wins: wins,
            losses: matchCount - wins,
            topChampions: Object.entries(champCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([champ, count]) => ({ champion: champ, games: count }))
          };
        }
      }
    } catch (e) {
      console.log('Match history error:', e.message);
    }

    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        name: summoner.name,
        puuid: summoner.puuid,
        summonerId: summoner.id,
        accountId: summoner.accountId,
        region: region,
        summonerLevel: summoner.summonerLevel,
        profileIcon: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${summoner.profileIconId}.png`,
        
        // Rangs
        soloRank: soloRank || 'Unranked',
        soloTier: soloQueue?.tier || null,
        soloDivision: soloQueue?.rank || null,
        soloLP: soloQueue?.leaguePoints || 0,
        soloWins: soloQueue?.wins || 0,
        soloLosses: soloQueue?.losses || 0,
        soloWinrate: soloQueue ? Math.round((soloQueue.wins / (soloQueue.wins + soloQueue.losses)) * 100) : null,
        
        flexRank: flexRank || 'Unranked',
        flexTier: flexQueue?.tier || null,
        flexDivision: flexQueue?.rank || null,
        flexLP: flexQueue?.leaguePoints || 0,
        flexWins: flexQueue?.wins || 0,
        flexLosses: flexQueue?.losses || 0,
        flexWinrate: flexQueue ? Math.round((flexQueue.wins / (flexQueue.wins + flexQueue.losses)) * 100) : null,
        
        // Stats
        stats: matchStats
      }
    });

  } catch (error) {
    console.error('Riot API error:', error);
    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        name: name,
        region: region,
        message: 'API temporairement indisponible'
      }
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
