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
    soloRank: 'Unranked',
    soloTier: null,
    soloDivision: null,
    soloLP: 0,
    soloWins: 0,
    soloLosses: 0,
    soloWinrate: null,
    flexRank: 'Unranked',
    flexTier: null,
    flexDivision: null,
    flexLP: 0,
    pastSeasons: [],
    topChampions: [],
    gamesPlayed: null,
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

      // 5. HISTORIQUE DES SAISONS - Parser depuis les tooltips
      // Format: tooltip="<itemname class='tagTitle brown'>S11 Silver</itemname>..reached Silver II during Season 11"
      const tooltipRegex = /tooltip="[^"]*<itemname[^>]*>(S\d+(?:\s*\([^)]+\))?\s+(?:Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger))<\/itemname>[^"]*reached\s+(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)/gi;
      
      let tooltipMatch;
      while ((tooltipMatch = tooltipRegex.exec(html)) !== null) {
        const tagTitle = tooltipMatch[1].trim(); // "S11 Silver"
        const reachedTier = tooltipMatch[2];
        const reachedDiv = tooltipMatch[3] || '';
        
        // Extraire la saison depuis le tagTitle
        const seasonPart = tagTitle.match(/^(S\d+(?:\s*\([^)]+\))?)/);
        if (seasonPart) {
          profileData.pastSeasons.push({
            season: seasonPart[1],
            rank: `${reachedTier} ${reachedDiv}`.trim(),
            tier: reachedTier.toUpperCase()
          });
        }
      }

      // Si pas trouvé via tooltip, essayer le format simple des tags
      if (profileData.pastSeasons.length === 0) {
        // Chercher les tags directement: S11 Silver, S2025 Platinum, etc.
        const simpleTagRegex = />\s*(S\d+(?:\s*\([^)]+\))?)\s+(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*</gi;
        let simpleMatch;
        while ((simpleMatch = simpleTagRegex.exec(html)) !== null) {
          const season = simpleMatch[1].trim();
          const rank = simpleMatch[2];
          // Éviter les doublons
          if (!profileData.pastSeasons.find(s => s.season === season)) {
            profileData.pastSeasons.push({
              season: season,
              rank: rank,
              tier: rank.toUpperCase()
            });
          }
        }
      }

      // 6. Rang Flex (chercher dans tooltip)
      const flexMatch = html.match(/Ranked\s*Flex[^<]*<\/highlight><br\/?>\s*This player reached\s+(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)/i);
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
