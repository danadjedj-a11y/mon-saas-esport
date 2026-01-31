// API pour vérifier un compte League of Legends
// Utilise League of Graphs, Porofessor, et OPGG pour les données

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
    'euw1': { display: 'EUW', log: 'euw', opgg: 'euw' },
    'eun1': { display: 'EUNE', log: 'eune', opgg: 'eune' },
    'na1': { display: 'NA', log: 'na', opgg: 'na' },
    'kr': { display: 'KR', log: 'kr', opgg: 'kr' },
    'br1': { display: 'BR', log: 'br', opgg: 'br' },
    'jp1': { display: 'JP', log: 'jp', opgg: 'jp' },
    'la1': { display: 'LAN', log: 'lan', opgg: 'lan' },
    'la2': { display: 'LAS', log: 'las', opgg: 'las' },
    'oc1': { display: 'OCE', log: 'oce', opgg: 'oce' },
    'tr1': { display: 'TR', log: 'tr', opgg: 'tr' },
    'ru': { display: 'RU', log: 'ru', opgg: 'ru' }
  };

  const regionInfo = regionMap[region] || { display: region.toUpperCase(), log: region.replace('1', ''), opgg: region.replace('1', '') };
  
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
    recentStats: null,
    avgKDA: null,
    avgCS: null,
    gamesPlayed: null
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
  };

  // 1. Essayer League of Graphs (meilleure source de données)
  try {
    const logUrl = `https://www.leagueofgraphs.com/summoner/${regionInfo.log}/${encodeURIComponent(riotIdPath)}`;
    console.log('Fetching LoG:', logUrl);
    
    const logResponse = await fetchWithTimeout(logUrl, headers, 15000);
    
    if (logResponse.ok) {
      const html = await logResponse.text();
      
      // Vérifier si le profil existe
      if (html.includes('Page not found') || html.includes('Summoner not found')) {
        console.log('LoG: Summoner not found');
      } else {
        // Parser le niveau - plusieurs patterns possibles
        const levelPatterns = [
          /class="summonerLevel"[^>]*>(\d+)</i,
          /Level\s*<\/span>\s*<span[^>]*>(\d+)/i,
          /"level"\s*:\s*(\d+)/i,
          /summoner-level[^>]*>\s*(\d+)/i,
          /Level[:\s]+(\d+)/i,
          /<span[^>]*class="[^"]*level[^"]*"[^>]*>(\d+)/i
        ];
        
        for (const pattern of levelPatterns) {
          const match = html.match(pattern);
          if (match) {
            profileData.summonerLevel = parseInt(match[1]);
            break;
          }
        }

        // Parser l'icône de profil
        const iconPatterns = [
          /profileicon\/(\d+)/i,
          /img\/profileicon\/(\d+)/i,
          /"profileIconId"\s*:\s*(\d+)/i
        ];
        
        for (const pattern of iconPatterns) {
          const match = html.match(pattern);
          if (match) {
            profileData.profileIcon = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${match[1]}.png`;
            break;
          }
        }

        // Parser le rang Solo/Duo
        const soloRankPatterns = [
          /Solo\/Duo[^]*?leagueTier[^>]*>([^<]+)</i,
          /RANKED_SOLO[^]*?(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)/i,
          /Solo\/Duo[^]*?(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)/i,
          /rankingsolo[^]*?(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)/i
        ];

        for (const pattern of soloRankPatterns) {
          const match = html.match(pattern);
          if (match) {
            let rankText = match[1];
            if (match[2]) rankText += ' ' + match[2];
            rankText = rankText.trim();
            
            if (rankText && !rankText.toLowerCase().includes('unranked')) {
              profileData.soloRank = rankText;
              const tierMatch = rankText.match(/^(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)/i);
              const divMatch = rankText.match(/([IV1-4]+)$/);
              if (tierMatch) profileData.soloTier = tierMatch[1].toUpperCase();
              if (divMatch) profileData.soloDivision = divMatch[1];
              break;
            }
          }
        }

        // Parser LP
        const lpMatch = html.match(/(\d+)\s*LP/i) || html.match(/"leaguePoints"\s*:\s*(\d+)/i);
        if (lpMatch) {
          profileData.soloLP = parseInt(lpMatch[1]);
        }

        // Parser W/L et winrate
        const wlPatterns = [
          /(\d+)\s*W\s*[\/-]\s*(\d+)\s*L/i,
          /(\d+)\s*wins?\s*[\/-]\s*(\d+)\s*loss/i,
          /"wins"\s*:\s*(\d+)[^}]*"losses"\s*:\s*(\d+)/i
        ];

        for (const pattern of wlPatterns) {
          const match = html.match(pattern);
          if (match) {
            profileData.soloWins = parseInt(match[1]);
            profileData.soloLosses = parseInt(match[2]);
            break;
          }
        }

        // Parser winrate
        const wrMatch = html.match(/(\d+(?:\.\d+)?)\s*%\s*(?:Win|WR)/i) || 
                       html.match(/winrate[^>]*>(\d+(?:\.\d+)?)\s*%/i);
        if (wrMatch) {
          profileData.soloWinrate = Math.round(parseFloat(wrMatch[1]));
        } else if (profileData.soloWins + profileData.soloLosses > 0) {
          profileData.soloWinrate = Math.round((profileData.soloWins / (profileData.soloWins + profileData.soloLosses)) * 100);
        }

        // Parser champions favoris
        const champPattern = /champion\/([A-Za-z]+)(?:\/|")/gi;
        const champMatches = html.matchAll(champPattern);
        const champions = new Set();
        const invalidChamps = ['All', 'Stats', 'Builds', 'Runes', 'Role', 'Champion', 'Items', 'Guide', 'Pro', 'Counter'];
        for (const match of champMatches) {
          if (champions.size < 5) {
            const champ = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
            if (!invalidChamps.includes(champ) && champ.length > 2) {
              champions.add(champ);
            }
          }
        }
        if (champions.size > 0) {
          profileData.topChampions = Array.from(champions);
        }

        // Parser KDA moyen
        const kdaPatterns = [
          /(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)\s*(?:KDA|Average)/i,
          /KDA[^>]*>(\d+\.?\d*)/i,
          /"kda"\s*:\s*(\d+\.?\d*)/i
        ];
        
        for (const pattern of kdaPatterns) {
          const match = html.match(pattern);
          if (match) {
            if (match[3]) {
              profileData.avgKDA = `${match[1]}/${match[2]}/${match[3]}`;
            } else {
              profileData.avgKDA = match[1];
            }
            break;
          }
        }

        // Parser CS moyen
        const csMatch = html.match(/(\d+\.?\d*)\s*(?:CS|Creeps)/i);
        if (csMatch) {
          profileData.avgCS = parseFloat(csMatch[1]);
        }

        // Parser nombre de games
        const gamesMatch = html.match(/(\d+)\s*(?:games?|matches?|played)/i);
        if (gamesMatch) {
          profileData.gamesPlayed = parseInt(gamesMatch[1]);
        }
      }
    }
  } catch (e) {
    console.log('League of Graphs error:', e.message);
  }

  // 2. Backup: Essayer OP.GG si pas assez de données
  if (!profileData.summonerLevel || !profileData.soloRank || profileData.soloRank === 'Unranked') {
    try {
      const opggUrl = `https://www.op.gg/summoners/${regionInfo.opgg}/${encodeURIComponent(riotIdPath)}`;
      console.log('Fetching OPGG:', opggUrl);
      
      const opggResponse = await fetchWithTimeout(opggUrl, headers, 12000);
      
      if (opggResponse.ok) {
        const html = await opggResponse.text();
        
        // Parser le niveau
        if (!profileData.summonerLevel) {
          const levelMatch = html.match(/Level\s*(\d+)/i) || html.match(/"level"\s*:\s*(\d+)/i);
          if (levelMatch) {
            profileData.summonerLevel = parseInt(levelMatch[1]);
          }
        }

        // Parser le rang si pas encore trouvé
        if (!profileData.soloTier) {
          const rankMatch = html.match(/(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)\s*([IV1-4]*)/i);
          if (rankMatch) {
            profileData.soloRank = `${rankMatch[1]} ${rankMatch[2] || ''}`.trim();
            profileData.soloTier = rankMatch[1].toUpperCase();
            profileData.soloDivision = rankMatch[2] || null;
          }
        }

        // Parser l'icône
        if (!profileData.profileIcon) {
          const iconMatch = html.match(/profileicon\/(\d+)/i);
          if (iconMatch) {
            profileData.profileIcon = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${iconMatch[1]}.png`;
          }
        }
      }
    } catch (e) {
      console.log('OPGG error:', e.message);
    }
  }

  // 3. Dernier recours: Porofessor
  if (!profileData.summonerLevel) {
    try {
      const poroUrl = `https://www.porofessor.gg/live/${regionInfo.log}/${encodeURIComponent(riotIdPath)}`;
      console.log('Fetching Porofessor:', poroUrl);
      
      const poroResponse = await fetchWithTimeout(poroUrl, headers, 10000);
      
      if (poroResponse.ok) {
        const html = await poroResponse.text();
        
        const levelMatch = html.match(/level[^>]*>\s*(\d+)/i);
        if (levelMatch) {
          profileData.summonerLevel = parseInt(levelMatch[1]);
        }
      }
    } catch (e) {
      console.log('Porofessor error:', e.message);
    }
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
