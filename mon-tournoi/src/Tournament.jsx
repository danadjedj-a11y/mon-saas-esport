import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { initializeSwissScores, swissPairing, getSwissScores, updateSwissScores, recalculateBuchholzScores } from './swissUtils';
import { exportTournamentToPDF } from './utils/pdfExport';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';

export default function Tournament({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Déterminer le mode (organizer ou player) basé sur l'URL
  const isOrganizerView = location.pathname.includes('/organizer/tournament/');
  const isPlayerView = location.pathname.includes('/player/tournament/');
  
  // États de données
  const [tournoi, setTournoi] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swissScores, setSwissScores] = useState([]);
  const [waitlist, setWaitlist] = useState([]);

  // États d'interface (Modales & Admin)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [winnerName, setWinnerName] = useState(null);
  const [isSeedingModalOpen, setIsSeedingModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [schedulingMatch, setSchedulingMatch] = useState(null);

  // Refs pour gérer les race conditions et le montage
  const isMountedRef = useRef(true);
  const fetchDataVersionRef = useRef(0); // Pour ignorer les anciennes requêtes

  const isOwner = tournoi && session && tournoi.owner_id === session.user.id;
  
  // En mode organizer, forcer isOwner à true pour les propriétaires
  // En mode player, forcer isOwner à false même si c'est le propriétaire (pour une vue joueur pure)
  const shouldShowAdminFeatures = isOwner && isOrganizerView;

  // ==============================================================================
  // 1. CHARGEMENT DES DONNÉES ET REALTIME
  // ==============================================================================

  // Cleanup au démontage
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Incrémenter la version pour ignorer les anciennes requêtes
      fetchDataVersionRef.current += 1;
    };
  }, []);

  // Mémoriser fetchData avec useCallback pour éviter les race conditions
  const fetchData = useCallback(async () => {
    if (!id || !isMountedRef.current) return;

    // Incrémenter la version pour cette requête
    const currentVersion = ++fetchDataVersionRef.current;
    
    try {
      // 1. Tournoi
      const { data: tData, error: tError } = await supabase.from('tournaments').select('*').eq('id', id).single();
      if (currentVersion !== fetchDataVersionRef.current || !isMountedRef.current) return;
      if (tError) {
        console.error('Erreur chargement tournoi:', tError);
        if (isMountedRef.current) setLoading(false);
        return;
      }
      if (isMountedRef.current) setTournoi(tData);

      // 2. Participants (avec Teams)
      const { data: pData, error: pError } = await supabase
        .from('participants')
        .select('*, teams(*)')
        .eq('tournament_id', id)
        .order('seed_order', { ascending: true, nullsLast: true });
      
      if (currentVersion !== fetchDataVersionRef.current || !isMountedRef.current) return;
      if (pError) {
        console.error('Erreur chargement participants:', pError);
        if (isMountedRef.current) setParticipants([]);
      } else {
        if (isMountedRef.current) setParticipants(pData || []);
      }

      // 3. Matchs
      const { data: mData, error: mError } = await supabase.from('matches').select('*').eq('tournament_id', id).order('match_number');
      if (currentVersion !== fetchDataVersionRef.current || !isMountedRef.current) return;

      if (mError) {
        console.error('Erreur chargement matchs:', mError);
        if (isMountedRef.current) setMatches([]);
      } else if (mData && mData.length > 0 && pData) {
        // Enrichissement des matchs avec les noms et logos
        const participantsMap = new Map(pData.map(p => [p.team_id, p]));
        
        const enrichedMatches = mData.map(match => {
          const p1 = match.player1_id ? participantsMap.get(match.player1_id) : null;
          const p2 = match.player2_id ? participantsMap.get(match.player2_id) : null;
          
          const p1Disqualified = p1?.disqualified || false;
          const p2Disqualified = p2?.disqualified || false;
          const p1NotCheckedIn = p1 && !p1.checked_in;
          const p2NotCheckedIn = p2 && !p2.checked_in;
          
          const getTeamName = (p, isDQ, notCI) => {
            if (!p) return 'En attente';
            let name = `${p.teams.name} [${p.teams.tag}]`;
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
        
        if (isMountedRef.current) setMatches(enrichedMatches);
        
        // Charger les scores suisses si format suisse
        if (tData?.format === 'swiss' && isMountedRef.current) {
          try {
            const scores = await getSwissScores(supabase, id);
            if (currentVersion !== fetchDataVersionRef.current || !isMountedRef.current) return;
            if (isMountedRef.current) setSwissScores(scores);
          } catch (error) {
            console.error('Erreur chargement scores suisses:', error);
            if (isMountedRef.current) setSwissScores([]);
          }
        } else {
          if (isMountedRef.current) setSwissScores([]);
        }
        
        // Détection vainqueur final
        if (currentVersion === fetchDataVersionRef.current && isMountedRef.current && tData.status === 'completed') {
          const lastMatch = enrichedMatches.find(m => !m.bracket_type && !m.is_reset && m.status === 'completed' && enrichedMatches.every(om => om.round_number <= m.round_number));
          if (lastMatch && isMountedRef.current) {
            const winner = lastMatch.score_p1 > lastMatch.score_p2 ? lastMatch.p1_name : lastMatch.p2_name;
            setWinnerName(winner);
          }
        }
      } else {
        if (isMountedRef.current) setMatches([]);
      }
      
      // Charger la liste d'attente
      if (currentVersion === fetchDataVersionRef.current && isMountedRef.current) {
        try {
          const { data: waitlistData, error: wError } = await supabase
            .from('waitlist')
            .select('*, teams(*)')
            .eq('tournament_id', id)
            .order('created_at', { ascending: true });
          
          if (currentVersion !== fetchDataVersionRef.current || !isMountedRef.current) return;
          
          if (wError) {
            console.error('Erreur chargement waitlist:', wError);
            if (isMountedRef.current) setWaitlist([]);
          } else {
            if (isMountedRef.current) setWaitlist(waitlistData || []);
          }
        } catch (error) {
          console.error('Exception lors du chargement de la waitlist:', error);
          if (isMountedRef.current) setWaitlist([]);
        }
      }
      
      if (isMountedRef.current) {
        setLoading(false);
      }
    } catch (error) {
      if (currentVersion === fetchDataVersionRef.current && isMountedRef.current) {
        console.error('Erreur lors du chargement des données:', error);
        setLoading(false);
      }
    }
  }, [id, supabase]);

  useEffect(() => {
    if (!id) return;
    
    isMountedRef.current = true;
    fetchData();

    // Abonnement aux changements Supabase
    const channel = supabase.channel(`tournament-updates-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` }, () => {
        if (isMountedRef.current) {
          fetchData();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${id}` }, () => {
        if (isMountedRef.current) {
          fetchData();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` }, () => {
        if (isMountedRef.current) {
          fetchData();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swiss_scores', filter: `tournament_id=eq.${id}` }, (payload) => {
        if (isMountedRef.current) {
          console.log('Changement Swiss Score détecté !', payload);
          fetchData();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist', filter: `tournament_id=eq.${id}` }, () => {
        if (isMountedRef.current) {
          fetchData();
        }
      })
      .subscribe();

    // Écouteur pour forcer la mise à jour depuis le MatchLobby (Custom Event)
    const handleMatchUpdate = (event) => {
      if (event.detail.tournamentId === id && isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchData();
          }
        }, 300);
      }
    };
    
    window.addEventListener('tournament-match-updated', handleMatchUpdate);

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
      window.removeEventListener('tournament-match-updated', handleMatchUpdate);
      // Incrémenter la version pour ignorer les requêtes en cours
      fetchDataVersionRef.current += 1;
    };
  }, [id, fetchData, supabase]);

  // ==============================================================================
  // 2. LOGIQUE DE GÉNÉRATION (ARBRE & MATCHS)
  // ==============================================================================

  const startTournament = async () => {
    if (participants.length < 2) {
      toast.error("Il faut au moins 2 équipes pour lancer !");
      return;
    }
    if (!confirm("Lancer le tournoi ? Plus aucune inscription ne sera possible.")) return;
    
    setLoading(true);

    // On ne garde que les équipes prêtes (Checked-in)
    const checkedInParticipants = participants.filter(p => p.checked_in && !p.disqualified);
    
    if (checkedInParticipants.length < 2) {
      toast.warning("Moins de 2 équipes ont fait leur check-in. Impossible de lancer.");
      setLoading(false);
      return;
    }

    // Utiliser uniquement les équipes check-in pour créer les matchs
    const participantsForMatches = checkedInParticipants;

    // Générer l'arbre
    await generateBracketInternal(participantsForMatches);

    // Mettre à jour le statut
    await supabase.from('tournaments').update({ status: 'ongoing' }).eq('id', id);
    setLoading(false);
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
    
    await fetchData();
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
    fetchData();
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
    fetchData();
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
    
    fetchData();
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
      fetchData();
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
    fetchData();
  };

  // ==============================================================================
  // 3. LOGIQUE DE JEU & PROGRESSION
  // ==============================================================================

  const handleMatchClick = (match) => {
    // Règles de clic : Admin ouvre modal, Joueur ouvre Lobby
    if (tournoi.format !== 'double_elimination' && (!match.player1_id || !match.player2_id)) return;
    if (tournoi.format === 'double_elimination' && !match.player1_id && !match.player2_id) return;

    if (isOwner) {
      setCurrentMatch(match);
      setScoreA(match.score_p1 || 0);
      setScoreB(match.score_p2 || 0);
      setIsModalOpen(true);
    } else {
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
      fetchData();
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
    fetchData();
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

  const getStandings = () => {
    if (!participants || !matches) return [];
    const stats = participants.map(p => ({ ...p, played: 0, wins: 0, draws: 0, losses: 0, points: 0, goalDiff: 0 }));

    matches.filter(m => m.status === 'completed').forEach(m => {
      const p1 = stats.find(p => p.team_id === m.player1_id);
      const p2 = stats.find(p => p.team_id === m.player2_id);
      if (!p1 || !p2) return;

      p1.played++; p2.played++;
      const diff = m.score_p1 - m.score_p2;
      p1.goalDiff += diff; p2.goalDiff -= diff;

      if (m.score_p1 > m.score_p2) { p1.wins++; p1.points += 3; p2.losses++; }
      else if (m.score_p2 > m.score_p1) { p2.wins++; p2.points += 3; p1.losses++; }
      else { p1.draws++; p1.points++; p2.draws++; p2.points++; }
    });

    return stats.sort((a, b) => (b.points - a.points) || (b.goalDiff - a.goalDiff));
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  // ==============================================================================
  // 4. RENDU (UI)
  // ==============================================================================

  if (loading) return (
    <DashboardLayout session={session}>
      <div className="text-fluky-text font-body text-center py-20">Chargement...</div>
    </DashboardLayout>
  );
  if (!tournoi) return (
    <DashboardLayout session={session}>
      <div className="text-fluky-text font-body text-center py-20">Tournoi introuvable</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-7xl mx-auto">
        {/* --- HEADER --- */}
        <div className="flex justify-between items-center border-b-4 border-fluky-secondary pb-5 mb-8">
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
              className="px-4 py-2 bg-transparent border-2 border-fluky-primary text-fluky-text rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 hover:bg-fluky-primary hover:border-fluky-secondary mb-3"
            >
              ← Retour
            </button>
            <h1 className="font-display text-4xl text-fluky-secondary m-0" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>{tournoi.name}</h1>
          </div>
          <div className="text-right flex flex-col gap-3 items-end">
            <div className={`font-bold font-body ${tournoi.status === 'draft' ? 'text-fluky-accent-orange' : 'text-fluky-primary'}`}>
              {winnerName ? '🏆 TERMINÉ' : (tournoi.status === 'draft' ? '🟠 Inscriptions Ouvertes' : '🟢 En cours')}
            </div>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={copyPublicLink} 
                className="px-4 py-2 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display text-sm uppercase tracking-wide font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50"
              >
                🔗 Lien Public
              </button>
              {tournoi.status === 'completed' && (
                <button 
                  type="button"
                  onClick={exportToPDF} 
                  className="px-4 py-2 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display text-sm uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50"
                >
                  📄 Export PDF
                </button>
              )}
            </div>
          </div>
        </div>

      {winnerName && (
          <div style={{background: 'linear-gradient(135deg, rgba(193, 4, 104, 0.3) 0%, rgba(255, 54, 163, 0.2) 100%)', color:'#F8F6F2', padding:'20px', borderRadius:'12px', textAlign:'center', marginBottom:'30px', border: '2px solid #FF36A3'}}>
              <h2 style={{margin:0, fontFamily: "'Shadows Into Light', cursive", color: '#FF36A3', fontSize: '1.8rem'}}>👑 VAINQUEUR : {winnerName} 👑</h2>
          </div>
      )}

      {/* --- RÈGLEMENT --- */}
      {tournoi.rules && (
        <div style={{ background: 'rgba(3, 9, 19, 0.9)', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '2px solid #FF36A3' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#FF36A3', borderBottom: '2px solid #FF36A3', paddingBottom: '10px', fontFamily: "'Shadows Into Light', cursive" }}>📋 Règlement du Tournoi</h3>
          <div style={{ 
            color: '#F8F6F2', 
            lineHeight: '1.6', 
            whiteSpace: 'pre-wrap',
            fontFamily: "'Protest Riot', sans-serif",
            fontSize: '0.95rem'
          }}>
            {tournoi.rules}
          </div>
        </div>
      )}

      {/* --- INFORMATIONS D'INSCRIPTION --- */}
      {(tournoi.max_participants || tournoi.registration_deadline) && tournoi.status === 'draft' && (
        <div style={{ background: 'rgba(3, 9, 19, 0.9)', padding: '15px', borderRadius: '12px', marginBottom: '30px', borderLeft: '4px solid #E7632C', border: '2px solid #FF36A3' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>🚪 Informations d'Inscription</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
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
          onUpdate={fetchData}
          onScheduleMatch={(match) => {
            setSchedulingMatch(match);
            setIsSchedulingModalOpen(true);
          }}
        />
      )}
      
        {shouldShowAdminFeatures && tournoi.status === 'draft' && (
          <div className="bg-[#030913]/60 backdrop-blur-md border-l-4 border-purple-500 p-5 rounded-lg mb-8 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-fluky-text font-body">{participants.length} équipes inscrites.</span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsSeedingModalOpen(true)} 
                  className="px-5 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black border-none rounded-lg cursor-pointer font-bold transition-all duration-300 hover:scale-105"
                >
                  🎯 God Mode - Seeding
                </button>
                <button 
                  onClick={startTournament} 
                  className="px-5 py-3 bg-purple-600 text-white border-none rounded-lg cursor-pointer font-bold transition-all duration-300 hover:scale-105 hover:bg-purple-700"
                >
                  Générer l'Arbre et Lancer
                </button>
              </div>
            </div>
            {participants.some(p => p.seed_order !== null) && (
              <div className="bg-[#030913]/60 p-3 rounded-lg text-sm text-green-400 border-l-4 border-green-400 font-body">
                ✅ Seeding configuré.
              </div>
            )}
          </div>
        )}

        {/* --- ACTIONS JOUEURS (Inscription / Check-in) --- */}
        {tournoi.status === 'draft' && (
          <div className="mb-5 flex gap-3 items-center">
            <TeamJoinButton tournamentId={id} supabase={supabase} session={session} onJoinSuccess={fetchData} tournament={tournoi} />
            <CheckInButton tournamentId={id} supabase={supabase} session={session} tournament={tournoi} />
          </div>
        )}

        <div className="flex gap-10 flex-wrap items-start">
          
          {/* --- COLONNE GAUCHE : ÉQUIPES & CHAT --- */}
          <div className="flex-1 min-w-[300px] max-w-[400px] bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-lg">
            <div className="p-4 border-b border-white/5">
              <h3 className="font-display text-xl text-fluky-text m-0 mb-2">Équipes ({participants.length})</h3>
              {shouldShowAdminFeatures && tournoi.status === 'draft' && (
                <div className="text-xs text-fluky-text/70 flex gap-4 flex-wrap font-body">
                  <span className="text-green-400">✅ Check-in: {participants.filter(p => p.checked_in).length}</span>
                  <span className="text-gray-400">⏳ En attente: {participants.filter(p => !p.checked_in && !p.disqualified).length}</span>
                  {participants.filter(p => p.disqualified).length > 0 && (
                    <span className="text-red-400">❌ DQ: {participants.filter(p => p.disqualified).length}</span>
                  )}
                </div>
              )}
            </div>
            <ul className="list-none p-0 m-0 max-h-[300px] overflow-y-auto">
              {participants.map(p => (
                <li 
                  key={p.id} 
                  className={`p-3 border-b border-white/5 flex justify-between items-center ${
                    p.checked_in ? 'bg-green-900/20' : (p.disqualified ? 'bg-red-900/20' : 'bg-transparent')
                  }`}
                >
                  <div className="flex gap-3 items-center flex-1">
                    <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-xs font-bold text-fluky-text">
                      {p.teams?.tag || '?'}
                    </div>
                    <span className={`font-body ${
                      p.disqualified ? 'text-red-400' : (p.checked_in ? 'text-green-400' : 'text-fluky-text/70')
                    }`}>
                      {p.teams?.name || 'Inconnu'}
                    </span>
                    {/* Indicateur de statut */}
                    {isOwner && tournoi.status === 'draft' && (
                      <span className={`text-xs px-2 py-1 rounded-full text-white font-bold font-body ${
                        p.checked_in ? 'bg-green-500' : (p.disqualified ? 'bg-red-500' : 'bg-gray-500')
                      }`}>
                        {p.checked_in ? '✅ Check-in' : (p.disqualified ? '❌ DQ' : '⏳ En attente')}
                      </span>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex gap-2 items-center">
                      {tournoi.status === 'draft' && (
                        <button
                          onClick={() => handleAdminCheckIn(p.id, p.checked_in)}
                          className={`px-3 py-1 text-white border-none rounded-lg cursor-pointer text-xs font-bold transition-all duration-300 hover:scale-105 ${
                            p.checked_in ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                          title={p.checked_in ? 'Retirer le check-in' : 'Valider le check-in'}
                        >
                          {p.checked_in ? '↩️ Retirer' : '✅ Check-in'}
                        </button>
                      )}
                      <button 
                        onClick={()=>removeParticipant(p.id)} 
                        className="text-red-400 bg-none border-none cursor-pointer text-xl hover:text-red-500 transition-colors" 
                        title="Exclure cette équipe"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          
            {/* LISTE D'ATTENTE */}
            {shouldShowAdminFeatures && waitlist.length > 0 && tournoi.status === 'draft' && (
              <>
                <div className="border-t border-white/5 p-4 border-b border-white/5 bg-white/5">
                  <h3 className="m-0 text-sm text-yellow-400 font-body">⏳ Liste d'Attente ({waitlist.length})</h3>
                </div>
                <ul className="list-none p-0 m-0 max-h-[200px] overflow-y-auto">
                  {waitlist.map((w) => {
                    const canPromote = !tournoi?.max_participants || participants.length < tournoi.max_participants;
                    return (
                      <li key={w.id} className="p-3 border-b border-white/5 flex justify-between items-center bg-black/30 opacity-90">
                        <div className="flex gap-3 items-center flex-1">
                          <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
                            {w.position}
                          </div>
                          <div className="w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-xs font-bold text-fluky-text">
                            {w.teams?.tag || '?'}
                          </div>
                          <span className="text-sm text-fluky-text/70 font-body">{w.teams?.name || 'Inconnu'}</span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <span className="text-xs text-fluky-text/50 font-body">Position #{w.position}</span>
                          {canPromote && (
                            <button
                              onClick={() => {
                                if (confirm(`Promouvoir "${w.teams?.name || 'cette équipe'}" depuis la liste d'attente ?`)) {
                                  promoteTeamFromWaitlist(w.id, w.team_id);
                                }
                              }}
                              className="px-3 py-1 bg-green-500 text-white border-none rounded-lg cursor-pointer text-xs font-bold transition-all duration-300 hover:scale-105 hover:bg-green-600"
                            >
                              ✅ Promouvoir
                            </button>
                          )}
                          {!canPromote && (
                            <span className="text-xs text-fluky-text/50 italic font-body">Complet</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            
            <div className="border-t border-white/5 p-4">
              <h3 className="font-display text-lg text-fluky-text m-0 mb-3">💬 Chat Lobby</h3>
              <div className="h-[400px] flex flex-col">
                <Chat tournamentId={id} session={session} supabase={supabase} />
              </div>
            </div>
          </div>

          {/* --- COLONNE DROITE : CLASSEMENT & ARBRE --- */}
          <div className="flex-[3] min-w-[300px] overflow-x-auto">
              
              {/* Table Swiss System */}
              {tournoi?.format === 'swiss' && swissScores.length > 0 && (
                <div className="mb-10 bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-display text-2xl text-fluky-text m-0 border-b border-white/5 pb-3">🇨🇭 Classement Suisse</h2>
                  {isOwner && tournoi.status === 'ongoing' && (
                    <button 
                      onClick={generateNextSwissRound}
                      style={{ padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ➕ Générer Round Suivant
                    </button>
                  )}
                </div>
                  <table className="w-full border-collapse text-white">
                    <thead>
                      <tr className="bg-black/50 text-left">
                        <th className="p-3">Rang</th>
                        <th className="p-3">Équipe</th>
                        <th className="p-3 text-center">Victoires</th>
                        <th className="p-3 text-center">Défaites</th>
                        <th className="p-3 text-center">Nuls</th>
                        <th className="p-3 text-center">Buchholz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const standings = swissScores.sort((a, b) => {
                          if (b.wins !== a.wins) return b.wins - a.wins;
                          if (b.buchholz_score !== a.buchholz_score) return b.buchholz_score - a.buchholz_score;
                          return a.team_id.localeCompare(b.team_id);
                        });
                        return standings.map((score, index) => {
                          const team = participants.find(p => p.team_id === score.team_id);
                          return (
                            <tr key={score.id} className="border-b border-white/5">
                              <td className={`p-3 ${index === 0 ? 'font-bold text-yellow-400' : 'text-white'}`}>
                                #{index + 1}
                              </td>
                              <td className="p-3 flex items-center gap-3">
                                <img 
                                  src={team?.teams?.logo_url || `https://ui-avatars.com/api/?name=${team?.teams?.tag || '?'}`} 
                                  className="w-6 h-6 rounded-full" 
                                  alt=""
                                />
                                <span className="font-body">{team?.teams?.name || 'Inconnu'}</span>
                              </td>
                              <td className="p-3 text-center text-green-400 font-bold">{score.wins}</td>
                              <td className="p-3 text-center text-red-400">{score.losses}</td>
                              <td className="p-3 text-center text-yellow-400">{score.draws}</td>
                              <td className="p-3 text-center text-blue-400">{parseFloat(score.buchholz_score || 0).toFixed(1)}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

            {/* Table Round Robin */}
            {tournoi?.format === 'round_robin' && (
                <div style={{ marginBottom: '40px', background: '#1a1a1a', borderRadius: '15px', padding: '20px', border: '1px solid #333' }}>
                <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginTop: 0 }}>🏆 Classement</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                    <thead>
                    <tr style={{ background: '#252525', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Rang</th>
                        <th style={{ padding: '10px' }}>Équipe</th>
                        <th style={{ padding: '10px', textAlign:'center' }}>Pts</th>
                        <th style={{ padding: '10px', textAlign:'center' }}>J</th>
                        <th style={{ padding: '10px', textAlign:'center' }}>V</th>
                        <th style={{ padding: '10px', textAlign:'center' }}>N</th>
                        <th style={{ padding: '10px', textAlign:'center' }}>D</th>
                    </tr>
                    </thead>
                    <tbody>
                    {getStandings().map((team, index) => (
                        <tr key={team.id} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: '10px', color: index === 0 ? '#f1c40f' : 'white' }}>#{index + 1}</td>
                        <td style={{ padding: '10px', display:'flex', alignItems:'center', gap:'10px' }}>
                            <img src={team.teams?.logo_url || `https://ui-avatars.com/api/?name=${team.teams?.tag}`} style={{width:'24px', height:'24px', borderRadius:'50%'}} alt=""/>
                            {team.teams?.name}
                        </td>
                        <td style={{ padding: '10px', textAlign:'center', color:'#4ade80' }}>{team.points}</td>
                        <td style={{ padding: '10px', textAlign:'center', color:'#888' }}>{team.played}</td>
                        <td style={{ padding: '10px', textAlign:'center' }}>{team.wins}</td>
                        <td style={{ padding: '10px', textAlign:'center' }}>{team.draws}</td>
                        <td style={{ padding: '10px', textAlign:'center' }}>{team.losses}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}

            {/* Arbres Visuels */}
            {matches.length > 0 ? (
                tournoi.format === 'double_elimination' ? (
                <div style={{display:'flex', gap:'40px', paddingBottom:'20px'}}>
                    {/* Winners */}
                    <div style={{flex: 1}}>
                    <h3 style={{textAlign:'center', color:'#4ade80'}}>🏆 Winners Bracket</h3>
                    <div style={{display:'flex', gap:'40px'}}>
                        {[...new Set(matches.filter(m => m.bracket_type === 'winners').map(m=>m.round_number))].sort().map(round => (
                        <div key={`winners-${round}`} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                            {matches.filter(m => m.bracket_type === 'winners' && m.round_number === round).map(m => (
                                <MatchCard key={m.id} match={m} onClick={handleMatchClick} isOwner={isOwner} />
                            ))}
                        </div>
                        ))}
                    </div>
                    </div>
                    {/* Losers */}
                    <div style={{flex: 1}}>
                    <h3 style={{textAlign:'center', color:'#e74c3c'}}>💀 Losers Bracket</h3>
                    <div style={{display:'flex', gap:'40px'}}>
                        {[...new Set(matches.filter(m => m.bracket_type === 'losers').map(m=>m.round_number))].sort().map(round => (
                        <div key={`losers-${round}`} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                            {matches.filter(m => m.bracket_type === 'losers' && m.round_number === round).map(m => (
                                <MatchCard key={m.id} match={m} onClick={handleMatchClick} isOwner={isOwner} />
                            ))}
                        </div>
                        ))}
                    </div>
                    {/* Grand Finals */}
                    {matches.filter(m => !m.bracket_type && !m.is_reset).length > 0 && (
                        <div style={{marginTop:'40px', paddingTop:'20px', borderTop:'2px solid #444'}}>
                            <h3 style={{textAlign:'center', color:'#f1c40f'}}>🏅 Grand Finals</h3>
                            <div style={{display:'flex', justifyContent:'center'}}>
                                {matches.filter(m => !m.bracket_type && !m.is_reset).map(m => (
                                    <MatchCard key={m.id} match={m} onClick={handleMatchClick} isOwner={isOwner} />
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Reset Match (affiché seulement s'il est nécessaire) */}
                    {matches.filter(m => m.is_reset && m.player1_id && m.player2_id).length > 0 && (
                        <div style={{marginTop:'20px', paddingTop:'20px', borderTop:'2px solid #444'}}>
                            <h4 style={{textAlign:'center', color:'#f39c12', marginBottom:'10px'}}>🔄 Reset Match</h4>
                            <div style={{display:'flex', justifyContent:'center'}}>
                                {matches.filter(m => m.is_reset).map(m => (
                                    <MatchCard key={m.id} match={m} onClick={handleMatchClick} isOwner={isOwner} />
                                ))}
                            </div>
                        </div>
                    )}
                    </div>
                </div>
                ) : tournoi.format === 'swiss' ? (
                // Swiss System (affichage par rounds)
                <div style={{display:'flex', gap:'40px', paddingBottom:'20px'}}>
                    {[...new Set(matches.map(m=>m.round_number))].sort().map(round => (
                    <div key={round} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                        <h4 style={{textAlign:'center', color:'#3498db', fontWeight:'bold'}}>🇨🇭 Round {round}</h4>
                        {matches.filter(m=>m.round_number === round && m.bracket_type === 'swiss').map(m => (
                            <MatchCard key={m.id} match={m} onClick={handleMatchClick} isOwner={isOwner} />
                        ))}
                    </div>
                    ))}
                </div>
                ) : (
                // Single Elimination ou Round Robin (vue simple)
                <div style={{display:'flex', gap:'40px', paddingBottom:'20px'}}>
                    {[...new Set(matches.map(m=>m.round_number))].sort().map(round => (
                    <div key={round} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                        <h4 style={{textAlign:'center', color:'#666'}}>Round {round}</h4>
                        {matches.filter(m=>m.round_number === round).map(m => (
                            <MatchCard key={m.id} match={m} onClick={handleMatchClick} isOwner={isOwner} />
                        ))}
                    </div>
                    ))}
                </div>
                )
            ) : (
                <div style={{textAlign:'center', padding:'50px', border:'2px dashed #333', borderRadius:'8px', color:'#666'}}>
                Les brackets apparaîtront une fois le tournoi lancé.
                </div>
            )}
        </div>
      </div>

      {/* MODALES */}
      {isModalOpen && currentMatch && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999}}>
            <div style={{background:'#2a2a2a', padding:'30px', borderRadius:'12px', width:'300px', border:'1px solid #444'}}>
                <h3 style={{textAlign:'center'}}>Score Admin</h3>
                <div style={{display:'flex', justifyContent:'space-between', margin:'20px 0'}}>
                    <input type="number" value={scoreA} onChange={e=>setScoreA(e.target.value)} style={{width:'50px', padding:'10px', background:'#111', color:'white', border:'none'}} />
                    <span>-</span>
                    <input type="number" value={scoreB} onChange={e=>setScoreB(e.target.value)} style={{width:'50px', padding:'10px', background:'#111', color:'white', border:'none'}} />
                </div>
                <button onClick={saveScore} style={{width:'100%', padding:'10px', background:'#4ade80', border:'none', cursor:'pointer'}}>Valider & Avancer</button>
                <button onClick={()=>setIsModalOpen(false)} style={{width:'100%', padding:'10px', background:'transparent', border:'none', color:'#ccc', marginTop:'10px', cursor:'pointer'}}>Annuler</button>
            </div>
        </div>
      )}

        <SeedingModal isOpen={isSeedingModalOpen} onClose={() => setIsSeedingModalOpen(false)} participants={participants} tournamentId={id} supabase={supabase} onSave={() => fetchData()} />
        
        <SchedulingModal 
          isOpen={isSchedulingModalOpen} 
          onClose={() => {
            setIsSchedulingModalOpen(false);
            setSchedulingMatch(null);
          }} 
          match={schedulingMatch}
          supabase={supabase} 
          onSave={() => fetchData()} 
        />
      </div>
    </DashboardLayout>
  );
}

// Petit sous-composant pour alléger le rendu (Render pur)
function MatchCard({ match, onClick, isOwner }) {
    const hasDisqualified = match.p1_disqualified || match.p2_disqualified;
    const isCompleted = match.status === 'completed';
    const isScheduled = match.scheduled_at && !isCompleted;
    
    return (
        <div onClick={()=>onClick(match)} style={{
            width:'240px', 
            background: hasDisqualified ? '#3a1a1a' : (match.bracket_type === 'losers' ? '#1a1a1a' : '#252525'), 
            border: hasDisqualified ? '1px solid #e74c3c' : (isCompleted ? '1px solid #4ade80' : (isScheduled ? '1px solid #3498db' : '1px solid #444')), 
            borderRadius:'8px', 
            cursor: isOwner ? 'pointer' : 'default', 
            position:'relative',
            opacity: hasDisqualified ? 0.7 : 1
        }}>
            {/* Badge Date planifiée */}
            {isScheduled && (
                <div style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    background: '#3498db',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    zIndex: 10
                }}>
                    📅 {new Date(match.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            )}
            {/* J1 */}
            <div style={{padding:'10px', display:'flex', justifyContent:'space-between', alignItems:'center', background: match.score_p1 > match.score_p2 ? '#2f3b2f' : 'transparent', borderRadius:'8px 8px 0 0'}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', overflow:'hidden'}}>
                    {match.player1_id && <img src={match.p1_avatar} style={{width:'20px', height:'20px', borderRadius:'50%'}} alt="" />}
                    <span style={{fontSize:'0.9rem', whiteSpace:'nowrap', textDecoration: match.p1_disqualified ? 'line-through' : 'none', color: match.p1_disqualified ? '#e74c3c' : 'white'}}>
                        {match.p1_name.split(' [')[0]}
                    </span>
                </div>
                <span style={{fontWeight:'bold'}}>{match.score_p1}</span>
            </div>
            {/* J2 */}
            <div style={{padding:'10px', display:'flex', justifyContent:'space-between', alignItems:'center', background: match.score_p2 > match.score_p1 ? '#2f3b2f' : 'transparent', borderRadius:'0 0 8px 8px', borderTop:'1px solid #333'}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', overflow:'hidden'}}>
                    {match.player2_id && <img src={match.p2_avatar} style={{width:'20px', height:'20px', borderRadius:'50%'}} alt="" />}
                    <span style={{fontSize:'0.9rem', whiteSpace:'nowrap', textDecoration: match.p2_disqualified ? 'line-through' : 'none', color: match.p2_disqualified ? '#e74c3c' : 'white'}}>
                        {match.p2_name.split(' [')[0]}
                    </span>
                </div>
                <span style={{fontWeight:'bold'}}>{match.score_p2}</span>
            </div>
        </div>
    );
}