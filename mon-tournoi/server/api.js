import { createClient } from '@supabase/supabase-js';

// Configuration Supabase (utiliser les variables d'environnement depuis import.meta.env en runtime)
// Note: En développement, Vite expose les variables via import.meta.env
let supabase = null;

function initSupabase() {
  if (supabase) return supabase;
  
  // Dans un middleware Vite, on peut accéder aux variables via process.env ou import.meta.env
  // On va les charger dynamiquement
  const supabaseUrl = process.env.VITE_SUPABASE_URL || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : null);
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : null);

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY non défini. L\'API ne fonctionnera pas correctement.');
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

// Fonction helper pour récupérer les scores suisses
async function getSwissScores(tournamentId) {
  const client = initSupabase();
  if (!client) return [];
  
  const { data, error } = await client
    .from('swiss_scores')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('wins', { ascending: false })
    .order('buchholz_score', { ascending: false });

  if (error) {
    console.error('Error fetching swiss scores:', error);
    return [];
  }

  return data || [];
}

// Fonctions helper pour récupérer les données

async function fetchTournamentInfo(tournamentId) {
  const client = initSupabase();
  if (!client) throw new Error('Supabase non configuré');
  
  const { data: tournament, error } = await client
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (error) throw error;

  const { data: participants } = await client
    .from('participants')
    .select('*, teams(name, tag, logo_url)')
    .eq('tournament_id', tournamentId);

  const { data: matches } = await client
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId);

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      game: tournament.game,
      format: tournament.format,
      status: tournament.status,
      start_date: tournament.start_date,
      best_of: tournament.best_of,
      maps_pool: tournament.maps_pool
    },
    participants_count: participants?.length || 0,
    matches_count: matches?.length || 0,
    completed_matches: matches?.filter(m => m.status === 'completed').length || 0
  };
}

async function fetchBracket(tournamentId) {
  const client = initSupabase();
  if (!client) throw new Error('Supabase non configuré');
  
  const { data: tournament } = await client
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  const { data: participants } = await client
    .from('participants')
    .select('*, teams(*)')
    .eq('tournament_id', tournamentId);

  const { data: matches } = await client
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true })
    .order('match_number', { ascending: true });

  if (!matches || !participants) {
    return { matches: [], rounds: [] };
  }

  const participantsMap = new Map(participants.map(p => [p.team_id, p]));
  
  const enrichedMatches = matches.map(match => {
    const p1 = match.player1_id ? participantsMap.get(match.player1_id) : null;
    const p2 = match.player2_id ? participantsMap.get(match.player2_id) : null;

    return {
      id: match.id,
      match_number: match.match_number,
      round_number: match.round_number,
      bracket_type: match.bracket_type,
      status: match.status,
      score_p1: match.score_p1,
      score_p2: match.score_p2,
      scheduled_at: match.scheduled_at,
      team1: p1 ? {
        id: p1.team_id,
        name: p1.teams.name,
        tag: p1.teams.tag,
        logo_url: p1.teams.logo_url
      } : null,
      team2: p2 ? {
        id: p2.team_id,
        name: p2.teams.name,
        tag: p2.teams.tag,
        logo_url: p2.teams.logo_url
      } : null
    };
  });

  const rounds = [...new Set(matches.map(m => m.round_number))].sort();

  return {
    tournament_id: tournamentId,
    format: tournament?.format,
    matches: enrichedMatches,
    rounds: rounds.map(round => ({
      round_number: round,
      matches: enrichedMatches.filter(m => m.round_number === round)
    }))
  };
}

async function fetchStandings(tournamentId) {
  const client = initSupabase();
  if (!client) throw new Error('Supabase non configuré');
  
  const { data: tournament } = await client
    .from('tournaments')
    .select('format')
    .eq('id', tournamentId)
    .single();

  if (tournament?.format === 'swiss') {
    const scores = await getSwissScores(tournamentId);
    const { data: participants } = await client
      .from('participants')
      .select('*, teams(*)')
      .eq('tournament_id', tournamentId);

    const standings = scores
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.buchholz_score !== a.buchholz_score) return b.buchholz_score - a.buchholz_score;
        return 0;
      })
      .map((score, index) => {
        const participant = participants?.find(p => p.team_id === score.team_id);
        return {
          rank: index + 1,
          team: participant ? {
            id: participant.team_id,
            name: participant.teams.name,
            tag: participant.teams.tag,
            logo_url: participant.teams.logo_url
          } : null,
          wins: score.wins,
          losses: score.losses,
          draws: score.draws,
          buchholz_score: parseFloat(score.buchholz_score || 0)
        };
      });

    return {
      tournament_id: tournamentId,
      format: 'swiss',
      standings
    };
  }

  // Pour les autres formats, calculer depuis les matchs
  const { data: participants } = await client
    .from('participants')
    .select('*, teams(*)')
    .eq('tournament_id', tournamentId);

  const { data: matches } = await client
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed');

  const teamStats = new Map();
  participants?.forEach(p => {
    teamStats.set(p.team_id, {
      team: {
        id: p.team_id,
        name: p.teams.name,
        tag: p.teams.tag,
        logo_url: p.teams.logo_url
      },
      wins: 0,
      losses: 0,
      draws: 0,
      matches_played: 0
    });
  });

  matches?.forEach(m => {
    if (m.player1_id && teamStats.has(m.player1_id)) {
      const stats = teamStats.get(m.player1_id);
      stats.matches_played++;
      if ((m.score_p1 || 0) > (m.score_p2 || 0)) stats.wins++;
      else if ((m.score_p1 || 0) < (m.score_p2 || 0)) stats.losses++;
      else stats.draws++;
    }
    if (m.player2_id && teamStats.has(m.player2_id)) {
      const stats = teamStats.get(m.player2_id);
      stats.matches_played++;
      if ((m.score_p2 || 0) > (m.score_p1 || 0)) stats.wins++;
      else if ((m.score_p2 || 0) < (m.score_p1 || 0)) stats.losses++;
      else stats.draws++;
    }
  });

  const standings = Array.from(teamStats.values())
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.team.name.localeCompare(b.team.name);
    })
    .map((stats, index) => ({
      rank: index + 1,
      ...stats
    }));

  return {
    tournament_id: tournamentId,
    format: tournament?.format || 'elimination',
    standings
  };
}

async function fetchResults(tournamentId) {
  const client = initSupabase();
  if (!client) throw new Error('Supabase non configuré');
  
  const { data: participants } = await client
    .from('participants')
    .select('*, teams(*)')
    .eq('tournament_id', tournamentId);

  const { data: matches } = await client
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed')
    .order('round_number', { ascending: true })
    .order('match_number', { ascending: true });

  if (!matches || !participants) {
    return { results: [] };
  }

  const participantsMap = new Map(participants.map(p => [p.team_id, p]));

  const results = matches.map(match => {
    const p1 = match.player1_id ? participantsMap.get(match.player1_id) : null;
    const p2 = match.player2_id ? participantsMap.get(match.player2_id) : null;

    const winnerId = (match.score_p1 || 0) > (match.score_p2 || 0) ? match.player1_id :
                     (match.score_p2 || 0) > (match.score_p1 || 0) ? match.player2_id : null;

    return {
      id: match.id,
      match_number: match.match_number,
      round_number: match.round_number,
      bracket_type: match.bracket_type,
      score_p1: match.score_p1,
      score_p2: match.score_p2,
      scheduled_at: match.scheduled_at,
      team1: p1 ? {
        id: p1.team_id,
        name: p1.teams.name,
        tag: p1.teams.tag,
        logo_url: p1.teams.logo_url
      } : null,
      team2: p2 ? {
        id: p2.team_id,
        name: p2.teams.name,
        tag: p2.teams.tag,
        logo_url: p2.teams.logo_url
      } : null,
      winner: winnerId ? (winnerId === match.player1_id ? 'team1' : 'team2') : null
    };
  });

  return {
    tournament_id: tournamentId,
    total_results: results.length,
    results
  };
}

// Middleware Connect (compatible avec Vite)
export default function apiRouter(req, res, next) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Parser l'URL: /api/tournament/{id}/{endpoint}
  const match = req.url.match(/^\/api\/tournament\/([^/]+)\/([^/]+)$/);
  if (!match) {
    next(); // Passer au middleware suivant si ce n'est pas une route API
    return;
  }

  const [, id, endp] = match;

  // Gérer les différentes routes
  const handleRequest = async () => {
    try {
      let data;
      switch (endp) {
        case 'info':
          data = await fetchTournamentInfo(id);
          break;
        case 'bracket':
          data = await fetchBracket(id);
          break;
        case 'standings':
          data = await fetchStandings(id);
          break;
        case 'results':
          data = await fetchResults(id);
          break;
        default:
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Endpoint invalide: ${endp}. Endpoints disponibles: info, bracket, standings, results` }));
          return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Erreur API /${endp}:`, error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error.message || 'Erreur serveur' }));
    }
  };

  handleRequest();
}
