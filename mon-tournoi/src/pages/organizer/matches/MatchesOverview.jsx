import { useState, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { toast } from '../../../utils/toast';
import MatchQuickView from '../../../components/match/MatchQuickView';

export default function MatchesOverview() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [selectedMatches, setSelectedMatches] = useState([]);
  const [quickViewMatch, setQuickViewMatch] = useState(null);

  // Charger les matchs via Convex
  const matchesData = useQuery(api.matches.listByTournament,
    tournamentId ? { tournamentId } : "skip"
  );

  // Charger les phases depuis le contexte ou créer une phase par défaut
  const phases = context?.phases || [{
    id: 'default',
    name: 'Playoffs',
    type: tournament?.bracketType || 'double_elimination',
  }];

  const loading = matchesData === undefined;

  // Sort matches by round and match number
  const matches = useMemo(() => {
    if (!matchesData) return [];
    return [...matchesData].sort((a, b) => 
      (a.roundNumber || 1) - (b.roundNumber || 1) || 
      (a.matchNumber || 0) - (b.matchNumber || 0)
    );
  }, [matchesData]);

  const completedMatches = matches.filter(m => m.status === 'completed').length;

  const getMatchStatus = (match) => {
    switch (match.status) {
      case 'completed': return { label: 'Terminé', color: 'text-green-400' };
      case 'in_progress': return { label: 'En cours', color: 'text-yellow-400' };
      case 'scheduled': return { label: 'Planifié', color: 'text-blue-400' };
      default: return { label: 'En attente', color: 'text-gray-400' };
    }
  };

  const getMatchContext = (match) => {
    const phase = phases.find(p => p.id === match.phaseId) || phases[0];
    const bracket = match.bracketType === 'losers' ? 'Losers Bracket' : 'Winners Bracket';
    return `${phase?.name || 'Playoffs'} - ${bracket} - Round ${match.roundNumber || 1}`;
  };

  const handleSelectMatch = (id) => {
    setSelectedMatches(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const refreshData = () => {
    // Data will auto-refresh through Convex reactivity
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Quick View Modal */}
      {quickViewMatch && (
        <MatchQuickView
          match={quickViewMatch}
          phase={phases.find(p => p.id === quickViewMatch.phaseId) || phases[0]}
          tournamentId={tournamentId}
          onClose={() => setQuickViewMatch(null)}
          onRefresh={refreshData}
        />
      )}

      {/* Header */}
      <h1 className="text-2xl font-display font-bold text-white mb-6">
        Matchs
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 text-center">
          <p className="text-4xl font-bold text-white mb-2">{matches.length}</p>
          <p className="text-gray-400">Matchs</p>
        </div>
        <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 text-center">
          <p className="text-4xl font-bold text-white mb-2">{completedMatches}</p>
          <p className="text-gray-400">Complété{completedMatches > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Matches List */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-cyan"
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedMatches(matches.map(m => m._id));
                } else {
                  setSelectedMatches([]);
                }
              }}
            />
            <button className="text-gray-400 hover:text-white">
              📋
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-cyan hover:text-cyan/80">
              ⚙️
            </button>
            <span className="text-gray-400 text-sm">
              {matches.length > 0 ? `1-${matches.length} sur ${matches.length}` : '0 matchs'}
            </span>
            <div className="flex gap-1">
              <button className="p-1 text-gray-400 hover:text-white">‹</button>
              <button className="p-1 text-gray-400 hover:text-white">›</button>
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_200px_120px_40px] gap-4 px-4 py-3 border-b border-white/10 text-sm">
          <span></span>
          <span className="text-gray-400">Contexte</span>
          <span className="text-gray-400">Match</span>
          <span className="text-gray-400">État</span>
          <span></span>
        </div>

        {/* Match Rows */}
        {matches.length > 0 ? (
          matches.map((match) => {
            const status = getMatchStatus(match);
            const matchId = `#${match.phaseId ? '1' : '1'}.${match.bracketType === 'losers' ? '2' : '1'}.${match.roundNumber || 1}.${match.matchNumber || 1}`;
            
            return (
              <div
                key={match._id}
                onClick={() => setQuickViewMatch(match)}
                className="grid grid-cols-[40px_1fr_200px_120px_40px] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer items-center"
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedMatches.includes(match._id)}
                    onChange={() => handleSelectMatch(match._id)}
                    className="accent-cyan"
                  />
                </div>
                
                <div>
                  <p className="text-cyan font-medium text-sm">
                    Match {matchId}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {getMatchContext(match)}
                  </p>
                </div>
                
                <div className="text-sm">
                  <p className="text-gray-400">
                    {match.team1?.name || 'À déterminer'}
                  </p>
                  <p className="text-gray-400">
                    {match.team2?.name || 'À déterminer'}
                  </p>
                </div>
                
                <span className={`text-sm ${status.color}`}>
                  {status.label}
                </span>
                
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => navigate(`/organizer/tournament/${tournamentId}/matches/${match._id}`)}
                    className="p-1 text-cyan hover:text-cyan/80"
                    title="Éditer le résultat"
                  >
                    ✏️
                  </button>
                  <button 
                    className="p-1 text-gray-400 hover:text-white"
                    title="Plus d'options"
                  >
                    ⋮
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-gray-500">
            Aucun match généré.
            <p className="text-sm mt-2">Configurez d'abord la structure et placez les participants.</p>
          </div>
        )}

        {/* Footer */}
        {matches.length > 0 && (
          <div className="flex items-center justify-end p-4 border-t border-white/10">
            <span className="text-gray-400 text-sm">
              1-{matches.length} sur {matches.length}
            </span>
            <div className="flex gap-1 ml-4">
              <button className="p-1 text-gray-400 hover:text-white">‹</button>
              <button className="p-1 text-gray-400 hover:text-white">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
