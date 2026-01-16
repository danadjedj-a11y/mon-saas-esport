import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import confetti from 'canvas-confetti';

// Composants enfants
import TeamJoinButton from './TeamJoinButton';
import CheckInButton from './CheckInButton';
import Chat from './Chat';
import AdminPanel from './AdminPanel';
import SeedingModal from './SeedingModal';
import SchedulingModal from './SchedulingModal';
import { notifyMatchResult } from './notificationUtils';
import { initializeSwissScores, swissPairing, getSwissScores, updateSwissScores } from './swissUtils';
import { exportTournamentToPDF } from './utils/pdfExport';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import { useTournament } from './shared/hooks';
import { 
  TournamentBracket, 
  SwissStandings, 
  RoundRobinStandings,
  TeamsList, 
  WaitlistSection 
} from './components/tournament';

export default function Tournament({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Déterminer le mode (organizer ou player) basé sur l'URL
  const isOrganizerView = location.pathname.includes('/organizer/tournament/');
  const isPlayerView = location.pathname.includes('/player/tournament/');
  
  // Utiliser le hook useTournament pour charger les données
  const {
    tournament: tournoi,
    participants,
    matches: rawMatches,
    waitlist,
    swissScores,
    loading,
    error,
    refetch,
  } = useTournament(id, {
    enabled: !!id,
    subscribe: true,
    currentUserId: session?.user?.id,
  });

  // États d'interface (Modales & Admin)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [winnerName, setWinnerName] = useState(null);
  const [isSeedingModalOpen, setIsSeedingModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [schedulingMatch, setSchedulingMatch] = useState(null);
  const [_actionLoading, setActionLoading] = useState(false); // Pour les actions spécifiques (startTournament, etc.)

  const isOwner = tournoi && session && tournoi.owner_id === session.user.id;
  
  // En mode organizer, forcer isOwner à true pour les propriétaires
  // En mode player, forcer isOwner à false même si c'est le propriétaire (pour une vue joueur pure)
  const shouldShowAdminFeatures = isOwner && isOrganizerView;

  // Enrichir les matchs avec les informations des participants (noms, logos, statuts)
  const matches = useMemo(() => {
    if (!rawMatches || !participants || rawMatches.length === 0) return [];
    
    const participantsMap = new Map(participants.map(p => [p.team_id, p]));
    
    return rawMatches.map(match => {
      const p1 = match.player1_id ? participantsMap.get(match.player1_id) : null;
      const p2 = match.player2_id ? participantsMap.get(match.player2_id) : null;
      
      const p1Disqualified = p1?.disqualified || false;
      const p2Disqualified = p2?.disqualified || false;
      const p1NotCheckedIn = p1 && !p1.checked_in;
      const p2NotCheckedIn = p2 && !p2.checked_in;
      
      const getTeamName = (p, isDQ, notCI) => {
        if (!p) return 'En attente';
        let name = `${p.teams?.name || 'Inconnu'} [${p.teams?.tag || '?'}]`;
        if (isDQ) name += ' ❌ DQ';
        if (notCI && !isDQ) name += ' ⏳';
        return name;
      };
      
      const getTeamLogo = (p) => p?.teams?.logo_url || `https://ui-avatars.com/api/?name=${p?.teams?.tag || '?'}&background=random&size=64`;

      return {
        ...match,
        p1_name: match.player1_id ? getTeamName(p1, p1Disqualified, p1NotCheckedIn) : 'En attente',
        p1_avatar: getTeamLogo(p1),
        p1_disqualified: p1Disqualified,
        p1_not_checked_in: p1NotCheckedIn,
        p2_name: match.player2_id ? getTeamName(p2, p2Disqualified, p2NotCheckedIn) : 'En attente',
        p2_avatar: getTeamLogo(p2),
        p2_disqualified: p2Disqualified,
        p2_not_checked_in: p2NotCheckedIn,
      };
    });
  }, [rawMatches, participants]);

  // Détecter le vainqueur final
  useEffect(() => {
    if (!tournoi || tournoi.status !== 'completed' || !matches || matches.length === 0) {
      setWinnerName(null);
      return;
    }
    
    const lastMatch = matches.find(m => 
      !m.bracket_type && 
      !m.is_reset && 
      m.status === 'completed' && 
      matches.every(om => om.round_number <= m.round_number)
    );
    
    if (lastMatch) {
      const winner = lastMatch.score_p1 > lastMatch.score_p2 ? lastMatch.p1_name : lastMatch.p2_name;
      setWinnerName(winner);
    }
  }, [tournoi, matches]);

  // Écouteur pour forcer la mise à jour depuis le MatchLobby (Custom Event)
  useEffect(() => {
    const handleMatchUpdate = (event) => {
      if (event.detail.tournamentId === id) {
        setTimeout(() => {
          refetch();
        }, 300);
      }
    };
    
    window.addEventListener('tournament-match-updated', handleMatchUpdate);
    
    return () => {
      window.removeEventListener('tournament-match-updated', handleMatchUpdate);
    };
  }, [id, refetch]);

  // ==============================================================================
  // 1. LOGIQUE DE GÉNÉRATION (ARBRE & MATCHS)
  // ==============================================================================

  const startTournament = async () => {
    if (participants.length < 2) {
      toast.error("Il faut au moins 2 équipes pour lancer !");
      return;
    }
    if (!confirm("Lancer le tournoi ? Plus aucune inscription ne sera possible.")) return;
    
    setActionLoading(true);

    // On ne garde que les équipes prêtes (Checked-in)
    const checkedInParticipants = participants.filter(p => p.checked_in && !p.disqualified);
    
    if (checkedInParticipants.length < 2) {
      toast.warning("Moins de 2 équipes ont fait leur check-in. Impossible de lancer.");
      setActionLoading(false);
      return;
    }

    // Utiliser uniquement les équipes check-in pour créer les matchs
    const participantsForMatches = checkedInParticipants;

    // Générer l'arbre
    await generateBracketInternal(participantsForMatches);

    // Mettre à jour le statut
    await supabase.from('tournaments').update({ status: 'ongoing' }).eq('id', id);
    setActionLoading(false);
  };

  const generateBracketInternal = async (participantsList, deleteExisting = true) => {
    if (!tournoi || participantsList.length < 2) return;

    if (deleteExisting) {
      await supabase.from('matches').delete().eq('tournament_id', id);
    }

    let matchesToCreate = [];
    let orderedParticipants = [...participantsList];
    
    // Gestion du Seeding
    const hasSeeding = participantsList.some(p => p.seed_order !== null && p.seed_order !== undefined);
    if (hasSeeding) {
      orderedParticipants.sort((a, b) => (a.seed_order ?? 999) - (b.seed_order ?? 999));
    } else {
      orderedParticipants.sort(() => 0.5 - Math.random());
    }

    // --- ARBRE SIMPLE (SINGLE ELIMINATION) ---
    if (tournoi.format === 'elimination') {
        const teamIds = orderedParticipants.map(p => p.team_id);
        const numTeams = teamIds.length;
        let matchCount = 1;
        const totalRounds = Math.ceil(Math.log2(numTeams));
        
        // Round 1
        const pairs = [];
        const teams = [...teamIds];
        while (teams.length > 0) pairs.push(teams.splice(0, 2));
        
        pairs.forEach(pair => {
            matchesToCreate.push({
                tournament_id: id,
                match_number: matchCount++,
                round_number: 1,
                player1_id: pair[0] || null,
                player2_id: pair[1] || null,
                status: pair[1] ? 'pending' : 'completed', // Auto-win si Bye
                bracket_type: null
            });
        });
        
        // Rounds suivants (vides)
        let matchesInPrevRound = pairs.length;
        for (let round = 2; round <= totalRounds; round++) {
            const matchesInCurrentRound = Math.ceil(matchesInPrevRound / 2);
            for (let i = 0; i < matchesInCurrentRound; i++) {
                matchesToCreate.push({
                    tournament_id: id,
                    match_number: matchCount++,
                    round_number: round,
                    player1_id: null,
                    player2_id: null,
                    status: 'pending',
                    bracket_type: null
                });
            }
            matchesInPrevRound = matchesInCurrentRound;
        }
    } 
    
    // --- DOUBLE ELIMINATION ---
    else if (tournoi.format === 'double_elimination') {
      const teamIds = orderedParticipants.map(p => p.team_id);
      const numTeams = teamIds.length;
      let matchCount = 1;
      const winnersRounds = Math.ceil(Math.log2(numTeams));
      
      const winnersMatchesByRound = {}; 
      const losersMatchesByRound = {}; 

      // 1. Winners Bracket
      const pairs = [];
      const teams = [...teamIds];
      while (teams.length > 0) pairs.push(teams.splice(0, 2));
      
      winnersMatchesByRound[1] = [];
      pairs.forEach(pair => {
        const matchNum = matchCount++;
        matchesToCreate.push({
          tournament_id: id, match_number: matchNum, round_number: 1,
          player1_id: pair[0] || null, player2_id: pair[1] || null,
          status: pair[1] ? 'pending' : 'completed', bracket_type: 'winners', is_reset: false
        });
        winnersMatchesByRound[1].push(matchNum);
      });
      
      for (let round = 2; round <= winnersRounds; round++) {
        winnersMatchesByRound[round] = [];
        const matchesInRound = Math.ceil(winnersMatchesByRound[round - 1].length / 2);
        for (let i = 0; i < matchesInRound; i++) {
          const matchNum = matchCount++;
          matchesToCreate.push({
            tournament_id: id, match_number: matchNum, round_number: round,
            player1_id: null, player2_id: null, status: 'pending', bracket_type: 'winners', is_reset: false
          });
          winnersMatchesByRound[round].push(matchNum);
        }
      }
      
      // 2. Losers Bracket
      losersMatchesByRound[1] = [];
      const losersRound1Count = Math.ceil(winnersMatchesByRound[1].length / 2);
      for (let i = 0; i < losersRound1Count; i++) {
        const matchNum = matchCount++;
        matchesToCreate.push({
          tournament_id: id, match_number: matchNum, round_number: 1,
          player1_id: null, player2_id: null, status: 'pending', bracket_type: 'losers', is_reset: false
        });
        losersMatchesByRound[1].push(matchNum);
      }
      
      for (let round = 2; round < winnersRounds; round++) {
        losersMatchesByRound[round] = [];
        const losersFromWinners = winnersMatchesByRound[round].length;
        const winnersFromLosers = Math.ceil(losersMatchesByRound[round - 1].length / 2);
        const totalLosersMatches = Math.max(losersFromWinners, winnersFromLosers);
        
        for (let i = 0; i < totalLosersMatches; i++) {
          const matchNum = matchCount++;
          matchesToCreate.push({
            tournament_id: id, match_number: matchNum, round_number: round,
            player1_id: null, player2_id: null, status: 'pending', bracket_type: 'losers', is_reset: false
          });
          losersMatchesByRound[round].push(matchNum);
        }
      }
      
      // Losers Finals
      if (winnersRounds > 1) {
        const matchNum = matchCount++;
        matchesToCreate.push({
          tournament_id: id, match_number: matchNum, round_number: winnersRounds,
          player1_id: null, player2_id: null, status: 'pending', bracket_type: 'losers', is_reset: false
        });
      }
      
      // 3. Grand Finals & Reset
      const grandFinalsNum = matchCount++;
      matchesToCreate.push({
        tournament_id: id, match_number: grandFinalsNum, round_number: winnersRounds + 1,
        player1_id: null, player2_id: null, status: 'pending', bracket_type: null, is_reset: false
      });
      
      const resetMatchNum = matchCount++;
      matchesToCreate.push({
        tournament_id: id, match_number: resetMatchNum, round_number: winnersRounds + 2,
        player1_id: null, player2_id: null, status: 'pending', bracket_type: null, is_reset: true
      });
    }
    
    // --- CHAMPIONNAT (ROUND ROBIN) ---
    else if (tournoi.format === 'round_robin') {
        let matchNum = 1;
        for (let i = 0; i < orderedParticipants.length; i++) {
            for (let j = i + 1; j < orderedParticipants.length; j++) {
                matchesToCreate.push({
                    tournament_id: id,
                    match_number: matchNum++,
                    round_number: 1,
                    player1_id: orderedParticipants[i].team_id,
                    player2_id: orderedParticipants[j].team_id,
                    status: 'pending',
                    score_p1: 0,
                    score_p2: 0,
                    bracket_type: null
                });
            }
        }
    }
    
    // --- SYSTÈME SUISSE ---
    else if (tournoi.format === 'swiss') {
        const teamIds = orderedParticipants.map(p => p.team_id);
        
        // Initialiser les scores suisses
        await initializeSwissScores(supabase, id, teamIds);
        
        // Pour le premier round, on pair aléatoirement (ou selon seeding)
        const pairs = [];
        const teams = [...teamIds];
        while (teams.length > 0) {
            const pair = teams.splice(0, 2);
            pairs.push(pair);
        }
        
        let matchNum = 1;
        pairs.forEach(pair => {
            matchesToCreate.push({
                tournament_id: id,
                match_number: matchNum++,
                round_number: 1,
                player1_id: pair[0] || null,
                player2_id: pair[1] || null,
                status: pair[1] ? 'pending' : 'completed', // Bye si nombre impair
                bracket_type: 'swiss'
            });
        });
    }

    const { error: matchError } = await supabase.from('matches').insert(matchesToCreate);
    if (matchError) toast.error("Erreur création matchs : " + matchError.message);
    
    refetch();
  };

  // Fonction pour promouvoir une équipe spécifique depuis la waitlist
  const promoteTeamFromWaitlist = async (waitlistEntryId, teamId) => {
    // Vérifier s'il y a de la place
    if (tournoi?.max_participants) {
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', id);

      const currentCount = count || 0;
      if (currentCount >= tournoi.max_participants) {
        toast.error('Le tournoi est complet. Impossible de promouvoir cette équipe.');
        return;
      }
    }

    // Promouvoir en participant
    const { error: insertError } = await supabase
      .from('participants')
      .insert([{
        tournament_id: id,
        team_id: teamId,
        checked_in: false,
        disqualified: false
      }]);

    if (insertError) {
      console.error('Erreur lors de la promotion:', insertError);
      toast.error('Erreur lors de la promotion : ' + insertError.message);
      return;
    }

    // Retirer de la waitlist
    const { error: deleteError } = await supabase
      .from('waitlist')
      .delete()
      .eq('id', waitlistEntryId);

    if (deleteError) {
      console.error('Erreur lors de la suppression de la waitlist:', deleteError);
    }

    // Réorganiser les positions dans la waitlist
    const { data: remainingWaitlist } = await supabase
      .from('waitlist')
      .select('*')
      .eq('tournament_id', id)
      .order('position', { ascending: true });

    if (remainingWaitlist && remainingWaitlist.length > 0) {
      for (let i = 0; i < remainingWaitlist.length; i++) {
        await supabase
          .from('waitlist')
          .update({ position: i + 1 })
          .eq('id', remainingWaitlist[i].id);
      }
    }

    toast.success('Équipe promue avec succès !');
    refetch();
  };

  const removeParticipant = async (pid) => {
    if (!confirm("Exclure cette équipe ?")) return;
    
    const { error } = await supabase.from('participants').delete().eq('id', pid);
    
    if (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression : ' + error.message);
      return;
    }
    
    // Ne pas promouvoir automatiquement - l'admin choisira manuellement
    refetch();
  };

  const handleAdminCheckIn = async (participantId, currentStatus) => {
    const { error } = await supabase
      .from('participants')
      .update({ checked_in: !currentStatus, disqualified: false })
      .eq('id', participantId);
    
    if (error) {
      console.error('Erreur lors du check-in:', error);
      toast.error('Erreur lors du check-in : ' + error.message);
      return;
    }
    
    refetch();
  };

  const copyPublicLink = () => {
    const publicUrl = `${window.location.origin}/tournament/${id}/public`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      toast.success('Lien public copié dans le presse-papier !');
    }).catch(() => {
      toast.error('Erreur lors de la copie du lien');
    });
  };

  const exportToPDF = () => {
    if (!tournoi || !participants || !matches) {
      toast.error('Données incomplètes pour l\'export PDF');
      return;
    }
    
    let standings = null;
    if (tournoi.format === 'round_robin') {
      // Calculer le classement Round Robin
      const stats = participants.map(p => ({
        ...p,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        goalDiff: 0
      }));
      
      matches.filter(m => m.status === 'completed').forEach(m => {
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
      
      standings = stats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.goalDiff - a.goalDiff;
      });
    } else if (tournoi.format === 'swiss' && swissScores.length > 0) {
      // Utiliser les scores suisses
      standings = swissScores.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.buchholz_score !== a.buchholz_score) return b.buchholz_score - a.buchholz_score;
        return a.team_id.localeCompare(b.team_id);
      }).map(score => {
        const team = participants.find(p => p.team_id === score.team_id);
        return {
          ...score,
          teams: team?.teams,
          name: team?.teams?.name
        };
      });
    }
    
    exportTournamentToPDF(tournoi, participants, matches, standings);
  };

  // Générer le round suivant pour le système suisse
  const generateNextSwissRound = async () => {
    if (tournoi.format !== 'swiss') return;
    
    // Récupérer tous les matchs et scores suisses
    const { data: allMatches } = await supabase.from('matches').select('*').eq('tournament_id', id).order('round_number');
    const swissScores = await getSwissScores(supabase, id);
    
    // Trouver le dernier round
    const maxRound = Math.max(...(allMatches || []).map(m => m.round_number), 0);
    
    // Vérifier que tous les matchs du dernier round sont terminés
    const lastRoundMatches = (allMatches || []).filter(m => m.round_number === maxRound);
    const allCompleted = lastRoundMatches.every(m => m.status === 'completed');
    
    if (!allCompleted) {
      toast.warning('Tous les matchs du round actuel doivent être terminés avant de générer le round suivant.');
      return;
    }
    
    // Calculer le nombre de rounds (généralement log2(nombre d'équipes))
    const numTeams = participants.length;
    const totalRounds = Math.ceil(Math.log2(numTeams));
    
    if (maxRound >= totalRounds) {
      // Tournoi terminé
      await supabase.from('tournaments').update({ status: 'completed' }).eq('id', id);
      triggerConfetti();
      toast.success('Tous les rounds sont terminés ! Le tournoi est complété.');
      refetch();
      return;
    }
    
    // Générer les paires pour le round suivant
    const pairs = swissPairing(swissScores, allMatches || []);
    
    if (pairs.length === 0) {
      toast.warning('Impossible de générer des paires. Vérifiez les scores suisses.');
      return;
    }
    
    // Créer les matchs pour le round suivant
    const nextRound = maxRound + 1;
    let matchNum = Math.max(...(allMatches || []).map(m => m.match_number), 0) + 1;
    const matchesToCreate = pairs.map(pair => ({
      tournament_id: id,
      match_number: matchNum++,
      round_number: nextRound,
      player1_id: pair[0],
      player2_id: pair[1],
      status: 'pending',
      bracket_type: 'swiss'
    }));
    
    const { error } = await supabase.from('matches').insert(matchesToCreate);
    if (error) {
      toast.error('Erreur lors de la création du round : ' + error.message);
      return;
    }
    
    toast.success(`Round ${nextRound} généré avec ${pairs.length} matchs !`);
    refetch();
  };

  // ==============================================================================
  // 2. LOGIQUE DE JEU & PROGRESSION
  // ==============================================================================

  const handleMatchClick = (match) => {
    // Règles de clic : Admin ouvre modal, tout le monde else voit les détails
    if (tournoi.format !== 'double_elimination' && (!match.player1_id || !match.player2_id)) return;
    if (tournoi.format === 'double_elimination' && !match.player1_id && !match.player2_id) return;

    if (shouldShowAdminFeatures) {
      // Admin opens modal to update scores
      setCurrentMatch(match);
      setScoreA(match.score_p1 || 0);
      setScoreB(match.score_p2 || 0);
      setIsModalOpen(true);
    } else {
      // Everyone else navigates to match details page
      navigate(`/match/${match.id}`);
    }
  };

  const saveScore = async () => {
    if (!currentMatch) return;
    const s1 = parseInt(scoreA);
    const s2 = parseInt(scoreB);

    const { error } = await supabase.from('matches')
      .update({ score_p1: s1, score_p2: s2, status: 'completed' })
      .eq('id', currentMatch.id);

    if (error) {
      toast.error('Erreur score : ' + error.message);
      return;
    }

    // Récupérer le match mis à jour depuis la DB (comme pour les brackets)
    const { data: updatedMatch } = await supabase.from('matches').select('*').eq('id', currentMatch.id).single();
    
    if (!updatedMatch) {
      setIsModalOpen(false);
      refetch();
      return;
    }

    // Mettre à jour les scores suisses si format suisse (pour tous les matchs, y compris nuls)
    if (tournoi.format === 'swiss') {
      await updateSwissScores(supabase, id, updatedMatch);
    }

    if (s1 !== s2) {
      const winnerId = s1 > s2 ? updatedMatch.player1_id : updatedMatch.player2_id;
      const loserId = s1 > s2 ? updatedMatch.player2_id : updatedMatch.player1_id;

      // Notifier les équipes du résultat
      if (winnerId && loserId) {
        await notifyMatchResult(currentMatch.id, winnerId, loserId, s1, s2);
      }

      if (tournoi.format === 'double_elimination') {
         await handleDoubleEliminationProgression(updatedMatch, winnerId, loserId);
      } else if (tournoi.format === 'elimination') {
         // Single Elimination Progression
         const { data: allMatches } = await supabase.from('matches').select('*').eq('tournament_id', id).order('match_number');
         const currentRoundMatches = allMatches.filter(m => m.round_number === updatedMatch.round_number).sort((a,b) => a.match_number - b.match_number);
         const myIndex = currentRoundMatches.findIndex(m => m.id === updatedMatch.id);
         
         const nextRoundMatches = allMatches.filter(m => m.round_number === updatedMatch.round_number + 1).sort((a,b) => a.match_number - b.match_number);
         const nextMatch = nextRoundMatches[Math.floor(myIndex / 2)];

         if (nextMatch) {
            const isP1 = (myIndex % 2) === 0;
            await supabase.from('matches').update(isP1 ? { player1_id: winnerId } : { player2_id: winnerId }).eq('id', nextMatch.id);
         } else {
            triggerConfetti();
            await supabase.from('tournaments').update({ status: 'completed' }).eq('id', id);
         }
      }
    }

    setIsModalOpen(false);
    refetch();
  };

  const handleDoubleEliminationProgression = async (completedMatch, winnerId, loserId) => {
    // Récupérer les données fraîches
    const { data: matches } = await supabase.from('matches').select('*').eq('tournament_id', id).order('match_number');
    if (!matches) return;

    const { bracket_type, round_number } = completedMatch;

    if (bracket_type === 'winners') {
        // Winners -> Avance en Winners + Perdant en Losers
        const winRoundMatches = matches.filter(m => m.bracket_type === 'winners' && m.round_number === round_number).sort((a,b)=>a.match_number-b.match_number);
        const myIndex = winRoundMatches.findIndex(m => m.id === completedMatch.id);
        
        // Avancer Winner
        const nextWinMatches = matches.filter(m => m.bracket_type === 'winners' && m.round_number === round_number + 1).sort((a,b)=>a.match_number-b.match_number);
        if (nextWinMatches.length > 0) {
            const nextM = nextWinMatches[Math.floor(myIndex / 2)];
            if (nextM) await supabase.from('matches').update((myIndex % 2) === 0 ? {player1_id: winnerId} : {player2_id: winnerId}).eq('id', nextM.id);
        } else {
            // Vers Grand Finals
            const gf = matches.find(m => !m.bracket_type && !m.is_reset);
            if (gf) await supabase.from('matches').update({player1_id: winnerId}).eq('id', gf.id);
        }

        // Envoyer Loser
        let targetLoserMatches = [];
        if (round_number === 1) {
             targetLoserMatches = matches.filter(m => m.bracket_type === 'losers' && m.round_number === 1).sort((a,b)=>a.match_number-b.match_number);
        } else {
             targetLoserMatches = matches.filter(m => m.bracket_type === 'losers' && m.round_number === round_number).sort((a,b)=>a.match_number-b.match_number);
        }
        
        if (targetLoserMatches.length > 0) {
            // Remplir le premier slot vide
            for (const m of targetLoserMatches) {
                if (!m.player1_id) { await supabase.from('matches').update({player1_id: loserId}).eq('id', m.id); break; }
                else if (!m.player2_id) { await supabase.from('matches').update({player2_id: loserId}).eq('id', m.id); break; }
            }
        }

    } else if (bracket_type === 'losers') {
        // Losers -> Avance en Losers
        const nextLosMatches = matches.filter(m => m.bracket_type === 'losers' && m.round_number === round_number + 1).sort((a,b)=>a.match_number-b.match_number);
        if (nextLosMatches.length > 0) {
            const avail = nextLosMatches.find(m => !m.player1_id || !m.player2_id);
            if (avail) await supabase.from('matches').update(!avail.player1_id ? {player1_id: winnerId} : {player2_id: winnerId}).eq('id', avail.id);
        } else {
            // Vers Grand Finals
            const gf = matches.find(m => !m.bracket_type && !m.is_reset);
            if (gf) await supabase.from('matches').update({player2_id: winnerId}).eq('id', gf.id);
        }

    } else {
        // Grand Finals / Reset
        if (completedMatch.is_reset) {
            triggerConfetti();
            await supabase.from('tournaments').update({ status: 'completed' }).eq('id', id);
        } else {
            // Grand Final
            if (winnerId === completedMatch.player1_id) {
                // Winner Bracket Champ gagne
                triggerConfetti();
                await supabase.from('tournaments').update({ status: 'completed' }).eq('id', id);
            } else {
                // Reset nécessaire
                const resetM = matches.find(m => m.is_reset);
                if (resetM) await supabase.from('matches').update({player1_id: completedMatch.player1_id, player2_id: completedMatch.player2_id, status: 'pending', score_p1:0, score_p2:0}).eq('id', resetM.id);
            }
        }
    }
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  // ==============================================================================
  // 3. RENDU (UI)
  // ==============================================================================

  if (loading) return (
    <DashboardLayout session={session}>
      <div className="text-gray-400 text-center py-20">Chargement...</div>
    </DashboardLayout>
  );
  
  if (error) return (
    <DashboardLayout session={session}>
      <div className="text-red-400 font-body text-center py-20">
        Erreur lors du chargement: {error.message || 'Erreur inconnue'}
      </div>
    </DashboardLayout>
  );
  
  if (!tournoi) return (
    <DashboardLayout session={session}>
      <div className="text-gray-400 text-center py-20">Tournoi introuvable</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-7xl mx-auto">
        {/* --- HEADER --- */}
        <div className="flex justify-between items-center border-b-4 border-violet-500 pb-5 mb-8">
          <div>
            <button 
              onClick={() => {
                if (isOrganizerView) {
                  navigate('/organizer/dashboard');
                } else if (isPlayerView) {
                  navigate('/player/dashboard');
                } else {
                  if (isOwner) {
                    navigate('/organizer/dashboard');
                  } else {
                    navigate('/player/dashboard');
                  }
                }
              }} 
              className="px-4 py-2 bg-transparent border-2 border-violet-500 text-white rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 hover:bg-violet-500/20 hover:border-violet-400 mb-3"
            >
              ← Retour
            </button>
            <h1 className="font-display text-4xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 m-0 drop-shadow-glow">{tournoi.name}</h1>
          </div>
          <div className="text-right flex flex-col gap-3 items-end">
            <div className={`font-bold ${tournoi.status === 'draft' ? 'text-orange-400' : 'text-cyan-400'}`}>
              {winnerName ? '🏆 TERMINÉ' : (tournoi.status === 'draft' ? '🟠 Inscriptions Ouvertes' : '🟢 En cours')}
            </div>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={copyPublicLink} 
                className="px-4 py-2 btn-primary rounded-lg font-display text-sm uppercase tracking-wide font-bold"
              >
                🔗 Lien Public
              </button>
              {tournoi.status === 'completed' && (
                <button 
                  type="button"
                  onClick={exportToPDF} 
                  className="px-4 py-2 btn-secondary rounded-lg font-display text-sm uppercase tracking-wide"
                >
                  📄 Export PDF
                </button>
              )}
            </div>
          </div>
        </div>

      {winnerName && (
          <div className="glass-card border-violet-500/50 p-5 text-center mb-8 shadow-glow-violet">
              <h2 className="m-0 font-display text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 text-3xl">👑 VAINQUEUR : {winnerName} 👑</h2>
          </div>
      )}

      {/* --- RÈGLEMENT --- */}
      {tournoi.rules && (
        <div className="glass-card border-violet-500/30 p-5 mb-8">
          <h3 className="m-0 mb-4 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 font-display text-xl border-b border-violet-500/30 pb-3">📋 Règlement du Tournoi</h3>
          <div className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
            {tournoi.rules}
          </div>
        </div>
      )}

      {/* --- INFORMATIONS D'INSCRIPTION --- */}
      {(tournoi.max_participants || tournoi.registration_deadline) && tournoi.status === 'draft' && (
        <div className="glass-card border-l-4 border-orange-500 border-violet-500/30 p-4 mb-8">
          <h4 className="m-0 mb-3 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 font-display">🚪 Informations d'Inscription</h4>
          <div className="flex flex-col gap-2 text-sm text-gray-300">
            {tournoi.max_participants && (
              <div>
                <strong>Nombre maximum d'équipes :</strong> {tournoi.max_participants} ({participants.length} inscrites)
              </div>
            )}
            {tournoi.registration_deadline && (
              <div>
                <strong>Date limite d'inscription :</strong> {new Date(tournoi.registration_deadline).toLocaleString('fr-FR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
                {new Date(tournoi.registration_deadline) < new Date() && (
                  <span style={{ color: '#e74c3c', marginLeft: '10px', fontWeight: 'bold' }}>⚠️ EXPIRÉE</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ADMIN CONTROLS --- */}
      {shouldShowAdminFeatures && tournoi.status === 'ongoing' && (
        <AdminPanel 
          tournamentId={id} 
          supabase={supabase} 
          session={session} 
          participants={participants} 
          matches={matches} 
          tournament={tournoi}
          onUpdate={refetch}
          onScheduleMatch={(match) => {
            setSchedulingMatch(match);
            setIsSchedulingModalOpen(true);
          }}
        />
      )}
      
        {shouldShowAdminFeatures && tournoi.status === 'draft' && (
          <div className="glass-card border-l-4 border-purple-500 border-violet-500/30 p-5 mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-300">{participants.length} équipes inscrites.</span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsSeedingModalOpen(true)} 
                  className="px-5 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black border-none rounded-lg cursor-pointer font-bold transition-all duration-300 hover:scale-105"
                >
                  🎯 God Mode - Seeding
                </button>
                <button 
                  onClick={startTournament} 
                  className="px-5 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white border-none rounded-lg cursor-pointer font-bold transition-all duration-300 hover:scale-105 hover:shadow-glow-violet"
                >
                  Générer l'Arbre et Lancer
                </button>
              </div>
            </div>
            {participants.some(p => p.seed_order !== null) && (
              <div className="glass-card border-l-4 border-green-400 p-3 text-sm text-green-400">
                ✅ Seeding configuré.
              </div>
            )}
          </div>
        )}

        {/* --- ACTIONS JOUEURS (Inscription / Check-in) --- */}
        {tournoi.status === 'draft' && (
          <div className="mb-5 flex gap-3 items-center">
            <TeamJoinButton tournamentId={id} supabase={supabase} session={session} onJoinSuccess={refetch} tournament={tournoi} />
            <CheckInButton tournamentId={id} supabase={supabase} session={session} tournament={tournoi} />
          </div>
        )}

        <div className="flex gap-10 flex-wrap items-start">
          
          {/* --- COLONNE GAUCHE : ÉQUIPES & CHAT --- */}
          <div className="flex-1 min-w-[300px] max-w-[400px] glass-card border-violet-500/30">
            <TeamsList
              participants={participants}
              isOwner={isOwner}
              tournamentStatus={tournoi.status}
              onRemove={removeParticipant}
              onToggleCheckIn={handleAdminCheckIn}
            />
          
            {/* LISTE D'ATTENTE */}
            {shouldShowAdminFeatures && waitlist.length > 0 && tournoi.status === 'draft' && (
              <WaitlistSection
                waitlist={waitlist}
                maxParticipants={tournoi?.max_participants}
                currentCount={participants.length}
                onPromote={promoteTeamFromWaitlist}
              />
            )}
            
            <div className="border-t border-violet-500/20 p-4">
              <h3 className="font-display text-lg text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 m-0 mb-3">💬 Chat Lobby</h3>
              <div className="h-[400px] flex flex-col">
                <Chat tournamentId={id} session={session} supabase={supabase} />
              </div>
            </div>
          </div>

          {/* --- COLONNE DROITE : CLASSEMENT & ARBRE --- */}
          <div className="flex-[3] min-w-[300px] overflow-x-auto">
              
              {/* Table Swiss System */}
              {tournoi?.format === 'swiss' && swissScores.length > 0 && (
                <SwissStandings
                  swissScores={swissScores}
                  participants={participants}
                  isOwner={isOwner}
                  tournamentStatus={tournoi.status}
                  onGenerateNextRound={generateNextSwissRound}
                />
              )}

            {/* Table Round Robin */}
            {tournoi?.format === 'round_robin' && (
              <RoundRobinStandings
                participants={participants}
                matches={matches}
              />
            )}

            {/* Arbres Visuels */}
            <TournamentBracket
              matches={matches}
              format={tournoi.format}
              onMatchClick={handleMatchClick}
            />
        </div>
      </div>

      {/* MODALES */}
      {isModalOpen && currentMatch && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999}}>
            <div style={{background:'#2a2a2a', padding:'30px', borderRadius:'12px', width:'300px', border:'1px solid #444'}}>
                <h3 style={{textAlign:'center'}}>Score Admin</h3>
                <div style={{display:'flex', justifyContent:'space-between', margin:'20px 0'}}>
                    <input type="number" value={scoreA} onChange={e=>setScoreA(e.target.value)} aria-label="Score équipe 1" style={{width:'50px', padding:'10px', background:'#111', color:'white', border:'none'}} />
                    <span>-</span>
                    <input type="number" value={scoreB} onChange={e=>setScoreB(e.target.value)} aria-label="Score équipe 2" style={{width:'50px', padding:'10px', background:'#111', color:'white', border:'none'}} />
                </div>
                <button onClick={saveScore} style={{width:'100%', padding:'10px', background:'#4ade80', border:'none', cursor:'pointer'}}>Valider & Avancer</button>
                <button onClick={()=>setIsModalOpen(false)} style={{width:'100%', padding:'10px', background:'transparent', border:'none', color:'#ccc', marginTop:'10px', cursor:'pointer'}}>Annuler</button>
            </div>
        </div>
      )}

        <SeedingModal isOpen={isSeedingModalOpen} onClose={() => setIsSeedingModalOpen(false)} participants={participants} tournamentId={id} supabase={supabase} onSave={() => refetch()} />
        
        <SchedulingModal 
          isOpen={isSchedulingModalOpen} 
          onClose={() => {
            setIsSchedulingModalOpen(false);
            setSchedulingMatch(null);
          }} 
          match={schedulingMatch}
          supabase={supabase} 
          onSave={() => refetch()} 
        />
      </div>
    </DashboardLayout>
  );
}