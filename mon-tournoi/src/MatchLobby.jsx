import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Chat from './Chat';
import { notifyMatchResult, notifyScoreDispute } from './notificationUtils';
import { updateSwissScores } from './swissUtils';
import { calculateMatchWinner, getMapForGame } from './bofUtils';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import { useMatch } from './shared/hooks';
import { supabase } from './supabaseClient';
import { getPlatformForGame, formatGamertag, PLATFORM_LOGOS } from './utils/gamePlatforms';
import { getUserGamingAccounts } from './shared/services/api/gamingAccounts';

export default function MatchLobby({ session }) {
  const { id } = useParams();
  const _navigate = useNavigate();
  
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
                console.log('🇨🇭 Match Suisse validé par joueurs : Calcul des points...');
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
         console.log('🇨🇭 Match Suisse résolu par Admin : Calcul des points...');
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
      <div className="text-fluky-text font-body text-center py-20">Chargement du Lobby...</div>
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
        
        <div style={{ background: 'rgba(3, 9, 19, 0.95)', padding: '30px', borderRadius: '15px', border: '2px solid #FF36A3', boxShadow: '0 8px 32px rgba(193, 4, 104, 0.3)' }}>
          <h2 style={{color:'#FF36A3', fontSize:'0.9rem', textTransform:'uppercase', marginTop: 0, fontFamily: "'Protest Riot', sans-serif"}}>Match #{match.match_number} - Round {match.round_number}</h2>
          
          {hasConflict && (
            <div style={{background: 'rgba(255, 54, 163, 0.3)', color: '#F8F6F2', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #FF36A3'}}>
              <strong style={{fontFamily: "'Protest Riot', sans-serif"}}>⚠️ Conflit de scores détecté</strong>
              <p style={{margin: '5px 0 0 0', fontSize: '0.9rem', fontFamily: "'Protest Riot', sans-serif"}}>Les deux équipes ont déclaré des scores différents. Intervention admin requise.</p>
            </div>
          )}

          {isConfirmed && (
            <div style={{background: 'rgba(193, 4, 104, 0.3)', color: '#F8F6F2', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #C10468'}}>
              <strong style={{fontFamily: "'Protest Riot', sans-serif"}}>✅ Scores confirmés</strong>
              <p style={{margin: '5px 0 0 0', fontSize: '0.9rem', fontFamily: "'Protest Riot', sans-serif"}}>Les scores ont été validés automatiquement.</p>
            </div>
          )}
            
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '30px 0' }}>
                {/* TEAM 1 */}
                <div style={{textAlign:'center', flex: 1}}>
                  <img 
                    src={match.team1?.logo_url || `https://ui-avatars.com/api/?name=${match.team1?.tag}&background=random&size=128`} 
                    style={{width:'80px', height:'80px', borderRadius:'10px', objectFit:'cover', border: isTeam1 ? '3px solid #FF36A3' : '2px solid #C10468'}} 
                    alt=""
                  />
                    <h3 style={{marginTop:'10px', fontFamily: "'Shadows Into Light', cursive", color: '#F8F6F2'}}>{match.team1?.name}</h3>
                  {/* Display gaming account */}
                  {(() => {
                    const team1Account = match.team1?.captain_id ? team1GamingAccounts[match.team1.captain_id] : null;
                    return team1Account && tournamentGame ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '8px',
                        fontSize: '0.85rem',
                        color: '#666',
                        fontStyle: 'italic',
                        fontFamily: "'Protest Riot', sans-serif"
                      }}>
                        <img 
                          src={PLATFORM_LOGOS[team1Account.platform]} 
                          alt=""
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>
                          {formatGamertag(team1Account.game_username, team1Account.game_tag, team1Account.platform)}
                        </span>
                      </div>
                    ) : null;
                  })()}
                  {isTeam1 && <span style={{fontSize:'0.8rem', color:'#FF36A3', fontFamily: "'Protest Riot', sans-serif"}}>👤 Mon équipe</span>}
                  {reportedByMe && isTeam1 && (
                    <div style={{marginTop:'5px', fontSize:'0.75rem', color:'#C10468', fontFamily: "'Protest Riot', sans-serif"}}>✅ Score déclaré</div>
                  )}
                </div>

                {/* SCORE */}
                <div style={{display:'flex', flexDirection:'column', gap:'10px', alignItems:'center', padding: '0 30px'}}>
                  {isConfirmed ? (
                    <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                      <span style={{fontSize:'3rem', fontWeight:'bold', color: match.score_p1 > match.score_p2 ? '#C10468' : '#FF36A3', fontFamily: "'Shadows Into Light', cursive"}}>{match.score_p1}</span>
                        <span style={{fontSize:'2rem', fontWeight:'bold', color: '#F8F6F2'}}>:</span>
                      <span style={{fontSize:'3rem', fontWeight:'bold', color: match.score_p2 > match.score_p1 ? '#C10468' : '#FF36A3', fontFamily: "'Shadows Into Light', cursive"}}>{match.score_p2}</span>
                    </div>
                  ) : (
                    <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                      <span style={{fontSize:'2.5rem', fontWeight:'bold', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive"}}>{match.score_p1_reported ?? '-'}</span>
                      <span style={{fontSize:'2rem', color: '#F8F6F2'}}>:</span>
                      <span style={{fontSize:'2.5rem', fontWeight:'bold', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive"}}>{match.score_p2_reported ?? '-'}</span>
                    </div>
                  )}
                </div>

                {/* TEAM 2 */}
                <div style={{textAlign:'center', flex: 1}}>
                  <img 
                    src={match.team2?.logo_url || `https://ui-avatars.com/api/?name=${match.team2?.tag}&background=random&size=128`} 
                    style={{width:'80px', height:'80px', borderRadius:'10px', objectFit:'cover', border: !isTeam1 && myTeamId ? '3px solid #FF36A3' : '2px solid #C10468'}} 
                    alt=""
                  />
                    <h3 style={{marginTop:'10px', fontFamily: "'Shadows Into Light', cursive", color: '#F8F6F2'}}>{match.team2?.name}</h3>
                  {/* Display gaming account */}
                  {(() => {
                    const team2Account = match.team2?.captain_id ? team2GamingAccounts[match.team2.captain_id] : null;
                    return team2Account && tournamentGame ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '8px',
                        fontSize: '0.85rem',
                        color: '#666',
                        fontStyle: 'italic',
                        fontFamily: "'Protest Riot', sans-serif"
                      }}>
                        <img 
                          src={PLATFORM_LOGOS[team2Account.platform]} 
                          alt=""
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>
                          {formatGamertag(team2Account.game_username, team2Account.game_tag, team2Account.platform)}
                        </span>
                      </div>
                    ) : null;
                  })()}
                  {!isTeam1 && myTeamId && <span style={{fontSize:'0.8rem', color:'#FF36A3', fontFamily: "'Protest Riot', sans-serif"}}>👤 Mon équipe</span>}
                  {reportedByMe && !isTeam1 && (
                    <div style={{marginTop:'5px', fontSize:'0.75rem', color:'#C10468', fontFamily: "'Protest Riot', sans-serif"}}>✅ Score déclaré</div>
                  )}
                </div>
            </div>

            {/* SECTION MANCHES BEST-OF-X */}
            {tournamentBestOf > 1 && (
              <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5 mt-5">
                <h3 className="font-display text-xl text-fluky-text mt-0 mb-4">🎮 Manches (Best-of-{tournamentBestOf})</h3>
                <div className="flex flex-col gap-4">
                {Array.from({ length: tournamentBestOf }, (_, i) => i + 1).map((gameNum) => {
                  const game = matchGames.find(g => g.game_number === gameNum);
                  const isCompleted = game?.status === 'completed';
                  const isConfirmed = game?.score_status === 'confirmed';
                  const hasConflict = game?.score_status === 'disputed';
                  const gameReportedByMe = isTeam1 ? game?.reported_by_team1 : game?.reported_by_team2;
                  const mapName = game?.map_name || getMapForGame(matchGames, gameNum, tournamentMapsPool, vetos) || `Manche ${gameNum}`;
                  
                  return (
                  <div 
                    key={gameNum} 
                    className={`p-4 rounded-lg ${
                      isConfirmed ? 'bg-green-900/20 border border-green-500' : 
                      (hasConflict ? 'bg-red-900/20 border border-red-500' : 
                      'bg-[#030913]/60 border border-white/5')
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <strong className="font-body text-fluky-text">Manche {gameNum}</strong>
                        {mapName && <span className="ml-3 text-sm text-fluky-text/70 font-body">🗺️ {mapName}</span>}
                      </div>
                      {isConfirmed && <span className="text-green-400 text-sm font-body">✅ Terminée</span>}
                      {hasConflict && <span className="text-red-400 text-sm font-body">⚠️ Conflit</span>}
                    </div>
                      
                      {hasConflict && isAdmin && game ? (
                        // Conflit - Zone Admin (priorité pour l'admin)
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                          <div style={{color: '#e74c3c', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold'}}>⚠️ Conflit détecté. Résoudre :</div>
                          <div style={{display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center'}}>
                            <input
                              type="number"
                              defaultValue={game.team1_score_reported || 0}
                              id={`admin-game-${gameNum}-team1`}
                              min="0"
                              style={{width: '80px', padding: '8px', background: '#fff', color: '#000', border: '2px solid #e74c3c', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold'}}
                            />
                            <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>:</span>
                            <input
                              type="number"
                              defaultValue={game.team2_score_reported || 0}
                              id={`admin-game-${gameNum}-team2`}
                              min="0"
                              style={{width: '80px', padding: '8px', background: '#fff', color: '#000', border: '2px solid #e74c3c', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold'}}
                            />
                            <button
                              onClick={() => {
                                const score1 = parseInt(document.getElementById(`admin-game-${gameNum}-team1`).value) || 0;
                                const score2 = parseInt(document.getElementById(`admin-game-${gameNum}-team2`).value) || 0;
                                resolveGameConflict(game.id, score1, score2);
                              }}
                              style={{
                                padding: '8px 15px',
                                background: '#e74c3c',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                              }}
                            >
                              ✅ Valider
                            </button>
                          </div>
                          <div style={{fontSize: '0.8rem', color: '#888', textAlign: 'center', marginTop: '5px'}}>
                            Scores déclarés: {match.team1?.name} = {game.team1_score_reported || '-'}, {match.team2?.name} = {game.team2_score_reported || '-'}
                          </div>
                        </div>
                      ) : isConfirmed && isCompleted && game ? (
                        // Manche confirmée et terminée
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span style={{fontSize: '1.2rem', fontWeight: 'bold', color: game.team1_score > game.team2_score ? '#4ade80' : '#aaa'}}>
                            {match.team1?.name}: {game.team1_score}
                          </span>
                          <span style={{fontSize: '1.5rem'}}>:</span>
                          <span style={{fontSize: '1.2rem', fontWeight: 'bold', color: game.team2_score > game.team1_score ? '#4ade80' : '#aaa'}}>
                            {game.team2_score} : {match.team2?.name}
                          </span>
                        </div>
                      ) : hasConflict && !isAdmin && game ? (
                        // Conflit - Vue joueur (attente admin)
                        <div style={{color: '#e74c3c', fontSize: '0.9rem', textAlign: 'center', padding: '10px'}}>
                          ⚠️ Conflit détecté. Les scores déclarés ne correspondent pas. Un administrateur doit intervenir.
                        </div>
                      ) : !isConfirmed && myTeamId && !gameReportedByMe && !matchResult?.isCompleted ? (
                        // Zone de déclaration (si pas encore déclaré par mon équipe)
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                          {game && game.team1_score_reported !== null && game.team1_score_reported !== undefined && game.team2_score_reported !== null && game.team2_score_reported !== undefined && (
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', fontSize: '0.9rem', color: '#888'}}>
                              <span>{game.team1_score_reported ?? '-'}</span>
                              <span>:</span>
                              <span>{game.team2_score_reported ?? '-'}</span>
                            </div>
                          )}
                          <div style={{display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center'}}>
                            <input
                              type="number"
                              placeholder="Mon score"
                              min="0"
                              id={`game-${gameNum}-my`}
                              style={{width: '80px', padding: '8px', background: '#111', color: 'white', border: '2px solid #f1c40f', borderRadius: '4px', textAlign: 'center'}}
                            />
                            <span>:</span>
                            <input
                              type="number"
                              placeholder="Adverse"
                              min="0"
                              id={`game-${gameNum}-opp`}
                              style={{width: '80px', padding: '8px', background: '#111', color: 'white', border: '2px solid #f1c40f', borderRadius: '4px', textAlign: 'center'}}
                            />
                            <button
                              onClick={() => {
                                const myScore = parseInt(document.getElementById(`game-${gameNum}-my`).value) || 0;
                                const oppScore = parseInt(document.getElementById(`game-${gameNum}-opp`).value) || 0;
                                submitGameScore(gameNum, myScore, oppScore);
                              }}
                              style={{
                                padding: '8px 15px',
                                background: '#f1c40f',
                                color: '#000',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              ✉️ Envoyer
                            </button>
                          </div>
                          {gameReportedByMe && (
                            <div style={{fontSize: '0.75rem', color: '#4ade80', textAlign: 'center'}}>✅ Score déclaré</div>
                          )}
                        </div>
                      ) : (
                        <div style={{color: '#888', fontSize: '0.9rem'}}>
                          {gameReportedByMe ? '✅ Score déclaré, en attente de l\'adversaire...' : 'En attente...'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ZONE DE DÉCLARATION DE SCORE (pour single game seulement) */}
          {tournamentBestOf === 1 && myTeamId && !reportedByMe && !isConfirmed && (
            <div style={{background: '#2a2a2a', padding: '20px', borderRadius: '10px', marginTop: '20px', border: '2px solid #f1c40f'}}>
              <h3 style={{marginTop: 0, marginBottom: '15px', color: '#f1c40f'}}>📝 Déclarer mon score</h3>
              <div style={{display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{textAlign: 'center'}}>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Mon score</label>
                  <input 
                    type="number" 
                    value={myScore} 
                    onChange={e => setMyScore(parseInt(e.target.value) || 0)} 
                    min="0"
                    style={{fontSize:'1.5rem', width:'80px', textAlign:'center', background:'#111', color:'white', border:'2px solid #f1c40f', borderRadius:'5px', padding: '10px'}} 
                  />
                </div>
                <span style={{fontSize:'2rem', marginTop: '25px'}}>:</span>
                <div style={{textAlign: 'center'}}>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Score adverse</label>
                  <input 
                    type="number" 
                    value={opponentScore} 
                    onChange={e => setOpponentScore(parseInt(e.target.value) || 0)} 
                    min="0"
                    style={{fontSize:'1.5rem', width:'80px', textAlign:'center', background:'#111', color:'white', border:'2px solid #f1c40f', borderRadius:'5px', padding: '10px'}} 
                  />
                </div>
              </div>
              <button 
                onClick={submitScoreReport} 
                style={{
                  width: '100%', marginTop: '15px', background:'#f1c40f', color:'#000', border:'none', padding:'15px', fontSize:'1.1rem', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'
                }}
              >
                ✉️ Envoyer ma déclaration
              </button>
              <p style={{marginTop: '10px', fontSize: '0.8rem', color: '#aaa', textAlign: 'center'}}>
                L'adversaire devra également déclarer son score. Si les scores concordent, validation automatique.
              </p>
            </div>
          )}

          {/* ZONE ADMIN POUR RÉSOUDRE CONFLIT */}
          {hasConflict && isAdmin && (
            <div style={{background: '#c0392b', padding: '20px', borderRadius: '10px', marginTop: '20px', border: '2px solid #e74c3c'}}>
              <h3 style={{marginTop: 0, marginBottom: '15px', color: 'white'}}>⚖️ Résoudre le conflit (Admin)</h3>
              <div style={{display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'center'}}>
                <input type="number" defaultValue={match.score_p1_reported || 0} id="admin-score-p1" aria-label="Score équipe 1" min="0" style={{fontSize:'1.5rem', width:'80px', textAlign:'center', background:'#fff', color:'#000', borderRadius:'5px', padding: '10px'}} />
                <span style={{fontSize:'2rem'}}>:</span>
                <input type="number" defaultValue={match.score_p2_reported || 0} id="admin-score-p2" aria-label="Score équipe 2" min="0" style={{fontSize:'1.5rem', width:'80px', textAlign:'center', background:'#fff', color:'#000', borderRadius:'5px', padding: '10px'}} />
              </div>
              <button 
                onClick={() => {
                  const scoreP1 = parseInt(document.getElementById('admin-score-p1').value) || 0;
                  const scoreP2 = parseInt(document.getElementById('admin-score-p2').value) || 0;
                  resolveConflict(scoreP1, scoreP2);
                }} 
                style={{
                  width: '100%', marginTop: '15px', background:'#fff', color:'#c0392b', border:'none', padding:'15px', fontSize:'1.1rem', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'
                }}
              >
                ✅ Valider ce score
                </button>
            </div>
          )}
        </div>

        {/* SECTION PREUVES */}
        <div style={{ marginTop: '20px', background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}>
            <h3>📷 Preuve du résultat (Screenshot)</h3>
            {proofUrl ? (
                <a href={proofUrl} target="_blank" rel="noreferrer">
                    <img loading="lazy" src={proofUrl} style={{maxWidth:'100%', maxHeight:'300px', borderRadius:'5px', border:'1px solid #555'}} alt="Preuve" />
                </a>
            ) : (
                <p style={{color:'#666'}}>Aucune preuve envoyée.</p>
            )}
            
            {myTeamId && (
                <div style={{marginTop:'10px'}}>
              <input type="file" accept="image/*" onChange={uploadProof} disabled={uploading} aria-label="Télécharger une preuve de screenshot" style={{color:'white'}} />
              {uploading && <span style={{marginLeft: '10px', color: '#aaa'}}>Upload en cours...</span>}
            </div>
          )}
        </div>

          {/* SECTION ADMIN - DÉTAILS AVANCÉS */}
          {isAdmin && (
            <div style={{ marginTop: '20px', background: '#2a1a3a', padding: '20px', borderRadius: '15px', border: '2px solid #8e44ad' }}>
              <h3 style={{marginTop: 0, color: '#8e44ad'}}>👑 Panneau Admin - Détails du Match</h3>
              
              {/* Informations générales */}
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px'}}>
                <div style={{background: '#1a1a1a', padding: '12px', borderRadius: '8px'}}>
                  <div style={{fontSize: '0.8rem', color: '#aaa', marginBottom: '5px'}}>Statut du match</div>
                  <div style={{fontSize: '1rem', fontWeight: 'bold', color: match.status === 'completed' ? '#4ade80' : match.status === 'pending' ? '#f39c12' : '#e74c3c'}}>
                    {match.status === 'completed' ? '✅ Terminé' : match.status === 'pending' ? '⏳ En attente' : '❌ Annulé'}
                  </div>
                </div>
                <div style={{background: '#1a1a1a', padding: '12px', borderRadius: '8px'}}>
                  <div style={{fontSize: '0.8rem', color: '#aaa', marginBottom: '5px'}}>Statut des scores</div>
                  <div style={{fontSize: '1rem', fontWeight: 'bold', color: match.score_status === 'confirmed' ? '#4ade80' : match.score_status === 'disputed' ? '#e74c3c' : '#f39c12'}}>
                    {match.score_status === 'confirmed' ? '✅ Confirmé' : match.score_status === 'disputed' ? '⚠️ Conflit' : '⏳ En attente'}
                  </div>
                </div>
                {tournamentBestOf > 1 && (
                  <div style={{background: '#1a1a1a', padding: '12px', borderRadius: '8px'}}>
                    <div style={{fontSize: '0.8rem', color: '#aaa', marginBottom: '5px'}}>Format</div>
                    <div style={{fontSize: '1rem', fontWeight: 'bold'}}>Best-of-{tournamentBestOf}</div>
                  </div>
                )}
                {matchResult && tournamentBestOf > 1 && (
                  <div style={{background: '#1a1a1a', padding: '12px', borderRadius: '8px'}}>
                    <div style={{fontSize: '0.8rem', color: '#aaa', marginBottom: '5px'}}>Score global</div>
                    <div style={{fontSize: '1rem', fontWeight: 'bold'}}>
                      {matchResult.team1Wins} - {matchResult.team2Wins}
                      {matchResult.isCompleted && matchResult.winner && (
                        <span style={{marginLeft: '10px', color: '#4ade80'}}>✅ Terminé</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Détails des manches pour Best-of-X */}
              {tournamentBestOf > 1 && matchGames.length > 0 && (
                <div style={{background: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '15px'}}>
                  <h4 style={{marginTop: 0, marginBottom: '10px', fontSize: '0.9rem', color: '#aaa'}}>📊 Statut des manches</h4>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px'}}>
                    {matchGames.map((game) => {
                      const _isCompleted = game.status === 'completed';
                      const isConfirmed = game.score_status === 'confirmed';
                      const hasConflict = game.score_status === 'disputed';
                      
                      return (
                        <div key={game.id} style={{
                          background: isConfirmed ? '#1a3a1a' : (hasConflict ? '#3a1a1a' : '#2a2a2a'),
                          padding: '10px',
                          borderRadius: '6px',
                          border: isConfirmed ? '1px solid #27ae60' : (hasConflict ? '1px solid #e74c3c' : '1px solid #555'),
                          fontSize: '0.85rem'
                        }}>
                          <div style={{fontWeight: 'bold', marginBottom: '5px'}}>Manche {game.game_number}</div>
                          <div style={{color: '#aaa', fontSize: '0.75rem'}}>
                            {isConfirmed ? (
                              <span style={{color: '#4ade80'}}>✅ {game.team1_score} - {game.team2_score}</span>
                            ) : hasConflict ? (
                              <span style={{color: '#e74c3c'}}>⚠️ Conflit</span>
                            ) : game.reported_by_team1 && game.reported_by_team2 ? (
                              <span style={{color: '#f39c12'}}>⏳ En validation</span>
                            ) : (
                              <span style={{color: '#888'}}>⏳ En attente</span>
                            )}
                          </div>
                          {game.map_name && (
                            <div style={{color: '#888', fontSize: '0.7rem', marginTop: '3px'}}>🗺️ {game.map_name}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Historique des rapports de manches */}
              {tournamentBestOf > 1 && (
                <div style={{background: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '15px'}}>
                  <h4 style={{marginTop: 0, marginBottom: '10px', fontSize: '0.9rem', color: '#aaa'}}>📋 Historique des rapports de manches</h4>
                  <div style={{maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {matchGames.map((game) => {
                      if (!game.reported_by_team1 && !game.reported_by_team2) return null;
                      
                      return (
                        <div key={game.id} style={{
                          background: '#2a2a2a',
                          padding: '10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem'
                        }}>
                          <div style={{fontWeight: 'bold', marginBottom: '5px'}}>Manche {game.game_number}</div>
                          <div style={{color: '#aaa'}}>
                            {game.reported_by_team1 && (
                              <div>{match.team1?.name}: {game.team1_score_reported ?? '?'} - {game.team2_score_reported ?? '?'}</div>
                            )}
                            {game.reported_by_team2 && (
                              <div>{match.team2?.name}: {game.team2_score_reported ?? '?'} - {game.team1_score_reported ?? '?'}</div>
                            )}
                            {game.score_status === 'disputed' && (
                              <div style={{color: '#e74c3c', marginTop: '5px'}}>⚠️ Conflit détecté</div>
                            )}
                            {game.score_status === 'confirmed' && (
                              <div style={{color: '#4ade80', marginTop: '5px'}}>✅ Confirmé: {game.team1_score} - {game.team2_score}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Historique des déclarations (single game) */}
              {scoreReports.length > 0 && (
                <div style={{background: '#1a1a1a', padding: '15px', borderRadius: '8px'}}>
                  <h4 style={{marginTop: 0, marginBottom: '10px', fontSize: '0.9rem', color: '#aaa'}}>📋 Historique des déclarations</h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {scoreReports.map((report) => (
                      <div key={report.id} style={{ padding: '10px', background: report.is_resolved ? '#1a3a1a' : '#2a2a2a', borderRadius: '6px', border: report.is_resolved ? '1px solid #27ae60' : '1px solid #555', opacity: report.is_resolved ? 0.7 : 1, fontSize: '0.85rem' }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <div>
                            <strong>{report.teams?.name || 'Équipe'}</strong> a déclaré : 
                            <span style={{marginLeft: '10px', fontSize: '1rem', fontWeight: 'bold'}}>{report.score_team} - {report.score_opponent}</span>
                          </div>
                          <div style={{fontSize: '0.75rem', color: '#888'}}>
                            {new Date(report.created_at).toLocaleString('fr-FR')}
                            {report.is_resolved && <span style={{marginLeft: '10px', color: '#4ade80'}}>✅ Résolu</span>}
                          </div>
                        </div>
                        {report.profiles?.username && <div style={{fontSize: '0.7rem', color: '#aaa', marginTop: '5px'}}>Déclaré par {report.profiles.username}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HISTORIQUE DES DÉCLARATIONS (pour les joueurs) */}
        {!isAdmin && scoreReports.length > 0 && (
          <div style={{ marginTop: '20px', background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}>
            <h3>📋 Historique des déclarations</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px'}}>
              {scoreReports.map((report) => (
                <div key={report.id} style={{ padding: '12px', background: report.is_resolved ? '#1a3a1a' : '#2a2a2a', borderRadius: '8px', border: report.is_resolved ? '1px solid #27ae60' : '1px solid #555', opacity: report.is_resolved ? 0.7 : 1 }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <strong>{report.teams?.name || 'Équipe'}</strong> a déclaré : 
                      <span style={{marginLeft: '10px', fontSize: '1.2rem', fontWeight: 'bold'}}>{report.score_team} - {report.score_opponent}</span>
                    </div>
                    <div style={{fontSize: '0.8rem', color: '#888'}}>
                      {new Date(report.created_at).toLocaleString('fr-FR')}
                      {report.is_resolved && <span style={{marginLeft: '10px', color: '#4ade80'}}>✅ Résolu</span>}
                    </div>
                  </div>
                  {report.profiles?.username && <div style={{fontSize: '0.75rem', color: '#aaa', marginTop: '5px'}}>Déclaré par {report.profiles.username}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

          {/* COLONNE DROITE : CHAT */}
          <div className="h-[600px] bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/5 flex-shrink-0">
              <h3 className="font-display text-xl text-fluky-secondary m-0">💬 Chat du Match</h3>
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