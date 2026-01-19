import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button } from '../../shared/components/ui';
import { toast } from '../../utils/toast';
import clsx from 'clsx';

/**
 * Calcule la structure du bracket en fonction du format et de la taille
 */
function calculateBracketStructure(format, size, config = {}) {
  const structure = {
    winnersRounds: [],
    losersRounds: [],
    grandFinal: null,
  };

  // Nombre de rounds pour le winners bracket
  const numRounds = Math.ceil(Math.log2(size));
  
  if (format === 'elimination' || format === 'double_elimination') {
    // Winners Bracket
    let matchesInRound = Math.ceil(size / 2);
    for (let round = 1; round <= numRounds; round++) {
      const roundName = round === numRounds ? 'WB Final' : `WB Round ${round}`;
      const matches = [];
      
      for (let i = 1; i <= matchesInRound; i++) {
        matches.push({
          id: `WB${round}.${i}`,
          round,
          bracket: 'winners',
          position: i,
          team1: round === 1 ? { seed: (i - 1) * 2 + 1 } : { fromMatch: `WB${round - 1}.${(i - 1) * 2 + 1}`, result: 'winner' },
          team2: round === 1 ? { seed: (i - 1) * 2 + 2 } : { fromMatch: `WB${round - 1}.${(i - 1) * 2 + 2}`, result: 'winner' },
        });
      }
      
      structure.winnersRounds.push({
        name: roundName,
        matches,
      });
      
      matchesInRound = Math.ceil(matchesInRound / 2);
    }

    // Losers Bracket (pour double élimination)
    if (format === 'double_elimination') {
      const losersRoundsCount = (numRounds - 1) * 2;
      let matchesInLosersRound = Math.ceil(size / 4);
      
      for (let round = 1; round <= losersRoundsCount; round++) {
        const roundName = round === losersRoundsCount ? 'LB Final' : `LB Round ${round}`;
        const matches = [];
        
        for (let i = 1; i <= matchesInLosersRound; i++) {
          matches.push({
            id: `LB${round}.${i}`,
            round,
            bracket: 'losers',
            position: i,
            team1: { fromMatch: `WB${Math.ceil(round / 2)}.${i}`, result: 'loser' },
            team2: round === 1 
              ? { fromMatch: `WB1.${i * 2}`, result: 'loser' }
              : { fromMatch: `LB${round - 1}.${i}`, result: 'winner' },
          });
        }
        
        structure.losersRounds.push({
          name: roundName,
          matches,
        });
        
        if (round % 2 === 0) {
          matchesInLosersRound = Math.ceil(matchesInLosersRound / 2);
        }
      }

      // Grand Final
      if (config.grand_final !== 'none') {
        structure.grandFinal = {
          name: 'GF Round 1',
          matches: [{
            id: 'GF1',
            round: 1,
            bracket: 'grand_final',
            position: 1,
            team1: { fromMatch: `WB${numRounds}.1`, result: 'winner', label: 'Gagnant WB Final' },
            team2: { fromMatch: `LB${structure.losersRounds.length}.1`, result: 'winner', label: 'Gagnant LB Final' },
          }],
        };
      }
    }
  }

  return structure;
}

/**
 * Match component in the bracket
 */
function BracketMatch({ match, teams, onPlaceTeam }) {
  const getTeamDisplay = (teamSlot) => {
    if (!teamSlot) return { label: 'TBD', className: 'text-gray-500' };
    
    if (teamSlot.seed !== undefined) {
      const team = teams?.find(t => t.seed_order === teamSlot.seed);
      if (team) {
        return { 
          label: team.team?.name || `Équipe ${team.seed_order}`,
          className: 'text-white',
          hasTeam: true,
        };
      }
      return { 
        label: `Seed #${teamSlot.seed}`,
        className: 'text-amber-400 cursor-pointer hover:text-amber-300',
        isSlot: true,
        seed: teamSlot.seed,
      };
    }
    
    if (teamSlot.fromMatch) {
      const isWinner = teamSlot.result === 'winner';
      return {
        label: `${isWinner ? '↑ Gagnant' : '↓ Perdant'} ${teamSlot.fromMatch}`,
        className: isWinner ? 'text-cyan-400' : 'text-orange-400',
      };
    }
    
    return { label: 'TBD', className: 'text-gray-500' };
  };

  const team1Display = getTeamDisplay(match.team1);
  const team2Display = getTeamDisplay(match.team2);

  return (
    <div className="bg-[#1e2235] rounded-lg border border-white/10 overflow-hidden min-w-[180px]">
      {/* Match ID */}
      <div className="px-3 py-1 bg-white/5 text-xs text-gray-500 border-b border-white/10">
        {match.id}
      </div>
      
      {/* Team 1 */}
      <div 
        className={clsx(
          'px-3 py-2 border-b border-white/10 text-sm',
          team1Display.className,
          team1Display.isSlot && 'cursor-pointer hover:bg-white/5'
        )}
        onClick={() => team1Display.isSlot && onPlaceTeam?.(match.id, 1, team1Display.seed)}
      >
        {team1Display.isSlot && <span className="mr-1">🔒</span>}
        {team1Display.label}
      </div>
      
      {/* Team 2 */}
      <div 
        className={clsx(
          'px-3 py-2 text-sm',
          team2Display.className,
          team2Display.isSlot && 'cursor-pointer hover:bg-white/5'
        )}
        onClick={() => team2Display.isSlot && onPlaceTeam?.(match.id, 2, team2Display.seed)}
      >
        {team2Display.isSlot && <span className="mr-1">🔒</span>}
        {team2Display.label}
      </div>
    </div>
  );
}

/**
 * BracketRound - Column of matches for a round
 */
function BracketRound({ round, teams, onPlaceTeam }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Round Header */}
      <div className="bg-[#2a2d3e] rounded-lg px-4 py-2 text-center">
        <span className="text-sm font-medium text-white">{round.name}</span>
      </div>
      
      {/* Matches */}
      <div className="flex flex-col gap-8 justify-around flex-1">
        {round.matches.map((match) => (
          <BracketMatch 
            key={match.id} 
            match={match} 
            teams={teams}
            onPlaceTeam={onPlaceTeam}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * BracketEditor - Éditeur visuel de bracket
 */
export default function BracketEditor() {
  const { id: tournamentId, phaseId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  
  const [phase, setPhase] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [tournamentId, phaseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Charger la phase
      const { data: phaseData, error: phaseError } = await supabase
        .from('tournament_phases')
        .select('*')
        .eq('id', phaseId)
        .single();

      if (phaseError) throw phaseError;
      setPhase(phaseData);

      // Charger les participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select(`
          *,
          team:teams(id, name, logo_url)
        `)
        .eq('tournament_id', tournamentId)
        .order('seed_order', { ascending: true });

      if (!participantsError && participantsData) {
        setParticipants(participantsData);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Calculer la structure du bracket
  const bracketStructure = useMemo(() => {
    if (!phase) return null;
    return calculateBracketStructure(
      phase.format, 
      phase.config?.size || 8,
      phase.config
    );
  }, [phase]);

  const handlePlaceTeam = (matchId, position, seed) => {
    // TODO: Ouvrir modal de sélection d'équipe
    toast.info(`Placement équipe pour Seed #${seed}`);
  };

  const handleAutoPlace = () => {
    toast.success('Placement automatique selon le seeding');
  };

  const handleReset = () => {
    if (confirm('Réinitialiser tous les placements ?')) {
      toast.info('Placements réinitialisés');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement du bracket...</p>
        </div>
      </div>
    );
  }

  if (!phase || !bracketStructure) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Phase non trouvée</p>
        <Button 
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/structure`)}
          className="mt-4"
        >
          Retour à la structure
        </Button>
      </div>
    );
  }

  const PHASE_LABELS = {
    elimination: 'Élimination directe',
    double_elimination: 'Double élimination',
    round_robin: 'Round Robin',
    swiss: 'Système Suisse',
    gauntlet: 'Gauntlet',
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm">
        <span className="text-gray-400">Structure</span>
        <span className="text-gray-600 mx-2">/</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-2">
          Modifier l'arbre de la phase "{phase.name}"
        </h1>
      </div>

      {/* Format Title */}
      <div className="mb-6">
        <h2 className="text-xl font-display font-semibold text-white">
          {PHASE_LABELS[phase.format] || phase.format}
        </h2>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          onClick={handleAutoPlace}
          variant="secondary"
          className="bg-[#2a2d3e] border-white/10 hover:bg-white/10"
        >
          🎲 Auto-placer selon seeding
        </Button>
        <Button
          onClick={handleReset}
          variant="secondary"
          className="bg-[#2a2d3e] border-white/10 hover:bg-white/10"
        >
          ↺ Réinitialiser
        </Button>
      </div>

      {/* Bracket View */}
      <div className="bg-[#252836] rounded-xl p-6 overflow-x-auto">
        <div className="flex gap-12 min-w-max">
          {/* Winners Bracket */}
          {bracketStructure.winnersRounds.map((round, idx) => (
            <BracketRound 
              key={`winners-${idx}`}
              round={round}
              teams={participants}
              onPlaceTeam={handlePlaceTeam}
            />
          ))}

          {/* Grand Final */}
          {bracketStructure.grandFinal && (
            <BracketRound 
              round={bracketStructure.grandFinal}
              teams={participants}
              onPlaceTeam={handlePlaceTeam}
            />
          )}
        </div>

        {/* Losers Bracket */}
        {bracketStructure.losersRounds.length > 0 && (
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex gap-12 min-w-max">
              {bracketStructure.losersRounds.map((round, idx) => (
                <BracketRound 
                  key={`losers-${idx}`}
                  round={round}
                  teams={participants}
                  onPlaceTeam={handlePlaceTeam}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unplaced Teams Sidebar (when we have teams to place) */}
      {participants.length > 0 && (
        <div className="mt-8 p-6 bg-[#2a2d3e] rounded-xl">
          <h3 className="font-display font-semibold text-white mb-4">
            Équipes inscrites ({participants.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {participants.map((p, idx) => (
              <div 
                key={p.id}
                className="bg-[#1e2235] rounded-lg p-3 border border-white/10 cursor-grab hover:border-violet/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">#{idx + 1}</span>
                  <span className="text-sm text-white truncate">
                    {p.team?.name || p.team_name || `Équipe ${idx + 1}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Footer */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/structure`)}
          variant="secondary"
        >
          ← Retour à la structure
        </Button>
        
        <Button
          onClick={() => toast.success('Bracket sauvegardé')}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600"
        >
          💾 Sauvegarder
        </Button>
      </div>
    </div>
  );
}
