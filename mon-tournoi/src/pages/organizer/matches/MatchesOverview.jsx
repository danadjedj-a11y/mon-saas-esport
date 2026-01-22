import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { toast } from '../../../utils/toast';
import MatchQuickView from '../../../components/match/MatchQuickView';

export default function MatchesOverview() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [matches, setMatches] = useState([]);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [quickViewMatch, setQuickViewMatch] = useState(null);

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      // Fetch matches
      const { data: matchesData, error: mError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (mError && mError.code !== 'PGRST116') throw mError;
      
      // Fetch teams pour enrichir les données
      const teamIds = [...new Set(
        (matchesData || []).flatMap(m => [m.player1_id, m.player2_id]).filter(Boolean)
      )];
      
      let teamsMap = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, logo_url')
          .in('id', teamIds);
        teamsMap = Object.fromEntries((teamsData || []).map(t => [t.id, t]));
      }
      
      // Enrichir les matchs avec les infos des équipes
      const enrichedMatches = (matchesData || []).map(match => ({
        ...match,
        participant1: teamsMap[match.player1_id] || null,
        participant2: teamsMap[match.player2_id] || null,
      }));
      
      setMatches(enrichedMatches);

      // Fetch phases
      const { data: phasesData } = await supabase
        .from('tournament_phases')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('order_index', { ascending: true });

      if (phasesData && phasesData.length > 0) {
        setPhases(phasesData);
      } else {
        setPhases([{
          id: 'default',
          name: 'Playoffs',
          type: tournament?.bracket_type || 'double_elimination',
        }]);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

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
    const phase = phases.find(p => p.id === match.phase_id) || phases[0];
    const bracket = match.bracket_type === 'losers' ? 'Losers Bracket' : 'Winners Bracket';
    return `${phase?.name || 'Playoffs'} - ${bracket} - Round ${match.round_number || 1}`;
  };

  const handleSelectMatch = (id) => {
    setSelectedMatches(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
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
          phase={phases.find(p => p.id === quickViewMatch.phase_id) || phases[0]}
          tournamentId={tournamentId}
          onClose={() => setQuickViewMatch(null)}
          onRefresh={fetchData}
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
                  setSelectedMatches(matches.map(m => m.id));
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
            const matchId = `#${match.phase_id ? '1' : '1'}.${match.bracket_type === 'losers' ? '2' : '1'}.${match.round_number || 1}.${match.match_number || 1}`;
            
            return (
              <div
                key={match.id}
                onClick={() => setQuickViewMatch(match)}
                className="grid grid-cols-[40px_1fr_200px_120px_40px] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer items-center"
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedMatches.includes(match.id)}
                    onChange={() => handleSelectMatch(match.id)}
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
                    {match.participant1?.name || 'À déterminer'}
                  </p>
                  <p className="text-gray-400">
                    {match.participant2?.name || 'À déterminer'}
                  </p>
                </div>
                
                <span className={`text-sm ${status.color}`}>
                  {status.label}
                </span>
                
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => navigate(`/organizer/tournament/${tournamentId}/matches/${match.id}`)}
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
