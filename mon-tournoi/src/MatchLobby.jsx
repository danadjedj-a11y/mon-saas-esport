import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Chat from './Chat';
import { notifyMatchResult, notifyScoreDispute, notifyOpponentScoreDeclared } from './notificationUtils';
import { updateSwissScores } from './swissUtils';
import { calculateMatchWinner } from './bofUtils';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import { useMatch } from './shared/hooks';
import { supabase } from './supabaseClient';
import { getPlatformForGame } from './utils/gamePlatforms';
import { getUserGamingAccounts } from './shared/services/api/gamingAccounts';
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

export default function MatchLobby({ session }) {
  const { id } = useParams();
  
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
  
  // États pour la déclaration de score par manche
  const [_gameScores, _setGameScores] = useState({}); // { gameNumber: { team1Score, team2Score } }
  
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

  // Charger les manches et vetos (défini avant son utilisation)
  const loadMatchGamesAndVetos = useCallback(async () => {
    if (!id) return;
    try {
      const { data: gamesData } = await supabase
        .from('match_games')
        .select('*')
        .eq('match_id', id)
        .order('game_number', { ascending: true });
      
      setMatchGames(gamesData || []);
      
      const { data: vetosData } = await supabase
        .from('match_vetos')
        .select('*')
        .eq('match_id', id)
        .order('veto_order', { ascending: true });
      
      setVetos(vetosData || []);
    } catch (error) {
      console.warn('Tables match_games/match_vetos non disponibles:', error);
      setMatchGames([]);
      setVetos([]);
    }
  }, [id]);

  // Identifier mon équipe et charger les données supplémentaires
  useEffect(() => {
    if (!match || !session?.user?.id) return;

    // Identifier mon équipe
    const identifyMyTeam = async () => {
      let foundTeamId = null;

      if (match.player1_id) {
        const [membersResult, teamResult] = await Promise.all([
          supabase
            .from('team_members')
            .select('*')
            .match({ team_id: match.player1_id, user_id: session.user.id }),
          supabase
            .from('teams')
            .select('captain_id')
            .eq('id', match.player1_id)
            .single()
        ]);
        
        const isMember = membersResult.data && membersResult.data.length > 0;
        const isCaptain = teamResult.data?.captain_id === session.user.id;
        
        if (isMember || isCaptain) {
          foundTeamId = match.player1_id;
        }
      }

      if (!foundTeamId && match.player2_id) {
        const [membersResult, teamResult] = await Promise.all([
          supabase
            .from('team_members')
            .select('*')
            .match({ team_id: match.player2_id, user_id: session.user.id }),
          supabase
            .from('teams')
            .select('captain_id')
            .eq('id', match.player2_id)
            .single()
        ]);
        
        const isMember = membersResult.data && membersResult.data.length > 0;
        const isCaptain = teamResult.data?.captain_id === session.user.id;
        
        if (isMember || isCaptain) {
          foundTeamId = match.player2_id;
        }
      }

      if (foundTeamId && foundTeamId !== myTeamId) {
        setMyTeamId(foundTeamId);
      }
    };

    identifyMyTeam();

    // Récupérer les infos du tournoi depuis rawMatch.tournaments (relation Supabase)
    // Note: Pour les relations many-to-one, Supabase peut retourner un objet ou un array avec un seul élément
    const tournamentData = rawMatch?.tournaments;
    const tournament = Array.isArray(tournamentData) ? tournamentData[0] : tournamentData;
    if (tournament) {
      setTournamentOwnerId(tournament.owner_id);
      setIsAdmin(session?.user?.id === tournament.owner_id);
      setTournamentFormat(tournament.format);
      setTournamentBestOf(tournament.best_of || 1);
      setTournamentMapsPool(tournament.maps_pool || []);
      
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
    
    // Charger les comptes gaming
    const loadGamingAccounts = async () => {
      if (!tournament?.game) return;
      
      setTournamentGame(tournament.game);
      const requiredPlatform = getPlatformForGame(tournament.game);
      if (!requiredPlatform) return;
      
      // Load team 1 captain gaming account
      if (match.team1?.captain_id) {
        try {
          const accounts = await getUserGamingAccounts(match.team1.captain_id);
          const account = accounts.find(acc => acc.platform === requiredPlatform);
          if (account) {
            setTeam1GamingAccounts(prev => ({
              ...prev,
              [match.team1.captain_id]: account
            }));
          }
        } catch (error) {
          console.error('Error loading team1 captain gaming account:', error);
        }
      }
      
      // Load team 2 captain gaming account
      if (match.team2?.captain_id) {
        try {
          const accounts = await getUserGamingAccounts(match.team2.captain_id);
          const account = accounts.find(acc => acc.platform === requiredPlatform);
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

  // Charger les rapports de score (défini avant son utilisation)
  const loadScoreReports = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('score_reports')
      .select('*, teams(name, tag), profiles(username)')
      .eq('match_id', id)
      .order('created_at', { ascending: false });
    setScoreReports(data || []);
  }, [id]);

  // Charger les rapports au montage et lors des changements
  useEffect(() => {
    if (!id) return;
    loadScoreReports();

    // Realtime pour score_reports, match_games, match_vetos
    const channel = supabase.channel(`match-details-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'score_reports', filter: `match_id=eq.${id}` }, 
      () => loadScoreReports())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_games', filter: `match_id=eq.${id}` }, 
      () => loadMatchGamesAndVetos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_vetos', filter: `match_id=eq.${id}` }, 
      () => loadMatchGamesAndVetos())
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [id, loadScoreReports, loadMatchGamesAndVetos]);

  // Alias pour compatibilité avec le code existant
  const _fetchMatchDetails = () => {
    refetchMatch();
    loadMatchGamesAndVetos();
    loadScoreReports();
  };


  // --- LOGIQUE DE PROGRESSION (COPIÉE ET ADAPTÉE DE TOURNAMENT.JSX) ---

  const advanceWinner = async (matchData, winnerTeamId) => {
    // 1. Récupérer TOUS les matchs du tournoi pour avoir une vue d'ensemble fraîche
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', matchData.tournament_id)
      .order('round_number, match_number');

    if (!allMatches) return;

    // Logique Single Elimination
    const currentRoundMatches = allMatches
        .filter(m => m.round_number === matchData.round_number)
        .sort((a, b) => a.match_number - b.match_number);

    const myIndex = currentRoundMatches.findIndex(m => m.id === matchData.id);
    const nextRound = matchData.round_number + 1;
    
    const nextRoundMatches = allMatches
        .filter(m => m.round_number === nextRound)
        .sort((a, b) => a.match_number - b.match_number);
        
    const nextMatch = nextRoundMatches[Math.floor(myIndex / 2)];

    if (nextMatch) {
      const isPlayer1Slot = (myIndex % 2) === 0;
      await supabase
        .from('matches')
        .update(isPlayer1Slot ? { player1_id: winnerTeamId } : { player2_id: winnerTeamId })
        .eq('id', nextMatch.id);
    } else {
      // C'était la finale
      await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', matchData.tournament_id);
    }
  };

  const handleDoubleEliminationProgression = async (completedMatch, winnerTeamId, loserTeamId) => {
    // 1. Récupérer TOUS les matchs frais depuis la DB
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', completedMatch.tournament_id)
      .order('round_number', { ascending: true })
      .order('match_number', { ascending: true });
    
    if (!allMatches || allMatches.length === 0) return;
    
    const bracketType = completedMatch.bracket_type;
    const roundNumber = completedMatch.round_number;
    
    if (bracketType === 'winners') {
      // --- WINNERS BRACKET ---
      
      // A. Avancer le gagnant
      const currentWinnersMatches = allMatches.filter(m => m.bracket_type === 'winners' && m.round_number === roundNumber).sort((a,b) => a.match_number - b.match_number);
      const myIndex = currentWinnersMatches.findIndex(m => m.id === completedMatch.id);
      
      if (myIndex !== -1) {
          const nextWinnersRound = roundNumber + 1;
          const nextWinnersMatches = allMatches.filter(m => m.bracket_type === 'winners' && m.round_number === nextWinnersRound).sort((a,b) => a.match_number - b.match_number);
          
          if (nextWinnersMatches.length > 0) {
            const nextWinnersMatch = nextWinnersMatches[Math.floor(myIndex / 2)];
            if (nextWinnersMatch) {
              const isPlayer1Slot = (myIndex % 2) === 0;
              await supabase.from('matches').update(
                isPlayer1Slot ? { player1_id: winnerTeamId } : { player2_id: winnerTeamId }
              ).eq('id', nextWinnersMatch.id);
            }
          } else {
            // Plus de matchs Winners -> Grand Finals
            const grandFinals = allMatches.find(m => !m.bracket_type && !m.is_reset);
            if (grandFinals) {
              await supabase.from('matches').update({ player1_id: winnerTeamId }).eq('id', grandFinals.id);
            }
          }

          // B. Envoyer le perdant en Losers
          if (roundNumber === 1) {
            const losersRound1Matches = allMatches.filter(m => m.bracket_type === 'losers' && m.round_number === 1).sort((a,b) => a.match_number - b.match_number);
            if (losersRound1Matches.length > 0) {
              for (const losersMatch of losersRound1Matches) {
                if (!losersMatch.player1_id) {
                  await supabase.from('matches').update({ player1_id: loserTeamId }).eq('id', losersMatch.id);
                  break;
                } else if (!losersMatch.player2_id) {
                  await supabase.from('matches').update({ player2_id: loserTeamId }).eq('id', losersMatch.id);
                  break;
                }
              }
            }
          } else {
            const losersRound = roundNumber; // Souvent Round N Winners -> Round N Losers (simplifié)
            const losersMatches = allMatches.filter(m => m.bracket_type === 'losers' && m.round_number === losersRound).sort((a,b) => a.match_number - b.match_number);
            if (losersMatches.length > 0) {
              for (const losersMatch of losersMatches) {
                if (!losersMatch.player1_id) {
                  await supabase.from('matches').update({ player1_id: loserTeamId }).eq('id', losersMatch.id);
                  break;
                } else if (!losersMatch.player2_id) {
                  await supabase.from('matches').update({ player2_id: loserTeamId }).eq('id', losersMatch.id);
                  break;
                }
              }
            }
          }
      }
      
    } else if (bracketType === 'losers') {
      // --- LOSERS BRACKET ---
      const _currentLosersMatches = allMatches.filter(m => m.bracket_type === 'losers' && m.round_number === roundNumber).sort((a,b) => a.match_number - b.match_number);
      const nextLosersRound = roundNumber + 1;
      const nextLosersMatches = allMatches.filter(m => m.bracket_type === 'losers' && m.round_number === nextLosersRound).sort((a,b) => a.match_number - b.match_number);
      
      if (nextLosersMatches.length > 0) {
        // Trouver un match avec un slot vide
        const availableMatch = nextLosersMatches.find(m => !m.player1_id || !m.player2_id);
        if (availableMatch) {
          if (!availableMatch.player1_id) {
            await supabase.from('matches').update({ player1_id: winnerTeamId }).eq('id', availableMatch.id);
          } else {
            await supabase.from('matches').update({ player2_id: winnerTeamId }).eq('id', availableMatch.id);
          }
        }
      } else {
        // Vainqueur Losers -> Grand Finals
        const grandFinals = allMatches.find(m => !m.bracket_type && !m.is_reset);
        if (grandFinals) {
          await supabase.from('matches').update({ player2_id: winnerTeamId }).eq('id', grandFinals.id);
        }
      }
      
    } else if (completedMatch.is_reset) {
       // Reset Match terminé
       await supabase.from('tournaments').update({ status: 'completed' }).eq('id', completedMatch.tournament_id);
    } else {
       // Grand Finals terminé
       const grandFinals = completedMatch;
       if (winnerTeamId === grandFinals.player1_id) {
         // Vainqueur Winners a gagné -> Fin
         await supabase.from('tournaments').update({ status: 'completed' }).eq('id', completedMatch.tournament_id);
       } else {
         // Vainqueur Losers a gagné -> Reset
         const resetMatch = allMatches.find(m => m.is_reset);
         if (resetMatch) {
           await supabase.from('matches').update({
             player1_id: grandFinals.player1_id,
             player2_id: grandFinals.player2_id,
             score_p1: 0,
             score_p2: 0,
             status: 'pending'
           }).eq('id', resetMatch.id);
         }
       }
    }
  };

  // ------------------------------------------------------------------

  const submitScoreReport = async () => {
    if (!myTeamId || !session) {
      toast.error("Tu dois être connecté et membre d'une équipe pour déclarer un score.");
      return;
    }
    if (myScore < 0 || opponentScore < 0) {
      toast.error("Les scores ne peuvent pas être négatifs.");
      return;
    }

    const isTeam1 = myTeamId === match.player1_id;
    const scoreForTeam1 = isTeam1 ? myScore : opponentScore;
    const scoreForTeam2 = isTeam1 ? opponentScore : myScore;
    
    try {
      // 1. Enregistrer dans score_reports
      const { error: reportError } = await supabase
        .from('score_reports')
        .insert([{
          match_id: id,
          team_id: myTeamId,
          score_team: myScore,
          score_opponent: opponentScore,
          reported_by: session.user.id
        }]);

      if (reportError) throw reportError;

      // 2. Mettre à jour le match avec les scores déclarés
      const updateData = isTeam1
        ? { score_p1_reported: scoreForTeam1, score_p2_reported: scoreForTeam2, reported_by_team1: true }
        : { score_p1_reported: scoreForTeam1, score_p2_reported: scoreForTeam2, reported_by_team2: true };

      const { error: matchError } = await supabase.from('matches').update(updateData).eq('id', id);

      if (matchError) throw matchError;

      // 3. Vérifier concordance
      const { data: currentMatch } = await supabase.from('matches').select('*').eq('id', id).single();

      // Notifier l'équipe adverse qu'un score a été déclaré
      const opponentTeamId = isTeam1 ? match.player2_id : match.player1_id;
      const opponentName = isTeam1 ? (match.team2?.name || 'Équipe 2') : (match.team1?.name || 'Équipe 1');
      const myTeamName = isTeam1 ? (match.team1?.name || 'Équipe 1') : (match.team2?.name || 'Équipe 2');
      
      // Notifier seulement si c'est la première déclaration (l'autre équipe n'a pas encore déclaré)
      const otherTeamAlreadyReported = isTeam1 ? currentMatch?.reported_by_team2 : currentMatch?.reported_by_team1;
      if (!otherTeamAlreadyReported && opponentTeamId) {
        await notifyOpponentScoreDeclared(id, myTeamId, opponentTeamId, myTeamName, `${myScore} - ${opponentScore}`);
      }

      if (currentMatch?.reported_by_team1 && currentMatch?.reported_by_team2) {
        
        // Récupérer les rapports pour comparer
        const { data: reports } = await supabase
          .from('score_reports')
          .select('*')
          .eq('match_id', id)
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(2);

        if (reports && reports.length === 2) {
          const team1Report = reports.find(r => r.team_id === match.player1_id);
          const team2Report = reports.find(r => r.team_id === match.player2_id);

          if (team1Report && team2Report) {
            const scoresConcord = 
              team1Report.score_team === team2Report.score_opponent &&
              team1Report.score_opponent === team2Report.score_team;
            
            if (scoresConcord) {
              // ✅ SUCCESS : Validation et Progression
              
              // A. Mettre à jour le match comme TERMINÉ
              await supabase.from('matches').update({
                score_p1: team1Report.score_team,
                score_p2: team1Report.score_opponent,
                score_status: 'confirmed',
                status: 'completed'
              }).eq('id', id);

              // B. Résoudre les tickets
              const reportIds = reports.map(r => r.id);
              if (reportIds.length > 0) {
                await supabase.from('score_reports').update({ is_resolved: true }).in('id', reportIds);
              }

              toast.success('Scores concordent ! Le match est validé et l\'arbre va se mettre à jour.');
              
              // C. Récupérer le match mis à jour
              const updatedMatch = { ...currentMatch, score_p1: team1Report.score_team, score_p2: team1Report.score_opponent, status: 'completed' };
              
              // --- 🛑 AJOUT SPÉCIAL SUISSE 🛑 ---
              if (tournamentFormat === 'swiss') {
                // Match Suisse validé par joueurs : Calcul des points
                await updateSwissScores(supabase, updatedMatch.tournament_id, updatedMatch);
              }
              // -------------------------------

              const s1 = updatedMatch.score_p1;
              const s2 = updatedMatch.score_p2;
              
              // Pour les autres formats (élimination), on avance seulement s'il y a un gagnant
              if (s1 !== s2) {
                const winnerTeamId = s1 > s2 ? updatedMatch.player1_id : updatedMatch.player2_id;
                const loserTeamId = s1 > s2 ? updatedMatch.player2_id : updatedMatch.player1_id;
                
                // Notifier les équipes du résultat
                if (winnerTeamId && loserTeamId) {
                  await notifyMatchResult(id, winnerTeamId, loserTeamId, s1, s2);
                }
                
                // Récupérer format (si pas déjà dans l'état, par sécurité)
                const { data: tournament } = await supabase.from('tournaments').select('format, id').eq('id', updatedMatch.tournament_id).single();
                
                if (tournament) {
                    if (tournament.format === 'double_elimination') {
                        await handleDoubleEliminationProgression(updatedMatch, winnerTeamId, loserTeamId);
                    } else if (tournament.format === 'elimination') {
                        await advanceWinner(updatedMatch, winnerTeamId);
                    }
                    
                    // D. Forcer le rafraîchissement global
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('tournament-match-updated', { detail: { tournamentId: tournament.id } }));
                    }, 1000);
                }
              }

            } else {
              // ❌ CONFLIT
              await supabase.from('matches').update({ score_status: 'disputed' }).eq('id', id);
              
              // Notifier les équipes du conflit
              if (match.player1_id && match.player2_id) {
                await notifyScoreDispute(id, match.player1_id, match.player2_id);
              }
              
              toast.warning('Conflit : Les scores ne correspondent pas. Un admin doit intervenir.');
            }
          }
        }
      }

      refetchMatch();
      loadScoreReports();
    } catch (error) {
      toast.error("Erreur : " + error.message);
    }
  };

  const resolveConflict = async (scoreP1, scoreP2) => {
    if (!isAdmin) {
      toast.error("Seul l'administrateur peut résoudre un conflit.");
      return;
    }

    // 1. Update Match
    await supabase.from('matches').update({ 
      score_p1: scoreP1, score_p2: scoreP2, score_p1_reported: scoreP1, score_p2_reported: scoreP2,
      score_status: 'confirmed', status: 'completed', reported_by_team1: true, reported_by_team2: true
    }).eq('id', id);

    // 2. Resolve reports
    await supabase.from('score_reports').update({ is_resolved: true }).eq('match_id', id);

    toast.success("Conflit résolu !");
    
    // 3. Avancer Bracket / Calculer Points
    const { data: updatedMatch } = await supabase.from('matches').select('*').eq('id', id).single();
    if (updatedMatch) {
       // --- 🛑 AJOUT SPÉCIAL SUISSE 🛑 ---
       if (tournamentFormat === 'swiss') {
         // Match Suisse résolu par Admin : Calcul des points
         await updateSwissScores(supabase, updatedMatch.tournament_id, updatedMatch);
       }
       // -------------------------------

       const winnerTeamId = scoreP1 > scoreP2 ? updatedMatch.player1_id : updatedMatch.player2_id;
       const loserTeamId = scoreP1 > scoreP2 ? updatedMatch.player2_id : updatedMatch.player1_id;

       const { data: tournament } = await supabase.from('tournaments').select('format, id').eq('id', updatedMatch.tournament_id).single();
       if (tournament) {
            if (tournament.format === 'double_elimination') {
                await handleDoubleEliminationProgression(updatedMatch, winnerTeamId, loserTeamId);
            } else if (tournament.format === 'elimination') {
                await advanceWinner(updatedMatch, winnerTeamId);
            }
            // Trigger refresh
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('tournament-match-updated', { detail: { tournamentId: tournament.id } }));
            }, 1000);
       }
    }
    
    refetchMatch();
    loadScoreReports();
  };

  // ========== FONCTIONS BEST-OF-X ==========
  
  // Initialiser les manches si elles n'existent pas
  const initializeGames = async () => {
    if (tournamentBestOf <= 1 || !match) return;
    
    try {
      const existingGames = await supabase
        .from('match_games')
        .select('*')
        .eq('match_id', id);
      
      if (existingGames.data && existingGames.data.length > 0) return; // Déjà initialisées
      
      // Créer les manches
      const gamesToCreate = [];
      for (let i = 1; i <= tournamentBestOf; i++) {
        gamesToCreate.push({
          match_id: id,
          game_number: i,
          status: 'pending'
        });
      }
      
      await supabase.from('match_games').insert(gamesToCreate);
      loadMatchGamesAndVetos();
    } catch (error) {
      // Si la table n'existe pas encore, ignorer l'erreur
      console.warn('Table match_games non disponible:', error);
    }
  };

  // Déclarer le score d'une manche (avec système de validation)
  const submitGameScore = async (gameNumber, myTeamScore, opponentScore) => {
    if (!myTeamId || !session) {
      toast.error("Tu dois être connecté et membre d'une équipe pour déclarer un score.");
      return;
    }
    if (myTeamScore < 0 || opponentScore < 0) {
      toast.error("Les scores ne peuvent pas être négatifs.");
      return;
    }
    
    const isTeam1 = myTeamId === match.player1_id;
    const scoreForTeam1 = isTeam1 ? myTeamScore : opponentScore;
    const scoreForTeam2 = isTeam1 ? opponentScore : myTeamScore;
    
    try {
      // Chercher si la manche existe déjà
      let existingGame = null;
      const { data: gameData } = await supabase
        .from('match_games')
        .select('*')
        .eq('match_id', id)
        .eq('game_number', gameNumber)
        .single();
      
      existingGame = gameData;
      
      // Si la manche n'existe pas, la créer
      if (!existingGame) {
        const { data: newGame } = await supabase
          .from('match_games')
          .insert([{
            match_id: id,
            game_number: gameNumber,
            status: 'pending'
          }])
          .select()
          .single();
        existingGame = newGame;
      }
      
      if (!existingGame) {
        toast.error('Erreur : Impossible de créer/récupérer la manche.');
        return;
      }
      
      // 1. Enregistrer dans game_score_reports
      const { error: reportError } = await supabase
        .from('game_score_reports')
        .insert([{
          game_id: existingGame.id,
          team_id: myTeamId,
          score_team: myTeamScore,
          score_opponent: opponentScore,
          reported_by: session.user.id
        }]);

      if (reportError) throw reportError;

      // 2. Mettre à jour la manche avec les scores déclarés
      const updateData = isTeam1
        ? { team1_score_reported: scoreForTeam1, team2_score_reported: scoreForTeam2, reported_by_team1: true }
        : { team1_score_reported: scoreForTeam1, team2_score_reported: scoreForTeam2, reported_by_team2: true };

      const { error: gameError } = await supabase.from('match_games').update(updateData).eq('id', existingGame.id);

      if (gameError) throw gameError;

      // 3. Vérifier concordance
      const { data: currentGame } = await supabase.from('match_games').select('*').eq('id', existingGame.id).single();

      if (currentGame?.reported_by_team1 && currentGame?.reported_by_team2) {
        
        // Récupérer les rapports pour comparer
        const { data: reports } = await supabase
          .from('game_score_reports')
          .select('*')
          .eq('game_id', existingGame.id)
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(2);

        if (reports && reports.length === 2) {
          const team1Report = reports.find(r => r.team_id === match.player1_id);
          const team2Report = reports.find(r => r.team_id === match.player2_id);

          if (team1Report && team2Report) {
            const scoresConcord = 
              team1Report.score_team === team2Report.score_opponent &&
              team1Report.score_opponent === team2Report.score_team;
            
            if (scoresConcord) {
              // ✅ SUCCESS : Validation de la manche
              const finalTeam1Score = team1Report.score_team;
              const finalTeam2Score = team1Report.score_opponent;
              const winnerTeamId = finalTeam1Score > finalTeam2Score ? match.player1_id : (finalTeam2Score > finalTeam1Score ? match.player2_id : null);
              
              // A. Mettre à jour la manche comme TERMINÉE
              await supabase.from('match_games').update({
                team1_score: finalTeam1Score,
                team2_score: finalTeam2Score,
                winner_team_id: winnerTeamId,
                score_status: 'confirmed',
                status: 'completed',
                completed_at: new Date().toISOString()
              }).eq('id', existingGame.id);

              // B. Résoudre les rapports
              const reportIds = reports.map(r => r.id);
              if (reportIds.length > 0) {
                await supabase.from('game_score_reports').update({ is_resolved: true }).in('id', reportIds);
              }

              // C. Vérifier si le match est terminé
              const { data: allGames } = await supabase
                .from('match_games')
                .select('*')
                .eq('match_id', id)
                .order('game_number', { ascending: true });
              
              if (allGames) {
                const matchResult = calculateMatchWinner(allGames, tournamentBestOf, match.player1_id, match.player2_id);
                
                if (matchResult.isCompleted && matchResult.winner) {
                  // Le match est terminé
                  const finalScore1 = matchResult.team1Wins;
                  const finalScore2 = matchResult.team2Wins;
                  
                  await supabase
                    .from('matches')
                    .update({
                      score_p1: finalScore1,
                      score_p2: finalScore2,
                      status: 'completed',
                      score_status: 'confirmed'
                    })
                    .eq('id', id);
                  
                  // Avancer le bracket
                  const { data: updatedMatch } = await supabase.from('matches').select('*').eq('id', id).single();
                  if (updatedMatch && tournamentFormat) {
                    if (tournamentFormat === 'swiss') {
                      await updateSwissScores(supabase, updatedMatch.tournament_id, updatedMatch);
                    } else if (tournamentFormat === 'double_elimination') {
                      const loserTeamId = matchResult.winner === match.player1_id ? match.player2_id : match.player1_id;
                      await handleDoubleEliminationProgression(updatedMatch, matchResult.winner, loserTeamId);
                    } else if (tournamentFormat === 'elimination') {
                      await advanceWinner(updatedMatch, matchResult.winner);
                    }
                    
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('tournament-match-updated', { detail: { tournamentId: updatedMatch.tournament_id } }));
                    }, 1000);
                  }
                  
                  toast.success(`Match terminé ! ${finalScore1} - ${finalScore2}`);
                } else {
                  toast.success('Manche validée ! Les scores concordent.');
                }
              }
              
            } else {
              // ❌ CONFLIT
              await supabase.from('match_games').update({ score_status: 'disputed' }).eq('id', existingGame.id);
              
              toast.warning('Conflit : Les scores ne correspondent pas. Un admin doit intervenir.');
            }
          }
        }
      } else {
        toast.success('Score déclaré ! En attente de la déclaration de l\'adversaire.');
      }
      
      refetchMatch();
      loadMatchGamesAndVetos();
    } catch (error) {
      toast.error('Erreur : ' + error.message);
    }
  };
  
  // Résoudre un conflit de score pour une manche (Admin)
  const resolveGameConflict = async (gameId, scoreTeam1, scoreTeam2) => {
    if (!isAdmin) {
      toast.error("Seul l'administrateur peut résoudre un conflit.");
      return;
    }

    const winnerTeamId = scoreTeam1 > scoreTeam2 ? match.player1_id : (scoreTeam2 > scoreTeam1 ? match.player2_id : null);
    
    // 1. Update Game
    await supabase.from('match_games').update({ 
      team1_score: scoreTeam1, 
      team2_score: scoreTeam2,
      team1_score_reported: scoreTeam1,
      team2_score_reported: scoreTeam2,
      winner_team_id: winnerTeamId,
      score_status: 'confirmed', 
      status: 'completed',
      reported_by_team1: true, 
      reported_by_team2: true,
      completed_at: new Date().toISOString()
    }).eq('id', gameId);

    // 2. Resolve reports
    await supabase.from('game_score_reports').update({ is_resolved: true }).eq('game_id', gameId);

    toast.success("Conflit résolu !");
    
    // 3. Vérifier si le match est terminé
    const { data: allGames } = await supabase
      .from('match_games')
      .select('*')
      .eq('match_id', id)
      .order('game_number', { ascending: true });
    
    if (allGames) {
      const matchResult = calculateMatchWinner(allGames, tournamentBestOf, match.player1_id, match.player2_id);
      
      if (matchResult.isCompleted && matchResult.winner) {
        const finalScore1 = matchResult.team1Wins;
        const finalScore2 = matchResult.team2Wins;
        
        await supabase
          .from('matches')
          .update({
            score_p1: finalScore1,
            score_p2: finalScore2,
            status: 'completed',
            score_status: 'confirmed'
          })
          .eq('id', id);
        
        const { data: updatedMatch } = await supabase.from('matches').select('*').eq('id', id).single();
        if (updatedMatch && tournamentFormat) {
          if (tournamentFormat === 'swiss') {
            await updateSwissScores(supabase, updatedMatch.tournament_id, updatedMatch);
          } else if (tournamentFormat === 'double_elimination') {
            const loserTeamId = matchResult.winner === match.player1_id ? match.player2_id : match.player1_id;
            await handleDoubleEliminationProgression(updatedMatch, matchResult.winner, loserTeamId);
          } else if (tournamentFormat === 'elimination') {
            await advanceWinner(updatedMatch, matchResult.winner);
          }
          
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('tournament-match-updated', { detail: { tournamentId: updatedMatch.tournament_id } }));
          }, 1000);
        }
      }
    }
    
    refetchMatch();
    loadMatchGamesAndVetos();
  };

  const uploadProof = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileName = `proof-${id}-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: upErr } = await supabase.storage.from('match-proofs').upload(fileName, file);
      if(upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('match-proofs').getPublicUrl(fileName);
      
      await supabase.from('matches').update({ proof_url: publicUrl }).eq('id', id);
      setProofUrl(publicUrl);

    } catch (err) {
      toast.error("Erreur upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Initialiser les manches si nécessaire (doit être avant le return)
  useEffect(() => {
    if (tournamentBestOf > 1 && match && matchGames.length === 0 && match.status === 'pending') {
      initializeGames().catch(err => {
        console.error('Erreur lors de l\'initialisation des manches:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentBestOf, match?.id, matchGames.length]);

  if (matchLoading || !match) return (
    <DashboardLayout session={session}>
      <div className="text-white font-body text-center py-20">Chargement du Lobby...</div>
    </DashboardLayout>
  );

  if (matchError) return (
    <DashboardLayout session={session}>
      <div className="text-red-400 font-body text-center py-20">
        Erreur lors du chargement: {matchError.message || 'Erreur inconnue'}
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
      <div className="w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLONNE GAUCHE : INFO MATCH & SCORE */}
          <div className="lg:col-span-2">
        
        <div className="bg-[#030913]/95 p-8 rounded-2xl border-2 border-cyan-500 shadow-[0_8px_32px_rgba(139,92,246,0.3)]">
          <h2 className="text-cyan-400 text-sm uppercase mt-0 font-body">Match #{match.match_number} - Round {match.round_number}</h2>
          
          <MatchStatusBanner hasConflict={hasConflict} isConfirmed={isConfirmed} />
            
            <div className="flex justify-around items-center my-8">
                {/* TEAM 1 */}
                <TeamDisplay
                  team={match.team1}
                  isMyTeam={isTeam1}
                  hasReported={reportedByMe && isTeam1}
                  gamingAccount={match.team1?.captain_id ? team1GamingAccounts[match.team1.captain_id] : null}
                  tournamentGame={tournamentGame}
                />

                {/* SCORE */}
                <div className="flex flex-col gap-2.5 items-center px-8">
                  <ScoreDisplay
                    isConfirmed={isConfirmed}
                    scoreP1={match.score_p1}
                    scoreP2={match.score_p2}
                    scoreP1Reported={match.score_p1_reported}
                    scoreP2Reported={match.score_p2_reported}
                  />
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

            {/* SECTION MANCHES BEST-OF-X */}
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

          {/* ZONE DE DÉCLARATION DE SCORE (pour single game seulement) */}
          {tournamentBestOf === 1 && myTeamId && !reportedByMe && !isConfirmed && (
            <SingleGameScoreForm onSubmit={(my, opp) => {
              setMyScore(my);
              setOpponentScore(opp);
              submitScoreReport();
            }} />
          )}

          {/* ZONE ADMIN POUR RÉSOUDRE CONFLIT */}
          {hasConflict && isAdmin && (
            <AdminConflictResolver
              defaultScoreP1={match.score_p1_reported}
              defaultScoreP2={match.score_p2_reported}
              onResolve={resolveConflict}
            />
          )}
        </div>

        {/* SECTION PREUVES */}
        <ProofSection
          proofUrl={proofUrl}
          canUpload={!!myTeamId}
          uploading={uploading}
          onUpload={uploadProof}
        />

          {/* SECTION ADMIN - DÉTAILS AVANCÉS */}
          {isAdmin && (
            <AdminMatchDetails
              match={match}
              matchGames={matchGames}
              matchResult={matchResult}
              tournamentBestOf={tournamentBestOf}
              scoreReports={scoreReports}
            />
          )}

          {/* HISTORIQUE DES DÉCLARATIONS (pour les joueurs) */}
          {!isAdmin && (
            <ScoreReportsHistory reports={scoreReports} isAdmin={false} />
          )}
      </div>

          {/* COLONNE DROITE : CHAT */}
          <div className="h-[600px] bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/5 flex-shrink-0">
              <h3 className="font-display text-xl text-cyan-400 m-0">💬 Chat du Match</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <Chat matchId={id} session={session} supabase={supabase} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}