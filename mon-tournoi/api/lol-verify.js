// API pour vérifier un compte League of Legends via Henrik Dev API
// Utilise la même clé API que Valorant

const HENRIK_API_KEY = process.env.HENRIK_API_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { name, tag, region = 'euw1' } = req.query;

  if (!name) {
    return res.status(400).json({ error: true, message: 'Summoner name is required' });
  }

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'FlukyBoys-Tournament-Platform/1.0'
  };
  
  if (HENRIK_API_KEY) {
    headers['Authorization'] = HENRIK_API_KEY;
  }

  // Mapping des régions Henrik pour LoL
  const regionMap = {
    'euw1': 'euw1',
    'eun1': 'eun1',
    'na1': 'na1',
    'kr': 'kr',
    'jp1': 'jp1',
    'br1': 'br1',
    'la1': 'la1',
    'la2': 'la2',
    'oc1': 'oc1',
    'tr1': 'tr1',
    'ru': 'ru',
    'ph2': 'ph2',
    'sg2': 'sg2',
    'th2': 'th2',
    'tw2': 'tw2',
    'vn2': 'vn2',
  };

  const lolRegion = regionMap[region] || 'euw1';

  try {
    // Si on a un tag, utiliser le format Riot ID
    // Sinon, utiliser juste le nom d'invocateur
    let profileData = null;
    let rankedData = null;
    
    const encodedName = encodeURIComponent(name);
    const encodedTag = tag ? encodeURIComponent(tag) : null;

    // 1. Récupérer le profil LoL
    console.log(`Fetching LoL profile: ${name}${tag ? '#' + tag : ''} on ${lolRegion}`);
    
    // Essayer avec Riot ID d'abord si tag fourni
    if (encodedTag) {
      try {
        const profileResponse = await fetchWithTimeout(
          `https://api.henrikdev.xyz/lol/v1/profile/${lolRegion}/${encodedName}/${encodedTag}`,
          headers,
          15000
        );
        
        if (profileResponse.ok) {
          const text = await profileResponse.text();
          if (text.startsWith('{')) {
            profileData = JSON.parse(text);
          }
        }
      } catch (e) {
        console.log('Profile with tag error:', e.message);
      }
    }

    // Si pas de données, essayer par nom d'invocateur seul
    if (!profileData?.data) {
      try {
        const profileResponse = await fetchWithTimeout(
          `https://api.henrikdev.xyz/lol/v1/profile/${lolRegion}/${encodedName}`,
          headers,
          15000
        );
        
        if (profileResponse.status === 404) {
          return res.status(404).json({ error: true, message: 'Invocateur introuvable' });
        }

        if (profileResponse.ok) {
          const text = await profileResponse.text();
          if (text.startsWith('{')) {
            profileData = JSON.parse(text);
          }
        }
      } catch (e) {
        console.log('Profile error:', e.message);
      }
    }

    // Si toujours pas de données
    if (!profileData?.data) {
      return res.status(200).json({
        success: true,
        validated: true,
        data: {
          name: name,
          tag: tag || null,
          region: region,
          message: 'Compte validé - Détails non disponibles via API'
        }
      });
    }

    const profile = profileData.data;

    // 2. Récupérer les rangs
    try {
      const rankedUrl = encodedTag 
        ? `https://api.henrikdev.xyz/lol/v1/ranked/${lolRegion}/${encodedName}/${encodedTag}`
        : `https://api.henrikdev.xyz/lol/v1/ranked/${lolRegion}/${encodedName}`;
        
      const rankedResponse = await fetchWithTimeout(rankedUrl, headers, 10000);
      
      if (rankedResponse.ok) {
        const text = await rankedResponse.text();
        if (text.startsWith('{')) {
          rankedData = JSON.parse(text);
        }
      }
    } catch (e) {
      console.log('Ranked error:', e.message);
    }

    // Parser les rangs
    const ranked = rankedData?.data;
    const soloQueue = ranked?.solo_duo;
    const flexQueue = ranked?.flex;

    const formatRank = (queue) => {
      if (!queue || !queue.tier) return 'Unranked';
      return `${queue.tier} ${queue.division}`;
    };

    // 3. Récupérer les matchs récents
    let matchStats = null;
    try {
      const matchUrl = encodedTag 
        ? `https://api.henrikdev.xyz/lol/v1/matches/${lolRegion}/${encodedName}/${encodedTag}?count=10`
        : `https://api.henrikdev.xyz/lol/v1/matches/${lolRegion}/${encodedName}?count=10`;
        
      const matchResponse = await fetchWithTimeout(matchUrl, headers, 15000);
      
      if (matchResponse.ok) {
        const text = await matchResponse.text();
        if (text.startsWith('{')) {
          const matchData = JSON.parse(text);
          const matches = matchData.data || [];
          
          if (matches.length > 0) {
            let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
            const champCount = {};
            
            matches.forEach(match => {
              const stats = match.stats || match;
              totalKills += stats.kills || 0;
              totalDeaths += stats.deaths || 0;
              totalAssists += stats.assists || 0;
              if (stats.win) wins++;
              
              const champ = stats.champion || match.champion;
              if (champ) {
                champCount[champ] = (champCount[champ] || 0) + 1;
              }
            });
            
            matchStats = {
              matches: matches.length,
              kills: totalKills,
              deaths: totalDeaths,
              assists: totalAssists,
              kda: totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toString(),
              winRate: Math.round((wins / matches.length) * 100),
              wins: wins,
              losses: matches.length - wins,
              topChampions: Object.entries(champCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([champ, count]) => ({ champion: champ, games: count }))
            };
          }
        }
      }
    } catch (e) {
      console.log('Matches error:', e.message);
    }

    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        name: profile.name || name,
        tag: profile.tag || tag || null,
        puuid: profile.puuid || null,
        region: region,
        summonerLevel: profile.level || profile.summoner_level || null,
        profileIcon: profile.profile_icon_url || profile.icon || null,
        
        // Rangs Solo/Duo
        soloRank: formatRank(soloQueue),
        soloTier: soloQueue?.tier || null,
        soloDivision: soloQueue?.division || null,
        soloLP: soloQueue?.lp || 0,
        soloWins: soloQueue?.wins || 0,
        soloLosses: soloQueue?.losses || 0,
        soloWinrate: soloQueue?.wins && soloQueue?.losses 
          ? Math.round((soloQueue.wins / (soloQueue.wins + soloQueue.losses)) * 100) 
          : null,
        
        // Rangs Flex
        flexRank: formatRank(flexQueue),
        flexTier: flexQueue?.tier || null,
        flexDivision: flexQueue?.division || null,
        flexLP: flexQueue?.lp || 0,
        flexWins: flexQueue?.wins || 0,
        flexLosses: flexQueue?.losses || 0,
        flexWinrate: flexQueue?.wins && flexQueue?.losses 
          ? Math.round((flexQueue.wins / (flexQueue.wins + flexQueue.losses)) * 100) 
          : null,
        
        // Stats des matchs récents
        stats: matchStats
      }
    });

  } catch (error) {
    console.error('Henrik LoL API error:', error);
    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        name: name,
        tag: tag || null,
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
