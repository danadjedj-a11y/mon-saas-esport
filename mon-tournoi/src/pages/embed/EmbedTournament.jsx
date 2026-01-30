import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

/**
 * EmbedTournament - Widget embed pour la vue générale du tournoi (Convex)
 */
export default function EmbedTournament() {
  const { id: tournamentId } = useParams();
  
  // Convex queries
  const tournament = useQuery(api.tournaments.getById, 
    tournamentId ? { tournamentId } : "skip"
  );
  const registrations = useQuery(api.tournamentRegistrations.listByTournament,
    tournamentId ? { tournamentId } : "skip"
  );
  const matches = useQuery(api.matches.listByTournament,
    tournamentId ? { tournamentId } : "skip"
  );

  const loading = tournament === undefined;

  const stats = useMemo(() => ({
    participants: registrations?.length || 0,
    matches: matches?.length || 0,
    completed: matches?.filter(m => m.status === 'completed').length || 0,
  }), [registrations, matches]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-gray-400">Tournoi non trouvé</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ongoing':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">En cours</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">Terminé</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Inscriptions ouvertes</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] p-4">
      {/* Header */}
      <div className="bg-[#161b22] rounded-xl border border-white/10 overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-violet-600 to-cyan-600 relative">
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Content */}
        <div className="p-6 -mt-8 relative">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#1e2235] border-4 border-[#161b22] flex items-center justify-center text-2xl">
              🏆
            </div>
            <div className="flex-1 pt-4">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
                {getStatusBadge(tournament.status)}
              </div>
              <p className="text-gray-400 text-sm">{tournament.game}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-white">{stats.participants}</p>
              <p className="text-xs text-gray-500">Participants</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-white">{stats.matches}</p>
              <p className="text-xs text-gray-500">Matchs</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-white">{stats.completed}</p>
              <p className="text-xs text-gray-500">Terminés</p>
            </div>
          </div>

          {/* Description */}
          {tournament.description && (
            <p className="mt-4 text-sm text-gray-400 line-clamp-3">
              {tournament.description}
            </p>
          )}

          {/* CTA */}
          <a
            href={`${window.location.origin}/tournament/${tournamentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block w-full py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-center rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Voir le tournoi
          </a>
        </div>
      </div>

      {/* Powered by */}
      <p className="text-center text-xs text-gray-600 mt-4">
        Powered by Mon-Tournoi
      </p>
    </div>
  );
}
