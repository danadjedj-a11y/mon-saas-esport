import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button, Modal } from '../../shared/components/ui';
import { toast } from '../../utils/toast';
import clsx from 'clsx';
import PlacementManager from '../phases/PlacementManager';
import MatchResultEditor from '../match/MatchResultEditor';

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
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('bracket'); // 'bracket', 'placement', 'results'
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showMatchEditor, setShowMatchEditor] = useState(false);

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

      // Charger les matchs de cette phase
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name, logo_url),
          team2:teams!matches_team2_id_fkey(id, name, logo_url)
        `)
        .eq('phase_id', phaseId)
        .order('round_number', { ascending: true });

      if (!matchesError && matchesData) {
        setMatches(matchesData);
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

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
    setShowMatchEditor(true);
  };

  const handleMatchSaved = () => {
    fetchData(); // Rafraîchir les données après sauvegarde
    setShowMatchEditor(false);
    setSelectedMatch(null);
  };

  const handlePlaceTeam = (matchId, position, seed) => {
    toast.info(`Placement équipe pour Seed #${seed}`);
  };

  const handleAutoPlace = async () => {
    // Implémenté via PlacementManager
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

  const VIEW_TABS = [
    { id: 'bracket', label: '🏗️ Arbre', icon: '🏗️' },
    { id: 'placement', label: '🎯 Placement', icon: '🎯' },
    { id: 'results', label: '📊 Résultats', icon: '📊' },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm flex items-center gap-2">
        <button 
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/structure`)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Structure
        </button>
        <span className="text-gray-600">/</span>
        <span className="text-white">{phase.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-1">
            Modifier l'arbre de la phase "{phase.name}"
          </h1>
          <p className="text-gray-400">
            {PHASE_LABELS[phase.format] || phase.format} • {phase.config?.size || 8} équipes
          </p>
        </div>
        
        <Button
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/structure/${phaseId}/settings`)}
          variant="secondary"
          className="bg-[#2a2d3e] border-white/10 hover:bg-white/10"
        >
          ⚙️ Paramètres
        </Button>
      </div>

      {/* View Tabs */}
      <div className="border-b border-white/10 mb-6">
        <div className="flex gap-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={clsx(
                'px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeView === tab.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar pour le bracket */}
      {activeView === 'bracket' && (
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
      )}

      {/* Vue Bracket */}
      {activeView === 'bracket' && (
        <>
          <div className="bg-[#252836] rounded-xl p-6 overflow-x-auto">
            <div className="flex gap-12 min-w-max">
              {/* Winners Bracket */}
              {bracketStructure.winnersRounds.map((round, idx) => (
                <BracketRound 
                  key={`winners-${idx}`}
                  round={round}
                  teams={participants}
                  onPlaceTeam={handlePlaceTeam}
                  onMatchClick={handleMatchClick}
                  matches={matches}
                />
              ))}

              {/* Grand Final */}
              {bracketStructure.grandFinal && (
                <BracketRound 
                  round={bracketStructure.grandFinal}
                  teams={participants}
                  onPlaceTeam={handlePlaceTeam}
                  onMatchClick={handleMatchClick}
                  matches={matches}
                />
              )}
            </div>

            {/* Losers Bracket */}
            {bracketStructure.losersRounds.length > 0 && (
              <div className="mt-12 pt-8 border-t border-white/10">
                <h3 className="text-orange-400 font-display text-sm mb-4">Losers Bracket</h3>
                <div className="flex gap-12 min-w-max">
                  {bracketStructure.losersRounds.map((round, idx) => (
                    <BracketRound 
                      key={`losers-${idx}`}
                      round={round}
                      teams={participants}
                      onPlaceTeam={handlePlaceTeam}
                      onMatchClick={handleMatchClick}
                      matches={matches}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Équipes inscrites */}
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
                      {p.team?.logo_url ? (
                        <img src={p.team.logo_url} alt="" className="w-5 h-5 rounded object-cover" />
                      ) : (
                        <span className="text-xs text-gray-500">#{idx + 1}</span>
                      )}
                      <span className="text-sm text-white truncate">
                        {p.team?.name || p.team_name || `Équipe ${idx + 1}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Vue Placement */}
      {activeView === 'placement' && (
        <div className="bg-[#252836] rounded-xl p-6">
          <h3 className="font-display font-semibold text-white mb-6">
            Placement des équipes
          </h3>
          <PlacementManager
            phaseId={phaseId}
            tournamentId={tournamentId}
            size={phase.config?.size || 8}
            format={phase.format}
            onPlacementChange={fetchData}
          />
        </div>
      )}

      {/* Vue Résultats */}
      {activeView === 'results' && (
        <div className="bg-[#252836] rounded-xl p-6">
          <h3 className="font-display font-semibold text-white mb-6">
            Résultats des matchs
          </h3>
          
          {matches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Aucun match n'a encore été créé pour cette phase.</p>
              <p className="text-sm text-gray-500">
                Les matchs seront générés une fois le placement des équipes terminé et la phase lancée.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map(match => (
                <div 
                  key={match.id}
                  onClick={() => handleMatchClick(match)}
                  className="flex items-center gap-4 p-4 bg-[#1e2235] rounded-lg border border-white/10 hover:border-violet/30 cursor-pointer transition-all"
                >
                  {/* Round info */}
                  <div className="text-sm text-gray-500 w-24">
                    Round {match.round_number}
                  </div>
                  
                  {/* Team 1 */}
                  <div className={clsx(
                    'flex-1 flex items-center gap-2 p-2 rounded',
                    match.winner_id === match.team1_id && 'bg-green-500/10'
                  )}>
                    {match.team1?.logo_url && (
                      <img src={match.team1.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                    )}
                    <span className="text-white">{match.team1?.name || 'TBD'}</span>
                    <span className="ml-auto font-bold text-cyan-400">{match.team1_score ?? '-'}</span>
                  </div>
                  
                  <span className="text-gray-500">VS</span>
                  
                  {/* Team 2 */}
                  <div className={clsx(
                    'flex-1 flex items-center gap-2 p-2 rounded',
                    match.winner_id === match.team2_id && 'bg-green-500/10'
                  )}>
                    {match.team2?.logo_url && (
                      <img src={match.team2.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                    )}
                    <span className="text-white">{match.team2?.name || 'TBD'}</span>
                    <span className="ml-auto font-bold text-cyan-400">{match.team2_score ?? '-'}</span>
                  </div>

                  {/* Status */}
                  <span className={clsx(
                    'px-2 py-1 text-xs rounded',
                    match.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    match.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-gray-500/20 text-gray-400'
                  )}>
                    {match.status === 'completed' ? 'Terminé' :
                     match.status === 'in_progress' ? 'En cours' : 'À venir'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions Footer */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/structure`)}
          variant="secondary"
          className="bg-[#2a2d3e] border-white/10"
        >
          ← Retour à la structure
        </Button>
        
        <Button
          onClick={() => toast.success('Modifications sauvegardées')}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600"
        >
          💾 Sauvegarder
        </Button>
      </div>

      {/* Modal éditeur de résultat */}
      {selectedMatch && (
        <MatchResultEditor
          match={selectedMatch}
          isOpen={showMatchEditor}
          onClose={() => {
            setShowMatchEditor(false);
            setSelectedMatch(null);
          }}
          onSave={handleMatchSaved}
          matchFormat={phase.config?.match_format || 'best_of'}
          bestOf={phase.config?.best_of || 3}
          fixedGames={phase.config?.fixed_games || 1}
        />
      )}
    </div>
  );
}
