import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';

export default function MatchesPhase() {
  const { id: tournamentId, phaseId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [phase, setPhase] = useState(null);
  const [matches, setMatches] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  const tournamentSize = tournament?.max_participants || tournament?.size || 4;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, phaseId]);

  const fetchData = async () => {
    try {
      // Fetch phase
      if (phaseId !== 'default') {
        const { data: phaseData } = await supabase
          .from('tournament_phases')
          .select('*')
          .eq('id', phaseId)
          .single();
        setPhase(phaseData);
      } else {
        setPhase({
          id: 'default',
          name: 'Playoffs',
          type: tournament?.bracket_type || 'double_elimination',
        });
      }

      // Fetch matches for this phase
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          participant1:team1_id (id, name, logo_url),
          participant2:team2_id (id, name, logo_url)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      setMatches(matchesData || []);

      // Fetch participants
      const { data: participantsData } = await supabase
        .from('participants')
        .select(`
          *,
          team:team_id (id, name, logo_url)
        `)
        .eq('tournament_id', tournamentId);

      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate bracket structure for visualization
  const generateBracketStructure = () => {
    const type = phase?.type || 'double_elimination';
    const numRounds = Math.ceil(Math.log2(tournamentSize));
    
    // Winners Bracket
    const winnersRounds = [];
    for (let round = 1; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round);
      const roundName = round === numRounds ? 'WB Final' : `WB Round ${round}`;
      
      const roundMatches = [];
      for (let m = 0; m < matchesInRound; m++) {
        // Find actual match or create placeholder
        const actualMatch = matches.find(
          match => match.round === round && 
                   match.match_number === m + 1 && 
                   match.bracket_type !== 'losers'
        );
        
        roundMatches.push({
          id: actualMatch?.id || `wb-${round}-${m}`,
          name: `WB ${round}.${m + 1}`,
          participant1: actualMatch?.participant1 || null,
          participant2: actualMatch?.participant2 || null,
          score1: actualMatch?.team1_score,
          score2: actualMatch?.team2_score,
          status: actualMatch?.status || 'pending',
          seed1: round === 1 ? m * 2 + 1 : null,
          seed2: round === 1 ? m * 2 + 2 : null,
        });
      }
      
      winnersRounds.push({ name: roundName, matches: roundMatches });
    }

    // Losers Bracket (for double elimination)
    const losersRounds = [];
    if (type === 'double_elimination') {
      const numLosersRounds = (numRounds - 1) * 2;
      
      for (let round = 1; round <= Math.min(numLosersRounds, 4); round++) {
        const roundName = round === numLosersRounds ? 'LB Final' : `LB Round ${round}`;
        const matchesInRound = Math.max(1, Math.ceil(tournamentSize / Math.pow(2, Math.ceil(round / 2) + 1)));
        
        const roundMatches = [];
        for (let m = 0; m < matchesInRound; m++) {
          const actualMatch = matches.find(
            match => match.round === round && 
                     match.match_number === m + 1 && 
                     match.bracket_type === 'losers'
          );
          
          roundMatches.push({
            id: actualMatch?.id || `lb-${round}-${m}`,
            name: `LB ${round}.${m + 1}`,
            participant1: actualMatch?.participant1 || null,
            participant2: actualMatch?.participant2 || null,
            score1: actualMatch?.team1_score,
            score2: actualMatch?.team2_score,
            status: actualMatch?.status || 'pending',
          });
        }
        
        losersRounds.push({ name: roundName, matches: roundMatches });
      }
    }

    // Grand Final
    const grandFinal = [{
      name: 'GF Round 1',
      matches: [{
        id: 'gf-1',
        name: 'Grand Final',
        participant1: null,
        participant2: null,
        status: 'pending',
      }],
    }];

    return { winnersRounds, losersRounds, grandFinal };
  };

  const bracket = generateBracketStructure();

  const getSeedLabel = (seed) => {
    if (!seed) return null;
    const participant = participants.find((_, i) => i + 1 === seed);
    if (participant) {
      return participant.team?.name || participant.name;
    }
    return `Seed ${seed}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link 
          to={`/organizer/tournament/${tournamentId}/matches`}
          className="hover:text-cyan"
        >
          Matchs
        </Link>
        <span>/</span>
      </div>

      {/* Header */}
      <h1 className="text-2xl font-display font-bold text-white mb-6">
        {phase?.name || 'Playoffs'}
      </h1>

      {/* Bracket View */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-white mb-6">
          {phase?.type === 'double_elimination' ? 'Double élimination' : 'Bracket'}
        </h2>

        {/* Winners Bracket */}
        <div className="mb-8">
          {/* Round Headers */}
          <div className="flex gap-8 mb-4">
            {bracket.winnersRounds.map((round, i) => (
              <div key={i} className="w-36 text-center">
                <span className="px-4 py-2 bg-[#1a1d2e] rounded-lg text-sm text-gray-300 inline-block">
                  {round.name}
                </span>
              </div>
            ))}
            {bracket.grandFinal.map((round, i) => (
              <div key={`gf-${i}`} className="w-36 text-center">
                <span className="px-4 py-2 bg-[#1a1d2e] rounded-lg text-sm text-gray-300 inline-block">
                  {round.name}
                </span>
              </div>
            ))}
          </div>

          {/* Match Boxes */}
          <div className="flex gap-8 items-start">
            {bracket.winnersRounds.map((round, roundIdx) => (
              <div 
                key={roundIdx} 
                className="space-y-4"
                style={{ paddingTop: roundIdx > 0 ? `${Math.pow(2, roundIdx) * 16}px` : 0 }}
              >
                {round.matches.map((match, _matchIdx) => (
                  <div
                    key={match.id}
                    onClick={() => match.id && !match.id.startsWith('wb-') && navigate(`/organizer/tournament/${tournamentId}/matches/${match.id}`)}
                    className="w-36 border border-white/20 rounded-lg bg-[#1a1d2e] overflow-hidden cursor-pointer hover:border-cyan/50 transition-colors"
                    style={{ marginBottom: roundIdx > 0 ? `${Math.pow(2, roundIdx) * 32 - 16}px` : 0 }}
                  >
                    {/* Match Name */}
                    <div className="px-2 py-1 bg-white/5 border-b border-white/10">
                      <span className="text-xs text-gray-500">{match.name}</span>
                    </div>
                    
                    {/* Participant 1 */}
                    <div className="px-2 py-2 border-b border-white/5 flex justify-between items-center">
                      <span className="text-sm text-white truncate">
                        {match.participant1?.name || 
                         (match.seed1 ? getSeedLabel(match.seed1) : 'Gagnant WB')}
                      </span>
                      {match.score1 !== null && match.score1 !== undefined && (
                        <span className="text-sm font-bold text-cyan">{match.score1}</span>
                      )}
                    </div>
                    
                    {/* Participant 2 */}
                    <div className="px-2 py-2 flex justify-between items-center">
                      <span className="text-sm text-white truncate">
                        {match.participant2?.name || 
                         (match.seed2 ? getSeedLabel(match.seed2) : 'Gagnant LB')}
                      </span>
                      {match.score2 !== null && match.score2 !== undefined && (
                        <span className="text-sm font-bold text-cyan">{match.score2}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Grand Final */}
            <div className="pt-16">
              {bracket.grandFinal[0].matches.map((match) => (
                <div
                  key={match.id}
                  className="w-36 border-2 border-yellow-500/50 rounded-lg bg-[#1a1d2e] overflow-hidden"
                >
                  <div className="px-2 py-1 bg-yellow-500/10 border-b border-yellow-500/20">
                    <span className="text-xs text-yellow-400">{match.name}</span>
                  </div>
                  <div className="px-2 py-2 border-b border-white/5">
                    <span className="text-sm text-gray-400">Gagnant WB Fi...</span>
                  </div>
                  <div className="px-2 py-2">
                    <span className="text-sm text-gray-400">Gagnant LB Final</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Losers Bracket */}
        {phase?.type === 'double_elimination' && bracket.losersRounds.length > 0 && (
          <div className="mt-8 pt-8 border-t border-white/10">
            {/* Round Headers */}
            <div className="flex gap-8 mb-4">
              {bracket.losersRounds.map((round, i) => (
                <div key={i} className="w-36 text-center">
                  <span className="px-4 py-2 bg-[#1a1d2e] rounded-lg text-sm text-gray-300 inline-block">
                    {round.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Match Boxes */}
            <div className="flex gap-8 items-start">
              {bracket.losersRounds.map((round, roundIdx) => (
                <div 
                  key={roundIdx} 
                  className="space-y-4"
                  style={{ paddingTop: roundIdx > 0 ? `${roundIdx * 20}px` : 0 }}
                >
                  {round.matches.map((match) => (
                    <div
                      key={match.id}
                      className="w-36 border border-white/20 rounded-lg bg-[#1a1d2e] overflow-hidden cursor-pointer hover:border-cyan/50 transition-colors"
                    >
                      <div className="px-2 py-1 bg-white/5 border-b border-white/10">
                        <span className="text-xs text-gray-500">{match.name}</span>
                      </div>
                      <div className="px-2 py-2 border-b border-white/5">
                        <span className="text-sm text-gray-400">
                          {match.participant1?.name || 'Perdant WB...'}
                        </span>
                      </div>
                      <div className="px-2 py-2">
                        <span className="text-sm text-gray-400">
                          {match.participant2?.name || 'Perdant WB...'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
