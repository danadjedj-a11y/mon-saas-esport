import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { toast } from '../../../utils/toast';

// Icons for phase types
const PHASE_TYPE_ICONS = {
  single_elimination: '🏆',
  double_elimination: '🏆🏆',
  round_robin: '🔄',
  swiss: '🇨🇭',
  groups: '👥',
};

const PHASE_TYPE_LABELS = {
  single_elimination: 'Élimination simple',
  double_elimination: 'Double élimination',
  round_robin: 'Round Robin',
  swiss: 'Système Suisse',
  groups: 'Phase de groupes',
};

export default function PlacementOverview() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [phases, setPhases] = useState([]);

  // Charger via Convex
  const phasesData = useQuery(
    api.tournamentPhases.listByTournament,
    tournamentId ? { tournamentId } : "skip"
  );

  const loading = phasesData === undefined;

  useEffect(() => {
    if (phasesData) {
      if (phasesData.length === 0) {
        // Use tournament's format or default
        const defaultPhases = [{
          _id: 'default',
          name: tournament?.bracketType === 'double_elimination' ? 'Playoffs' : 'Phase principale',
          type: tournament?.bracketType || 'single_elimination',
          phaseNumber: 0,
        }];
        setPhases(defaultPhases);
      } else {
        setPhases(phasesData);
      }
    }
  }, [phasesData, tournament]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-display font-bold text-white mb-6">
        Placement
      </h1>

      {/* Phases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.map((phase, index) => (
          <div
            key={phase._id}
            onClick={() => navigate(`/organizer/tournament/${tournamentId}/placement/${phase._id}`)}
            className="bg-[#2a2d3e] rounded-xl border-2 border-dashed border-cyan/50 p-6 cursor-pointer hover:border-cyan hover:bg-[#2a2d3e]/80 transition-all group"
          >
            {/* Phase Icon */}
            <div className="flex justify-center mb-4">
              <svg 
                className="w-20 h-20 text-gray-500 group-hover:text-gray-400 transition-colors"
                viewBox="0 0 100 100"
              >
                {/* Double elimination bracket icon */}
                <rect x="10" y="20" width="25" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                <rect x="10" y="35" width="25" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                <rect x="10" y="57" width="25" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                <rect x="10" y="72" width="25" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                
                <line x1="35" y1="24" x2="45" y2="24" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="35" y1="39" x2="45" y2="39" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="45" y1="24" x2="45" y2="39" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="45" y1="31" x2="55" y2="31" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                
                <rect x="55" y="27" width="25" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                
                <line x1="35" y1="61" x2="45" y2="61" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="35" y1="76" x2="45" y2="76" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="45" y1="61" x2="45" y2="76" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="45" y1="68" x2="55" y2="68" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                
                <rect x="55" y="64" width="25" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                
                <line x1="80" y1="31" x2="85" y2="31" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="80" y1="68" x2="85" y2="68" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="85" y1="31" x2="85" y2="68" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="85" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
              </svg>
            </div>

            {/* Phase Info */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-1">
                {index + 1}. {phase.name}
              </h3>
              <p className="text-sm text-gray-400">
                {PHASE_TYPE_LABELS[phase.type] || phase.type}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {phases.length === 0 && (
        <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-12 text-center">
          <p className="text-gray-500 mb-4">
            Aucune phase configurée.
          </p>
          <p className="text-sm text-gray-600">
            Configurez d'abord la structure du tournoi dans les paramètres.
          </p>
        </div>
      )}
    </div>
  );
}
