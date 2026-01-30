// Proxy API pour Henrik's Valorant API
// Contourne les problèmes CORS et ajoute un fallback

export default async function handler(req, res) {
  // Activer CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { name, tag } = req.query;

  if (!name || !tag) {
    return res.status(400).json({ 
      error: true, 
      message: 'Name and tag are required' 
    });
  }

  try {
    // Essayer l'API Henrik
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FlukyBoys-Tournament-Platform/1.0'
        }
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return res.status(404).json({
        error: true,
        message: 'Compte introuvable'
      });
    }

    if (response.status === 429) {
      return res.status(429).json({
        error: true,
        message: 'Rate limit - réessayez dans quelques secondes'
      });
    }

    if (!response.ok) {
      // API indisponible - retourner une validation basique
      return res.status(200).json({
        success: true,
        validated: false,
        data: {
          name: name,
          tag: tag,
          message: 'Format valide mais vérification API indisponible'
        }
      });
    }

    const data = await response.json();

    if (data.status === 404 || data.error) {
      return res.status(404).json({
        error: true,
        message: 'Compte introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      validated: true,
      data: {
        name: data.data?.name || name,
        tag: data.data?.tag || tag,
        puuid: data.data?.puuid,
        region: data.data?.region,
        account_level: data.data?.account_level,
        card: data.data?.card?.small || null
      }
    });

  } catch (error) {
    console.error('Henrik API error:', error);

    // En cas d'erreur, valider le format sans l'API
    if (error.name === 'AbortError') {
      return res.status(200).json({
        success: true,
        validated: false,
        data: {
          name: name,
          tag: tag,
          message: 'Timeout - format validé sans vérification API'
        }
      });
    }

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
