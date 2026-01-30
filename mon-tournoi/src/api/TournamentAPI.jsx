import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Composant API qui retourne des données JSON pour les endpoints API
 * Usage: Utiliser avec un route handler ou directement comme composant React
 * Note: Migré vers Convex - les données sont maintenant réactives
 */
export default function TournamentAPI() {
  const { id, endpoint } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Convex queries - automatically reactive
  const tournament = useQuery(api.tournaments.getById, id ? { tournamentId: id } : "skip");
  const matches = useQuery(api.matches.listByTournament, id ? { tournamentId: id } : "skip");

  useEffect(() => {
    if (tournament === undefined || matches === undefined) {
      setLoading(true);
      return;
    }
    
    processData();
  }, [tournament, matches, endpoint]);

  const processData = () => {
    try {
      setLoading(true);
      setError(null);

      let result = null;

      switch (endpoint) {
        case 'info':
          result = formatTournamentInfo(tournament, matches);
          break;
        case 'bracket':
          result = formatBracket(tournament, matches);
          break;
        case 'standings':
          result = formatStandings(tournament, matches);
          break;
        case 'results':
          result = formatResults(tournament, matches);
          break;
        default:
          throw new Error(`Endpoint invalide: ${endpoint}`);
      }

      setData(result);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Retourner JSON pour les endpoints API
  // Note: Pour une vraie API REST, on utiliserait Convex HTTP actions
  // Ici, on retourne les données via React (utile pour le développement)
  if (loading) {
    return <div style={{ padding: '20px', color: '#666' }}>Chargement...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#e74c3c' }}>
        Erreur: {error}
      </div>
    );
  }

  return (
    <pre style={{ 
      background: '#1a1a1a', 
      color: '#00d4ff', 
      padding: '20px', 
      borderRadius: '8px',
      overflow: 'auto',
      fontSize: '0.9rem',
      fontFamily: 'monospace'
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// Helper functions for formatting Convex data

function formatTournamentInfo(tournament, matches) {
  if (!tournament) return null;
  
  return {
    tournament: {
      id: tournament._id,
      name: tournament.name,
      game: tournament.game,
      format: tournament.format,
      status: tournament.status,
      startDate: tournament.startDate,
      bestOf: tournament.bestOf,
      mapsPool: tournament.mapsPool
    },
    participantsCount: tournament.participantCount || 0,
    matchesCount: matches?.length || 0,
    completedMatches: matches?.filter(m => m.status === 'completed').length || 0
  };
}

function formatBracket(tournament, matches) {
  if (!matches) {
    return { matches: [], rounds: [] };
  }

  const enrichedMatches = matches.map(match => ({
    id: match._id,
    matchNumber: match.matchNumber,
    roundNumber: match.round,
    bracketType: match.isLosersBracket ? 'losers' : 'winners',
    status: match.status,
    scoreP1: match.scoreTeam1,
    scoreP2: match.scoreTeam2,
    scheduledAt: match.scheduledAt,
    team1: match.team1 ? {
      id: match.team1._id,
      name: match.team1.name,
      tag: match.team1.tag,
      logoUrl: match.team1.logoUrl
    } : null,
    team2: match.team2 ? {
      id: match.team2._id,
      name: match.team2.name,
      tag: match.team2.tag,
      logoUrl: match.team2.logoUrl
    } : null
  }));

  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);

  return {
    tournamentId: tournament?._id,
    format: tournament?.format,
    matches: enrichedMatches,
    rounds: rounds.map(round => ({
      roundNumber: round,
      matches: enrichedMatches.filter(m => m.roundNumber === round)
    }))
  };
}

function formatStandings(tournament, matches) {
  if (!matches || !tournament) {
    return { tournamentId: tournament?._id, format: tournament?.format, standings: [] };
  }

  // Calculate standings from completed matches
  const teamStats = new Map();
  
  matches.forEach(match => {
    if (match.status !== 'completed') return;
    
    // Initialize teams if not seen
    if (match.team1 && !teamStats.has(match.team1._id)) {
      teamStats.set(match.team1._id, {
        team: {
          id: match.team1._id,
          name: match.team1.name,
          tag: match.team1.tag,
          logoUrl: match.team1.logoUrl
        },
        wins: 0,
        losses: 0,
        draws: 0,
        matchesPlayed: 0
      });
    }
    if (match.team2 && !teamStats.has(match.team2._id)) {
      teamStats.set(match.team2._id, {
        team: {
          id: match.team2._id,
          name: match.team2.name,
          tag: match.team2.tag,
          logoUrl: match.team2.logoUrl
        },
        wins: 0,
        losses: 0,
        draws: 0,
        matchesPlayed: 0
      });
    }

    // Update stats
    if (match.team1?._id) {
      const stats = teamStats.get(match.team1._id);
      stats.matchesPlayed++;
      if ((match.scoreTeam1 || 0) > (match.scoreTeam2 || 0)) stats.wins++;
      else if ((match.scoreTeam1 || 0) < (match.scoreTeam2 || 0)) stats.losses++;
      else stats.draws++;
    }
    if (match.team2?._id) {
      const stats = teamStats.get(match.team2._id);
      stats.matchesPlayed++;
      if ((match.scoreTeam2 || 0) > (match.scoreTeam1 || 0)) stats.wins++;
      else if ((match.scoreTeam2 || 0) < (match.scoreTeam1 || 0)) stats.losses++;
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
    tournamentId: tournament._id,
    format: tournament.format,
    standings
  };
}

function formatResults(tournament, matches) {
  if (!matches) {
    return { results: [] };
  }

  const completedMatches = matches.filter(m => m.status === 'completed');

  const results = completedMatches.map(match => {
    const winnerId = (match.scoreTeam1 || 0) > (match.scoreTeam2 || 0) ? match.team1?._id :
                     (match.scoreTeam2 || 0) > (match.scoreTeam1 || 0) ? match.team2?._id : null;

    return {
      id: match._id,
      matchNumber: match.matchNumber,
      roundNumber: match.round,
      bracketType: match.isLosersBracket ? 'losers' : 'winners',
      scoreP1: match.scoreTeam1,
      scoreP2: match.scoreTeam2,
      scheduledAt: match.scheduledAt,
      team1: match.team1 ? {
        id: match.team1._id,
        name: match.team1.name,
        tag: match.team1.tag,
        logoUrl: match.team1.logoUrl
      } : null,
      team2: match.team2 ? {
        id: match.team2._id,
        name: match.team2.name,
        tag: match.team2.tag,
        logoUrl: match.team2.logoUrl
      } : null,
      winner: winnerId ? (winnerId === match.team1?._id ? 'team1' : 'team2') : null
    };
  });

  return {
    tournamentId: tournament?._id,
    totalResults: results.length,
    results
  };
}

// Export for external use (these now work with Convex data format)
export { formatTournamentInfo, formatBracket, formatStandings, formatResults };

