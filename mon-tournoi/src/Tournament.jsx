import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function Tournament({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // États de données
  const [tournoi, setTournoi] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swissScores, setSwissScores] = useState([]);

  // États d'interface (Modales & Admin)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [winnerName, setWinnerName] = useState(null);
  const [isSeedingModalOpen, setIsSeedingModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [schedulingMatch, setSchedulingMatch] = useState(null);

  const isOwner = tournoi && session && tournoi.owner_id === session.user.id;

  // ==============================================================================
  // 1. CHARGEMENT DES DONNÉES ET REALTIME
  // ==============================================================================

  useEffect(() => {
    fetchData();

    // Abonnement aux changements Supabase (Matchs, Participants, Tournoi)
  // Abonnement aux changements Supabase
  const channel = supabase.channel('tournament-updates')
    // A. Écouter les matchs
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` }, () => fetchData())
    // B. Écouter les participants
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${id}` }, () => fetchData())
    // C. Écouter le tournoi global
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` }, () => fetchData())
    // 👇 D. AJOUT CRUCIAL : Écouter les scores suisses 👇
    .on('postgres_changes', { event: '*', schema: 'public', table: 'swiss_scores', filter: `tournament_id=eq.${id}` }, (payload) => {
        console.log('Changement Swiss Score détecté !', payload);
        fetchData();
    })
    .subscribe();

    // Écouteur pour forcer la mise à jour depuis le MatchLobby (Custom Event)
    const handleMatchUpdate = (event) => {
      if (event.detail.tournamentId === id) {
        setTimeout(() => fetchData(), 300); // Petit délai de sécurité
      }
    };
    
    window.addEventListener('tournament-match-updated', handleMatchUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('tournament-match-updated', handleMatchUpdate);
    };
  }, [id]);

  const fetchData = async () => {
    try {
      // 1. Tournoi
      const { data: tData } = await supabase.from('tournaments').select('*').eq('id', id).single();
      setTournoi(tData);

      // 2. Participants (avec Teams)
      const { data: pData } = await supabase
        .from('participants')
        .select('*, teams(*)')
        .eq('tournament_id', id)
        .order('seed_order', { ascending: true, nullsLast: true });
      setParticipants(pData || []);

      // 3. Matchs
      const { data: mData } = await supabase.from('matches').select('*').eq('tournament_id', id).order('match_number');

      if (mData && mData.length > 0 && pData) {
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
        
        setMatches(enrichedMatches);
        
        // Charger les scores suisses si format suisse
        if (tData?.format === 'swiss') {
          const scores = await getSwissScores(supabase, id);
          setSwissScores(scores);
        } else {
          setSwissScores([]);
        }
        
        // Détection vainqueur final
        const lastMatch = enrichedMatches.find(m => !m.bracket_type && !m.is_reset && m.status === 'completed' && enrichedMatches.every(om => om.round_number <= m.round_number));
        // Note: La détection du vainqueur est gérée plus finement par le confetti trigger, mais ceci sert à l'affichage header
        if (tData.status === 'completed' && lastMatch) {
            const winner = lastMatch.score_p1 > lastMatch.score_p2 ? lastMatch.p1_name : lastMatch.p2_name;
            setWinnerName(winner);
        }
      }
    } catch (error) {
      console.error("Erreur fetchData:", error);
    } finally {
      setLoading(false);
    }
  };

  // ==============================================================================
  // 2. LOGIQUE DE GÉNÉRATION (ARBRE & MATCHS)
  // ==============================================================================

  const startTournament = async () => {
    if (participants.length < 2) return alert("Il faut au moins 2 équipes pour lancer !");
    if (!confirm("Lancer le tournoi ? Plus aucune inscription ne sera possible.")) return;
    
    setLoading(true);

    // On ne garde que les équipes prêtes (Checked-in)
    const checkedInParticipants = participants.filter(p => p.checked_in && !p.disqualified);
    
    if (checkedInParticipants.length < 2) {
      alert("⚠️ Moins de 2 équipes ont fait leur check-in. Impossible de lancer.");
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
    if (matchError) alert("Erreur création matchs : " + matchError.message);
    
    await fetchData();
  };

  const removeParticipant = async (pid) => {
    if (!confirm("Exclure cette équipe ?")) return;
    await supabase.from('participants').delete().eq('id', pid);
    fetchData();
  };

  const copyPublicLink = () => {
    const publicUrl = `${window.location.origin}/tournament/${id}/public`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      alert('✅ Lien public copié dans le presse-papier !');
    }).catch(() => {
      alert('Erreur lors de la copie du lien');
    });
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
      alert('⚠️ Tous les matchs du round actuel doivent être terminés avant de générer le round suivant.');
      return;
    }
    
    // Calculer le nombre de rounds (généralement log2(nombre d'équipes))
    const numTeams = participants.length;
    const totalRounds = Math.ceil(Math.log2(numTeams));
    
    if (maxRound >= totalRounds) {
      // Tournoi terminé
      await supabase.from('tournaments').update({ status: 'completed' }).eq('id', id);
      triggerConfetti();
      alert('🏆 Tous les rounds sont terminés ! Le tournoi est complété.');
      fetchData();
      return;
    }
    
    // Générer les paires pour le round suivant
    const pairs = swissPairing(swissScores, allMatches || []);
    
    if (pairs.length === 0) {
      alert('⚠️ Impossible de générer des paires. Vérifiez les scores suisses.');
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
      alert('Erreur lors de la création du round : ' + error.message);
      return;
    }
    
    alert(`✅ Round ${nextRound} généré avec ${pairs.length} matchs !`);
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

    if (error) return alert('Erreur score : ' + error.message);

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

  if (loading) return <div style={{color:'white', padding:'20px'}}>Chargement...</div>;
  if (!tournoi) return <div style={{color:'white'}}>Tournoi introuvable</div>;

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '100%', margin: '0 auto', fontFamily: 'Arial' }}>
      
      {/* --- HEADER --- */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #333', paddingBottom:'20px', marginBottom:'30px'}}>
        <div>
           <button onClick={() => navigate('/dashboard')} style={{background:'transparent', border:'1px solid #444', color:'#888', padding:'5px 10px', borderRadius:'4px', cursor:'pointer', marginBottom:'10px'}}>← Retour</button>
           <h1 style={{ margin: 0, color: '#00d4ff' }}>{tournoi.name}</h1>
        </div>
        <div style={{textAlign:'right', display:'flex', flexDirection:'column', gap:'10px', alignItems:'flex-end'}}>
           <div style={{fontWeight:'bold', color: tournoi.status === 'draft' ? 'orange' : '#4ade80'}}>
             {winnerName ? '🏆 TERMINÉ' : (tournoi.status === 'draft' ? '🟠 Inscriptions Ouvertes' : '🟢 En cours')}
           </div>
           <button 
             onClick={copyPublicLink} 
             style={{
               background:'#3498db', 
               color:'white', 
               border:'none', 
               padding:'8px 16px', 
               borderRadius:'4px', 
               cursor:'pointer', 
               fontSize:'0.9rem',
               fontWeight:'bold'
             }}
           >
             🔗 Lien Public
           </button>
        </div>
      </div>

      {winnerName && (
          <div style={{background: 'linear-gradient(45deg, #FFD700, #FFA500)', color:'black', padding:'20px', borderRadius:'8px', textAlign:'center', marginBottom:'30px'}}>
              <h2 style={{margin:0}}>👑 VAINQUEUR : {winnerName} 👑</h2>
          </div>
      )}

      {/* --- ADMIN CONTROLS --- */}
      {isOwner && tournoi.status === 'ongoing' && (
        <AdminPanel 
          tournamentId={id} 
          supabase={supabase} 
          session={session} 
          participants={participants} 
          matches={matches} 
          onUpdate={fetchData}
          onScheduleMatch={(match) => {
            setSchedulingMatch(match);
            setIsSchedulingModalOpen(true);
          }}
        />
      )}
      
      {isOwner && tournoi.status === 'draft' && (
        <div style={{ background: '#222', padding: '20px', borderRadius: '8px', marginBottom: '30px', borderLeft:'4px solid #8e44ad' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' }}>
          <span>{participants.length} équipes inscrites.</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsSeedingModalOpen(true)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #f1c40f, #e67e22)', color: '#000', border: 'none', borderRadius: '4px', cursor:'pointer', fontWeight: 'bold' }}>
                🎯 God Mode - Seeding
              </button>
              <button onClick={startTournament} style={{ padding: '10px 20px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer', fontWeight: 'bold' }}>
                Générer l'Arbre et Lancer
              </button>
            </div>
          </div>
          {participants.some(p => p.seed_order !== null) && (
            <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '5px', fontSize: '0.9rem', color: '#4ade80', borderLeft: '3px solid #4ade80' }}>
              ✅ Seeding configuré.
            </div>
          )}
        </div>
      )}

      {/* --- ACTIONS JOUEURS (Inscription / Check-in) --- */}
      {tournoi.status === 'draft' && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <TeamJoinButton tournamentId={id} supabase={supabase} session={session} onJoinSuccess={fetchData} />
          <CheckInButton tournamentId={id} supabase={supabase} session={session} tournament={tournoi} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems:'flex-start' }}>
        
        {/* --- COLONNE GAUCHE : ÉQUIPES & CHAT --- */}
        <div style={{ flex: '1', minWidth: '300px', maxWidth: '400px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
          <div style={{padding:'15px', borderBottom:'1px solid #333'}}>
            <h3 style={{margin:0}}>Équipes ({participants.length})</h3>
          </div>
          <ul style={{listStyle:'none', padding:0, margin:0, maxHeight:'300px', overflowY:'auto'}}>
            {participants.map(p => (
                <li key={p.id} style={{padding:'10px 15px', borderBottom:'1px solid #2a2a2a', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                        <div style={{width:'30px', height:'30px', background:'#444', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:'bold'}}>
                            {p.teams?.tag || '?'}
                        </div>
                        <span>{p.teams?.name || 'Inconnu'}</span>
                    </div>
                    {isOwner && <button onClick={()=>removeParticipant(p.id)} style={{color:'#e74c3c', background:'none', border:'none', cursor:'pointer'}}>✕</button>}
                </li>
            ))}
          </ul>
          
          <div style={{ borderTop: '1px solid #333', padding: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>💬 Chat Lobby</h3>
            <Chat tournamentId={id} session={session} supabase={supabase} />
          </div>
        </div>

        {/* --- COLONNE DROITE : CLASSEMENT & ARBRE --- */}
        <div style={{ flex: '3', minWidth:'300px', overflowX:'auto' }}>
            
            {/* Table Swiss System */}
            {tournoi?.format === 'swiss' && swissScores.length > 0 && (
              <div style={{ marginBottom: '40px', background: '#1a1a1a', borderRadius: '15px', padding: '20px', border: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h2 style={{ margin: 0, borderBottom: '1px solid #444', paddingBottom: '10px' }}>🇨🇭 Classement Suisse</h2>
                  {isOwner && tournoi.status === 'ongoing' && (
                    <button 
                      onClick={generateNextSwissRound}
                      style={{ padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ➕ Générer Round Suivant
                    </button>
                  )}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                  <thead>
                    <tr style={{ background: '#252525', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Rang</th>
                      <th style={{ padding: '10px' }}>Équipe</th>
                      <th style={{ padding: '10px', textAlign:'center' }}>Victoires</th>
                      <th style={{ padding: '10px', textAlign:'center' }}>Défaites</th>
                      <th style={{ padding: '10px', textAlign:'center' }}>Nuls</th>
                      <th style={{ padding: '10px', textAlign:'center' }}>Buchholz</th>
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
                          <tr key={score.id} style={{ borderBottom: '1px solid #333' }}>
                            <td style={{ padding: '10px', fontWeight: index === 0 ? 'bold' : 'normal', color: index === 0 ? '#f1c40f' : 'white' }}>
                              #{index + 1}
                            </td>
                            <td style={{ padding: '10px', display:'flex', alignItems:'center', gap:'10px' }}>
                              <img src={team?.teams?.logo_url || `https://ui-avatars.com/api/?name=${team?.teams?.tag || '?'}`} style={{width:'24px', height:'24px', borderRadius:'50%'}} alt=""/>
                              {team?.teams?.name || 'Inconnu'}
                            </td>
                            <td style={{ padding: '10px', textAlign:'center', color: '#2ecc71', fontWeight: 'bold' }}>{score.wins}</td>
                            <td style={{ padding: '10px', textAlign:'center', color: '#e74c3c' }}>{score.losses}</td>
                            <td style={{ padding: '10px', textAlign:'center', color: '#f39c12' }}>{score.draws}</td>
                            <td style={{ padding: '10px', textAlign:'center', color: '#3498db' }}>{parseFloat(score.buchholz_score || 0).toFixed(1)}</td>
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