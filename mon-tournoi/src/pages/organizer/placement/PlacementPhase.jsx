import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

export default function PlacementPhase() {
  const { id: tournamentId, phaseId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [phase, setPhase] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [seeds, setSeeds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [draggedParticipant, setDraggedParticipant] = useState(null);

  const tournamentSize = tournament?.maxParticipants || tournament?.size || 4;

  // Charger via Convex
  const phaseData = useQuery(
    api.tournamentPhases.getById,
    phaseId && phaseId !== 'default' ? { phaseId } : "skip"
  );
  const registrationsData = useQuery(
    api.tournamentRegistrations.listByTournament,
    tournamentId ? { tournamentId } : "skip"
  );

  const loading = (phaseId !== 'default' && phaseData === undefined) || registrationsData === undefined;

  // Initialiser les données
  useEffect(() => {
    if (phaseId === 'default') {
      setPhase({
        _id: 'default',
        name: 'Playoffs',
        type: tournament?.bracketType || 'double_elimination',
      });
    } else if (phaseData) {
      setPhase(phaseData);
    }
  }, [phaseId, phaseData, tournament]);

  useEffect(() => {
    if (registrationsData) {
      setParticipants(registrationsData);
      
      // Initialize empty seeds based on tournament size
      const emptySeeds = Array.from({ length: tournamentSize }, (_, i) => ({
        id: `seed-${i + 1}`,
        seedNumber: i + 1,
        participantId: null,
      }));
      setSeeds(emptySeeds);
    }
  }, [registrationsData, tournamentSize]);

  const handleDragStart = (participant) => {
    setDraggedParticipant(participant);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (seedIndex) => {
    if (!draggedParticipant) return;

    setSeeds(prev => {
      const updated = [...prev];
      // Remove participant from any existing seed
      updated.forEach(s => {
        if (s.participantId === draggedParticipant._id) {
          s.participantId = null;
        }
      });
      // Assign to new seed
      updated[seedIndex].participantId = draggedParticipant._id;
      return updated;
    });
    setDraggedParticipant(null);
  };

  const handleAddToSeed = (participantId, seedIndex) => {
    setSeeds(prev => {
      const updated = [...prev];
      // Remove from existing seed
      updated.forEach(s => {
        if (s.participantId === participantId) {
          s.participantId = null;
        }
      });
      // Add to new seed
      updated[seedIndex].participantId = participantId;
      return updated;
    });
  };

  const handleRemoveFromSeed = (seedIndex) => {
    setSeeds(prev => {
      const updated = [...prev];
      updated[seedIndex].participantId = null;
      return updated;
    });
  };

  const handleRandomize = () => {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    setSeeds(prev => {
      const updated = [...prev];
      updated.forEach((seed, i) => {
        seed.participantId = shuffled[i]?._id || null;
      });
      return updated;
    });
    toast.success('Placement aléatoire effectué');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Migrate bracket_slots to Convex
      // For now, just show success - seeding is kept in local state
      toast.success('Placement enregistré (sauvegarde locale)');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const getParticipantById = (id) => participants.find(p => p._id === id);
  const getPlacedParticipantIds = () => seeds.filter(s => s.participantId).map(s => s.participantId);
  const unplacedParticipants = participants.filter(p => !getPlacedParticipantIds().includes(p._id));

  // Generate bracket visualization
  const generateBracketRounds = () => {
    const type = phase?.type || 'double_elimination';
    const size = tournamentSize;
    
    if (type === 'double_elimination') {
      // Winners bracket
      const wbRounds = Math.ceil(Math.log2(size));
      const wb = [];
      for (let i = 0; i < wbRounds; i++) {
        wb.push({ name: i === wbRounds - 1 ? 'WB Final' : `WB Round ${i + 1}` });
      }
      
      // Losers bracket
      const lbRounds = Math.max(1, wbRounds - 1);
      const lb = [];
      for (let i = 0; i < lbRounds; i++) {
        lb.push({ name: i === lbRounds - 1 ? 'LB Final' : `LB Round ${i + 1}` });
      }
      
      // Grand Final
      const gf = [{ name: 'GF Round 1' }];
      
      return { wb, lb, gf };
    }
    
    return { wb: [], lb: [], gf: [] };
  };

  const bracketRounds = generateBracketRounds();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link 
          to={`/organizer/tournament/${tournamentId}/placement`}
          className="hover:text-cyan"
        >
          Placement
        </Link>
        <span>/</span>
      </div>

      {/* Header */}
      <h1 className="text-2xl font-display font-bold text-white mb-6">
        {phase?.name || 'Playoffs'}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Placement List */}
        <div className="lg:col-span-1">
          <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                Placement
                <span className="text-gray-500 text-xs">ℹ️</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast.info('Ajouter un participant')}
                  className="text-cyan hover:text-cyan/80 text-sm"
                >
                  + Ajouter
                </button>
                <button
                  onClick={handleRandomize}
                  className="text-gray-400 hover:text-white"
                  title="Mélanger"
                >
                  🔀
                </button>
                <button className="text-gray-400 hover:text-white">
                  ⋮
                </button>
              </div>
            </div>

            {/* Seeds Table */}
            <div className="border-t border-white/10">
              <div className="grid grid-cols-[40px_1fr] gap-2 py-2 text-sm text-gray-400 border-b border-white/5">
                <span>#</span>
                <span>Nom</span>
              </div>
              
              {seeds.map((seed, index) => {
                const participant = seed.participant_id ? getParticipantById(seed.participant_id) : null;
                return (
                  <div
                    key={seed.id}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className="grid grid-cols-[40px_1fr] gap-2 py-2 items-center border-b border-white/5 hover:bg-white/5"
                  >
                    <span className="text-gray-500">{index + 1}</span>
                    {participant ? (
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm">
                          {participant.team?.name || participant.name}
                        </span>
                        <button
                          onClick={() => handleRemoveFromSeed(index)}
                          className="text-gray-500 hover:text-red-400 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (unplacedParticipants.length > 0) {
                            handleAddToSeed(unplacedParticipants[0].id, index);
                          }
                        }}
                        className="text-cyan hover:text-cyan/80 text-sm text-left"
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Unplaced Participants */}
            {unplacedParticipants.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400 mb-2">Non placés :</p>
                <div className="space-y-1">
                  {unplacedParticipants.map(p => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => handleDragStart(p)}
                      className="p-2 bg-[#1a1d2e] rounded text-sm text-white cursor-move hover:bg-white/10"
                    >
                      {p.team?.name || p.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Bracket Preview */}
        <div className="lg:col-span-2">
          <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-4 overflow-x-auto">
            <h2 className="font-semibold text-white mb-4">
              {phase?.type === 'double_elimination' ? 'Double élimination' : 'Bracket'}
            </h2>

            {/* Winners Bracket */}
            <div className="mb-6">
              <div className="flex gap-4 mb-2">
                {bracketRounds.wb.map((round, i) => (
                  <div key={i} className="w-28 text-center">
                    <span className="px-3 py-1 bg-[#1a1d2e] rounded text-sm text-gray-300">
                      {round.name}
                    </span>
                  </div>
                ))}
                {bracketRounds.gf.map((round, i) => (
                  <div key={`gf-${i}`} className="w-28 text-center">
                    <span className="px-3 py-1 bg-[#1a1d2e] rounded text-sm text-gray-300">
                      {round.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Match boxes - simplified visualization */}
              <div className="flex gap-4 items-start">
                {/* Round 1 */}
                <div className="space-y-2">
                  {Array.from({ length: Math.ceil(tournamentSize / 2) }).map((_, i) => (
                    <div key={i} className="w-28 border border-white/10 rounded bg-[#1a1d2e]">
                      <div className="px-2 py-1 text-xs text-gray-400 border-b border-white/5 flex justify-between">
                        <span>+ (#{ i * 2 + 1})</span>
                        <span>🔒</span>
                      </div>
                      <div className="px-2 py-1 text-xs text-gray-400 flex justify-between">
                        <span>+ (#{i * 2 + 2})</span>
                        <span>🔒</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Later rounds - empty boxes */}
                {bracketRounds.wb.slice(1).map((_, roundIdx) => (
                  <div key={roundIdx} className="space-y-4 pt-4">
                    {Array.from({ length: Math.ceil(tournamentSize / Math.pow(2, roundIdx + 2)) }).map((_, i) => (
                      <div key={i} className="w-28 h-14 border border-white/10 rounded bg-[#1a1d2e]" />
                    ))}
                  </div>
                ))}

                {/* Grand Final */}
                <div className="pt-8">
                  <div className="w-28 h-14 border border-white/10 rounded bg-[#1a1d2e]" />
                </div>
              </div>
            </div>

            {/* Losers Bracket */}
            {phase?.type === 'double_elimination' && (
              <>
                <div className="flex gap-4 mb-2 mt-8">
                  {bracketRounds.lb.map((round, i) => (
                    <div key={i} className="w-28 text-center">
                      <span className="px-3 py-1 bg-[#1a1d2e] rounded text-sm text-gray-300">
                        {round.name}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 items-start">
                  {bracketRounds.lb.map((_, roundIdx) => (
                    <div key={roundIdx} className="space-y-2">
                      {Array.from({ length: Math.max(1, Math.ceil(tournamentSize / Math.pow(2, roundIdx + 2))) }).map((_, i) => (
                        <div key={i} className="w-28 h-14 border border-white/10 rounded bg-[#1a1d2e]" />
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-center mt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-cyan hover:bg-cyan/90 text-white px-8"
        >
          {saving ? 'Enregistrement...' : '✓ Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
