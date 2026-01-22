// Vercel Serverless Function pour l'API Tournament
// Route: /api/tournament/[id]/[endpoint]

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variables d\'environnement Supabase manquantes');
  }

  return createClient(supabaseUrl, supabaseKey);
}

async function getSwissScores(supabase, tournamentId) {
  const { data, error } = await supabase
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

async function fetchTournamentInfo(supabase, tournamentId) {
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (error) throw error;

  const { data: participants } = await supabase
    .from('participants')
    .select('*, teams(name, tag, logo_url)')
    .eq('tournament_id', tournamentId);

  const { data: matches } = await supabase
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

async function fetchBracket(supabase, tournamentId) {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  const { data: participants } = await supabase
    .from('participants')
    .select('*, teams(*)')
    .eq('tournament_id', tournamentId);

  const { data: matches } = await supabase
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

async function fetchStandings(supabase, tournamentId) {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('format')
    .eq('id', tournamentId)
    .single();

  if (tournament?.format === 'swiss') {
    const scores = await getSwissScores(supabase, tournamentId);
    const { data: participants } = await supabase
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

  const { data: participants } = await supabase
    .from('participants')
    .select('*, teams(*)')
    .eq('tournament_id', tournamentId);

  const { data: matches } = await supabase
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

async function fetchResults(supabase, tournamentId) {
  const { data: participants } = await supabase
    .from('participants')
    .select('*, teams(*)')
    .eq('tournament_id', tournamentId);

  const { data: matches } = await supabase
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

// Liste des origines autorisées en production
const ALLOWED_ORIGINS = [
  'https://mon-tournoi.vercel.app',
  'https://mon-saas-esport.vercel.app',
  process.env.VITE_APP_URL,
  'http://localhost:5173', // Dev uniquement
  'http://localhost:3000',
].filter(Boolean);

// Validation UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return UUID_REGEX.test(str);
}

export default async function handler(req, res) {
  // CORS headers - Restreindre aux origines autorisées
  const origin = req.headers.origin;
  const isAllowed = !origin || ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV === 'development';
  
  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel passe les paramètres dynamiques via req.query
  const tournamentId = req.query.id;
  const endpoint = req.query.endpoint;

  if (!tournamentId || !endpoint) {
    return res.status(400).json({ error: 'ID et endpoint requis' });
  }

  // Validation UUID pour éviter les injections
  if (!isValidUUID(tournamentId)) {
    return res.status(400).json({ error: 'ID de tournoi invalide' });
  }

  try {
    const supabase = getSupabaseClient();
    let data;

    switch (endpoint) {
      case 'info':
        data = await fetchTournamentInfo(supabase, tournamentId);
        break;
      case 'bracket':
        data = await fetchBracket(supabase, tournamentId);
        break;
      case 'standings':
        data = await fetchStandings(supabase, tournamentId);
        break;
      case 'results':
        data = await fetchResults(supabase, tournamentId);
        break;
      default:
        return res.status(404).json({ 
          error: `Endpoint invalide: ${endpoint}. Endpoints disponibles: info, bracket, standings, results` 
        });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error(`Erreur API /${endpoint}:`, error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}

