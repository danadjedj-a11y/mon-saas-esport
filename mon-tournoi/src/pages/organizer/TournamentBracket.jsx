import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import clsx from 'clsx';

/**
 * TournamentBracket - Page principale pour voir/gérer les brackets du tournoi
 */
export default function TournamentBracket() {
  const { tournament, phases } = useOutletContext();
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [matches, setMatches] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Utiliser toutes les phases disponibles
  const allPhases = phases || [];

  useEffect(() => {
    if (allPhases.length > 0 && !selectedPhase) {
      setSelectedPhase(allPhases[0]);
    }
  }, [allPhases]);

  // Charger les matchs et participants
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Si une phase est sélectionnée, charger ses matchs, sinon tous les matchs du tournoi
        const matchQuery = selectedPhase
          ? supabase
              .from('matches')
              .select('*')
              .eq('phase_id', selectedPhase.id)
              .order('round_number', { ascending: true })
              .order('match_order', { ascending: true })
          : supabase
              .from('matches')
              .select('*')
              .eq('tournament_id', tournamentId)
              .order('round_number', { ascending: true })
              .order('match_order', { ascending: true });

        const [matchesRes, participantsRes] = await Promise.all([
          matchQuery,
          supabase
            .from('participants')
            .select('*')
            .eq('tournament_id', tournamentId)
        ]);

        setMatches(matchesRes.data || []);
        setParticipants(participantsRes.data || []);
      } catch (error) {
        console.error('Erreur chargement bracket:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPhase, tournamentId]);

  // Grouper les matchs par round
  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.round_number || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  const getParticipantName = (id) => {
    if (!id) return 'TBD';
    const p = participants.find(p => p.id === id);
    return p?.team_name || p?.name || 'TBD';
  };

  const getRoundName = (roundNum, totalRounds) => {
    const remaining = totalRounds - roundNum + 1;
    if (remaining === 1) return 'Finale';
    if (remaining === 2) return 'Demi-finales';
    if (remaining === 3) return 'Quarts de finale';
    return `Round ${roundNum}`;
  };

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Tournoi non trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Bracket</h1>
          <p className="text-gray-400 text-sm mt-1">
            Visualisez et gérez l'arbre de tournoi
          </p>
        </div>
        
        <div className="flex gap-2">
          {selectedPhase && (
            <button
              onClick={() => navigate(`/organizer/tournament/${tournamentId}/structure/${selectedPhase.id}/bracket`)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <span>✏️</span>
              <span>Éditer le bracket</span>
            </button>
          )}
          <button
            onClick={() => navigate(`/organizer/tournament/${tournamentId}/matches`)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span>📋</span>
            <span>Liste des matchs</span>
          </button>
        </div>
      </div>

      {/* Sélecteur de phase */}
      {allPhases.length > 0 && (
        <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-lg w-fit">
          <button
            onClick={() => setSelectedPhase(null)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              !selectedPhase
                ? 'bg-cyan-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            Tous les matchs
          </button>
          {allPhases.map((phase, idx) => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedPhase?.id === phase.id
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              {phase.name || `Phase ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Contenu principal */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <NoMatchesYet tournamentId={tournamentId} navigate={navigate} />
      ) : (
        /* Bracket Visualization */
        <div className="bg-[#161b22] rounded-xl border border-white/10 p-6 overflow-x-auto">
          <div className="flex gap-8 min-w-max">
            {rounds.map((roundNum) => (
              <div key={roundNum} className="flex flex-col gap-4">
                {/* Round Header */}
                <div className="text-center pb-3 border-b border-white/10">
                  <h3 className="text-sm font-medium text-white">
                    {getRoundName(roundNum, rounds.length)}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {matchesByRound[roundNum].length} match{matchesByRound[roundNum].length > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Matches */}
                <div className="flex flex-col gap-4" style={{ justifyContent: 'space-around', minHeight: '300px' }}>
                  {matchesByRound[roundNum].map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      getParticipantName={getParticipantName}
                      onClick={() => navigate(`/organizer/tournament/${tournamentId}/matches/${match.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats rapides */}
      {matches.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            label="Total matchs" 
            value={matches.length} 
            icon="⚔️" 
          />
          <StatCard 
            label="Matchs joués" 
            value={matches.filter(m => m.status === 'completed').length} 
            icon="✅" 
          />
          <StatCard 
            label="En attente" 
            value={matches.filter(m => m.status === 'pending' || !m.status).length} 
            icon="⏳" 
          />
          <StatCard 
            label="Rounds" 
            value={rounds.length} 
            icon="🔄" 
          />
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, getParticipantName, onClick }) {
  const isCompleted = match.status === 'completed';
  const isLive = match.status === 'ongoing' || match.status === 'in_progress';
  
  const p1Name = getParticipantName(match.player1_id);
  const p2Name = getParticipantName(match.player2_id);
  
  const p1Won = isCompleted && match.winner_id === match.player1_id;
  const p2Won = isCompleted && match.winner_id === match.player2_id;

  return (
    <div 
      onClick={onClick}
      className={clsx(
        'w-56 bg-[#0d1117] rounded-lg border overflow-hidden cursor-pointer transition-all hover:border-cyan-500/50',
        isLive ? 'border-green-500/50' : 'border-white/10'
      )}
    >
      {/* Match number */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5">
        <span className="text-xs text-gray-500">Match #{match.match_order || match.id?.slice(0, 4)}</span>
        {isLive && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live
          </span>
        )}
        {isCompleted && (
          <span className="text-xs text-gray-500">Terminé</span>
        )}
      </div>

      {/* Player 1 */}
      <div className={clsx(
        'flex items-center justify-between px-3 py-2 border-b border-white/5',
        p1Won && 'bg-green-500/10'
      )}>
        <span className={clsx(
          'text-sm truncate',
          p1Won ? 'text-white font-medium' : 'text-gray-400'
        )}>
          {p1Name}
        </span>
        <span className={clsx(
          'text-sm font-mono',
          p1Won ? 'text-green-400' : 'text-gray-500'
        )}>
          {match.score_p1 ?? '-'}
        </span>
      </div>

      {/* Player 2 */}
      <div className={clsx(
        'flex items-center justify-between px-3 py-2',
        p2Won && 'bg-green-500/10'
      )}>
        <span className={clsx(
          'text-sm truncate',
          p2Won ? 'text-white font-medium' : 'text-gray-400'
        )}>
          {p2Name}
        </span>
        <span className={clsx(
          'text-sm font-mono',
          p2Won ? 'text-green-400' : 'text-gray-500'
        )}>
          {match.score_p2 ?? '-'}
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-[#161b22] rounded-xl border border-white/10 p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function NoMatchesYet({ tournamentId, navigate }) {
  return (
    <div className="bg-[#161b22] rounded-xl border border-white/10 p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl mx-auto mb-4">
        ⚔️
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Aucun match généré</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
        Les matchs n'ont pas encore été générés. Configurez la structure de votre tournoi 
        et générez les matchs pour voir le bracket.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/structure`)}
          className="px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Configurer la structure
        </button>
        <button
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/matches`)}
          className="px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
        >
          Voir les matchs
        </button>
      </div>
    </div>
  );
}
