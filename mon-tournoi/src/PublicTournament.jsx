import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { calculateMatchWinner } from './bofUtils';
import CommentSection from './components/CommentSection';
import DashboardLayout from './layouts/DashboardLayout';
import { useTournament, useAuth } from './shared/hooks';

// Import des nouveaux composants refactorisés
import { 
  TournamentHeader, 
  TournamentTabs, 
  TournamentOverview,
  TournamentFooter,
  ParticipantsList,
  BracketTab,
  ScheduleTab,
  ResultsTab,
  defaultTabs 
} from './components/tournament';
import { TournamentPageSkeleton } from './components/ui/Skeletons';

export default function PublicTournament() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Utiliser les hooks pour la session et le tournoi
  const { session } = useAuth();
  
  // Utiliser le hook useTournament pour charger les données principales
  const {
    tournament: tournoi,
    participants,
    matches: rawMatches,
    swissScores,
    loading,
    error: _error,
    refetch,
  } = useTournament(id, {
    enabled: !!id,
    subscribe: true,
    currentUserId: session?.user?.id,
  });
  
  // États supplémentaires
  const [matchGames, setMatchGames] = useState([]); // Pour Best-of-X
  const [activeTab, setActiveTab] = useState('overview');

  // Enrichir les matchs avec les informations des participants (noms, logos)
  const matches = useMemo(() => {
    if (!rawMatches || !participants || rawMatches.length === 0) return [];
    
    const participantsMap = new Map(participants.map(p => [p.team_id, p]));
    
    return rawMatches.map(match => {
      const p1 = match.player1_id ? participantsMap.get(match.player1_id) : null;
      const p2 = match.player2_id ? participantsMap.get(match.player2_id) : null;
      
      const getTeamName = (p) => p ? `${p.teams?.name || 'Inconnu'} [${p.teams?.tag || '?'}]` : 'En attente';
      const getTeamLogo = (p) => p?.teams?.logo_url || `https://ui-avatars.com/api/?name=${p?.teams?.tag || '?'}&background=random&size=64`;

      return {
        ...match,
        p1_name: match.player1_id ? getTeamName(p1) : 'En attente',
        p1_avatar: getTeamLogo(p1),
        p2_name: match.player2_id ? getTeamName(p2) : 'En attente',
        p2_avatar: getTeamLogo(p2),
      };
    });
  }, [rawMatches, participants]);

  // Charger les manches pour Best-of-X
  const loadMatchGames = useCallback(async () => {
    if (!id || !tournoi?.best_of || tournoi.best_of <= 1 || !matches || matches.length === 0) {
      setMatchGames([]);
      return;
    }

    try {
      const matchIds = matches.map(m => m.id);
      if (matchIds.length === 0) {
        setMatchGames([]);
        return;
      }

      const { data: gamesData, error: gamesError } = await supabase
        .from('match_games')
        .select('*')
        .in('match_id', matchIds)
        .order('match_id', { ascending: true })
        .order('game_number', { ascending: true });
      
      if (gamesError) {
        console.warn('Erreur récupération manches:', gamesError);
        setMatchGames([]);
      } else {
        setMatchGames(gamesData || []);
      }
    } catch (_error) {
      console.warn('Erreur récupération manches:', _error);
      setMatchGames([]);
    }
  }, [id, tournoi, matches]);

  // Charger les manches quand les matchs changent
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMatchGames();
  }, [loadMatchGames]);

  // Realtime pour match_games seulement (les autres sont gérés par useTournament)
  useEffect(() => {
    if (!id || !tournoi?.best_of || tournoi.best_of <= 1 || !matches || matches.length === 0) return;

    const matchIds = matches.map(m => m.id).filter(Boolean);
    if (matchIds.length === 0) return;

    const channel = supabase.channel(`public-tournament-match-games-${id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'match_games'
      }, 
      (payload) => {
        // Vérifier si la manche appartient à un match de ce tournoi
        if (payload.new && matchIds.includes(payload.new.match_id)) {
          loadMatchGames();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, tournoi?.best_of, matches, loadMatchGames]);


  // Fonction helper pour obtenir le score Best-of-X d'un match en temps réel
  const getMatchBestOfScore = (match) => {
    if (!tournoi?.best_of || tournoi.best_of <= 1) {
      return { team1Wins: match.score_p1 || 0, team2Wins: match.score_p2 || 0, completedGames: 0, totalGames: 1 };
    }
    
    const matchGamesData = matchGames.filter(g => g.match_id === match.id);
    if (matchGamesData.length === 0) {
      return { team1Wins: 0, team2Wins: 0, completedGames: 0, totalGames: tournoi.best_of };
    }
    
    const result = calculateMatchWinner(matchGamesData, tournoi.best_of, match.player1_id, match.player2_id);
    const completedGames = matchGamesData.filter(g => g.status === 'completed').length;
    return { team1Wins: result.team1Wins, team2Wins: result.team2Wins, completedGames, totalGames: tournoi.best_of };
  };

  // Composant réutilisable pour afficher un match dans l'arbre
  const MatchCard = ({ match }) => {
    const isCompleted = match.status === 'completed';
    const isScheduled = match.scheduled_at && !isCompleted;
    const isBestOf = tournoi?.best_of > 1;
    
    // Calculer les scores en temps réel pour Best-of-X
    const bestOfScore = isBestOf ? getMatchBestOfScore(match) : null;
    const displayScore1 = isBestOf && bestOfScore ? bestOfScore.team1Wins : (match.score_p1 || 0);
    const displayScore2 = isBestOf && bestOfScore ? bestOfScore.team2Wins : (match.score_p2 || 0);
    const isTeam1Winning = displayScore1 > displayScore2;
    const isTeam2Winning = displayScore2 > displayScore1;
    
    // Récupérer les manches pour Best-of-X
    const matchGamesData = isBestOf ? matchGames.filter(g => g.match_id === match.id) : [];
    const completedGames = matchGamesData.filter(g => g.status === 'completed');
    
    return (
      <div style={{
        width: isBestOf ? '300px' : '260px',
        background: 'rgba(3, 9, 19, 0.95)',
        border: isCompleted ? '2px solid #8B5CF6' : (isScheduled ? '2px solid #06B6D4' : '2px solid #8B5CF6'),
        borderRadius: '12px',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
        overflow: 'hidden'
      }}>
        {/* Badge Best-of-X */}
        {isBestOf && (
          <div style={{
            position: 'absolute',
            top: '5px',
            left: '5px',
            background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
            color: '#F8F6F2',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(139, 92, 246, 0.5)',
            fontFamily: "'Protest Riot', sans-serif"
          }}>
            🎮 Bo{tournoi.best_of}
          </div>
        )}
        
        {/* Badge Date planifiée */}
        {isScheduled && (
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            background: '#06B6D4',
            color: '#F8F6F2',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            zIndex: 10,
            fontFamily: "'Protest Riot', sans-serif"
          }}>
            📅 {new Date(match.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        
        {/* JOUEUR 1 */}
        <div style={{
          padding: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isTeam1Winning ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
          borderRadius: '12px 12px 0 0',
          paddingTop: isBestOf ? '25px' : '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            {match.player1_id && (
              <img 
                src={match.p1_avatar} 
                style={{
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '2px solid #06B6D4', 
                  flexShrink: 0
                }} 
                alt="" 
              />
            )}
            <span style={{
              color: match.player1_id ? '#F8F6F2' : '#06B6D4',
              fontWeight: isTeam1Winning ? 'bold' : 'normal',
              fontSize: '0.9rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: "'Protest Riot', sans-serif"
            }}>
              {match.p1_name.split(' [')[0]}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '10px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#06B6D4', fontFamily: "'Shadows Into Light', cursive" }}>
              {displayScore1 || '-'}
            </span>
            {isBestOf && bestOfScore && (
              <span style={{ fontSize: '0.65rem', color: '#F8F6F2', marginTop: '2px', fontFamily: "'Protest Riot', sans-serif" }}>
                {bestOfScore.completedGames}/{bestOfScore.totalGames}
              </span>
            )}
          </div>
        </div>
        
        <div style={{ height: '2px', background: '#06B6D4' }}></div>
        
        {/* JOUEUR 2 */}
        <div style={{
          padding: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isTeam2Winning ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
          borderRadius: '0 0 12px 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            {match.player2_id && (
              <img 
                src={match.p2_avatar} 
                style={{
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '2px solid #06B6D4', 
                  flexShrink: 0
                }} 
                alt="" 
              />
            )}
            <span style={{
              color: match.player2_id ? '#F8F6F2' : '#06B6D4',
              fontWeight: isTeam2Winning ? 'bold' : 'normal',
              fontSize: '0.9rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: "'Protest Riot', sans-serif"
            }}>
              {match.p2_name.split(' [')[0]}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '10px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#06B6D4', fontFamily: "'Shadows Into Light', cursive" }}>
              {displayScore2 || '-'}
            </span>
            {isBestOf && bestOfScore && (
              <span style={{ fontSize: '0.65rem', color: '#F8F6F2', marginTop: '2px', fontFamily: "'Protest Riot', sans-serif" }}>
                {bestOfScore.completedGames}/{bestOfScore.totalGames}
              </span>
            )}
          </div>
        </div>
        
        {/* Section Manches Best-of-X */}
        {isBestOf && completedGames.length > 0 && (
          <div style={{
            padding: '10px',
            background: 'rgba(3, 9, 19, 0.8)',
            borderTop: '2px solid #06B6D4',
            fontSize: '0.75rem'
          }}>
            <div style={{ 
              color: '#06B6D4', 
              marginBottom: '6px', 
              fontSize: '0.7rem',
              fontFamily: "'Protest Riot', sans-serif"
            }}>
              📊 Manches terminées:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {completedGames
                .sort((a, b) => a.game_number - b.game_number)
                .map((game) => (
                  <div 
                    key={game.id} 
                    style={{
                      background: 'rgba(3, 9, 19, 0.9)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #8B5CF6',
                      fontSize: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: "'Protest Riot', sans-serif"
                    }}
                  >
                    <span style={{ color: '#06B6D4' }}>#{game.game_number}</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: game.team1_score > game.team2_score ? '#06B6D4' : '#F8F6F2' 
                    }}>
                      {game.team1_score}
                    </span>
                    <span style={{ color: '#8B5CF6' }}>-</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: game.team2_score > game.team1_score ? '#06B6D4' : '#F8F6F2' 
                    }}>
                      {game.team2_score}
                    </span>
                    {game.map_name && (
                      <span style={{ color: '#06B6D4', fontSize: '0.6rem', marginLeft: '2px' }}>
                        🗺️ {game.map_name}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Calcul du classement pour Round Robin
  const getStandings = () => {
    if (!participants || !matches) return [];

    const stats = participants.map(p => ({
      ...p,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      goalDiff: 0
    }));

    matches.forEach(m => {
      if (m.status !== 'completed') return;

      const p1Index = stats.findIndex(p => p.team_id === m.player1_id);
      const p2Index = stats.findIndex(p => p.team_id === m.player2_id);

      if (p1Index === -1 || p2Index === -1) return;

      stats[p1Index].played++;
      stats[p2Index].played++;

      const diff = (m.score_p1 || 0) - (m.score_p2 || 0);
      stats[p1Index].goalDiff += diff;
      stats[p2Index].goalDiff -= diff;

      if ((m.score_p1 || 0) > (m.score_p2 || 0)) {
        stats[p1Index].wins++;
        stats[p1Index].points += 3;
        stats[p2Index].losses++;
      } else if ((m.score_p2 || 0) > (m.score_p1 || 0)) {
        stats[p2Index].wins++;
        stats[p2Index].points += 3;
        stats[p1Index].losses++;
      } else {
        stats[p1Index].draws++;
        stats[p1Index].points += 1;
        stats[p2Index].draws++;
        stats[p2Index].points += 1;
      }
    });

    return stats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.goalDiff - a.goalDiff;
    });
  };

  // État de chargement
  if (loading || !tournoi) {
    return (
      <DashboardLayout session={session}>
        <TournamentPageSkeleton />
      </DashboardLayout>
    );
  }
  
  // Tournoi introuvable
  if (!tournoi) return (
    <DashboardLayout session={session}>
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white font-display">
        <div className="text-center">
          <div className="text-5xl mb-5">❌</div>
          <p className="text-xl text-pink-400">Tournoi introuvable</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-5 px-8 py-3 bg-violet-600 border-2 border-violet-400 text-white rounded-lg cursor-pointer font-handwriting text-base uppercase tracking-wider transition-all duration-300 hover:bg-violet-500 hover:border-violet-300 hover:-translate-y-0.5"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </DashboardLayout>
  );

  const winnerMatch = matches.find(m => m.round_number === Math.max(...matches.map(m => m.round_number), 0) && m.status === 'completed');
  const winnerName = winnerMatch ? (winnerMatch.score_p1 > winnerMatch.score_p2 ? winnerMatch.p1_name : winnerMatch.p2_name) : null;

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-7xl mx-auto">
        {/* HEADER + BANNIÈRE VAINQUEUR */}
        <TournamentHeader
          tournoi={tournoi}
          session={session}
          tournamentId={id}
          winnerName={winnerName}
        />

        {/* ONGLETS */}
        <TournamentTabs
          tabs={defaultTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

      {/* CONTENU DES ONGLETS */}
      <div style={{ minHeight: '400px' }}>
        
        {/* ONGLET PRÉSENTATION */}
        {activeTab === 'overview' && (
          <TournamentOverview
            tournoi={tournoi}
            participants={participants}
            matches={matches}
            session={session}
            tournamentId={id}
            onRefetch={refetch}
          />
        )}

        {/* ONGLET PARTICIPANTS */}
        {activeTab === 'participants' && (
          <ParticipantsList participants={participants} tournamentId={id} />
        )}

        {/* ONGLET ARBRE / CLASSEMENT */}
        {activeTab === 'bracket' && (
          <BracketTab 
            tournoi={tournoi} 
            matches={matches} 
            swissScores={swissScores}
            participants={participants}
            getStandings={getStandings}
          />
        )}

        {/* ONGLET PLANNING */}
        {activeTab === 'schedule' && (
          <ScheduleTab matches={matches} />
        )}

        {/* ONGLET COMMENTAIRES */}
        {activeTab === 'comments' && (
          <CommentSection tournamentId={id} session={session} />
        )}

        {/* ONGLET RÉSULTATS */}
        {activeTab === 'results' && (
          <ResultsTab matches={matches} />
        )}
      </div>

      {/* FOOTER */}
      <TournamentFooter />
      </div>
    </DashboardLayout>
  );
}

