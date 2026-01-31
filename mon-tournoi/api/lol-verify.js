// API pour vérifier un compte League of Legends
// Utilise League of Graphs pour les données

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
  
  // Format Riot ID pour les URLs
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
    flexWins: 0,
    flexLosses: 0,
    flexWinrate: null,
    topChampions: [],
    gamesPlayed: null
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  };

  try {
    // League of Graphs URL
    const logUrl = `https://www.leagueofgraphs.com/summoner/${regionInfo.log}/${encodeURIComponent(riotIdPath).replace(/%20/g, '+')}`;
    console.log('Fetching LoG:', logUrl);
    
    const logResponse = await fetchWithTimeout(logUrl, headers, 15000);
    
    if (logResponse.ok) {
      const html = await logResponse.text();
      
      // 1. Parser depuis la meta description (très fiable)
      // Format: "Gold I - Wins: 33 (42.9%) (#2,206,397) / Yone: Wins: 59.3% - Played: 27"
      const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      if (metaMatch) {
        const metaContent = metaMatch[1];
        console.log('Meta content:', metaContent);
        
        // Rank from meta
        const rankMatch = metaContent.match(/^(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)/i);
        if (rankMatch) {
          profileData.soloTier = rankMatch[1].toUpperCase();
          profileData.soloDivision = rankMatch[2] || null;
          profileData.soloRank = `${rankMatch[1]} ${rankMatch[2] || ''}`.trim();
        }
        
        // Wins and winrate from meta
        const winsMatch = metaContent.match(/Wins:\s*(\d+)\s*\((\d+(?:\.\d+)?)\s*%\)/i);
        if (winsMatch) {
          profileData.soloWins = parseInt(winsMatch[1]);
          profileData.soloWinrate = Math.round(parseFloat(winsMatch[2]));
          // Calculate losses from winrate
          if (profileData.soloWinrate > 0) {
            const totalGames = Math.round(profileData.soloWins / (profileData.soloWinrate / 100));
            profileData.soloLosses = totalGames - profileData.soloWins;
            profileData.gamesPlayed = totalGames;
          }
        }
        
        // Champions from meta
        const champMatches = metaContent.matchAll(/\/\s*([A-Za-z]+):\s*Wins:\s*[\d.]+%\s*-\s*Played:\s*(\d+)/gi);
        for (const match of champMatches) {
          if (profileData.topChampions.length < 5) {
            profileData.topChampions.push({
              name: match[1],
              games: parseInt(match[2])
            });
          }
        }
      }

      // 2. Parser le niveau
      const levelMatch = html.match(/Level\s*(\d+)/i);
      if (levelMatch) {
        profileData.summonerLevel = parseInt(levelMatch[1]);
      }

      // 3. Parser les LP
      const lpMatch = html.match(/LP:\s*<span[^>]*class="leaguePoints[^"]*"[^>]*>(\d+)/i) ||
                      html.match(/<span[^>]*class="leaguePoints[^"]*"[^>]*>(\d+)/i);
      if (lpMatch) {
        profileData.soloLP = parseInt(lpMatch[1]);
      }

      // 4. Parser l'icône de profil
      const iconMatch = html.match(/profileicon\/(\d+)/i);
      if (iconMatch) {
        profileData.profileIcon = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${iconMatch[1]}.png`;
      }

      // 5. Si pas de rang depuis meta, parser depuis leagueTier div
      if (!profileData.soloTier) {
        const tierMatch = html.match(/<div\s+class="leagueTier">\s*(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)/i);
        if (tierMatch) {
          profileData.soloTier = tierMatch[1].toUpperCase();
          profileData.soloDivision = tierMatch[2] || null;
          profileData.soloRank = `${tierMatch[1]} ${tierMatch[2] || ''}`.trim();
        }
      }

      // 6. Parser W/L si pas encore fait
      if (profileData.soloWins === 0) {
        const wlMatch = html.match(/Victoires[:\s]*(\d+)[^0-9]*D[ée]faites[:\s]*(\d+)/i) ||
                       html.match(/Wins[:\s]*(\d+)[^0-9]*Loss(?:es)?[:\s]*(\d+)/i) ||
                       html.match(/<span\s+class="wins"[^>]*>\s*(\d+)\s*<\/span>[^<]*<span\s+class="losses"[^>]*>\s*(\d+)/i);
        if (wlMatch) {
          profileData.soloWins = parseInt(wlMatch[1]);
          profileData.soloLosses = parseInt(wlMatch[2]);
          profileData.gamesPlayed = profileData.soloWins + profileData.soloLosses;
          if (profileData.gamesPlayed > 0) {
            profileData.soloWinrate = Math.round((profileData.soloWins / profileData.gamesPlayed) * 100);
          }
        }
      }

      // 7. Parser les champions favoris depuis la page si pas dans meta
      if (profileData.topChampions.length === 0) {
        // Chercher dans la structure de champions
        const champPattern = /data-name="([A-Za-z]+)"[^>]*>[^]*?Played:\s*(\d+)/gi;
        let champMatch;
        while ((champMatch = champPattern.exec(html)) !== null && profileData.topChampions.length < 5) {
          profileData.topChampions.push({
            name: champMatch[1],
            games: parseInt(champMatch[2])
          });
        }
      }
    }
  } catch (e) {
    console.log('League of Graphs error:', e.message);
  }

  // Icône par défaut si pas trouvée
  if (!profileData.profileIcon) {
    profileData.profileIcon = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/29.png`;
  }

  // Retourner les données
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
