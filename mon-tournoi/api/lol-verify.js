// API pour vérifier un compte League of Legends
// Utilise League of Graphs pour les données complètes + historique

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

  // Mapping des régions
  const regionMap = {
    'euw1': { display: 'EUW', log: 'euw' },
    'eun1': { display: 'EUNE', log: 'eune' },
    'na1': { display: 'NA', log: 'na' },
    'kr': { display: 'KR', log: 'kr' },
    'br1': { display: 'BR', log: 'br' },
    'jp1': { display: 'JP', log: 'jp' },
    'la1': { display: 'LAN', log: 'lan' },
    'la2': { display: 'LAS', log: 'las' },
    'oc1': { display: 'OCE', log: 'oce' },
    'tr1': { display: 'TR', log: 'tr' },
    'ru': { display: 'RU', log: 'ru' }
  };

  const regionInfo = regionMap[region] || { display: region.toUpperCase(), log: region.replace('1', '') };
  const riotIdPath = tag ? `${name}-${tag}` : name;

  let profileData = {
    name: name,
    tag: tag || null,
    region: region,
    regionDisplay: regionInfo.display,
    summonerLevel: null,
    profileIcon: null,
    // Current rank
    soloRank: 'Unranked',
    soloTier: null,
    soloDivision: null,
    soloLP: 0,
    soloWins: 0,
    soloLosses: 0,
    soloWinrate: null,
    // Flex
    flexRank: 'Unranked',
    flexTier: null,
    flexDivision: null,
    flexLP: 0,
    flexWins: 0,
    flexLosses: 0,
    flexWinrate: null,
    // History
    pastSeasons: [],
    // Champions
    topChampions: [],
    gamesPlayed: null,
    // Metadata
    lastUpdated: Date.now()
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  };

  try {
    const logUrl = `https://www.leagueofgraphs.com/summoner/${regionInfo.log}/${encodeURIComponent(riotIdPath).replace(/%20/g, '+')}`;
    console.log('Fetching LoG:', logUrl);
    
    const logResponse = await fetchWithTimeout(logUrl, headers, 15000);
    
    if (logResponse.ok) {
      const html = await logResponse.text();
      
      // 1. Meta description - très fiable pour rank actuel
      const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      if (metaMatch) {
        const metaContent = metaMatch[1];
        
        // Rank
        const rankMatch = metaContent.match(/^(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)/i);
        if (rankMatch) {
          profileData.soloTier = rankMatch[1].toUpperCase();
          profileData.soloDivision = rankMatch[2] || null;
          profileData.soloRank = `${rankMatch[1]} ${rankMatch[2] || ''}`.trim();
        }
        
        // W/L et winrate
        const winsMatch = metaContent.match(/Wins:\s*(\d+)\s*\((\d+(?:\.\d+)?)\s*%\)/i);
        if (winsMatch) {
          profileData.soloWins = parseInt(winsMatch[1]);
          profileData.soloWinrate = Math.round(parseFloat(winsMatch[2]));
          if (profileData.soloWinrate > 0) {
            const totalGames = Math.round(profileData.soloWins / (profileData.soloWinrate / 100));
            profileData.soloLosses = totalGames - profileData.soloWins;
            profileData.gamesPlayed = totalGames;
          }
        }
        
        // Champions
        const champMatches = metaContent.matchAll(/\/\s*([A-Za-z]+):\s*Wins:\s*([\d.]+)%\s*-\s*Played:\s*(\d+)/gi);
        for (const match of champMatches) {
          if (profileData.topChampions.length < 5) {
            profileData.topChampions.push({
              name: match[1],
              winrate: parseFloat(match[2]),
              games: parseInt(match[3])
            });
          }
        }
      }

      // 2. Niveau
      const levelMatch = html.match(/Level\s*(\d+)/i);
      if (levelMatch) {
        profileData.summonerLevel = parseInt(levelMatch[1]);
      }

      // 3. LP
      const lpMatch = html.match(/LP:\s*<span[^>]*>(\d+)/i) || html.match(/leaguePoints[^>]*>(\d+)/i);
      if (lpMatch) {
        profileData.soloLP = parseInt(lpMatch[1]);
      }

      // 4. Icône de profil
      const iconMatch = html.match(/profileicon\/(\d+)/i);
      if (iconMatch) {
        profileData.profileIcon = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${iconMatch[1]}.png`;
      }

      // 5. HISTORIQUE DES SAISONS - Parser les tags
      // Format: <div class="tag requireTooltip brown " tooltip="...S11 Silver...reached Silver II during Season 11...">S11 Silver</div>
      const seasonTagPattern = /<div\s+class="tag[^"]*"\s+tooltip="[^"]*>([^<]+)<\/div>/gi;
      const seasonMatches = html.matchAll(seasonTagPattern);
      
      for (const match of seasonMatches) {
        const tagContent = match[1].trim();
        // Parse: "S11 Silver", "S13 (Split 2) Gold", "S2025 Platinum"
        const seasonMatch = tagContent.match(/^(S\d+(?:\s*\([^)]+\))?)\s+(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)/i);
        if (seasonMatch) {
          profileData.pastSeasons.push({
            season: seasonMatch[1],
            rank: seasonMatch[2]
          });
        }
      }

      // Alternative: parser depuis le tooltip pour plus de détails
      const tooltipPattern = /tooltip="[^"]*<itemname[^>]*>([^<]+)<\/itemname>[^"]*reached\s+(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)[^"]*during\s+([^.]+)\./gi;
      const tooltipMatches = html.matchAll(tooltipPattern);
      
      // Reset si on a trouvé des tooltips (plus détaillés)
      const detailedSeasons = [];
      for (const match of tooltipMatches) {
        const seasonName = match[1].trim(); // "S11 Silver"
        const tier = match[2];
        const division = match[3] || '';
        const seasonPeriod = match[4].trim(); // "Season 11"
        
        // Extraire le nom de saison depuis seasonName
        const sMatch = seasonName.match(/^(S\d+(?:\s*\([^)]+\))?)/);
        if (sMatch) {
          detailedSeasons.push({
            season: sMatch[1],
            rank: `${tier} ${division}`.trim(),
            tier: tier.toUpperCase()
          });
        }
      }
      
      if (detailedSeasons.length > 0) {
        profileData.pastSeasons = detailedSeasons;
      }

      // 6. Rang Flex (si présent)
      const flexMatch = html.match(/Ranked\s*Flex[^]*?reached\s+(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)/i);
      if (flexMatch) {
        profileData.flexTier = flexMatch[1].toUpperCase();
        profileData.flexDivision = flexMatch[2] || null;
        profileData.flexRank = `${flexMatch[1]} ${flexMatch[2] || ''}`.trim();
      }
    }
  } catch (e) {
    console.log('League of Graphs error:', e.message);
  }

  // Icône par défaut
  if (!profileData.profileIcon) {
    profileData.profileIcon = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/29.png`;
  }

  return res.status(200).json({
    success: true,
    validated: true,
    data: profileData
  });
}

async function fetchWithTimeout(url, headers, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal, 
      headers,
      redirect: 'follow'
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
