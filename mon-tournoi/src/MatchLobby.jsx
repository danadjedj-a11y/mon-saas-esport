import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import Chat from './Chat';
import { notifyMatchResult, notifyScoreDispute, notifyOpponentScoreDeclared } from './notificationUtils';
import { updateSwissScores } from './swissUtils';
import { calculateMatchWinner } from './bofUtils';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import { useMatch } from './shared/hooks';
import { getPlatformForGame } from './utils/gamePlatforms';
import { GlassCard, NeonBadge, GradientButton } from './shared/components/ui';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

import {
  TeamDisplay,
  ScoreDisplay,
  MatchStatusBanner,
  SingleGameScoreForm,
  AdminConflictResolver,
  ProofSection,
  ScoreReportsHistory,
  GameRoundsList,
  AdminMatchDetails
} from './components/match';

/**
 * Floating particles for background effect (reused from PlayerDashboard)
 */
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-[#8B5CF6]/30 animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${5 + Math.random() * 10}s`,
            animationDelay: `${Math.random() * 5}s`
          }}
        />
      ))}
    </div>
  );
}

export default function MatchLobby({ session }) {
  const { id } = useParams();

  // Convex mutations
  const updateMatchMutation = useMutation(api.matchesMutations.updateScore);
  const updateMatchStatusMutation = useMutation(api.matchesMutations.updateStatus);
  
  // Convex queries for match games and vetos
  const matchGamesData = useQuery(api.matches.getById, id ? { matchId: id } : "skip");

  // Utiliser le hook useMatch pour charger le match principal
  const {
    match: rawMatch,
    loading: matchLoading,
    error: matchError,
    refetch: refetchMatch,
    myTeam: _myTeam,
    opponentTeam: _opponentTeam,
    isMyMatch: _isMyMatch,
  } = useMatch(id, {
    enabled: !!id,
    subscribe: true,
    myTeamId: null, // Sera déterminé plus tard
  });

  // États supplémentaires (non gérés par le hook)
  const [myTeamId, setMyTeamId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [_tournamentOwnerId, setTournamentOwnerId] = useState(null);
  const [tournamentFormat, setTournamentFormat] = useState(null);

  // États pour le score déclaré par MON équipe (pour single game)
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  // États pour l'upload de preuve
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState(null);

  // Historique des déclarations
  const [scoreReports, setScoreReports] = useState([]);

  // États pour Best-of-X
  const [tournamentBestOf, setTournamentBestOf] = useState(1);
  const [tournamentMapsPool, setTournamentMapsPool] = useState([]);
  const [matchGames, setMatchGames] = useState([]);
  const [vetos, setVetos] = useState([]);

  // États pour les comptes gaming
  const [team1GamingAccounts, setTeam1GamingAccounts] = useState({});
  const [team2GamingAccounts, setTeam2GamingAccounts] = useState({});
  const [tournamentGame, setTournamentGame] = useState(null);

  // Utiliser le match du hook, formaté pour compatibilité avec le code existant
  const match = useMemo(() => {
    if (!rawMatch) return null;

    // Le hook charge déjà player1 et player2 comme relations
    return {
      ...rawMatch,
      team1: rawMatch.player1 || null,
      team2: rawMatch.player2 || null,
    };
  }, [rawMatch]);

  // Charger les manches et vetos - now using Convex query data
  const loadMatchGamesAndVetos = useCallback(async () => {
    if (!id || !matchGamesData) return;
    try {
      // Use data from Convex query
      setMatchGames(matchGamesData.games || []);
      setVetos(matchGamesData.veto || []);
    } catch (error) {
      console.warn('Error loading match games/vetos:', error);
      setMatchGames([]);
      setVetos([]);
    }
  }, [id, matchGamesData]);

  // Identifier mon équipe et charger les données supplémentaires
  useEffect(() => {
    if (!match || !session?.user?.id) return;

    // Use the match hook's helper to identify team
    // The useMatch hook already provides isMyTeam1, isMyTeam2
    // For now, we'll use the team info from match data
    const identifyMyTeam = () => {
      // Check if user is in team1 via the match data
      const team1 = match.team1;
      const team2 = match.team2;
      
      // Compare using Clerk user ID if available, or check team captain
      const userId = session.user?.id;
      
      if (team1?.captainId === userId || team1?.members?.some(m => m.id === userId)) {
        setMyTeamId(match.team1Id || match.player1_id);
      } else if (team2?.captainId === userId || team2?.members?.some(m => m.id === userId)) {
        setMyTeamId(match.team2Id || match.player2_id);
      }
    };

    identifyMyTeam();

    // Récupérer les infos du tournoi
    const tournamentData = rawMatch?.tournament || rawMatch?.tournaments;
    const tournament = Array.isArray(tournamentData) ? tournamentData[0] : tournamentData;
    if (tournament) {
      setTournamentOwnerId(tournament.organizerId || tournament.owner_id);
      setIsAdmin(session?.user?.id === (tournament.organizerId || tournament.owner_id));
      setTournamentFormat(tournament.format);
      setTournamentBestOf(tournament.bestOf || tournament.best_of || 1);
      setTournamentMapsPool(tournament.mapsPool || tournament.maps_pool || []);

      // Charger les manches et vetos si Best-of-X
      if (tournament.best_of > 1) {
        loadMatchGamesAndVetos();
      }
    }

    // Initialiser les scores déclarés
    if (myTeamId && match) {
      const isTeam1 = myTeamId === match.player1_id;
      if (isTeam1 && match.reported_by_team1) {
        setMyScore(match.score_p1_reported || 0);
        setOpponentScore(match.score_p2_reported || 0);
      } else if (!isTeam1 && myTeamId === match.player2_id && match.reported_by_team2) {
        setMyScore(match.score_p2_reported || 0);
        setOpponentScore(match.score_p1_reported || 0);
      }
    }

    // Charger la preuve
    if (match?.proof_url) setProofUrl(match.proof_url);

    // Charger les comptes gaming using Convex
    const loadGamingAccounts = async () => {
      if (!tournament?.game) return;

      setTournamentGame(tournament.game);
      const requiredPlatform = getPlatformForGame(tournament.game);
      if (!requiredPlatform) return;

      // Load team 1 captain gaming account using Convex
      if (match.team1?.captain_id) {
        try {
          // We use the convex client directly for async loading
          // Note: In a full migration, these would be reactive useQuery calls
          const { convex } = await import('./convexClient');
          const accounts = await convex.query(api.playerGameAccounts.listByUser, { 
            userId: match.team1.captain_id 
          });
          const account = accounts?.find(acc => acc.platform === requiredPlatform);
          if (account) {
            setTeam1GamingAccounts(prev => ({
              ...prev,
              ...prev,
              [match.team1.captain_id]: account
            }));
          }
        } catch (error) {
          console.error('Error loading team1 captain gaming account:', error);
        }
      }

      // Load team 2 captain gaming account using Convex
      if (match.team2?.captain_id) {
        try {
          const { convex } = await import('./convexClient');
          const accounts = await convex.query(api.playerGameAccounts.listByUser, { 
            userId: match.team2.captain_id 
          });
          const account = accounts?.find(acc => acc.platform === requiredPlatform);
          if (account) {
            setTeam2GamingAccounts(prev => ({
              ...prev,
              [match.team2.captain_id]: account
            }));
          }
        } catch (error) {
          console.error('Error loading team2 captain gaming account:', error);
        }
      }
    };

    loadGamingAccounts();
  }, [rawMatch, match, session, myTeamId, loadMatchGamesAndVetos]);

  // Score reports - use Convex query data if available, or from match data
  // Note: In a full migration, create a Convex query for score reports
  const loadScoreReports = useCallback(async () => {
    // Convex queries are reactive, so this is now a no-op
    // Score reports would come from matchGamesData or a dedicated query
    if (matchGamesData?.scoreReports) {
      setScoreReports(matchGamesData.scoreReports);
    }
  }, [matchGamesData]);

  // Update local state when Convex data changes (Convex is reactive, no subscription needed)
  useEffect(() => {
    if (!id) return;
    loadScoreReports();
    loadMatchGamesAndVetos();
  }, [id, loadScoreReports, loadMatchGamesAndVetos]);

  // Convex mutation for handling progression
  const handleProgressionMutation = useMutation(api.matchesMutations.handleProgression);

  // --- LOGIQUE DE PROGRESSION ---
  // Use Convex mutation for bracket progression
  const advanceWinner = async (matchData, winnerTeamId) => {
    try {
      const loserId = matchData.team1Id === winnerTeamId ? matchData.team2Id : matchData.team1Id;
      await handleProgressionMutation({
        matchId: matchData._id || matchData.id,
        winnerId: winnerTeamId,
        loserId: loserId,
      });
    } catch (error) {
      console.error('Error advancing winner:', error);
      toast.error('Erreur lors de la progression du bracket');
    }
  };

  const handleDoubleEliminationProgression = async (completedMatch, winnerTeamId, loserTeamId) => {
    try {
      await handleProgressionMutation({
        matchId: completedMatch._id || completedMatch.id,
        winnerId: winnerTeamId,
        loserId: loserTeamId,
      });
    } catch (error) {
      console.error('Error in double elimination progression:', error);
      toast.error('Erreur lors de la progression');
    }
  };

  // Convex mutation for score reports
  const submitScoreReportMutation = useMutation(api.matchesMutations.submitScoreReport);

  const submitScoreReport = async () => {
    if (!myTeamId || !session) {
      toast.error("Tu dois être connecté et membre d'une équipe pour déclarer un score.");
      return;
    }
    if (myScore < 0 || opponentScore < 0) {
      toast.error("Les scores ne peuvent pas être négatifs.");
      return;
    }

    const isTeam1 = myTeamId === (match.team1Id || match.player1_id);
    const scoreForTeam1 = isTeam1 ? myScore : opponentScore;
    const scoreForTeam2 = isTeam1 ? opponentScore : myScore;

    try {
      // Use Convex mutation to update match score
      await updateMatchMutation({
        matchId: match._id || id,
        scoreTeam1: scoreForTeam1,
        scoreTeam2: scoreForTeam2,
      });
      
      toast.success('Score soumis avec succès !');
      refetchMatch();
      loadScoreReports();
    } catch (error) { 
      console.error('Error submitting score:', error);
      toast.error("Erreur : " + error.message); 
    }
  };

  const resolveConflict = async (scoreP1, scoreP2) => {
    if (!isAdmin) return;
    
    try {
      // Use Convex mutation to resolve conflict
      const winnerId = scoreP1 > scoreP2 ? (match.team1Id || match.player1_id) : (match.team2Id || match.player2_id);
      await updateMatchMutation({
        matchId: match._id || id,
        scoreTeam1: scoreP1,
        scoreTeam2: scoreP2,
        winnerId: winnerId,
      });
      
      toast.success("Conflit résolu !");
      
      // Handle progression
      const loserTeamId = scoreP1 > scoreP2 ? (match.team2Id || match.player2_id) : (match.team1Id || match.player1_id);
      if (tournamentFormat === 'double_elimination') {
        await handleDoubleEliminationProgression(match, winnerId, loserTeamId);
      } else if (tournamentFormat === 'elimination') {
        await advanceWinner(match, winnerId);
      }
      
      refetchMatch();
      loadScoreReports();
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error("Erreur lors de la résolution du conflit");
    }
  };

  // Convex mutations for game operations
  const createGameMutation = useMutation(api.matchesMutations.createGame);
  const updateGameScoreMutation = useMutation(api.matchesMutations.updateGameScore);

  const initializeGames = async () => {
    if (tournamentBestOf <= 1 || !match) return;
    try {
      // Check if games already exist from Convex data
      if (matchGames.length > 0) return;

      // Create games using Convex mutation
      for (let i = 1; i <= tournamentBestOf; i++) {
        await createGameMutation({ 
          matchId: match._id || id, 
          gameNumber: i 
        });
      }
      loadMatchGamesAndVetos();
    } catch (error) { 
      console.warn('Error initializing games:', error); 
    }
  };

  const submitGameScore = async (gameNumber, myTeamScore, opponentScoreVal) => {
    if (!myTeamId || !session) { toast.error("Erreur auth"); return; }
    if (myTeamScore < 0 || opponentScoreVal < 0) { toast.error("Scores < 0"); return; }

    const isTeam1 = myTeamId === (match.team1Id || match.player1_id);
    const scoreForTeam1 = isTeam1 ? myTeamScore : opponentScoreVal;
    const scoreForTeam2 = isTeam1 ? opponentScoreVal : myTeamScore;
    
    try {
      // Find the game to update
      const existingGame = matchGames.find(g => g.gameNumber === gameNumber);
      if (!existingGame) {
        toast.error("Manche non trouvée");
        return;
      }

      // Update game score using Convex mutation
      const winnerId = scoreForTeam1 > scoreForTeam2 
        ? (match.team1Id || match.player1_id) 
        : (scoreForTeam2 > scoreForTeam1 ? (match.team2Id || match.player2_id) : undefined);
        
      await updateGameScoreMutation({
        gameId: existingGame._id,
        scoreTeam1: scoreForTeam1,
        scoreTeam2: scoreForTeam2,
        winnerId: winnerId,
      });

      // Check if match is complete
      const updatedGames = [...matchGames];
      const gameIndex = updatedGames.findIndex(g => g.gameNumber === gameNumber);
      if (gameIndex >= 0) {
        updatedGames[gameIndex] = { 
          ...updatedGames[gameIndex], 
          scoreTeam1: scoreForTeam1, 
          scoreTeam2: scoreForTeam2,
          winnerId: winnerId 
        };
      }
      
      const matchResult = calculateMatchWinner(updatedGames, tournamentBestOf, match.team1Id || match.player1_id, match.team2Id || match.player2_id);
      if (matchResult.isCompleted && matchResult.winner) {
        // Update overall match
        await updateMatchMutation({
          matchId: match._id || id,
          scoreTeam1: matchResult.team1Wins,
          scoreTeam2: matchResult.team2Wins,
          winnerId: matchResult.winner,
        });
        
        toast.success(`Match terminé ! ${matchResult.team1Wins} - ${matchResult.team2Wins}`);
        
        // Handle bracket progression
        const loserTeamId = matchResult.winner === (match.team1Id || match.player1_id) 
          ? (match.team2Id || match.player2_id) 
          : (match.team1Id || match.player1_id);
        if (tournamentFormat === 'double_elimination') {
          await handleDoubleEliminationProgression(match, matchResult.winner, loserTeamId);
        } else if (tournamentFormat === 'elimination') {
          await advanceWinner(match, matchResult.winner);
        }
      } else {
        toast.success('Manche validée !');
      }

      refetchMatch();
      loadMatchGamesAndVetos();
    } catch (error) { 
      console.error('Error submitting game score:', error);
      toast.error('Erreur : ' + error.message); 
    }
  };

  const resolveGameConflict = async (gameId, scoreTeam1, scoreTeam2) => {
    if (!isAdmin) return;
    
    try {
      const winnerTeamId = scoreTeam1 > scoreTeam2 
        ? (match.team1Id || match.player1_id) 
        : (scoreTeam2 > scoreTeam1 ? (match.team2Id || match.player2_id) : null);
      
      await updateGameScoreMutation({
        gameId: gameId,
        scoreTeam1: scoreTeam1,
        scoreTeam2: scoreTeam2,
        winnerId: winnerTeamId,
      });
      
      toast.success("Conflit résolu !");

      // Check if match is now complete
      const updatedGames = matchGames.map(g => 
        g._id === gameId 
          ? { ...g, scoreTeam1, scoreTeam2, winnerId: winnerTeamId }
          : g
      );
      
      const matchResult = calculateMatchWinner(updatedGames, tournamentBestOf, match.team1Id || match.player1_id, match.team2Id || match.player2_id);
      if (matchResult.isCompleted && matchResult.winner) {
        await updateMatchMutation({
          matchId: match._id || id,
          scoreTeam1: matchResult.team1Wins,
          scoreTeam2: matchResult.team2Wins,
          winnerId: matchResult.winner,
        });
        
        const loserTeamId = matchResult.winner === (match.team1Id || match.player1_id) 
          ? (match.team2Id || match.player2_id) 
          : (match.team1Id || match.player1_id);
        if (tournamentFormat === 'double_elimination') {
          await handleDoubleEliminationProgression(match, matchResult.winner, loserTeamId);
        } else if (tournamentFormat === 'elimination') {
          await advanceWinner(match, matchResult.winner);
        }
      }
      
      refetchMatch();
      loadMatchGamesAndVetos();
    } catch (error) {
      console.error('Error resolving game conflict:', error);
      toast.error("Erreur lors de la résolution");
    }
  };

  // Note: File upload would need to use Convex file storage or an external service
  const uploadProof = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      // TODO: Migrate to Convex file storage
      // For now, just show a message
      toast.info("L'upload de preuves sera bientôt disponible avec Convex");
      setUploading(false);
    } catch (err) { 
      toast.error("Erreur upload: " + err.message); 
      setUploading(false);
    }
  };

  useEffect(() => {
    if (tournamentBestOf > 1 && match && matchGames.length === 0 && match.status === 'pending') {
      initializeGames().catch(err => console.error(err));
    }
  }, [tournamentBestOf, match?.id, matchGames.length]);


  // --- VISUAL RENDER ---
  if (matchLoading || !match) return (
    <DashboardLayout session={session}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    </DashboardLayout>
  );

  if (matchError) return (
    <DashboardLayout session={session}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Erreur chargement</h2>
          <p className="text-gray-400">{matchError.message}</p>
        </div>
      </div>
    </DashboardLayout>
  );

  const isTeam1 = myTeamId === match.player1_id;
  const reportedByMe = isTeam1 ? match.reported_by_team1 : match.reported_by_team2;
  const hasConflict = match.score_status === 'disputed';
  const isConfirmed = match.score_status === 'confirmed';

  // Calculer le score global pour Best-of-X
  let matchResult = null;
  if (tournamentBestOf > 1 && matchGames.length > 0) {
    matchResult = calculateMatchWinner(matchGames, tournamentBestOf, match.player1_id, match.player2_id);
  }

  return (
    <DashboardLayout session={session}>
      <div className="relative min-h-screen">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00F5FF]/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[150px]" />
        </div>
        <FloatingParticles />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header / Match Info */}
          <div className="text-center mb-8">
            <NeonBadge variant="neutral" className="mb-4">
              Match #{match.match_number} • Round {match.round_number}
            </NeonBadge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COL: INFO MATCH & SCORES */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard className="p-8 relative overflow-hidden">
                {/* Match Content */}
                <div className="relative z-10">
                  <MatchStatusBanner hasConflict={hasConflict} isConfirmed={isConfirmed} />

                  <div className="flex flex-col md:flex-row justify-between items-center gap-8 my-8">
                    {/* TEAM 1 */}
                    <TeamDisplay
                      team={match.team1}
                      isMyTeam={isTeam1}
                      hasReported={reportedByMe && isTeam1}
                      gamingAccount={match.team1?.captain_id ? team1GamingAccounts[match.team1.captain_id] : null}
                      tournamentGame={tournamentGame}
                    />

                    {/* SCORE CENTER */}
                    <div className="flex flex-col items-center gap-2">
                      <ScoreDisplay
                        isConfirmed={isConfirmed}
                        scoreP1={match.score_p1}
                        scoreP2={match.score_p2}
                        scoreP1Reported={match.score_p1_reported}
                        scoreP2Reported={match.score_p2_reported}
                      />
                      {tournamentBestOf > 1 && (
                        <span className="px-3 py-1 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase tracking-wider">
                          Best Of {tournamentBestOf}
                        </span>
                      )}
                    </div>

                    {/* TEAM 2 */}
                    <TeamDisplay
                      team={match.team2}
                      isMyTeam={!isTeam1 && !!myTeamId}
                      hasReported={reportedByMe && !isTeam1}
                      gamingAccount={match.team2?.captain_id ? team2GamingAccounts[match.team2.captain_id] : null}
                      tournamentGame={tournamentGame}
                    />
                  </div>

                  {/* Best of X Games List */}
                  <GameRoundsList
                    tournamentBestOf={tournamentBestOf}
                    matchGames={matchGames}
                    match={match}
                    isTeam1={isTeam1}
                    myTeamId={myTeamId}
                    isAdmin={isAdmin}
                    isMatchCompleted={matchResult?.isCompleted}
                    tournamentMapsPool={tournamentMapsPool}
                    vetos={vetos}
                    onSubmitScore={submitGameScore}
                    onResolveConflict={resolveGameConflict}
                  />

                  {/* Score Submission Form (Bo1) */}
                  {tournamentBestOf === 1 && myTeamId && !reportedByMe && !isConfirmed && (
                    <SingleGameScoreForm onSubmit={(my, opp) => {
                      setMyScore(my);
                      setOpponentScore(opp);
                      submitScoreReport();
                    }} />
                  )}

                  {/* Admin Zone */}
                  {hasConflict && isAdmin && (
                    <AdminConflictResolver
                      defaultScoreP1={match.score_p1_reported}
                      defaultScoreP2={match.score_p2_reported}
                      onResolve={resolveConflict}
                    />
                  )}
                </div>
              </GlassCard>

              {/* Proofs Section */}
              <ProofSection
                proofUrl={proofUrl}
                canUpload={!!myTeamId}
                uploading={uploading}
                onUpload={uploadProof}
              />

              {/* Admin Advanced Details */}
              {isAdmin && (
                <AdminMatchDetails
                  match={match}
                  matchGames={matchGames}
                  matchResult={matchResult}
                  tournamentBestOf={tournamentBestOf}
                  scoreReports={scoreReports}
                />
              )}
            </div>

            {/* RIGHT COL: CHAT & HISTORY */}
            <div className="flex flex-col gap-6">
              <GlassCard className="h-[600px] flex flex-col p-0 overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="font-bold text-white uppercase tracking-wider text-sm">Chat du Match</h3>
                </div>
                <div className="flex-1 min-h-0">
                  <Chat matchId={id} session={session} />
                </div>
              </GlassCard>

              {!isAdmin && (
                <ScoreReportsHistory reports={scoreReports} isAdmin={false} />
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}