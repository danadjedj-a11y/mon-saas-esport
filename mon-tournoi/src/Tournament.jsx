import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import confetti from 'canvas-confetti';
import TeamJoinButton from './TeamJoinButton';
import CheckInButton from './CheckInButton';
import Chat from './Chat';
import AdminPanel from './AdminPanel';
import SeedingModal from './SeedingModal';

export default function Tournament({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [tournoi, setTournoi] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [winnerName, setWinnerName] = useState(null);
  const [isSeedingModalOpen, setIsSeedingModalOpen] = useState(false);

  const isOwner = tournoi && session && tournoi.owner_id === session.user.id;

  // Ref pour le debounce des updates de matches (pour regrouper plusieurs updates rapides)
  const matchesUpdateTimeoutRef = useRef(null);

useEffect(() => {
    // 1. Chargement initial
    fetchData();

    // 2. Abonnement au canal Temps Réel (Multi-tables)
    const channel = supabase.channel('tournament-updates')
      
      // A. Écouter les changements dans la table MATCHES (Scores, Arbre généré)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` },
        (payload) => {
          // Debounce pour regrouper plusieurs updates rapides (ex: progression Double Elimination fait plusieurs updates)
          // Cela permet de laisser le temps à tous les updates de se terminer avant de recharger
          if (matchesUpdateTimeoutRef.current) {
            clearTimeout(matchesUpdateTimeoutRef.current);
          }
          matchesUpdateTimeoutRef.current = setTimeout(() => {
            fetchData();
          }, 500); // 500ms de délai pour regrouper les updates
        }
      )

      // B. Écouter les changements dans la table PARTICIPANTS (Nouvelle équipe inscrite)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${id}` },
        () => {
          fetchData();
        }
      )

      // C. Écouter les changements dans la table TOURNAMENTS (Statut : Draft -> Ongoing)
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Nettoyage quand on quitte la page
    return () => {
      supabase.removeChannel(channel);
      if (matchesUpdateTimeoutRef.current) {
        clearTimeout(matchesUpdateTimeoutRef.current);
      }
    };
  }, [id]);

  const fetchData = async () => {
    // 1. Charger le tournoi
    const { data: tData } = await supabase.from('tournaments').select('*').eq('id', id).single();
    setTournoi(tData);

    // 2. Charger les participants (AVEC les infos de la TEAM)
    const { data: pData } = await supabase
      .from('participants')
      .select('*, teams(*)') // On récupère tout ce qu'il y a dans 'teams' (nom, tag, logo...)
      .eq('tournament_id', id)
      .order('seed_order', { ascending: true, nullsLast: true }); // Trier par seed_order si disponible
    
    setParticipants(pData || []);

    // 3. Charger les matchs
    // Pour Double Elimination : ordonner par bracket_type (winners, losers, null), puis round_number, puis match_number
    // Pour Single Elimination/Round Robin : ordonner par round_number, puis match_number
    // Note: Supabase permet de chaîner plusieurs .order(), mais on peut aussi trier en JS après
    const { data: mData, error: mError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .order('round_number', { ascending: true })
      .order('match_number', { ascending: true });
    
    if (mError) {
      console.error('Erreur lors du chargement des matchs:', mError);
    }
    
    // Trier en JavaScript pour gérer bracket_type (Supabase peut avoir des problèmes avec nullsLast)
    let sortedMatches = mData || [];
    
    if (sortedMatches.length > 0) {
      sortedMatches = [...sortedMatches].sort((a, b) => {
        // Trier par bracket_type d'abord (winners avant losers, nulls en dernier)
        const bracketOrder = { 'winners': 0, 'losers': 1, null: 2, undefined: 2 };
        const bracketA = bracketOrder[a.bracket_type] ?? 2;
        const bracketB = bracketOrder[b.bracket_type] ?? 2;
        if (bracketA !== bracketB) return bracketA - bracketB;
        
        // Puis par round_number
        if (a.round_number !== b.round_number) return a.round_number - b.round_number;
        
        // Puis par match_number
        return a.match_number - b.match_number;
      });
    }

    if (sortedMatches && sortedMatches.length > 0 && pData) {
      // Créer une map pour accès rapide aux participants
      const participantsMap = new Map(pData.map(p => [p.team_id, p]));
      
      const enrichedMatches = sortedMatches.map(match => {
        // On trouve l'équipe via son ID stocké dans le match
        const p1 = match.player1_id ? participantsMap.get(match.player1_id) : null;
        const p2 = match.player2_id ? participantsMap.get(match.player2_id) : null;
        
        // Vérifier si les équipes sont disqualifiées ou non check-in
        const p1Disqualified = p1?.disqualified || false;
        const p2Disqualified = p2?.disqualified || false;
        const p1NotCheckedIn = p1 && !p1.checked_in;
        const p2NotCheckedIn = p2 && !p2.checked_in;
        
        const getTeamName = (p, isDisqualified, notCheckedIn) => {
          if (!p) return 'En attente';
          let name = `${p.teams.name} [${p.teams.tag}]`;
          if (isDisqualified) name += ' ❌ DQ';
          if (notCheckedIn && !isDisqualified) name += ' ⏳';
          return name;
        };
        
        // NOUVEAU : On utilise le logo_url s'il existe, sinon l'avatar par défaut
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
      
      const lastMatch = enrichedMatches[enrichedMatches.length - 1];
      if (lastMatch && lastMatch.status === 'completed') {
          const winner = lastMatch.score_p1 > lastMatch.score_p2 ? lastMatch.p1_name : lastMatch.p2_name;
          setWinnerName(winner);
      }
    }
    setLoading(false);
  };

  const removeParticipant = async (pid) => {
    if (!confirm("Exclure cette équipe ?")) return;
    await supabase.from('participants').delete().eq('id', pid);
    fetchData(); // Force refresh
  };

  // Fonction interne pour générer l'arbre (réutilisée par startTournament et regenerateBracketIfNeeded)
  const generateBracketInternal = async (participantsList, deleteExisting = true) => {
    if (!tournoi || participantsList.length < 2) return;

    // Supprimer les matchs existants si demandé (par défaut oui pour éviter les doublons)
    if (deleteExisting) {
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .eq('tournament_id', id);
      
      if (deleteError) {
        alert("Erreur lors de la suppression des matchs existants : " + deleteError.message);
        return;
      }
    }

    let matchesToCreate = [];
    
    // Utiliser l'ordre de seeding si disponible, sinon mélanger aléatoirement
    let orderedParticipants = [...participantsList];
    
    // Vérifier si un seeding existe
    const hasSeeding = participantsList.some(p => p.seed_order !== null && p.seed_order !== undefined);
    
    if (hasSeeding) {
      // Trier par seed_order
      orderedParticipants = [...participantsList].sort((a, b) => {
        const seedA = a.seed_order ?? 999;
        const seedB = b.seed_order ?? 999;
        return seedA - seedB;
      });
    } else {
      // Pas de seeding, mélange aléatoire
      orderedParticipants = [...participantsList].sort(() => 0.5 - Math.random());
    }

    // --- CAS 1 : ARBRE (ÉLIMINATION SIMPLE) ---
    if (tournoi.format === 'elimination') {
        let matchCount = 1;
        let activePlayers = orderedParticipants.map(p => p.team_id);
        
        const pairs = [];
        while (activePlayers.length > 0) {
            pairs.push(activePlayers.splice(0, 2));
        }

        pairs.forEach(pair => {
            matchesToCreate.push({
                tournament_id: id,
                match_number: matchCount++,
                round_number: 1,
                player1_id: pair[0] || null,
                player2_id: pair[1] || null,
                status: pair[1] ? 'pending' : 'completed',
                next_match_id: null,
                bracket_type: null
            });
        });
    } 
    
    // --- CAS 2 : DOUBLE ELIMINATION (Implémentation complète) ---
    else if (tournoi.format === 'double_elimination') {
      const teamIds = orderedParticipants.map(p => p.team_id);
      const numTeams = teamIds.length;
      
      if (numTeams < 2) return;
      
      let matchCount = 1;
      const winnersRounds = Math.ceil(Math.log2(numTeams));
      
      // Structure pour tracker les matchs créés
      const winnersMatchesByRound = {}; // { round: [matchNumbers] }
      const losersMatchesByRound = {}; // { round: [matchNumbers] }
      
      // ===========================================
      // ÉTAPE 1 : Générer le bracket WINNERS (comme single elimination)
      // ===========================================
      
      // Round 1 Winners : Paire toutes les équipes
      const pairs = [];
      const teams = [...teamIds];
      while (teams.length > 0) {
        pairs.push(teams.splice(0, 2));
      }
      
      winnersMatchesByRound[1] = [];
      pairs.forEach(pair => {
        const matchNum = matchCount++;
        matchesToCreate.push({
          tournament_id: id,
          match_number: matchNum,
          round_number: 1,
          player1_id: pair[0] || null,
          player2_id: pair[1] || null,
          status: pair[1] ? 'pending' : 'completed',
          bracket_type: 'winners',
          next_match_id: null,
          source_match_id: null,
          is_reset: false
        });
        winnersMatchesByRound[1].push(matchNum);
      });
      
      // Rounds suivants Winners : Créer les matchs vides (seront remplis lors de la progression)
      for (let round = 2; round <= winnersRounds; round++) {
        winnersMatchesByRound[round] = [];
        const prevRoundCount = winnersMatchesByRound[round - 1].length;
        const currentRoundCount = Math.ceil(prevRoundCount / 2);
        
        for (let i = 0; i < currentRoundCount; i++) {
          const matchNum = matchCount++;
          matchesToCreate.push({
            tournament_id: id,
            match_number: matchNum,
            round_number: round,
            player1_id: null,
            player2_id: null,
            status: 'pending',
            bracket_type: 'winners',
            next_match_id: null,
            source_match_id: null,
            is_reset: false
          });
          winnersMatchesByRound[round].push(matchNum);
        }
      }
      
      // ===========================================
      // ÉTAPE 2 : Générer le bracket LOSERS
      // ===========================================
      
      // Losers Round 1 : Perdants du Winners Round 1 (on crée les matchs vides)
      // Les perdants seront placés ici lors de la progression
      losersMatchesByRound[1] = [];
      const losersRound1Count = Math.ceil(winnersMatchesByRound[1].length / 2);
      for (let i = 0; i < losersRound1Count; i++) {
        const matchNum = matchCount++;
        matchesToCreate.push({
          tournament_id: id,
          match_number: matchNum,
          round_number: 1,
          player1_id: null,
          player2_id: null,
          status: 'pending',
          bracket_type: 'losers',
          next_match_id: null,
          source_match_id: null, // Référencera les matchs Winners Round 1
          is_reset: false
        });
        losersMatchesByRound[1].push(matchNum);
      }
      
      // Losers Rounds suivants : Créer les matchs vides
      // Losers Round N reçoit : perdants Winners Round N+1 + gagnants Losers Round N-1
      for (let round = 2; round < winnersRounds; round++) {
        losersMatchesByRound[round] = [];
        // Nombre de matchs = max(perdants Winners Round round, gagnants Losers Round round-1)
        const losersFromWinners = winnersMatchesByRound[round].length;
        const winnersFromLosers = Math.ceil(losersMatchesByRound[round - 1].length / 2);
        const totalLosersMatches = Math.max(losersFromWinners, winnersFromLosers);
        
        for (let i = 0; i < totalLosersMatches; i++) {
          const matchNum = matchCount++;
          matchesToCreate.push({
            tournament_id: id,
            match_number: matchNum,
            round_number: round,
            player1_id: null,
            player2_id: null,
            status: 'pending',
            bracket_type: 'losers',
            next_match_id: null,
            source_match_id: null,
            is_reset: false
          });
          losersMatchesByRound[round].push(matchNum);
        }
      }
      
      // Losers Finals (dernier round des losers)
      if (winnersRounds > 1) {
        const losersFinalsRound = winnersRounds;
        losersMatchesByRound[losersFinalsRound] = [];
        const matchNum = matchCount++;
        matchesToCreate.push({
          tournament_id: id,
          match_number: matchNum,
          round_number: losersFinalsRound,
          player1_id: null,
          player2_id: null,
          status: 'pending',
          bracket_type: 'losers',
          next_match_id: null,
          source_match_id: null,
          is_reset: false
        });
        losersMatchesByRound[losersFinalsRound].push(matchNum);
      }
      
      // ===========================================
      // ÉTAPE 3 : Grand Finals et Reset Match
      // ===========================================
      
      // Grand Finals : Gagnant Winners vs Gagnant Losers
      const grandFinalsNum = matchCount++;
      matchesToCreate.push({
        tournament_id: id,
        match_number: grandFinalsNum,
        round_number: winnersRounds + 1,
        player1_id: null, // Gagnant Winners
        player2_id: null, // Gagnant Losers
        status: 'pending',
        bracket_type: null, // Grand Finals n'est ni winners ni losers
        next_match_id: null,
        source_match_id: null,
        is_reset: false
      });
      
      // Reset Match : Si le gagnant des Losers gagne le Grand Finals
      const resetMatchNum = matchCount++;
      matchesToCreate.push({
        tournament_id: id,
        match_number: resetMatchNum,
        round_number: winnersRounds + 2,
        player1_id: null,
        player2_id: null,
        status: 'pending',
        bracket_type: null,
        next_match_id: null,
        source_match_id: null, // Sera rempli après insertion si nécessaire (grandFinalsNum est un numéro, pas un UUID)
        is_reset: true
      });
    }
    
    // --- CAS 3 : CHAMPIONNAT (ROUND ROBIN) ---
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

    // Insérer les nouveaux matchs
    const { error: matchError } = await supabase
      .from('matches')
      .insert(matchesToCreate);

    if (matchError) {
        alert("Erreur création matchs : " + matchError.message);
        return;
    }

    // Recharger les données
    await fetchData();
  };

  // Fonction pour régénérer l'arbre si nécessaire (approche simplifiée type Toornament)
  const regenerateBracketIfNeeded = async () => {
    // Ne régénérer que si le tournoi est en cours
    if (tournoi?.status !== 'ongoing' || matches.length === 0) return;

    // Vérifier si au moins un match a été joué (completed)
    const hasPlayedMatches = matches.some(m => m.status === 'completed');
    
    // Si des matchs ont été joués, l'arbre est verrouillé (pratique standard)
    if (hasPlayedMatches) {
      // L'arbre est verrouillé, pas de régénération possible
      return;
    }

    // Recharger les participants pour avoir les dernières données
    const { data: pData } = await supabase
      .from('participants')
      .select('*, teams(*)')
      .eq('tournament_id', id)
      .order('seed_order', { ascending: true, nullsLast: true });
    
    const activeParticipants = (pData || []).filter(p => p.checked_in && !p.disqualified);
    const teamsInMatches = new Set([
      ...matches.map(m => m.player1_id).filter(Boolean),
      ...matches.map(m => m.player2_id).filter(Boolean)
    ]);
    
    // Équipes actives qui ne sont pas dans l'arbre
    const teamsNotInBracket = activeParticipants.filter(p => !teamsInMatches.has(p.team_id));
    
    // Équipes dans l'arbre mais disqualifiées
    const disqualifiedTeamsInBracket = matches.filter(m => {
      const p1 = pData.find(p => p.team_id === m.player1_id);
      const p2 = pData.find(p => p.team_id === m.player2_id);
      return (p1 && (p1.disqualified || !p1.checked_in)) || (p2 && (p2.disqualified || !p2.checked_in));
    });

    // Si des équipes actives ne sont pas dans l'arbre OU si des équipes disqualifiées sont dans l'arbre
    if (teamsNotInBracket.length > 0 || disqualifiedTeamsInBracket.length > 0) {
      const message = `${teamsNotInBracket.length > 0 ? `${teamsNotInBracket.length} équipe(s) active(s) ne sont pas dans l'arbre. ` : ''}${disqualifiedTeamsInBracket.length > 0 ? `${disqualifiedTeamsInBracket.length} match(s) contiennent des équipes disqualifiées. ` : ''}Voulez-vous régénérer l'arbre ?`;
      
      if (!confirm(`⚠️ ${message}`)) {
        return;
      }

      // Régénérer l'arbre avec les équipes actives uniquement
      await generateBracketInternal(activeParticipants, true);
    }
  };

  // Fonction wrapper pour fetchData (régénération automatique désactivée)
  const fetchDataAndRegenerateIfNeeded = async () => {
    // On ne régénère plus automatiquement l'arbre - il reste tel quel une fois généré
    await fetchData();
  };

  // --- LOGIQUE DE GÉNÉRATION DES MATCHS (Mise à jour pour V2 Teams) ---
  const startTournament = async () => {
    // Sécurité de base
    if (participants.length < 2) return alert("Il faut au moins 2 équipes pour lancer !");
    if (!confirm("Lancer le tournoi ? Plus aucune inscription ne sera possible.")) return;
    
    setLoading(true);

    // Filtrer les participants : on ne garde que ceux qui ont check-in et ne sont pas disqualifiés
    const checkedInParticipants = participants.filter(p => p.checked_in && !p.disqualified);
    
    if (checkedInParticipants.length < 2) {
      alert("⚠️ Attention : Moins de 2 équipes ont fait leur check-in. Le tournoi sera lancé avec les équipes présentes.");
      if (checkedInParticipants.length < 1) {
        alert("❌ Aucune équipe n'a fait son check-in. Impossible de lancer le tournoi.");
        setLoading(false);
        return;
    }
    }

    // Utiliser uniquement les équipes check-in pour créer les matchs
    const participantsForMatches = checkedInParticipants.length > 0 ? checkedInParticipants : participants;

    // Générer l'arbre avec les équipes actives
    await generateBracketInternal(participantsForMatches);

    // Passer le tournoi en "En cours" (ongoing)
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ status: 'ongoing' })
      .eq('id', id);

    if (updateError) alert("Erreur update statut : " + updateError.message);
    
    setLoading(false);
  };
  // ------------------------------------------------------------------

  const handleMatchClick = (match) => {
    // Pour Double Elimination, permettre de cliquer même si un seul joueur est présent (match en cours de progression)
    // Pour les autres formats, vérifier que les deux joueurs sont présents
    if (tournoi.format !== 'double_elimination' && (!match.player1_id || !match.player2_id)) return;
    
    // Pour Double Elimination, on peut cliquer si au moins un joueur est présent
    if (tournoi.format === 'double_elimination' && !match.player1_id && !match.player2_id) return;

    // Si admin : ouvrir la modale de score, sinon rediriger vers MatchLobby
    if (isOwner) {
      setCurrentMatch(match);
      setScoreA(match.score_p1 || 0);
      setScoreB(match.score_p2 || 0);
      setIsModalOpen(true);
    } else {
      // Redirection vers le Lobby du Match pour les non-admins
      navigate(`/match/${match.id}`);
    }
  };

  // Fonction pour gérer la progression dans le Double Elimination
  const handleDoubleEliminationProgression = async (completedMatch, winnerTeamId, loserTeamId) => {
    // IMPORTANT: Récupérer les matches depuis la DB pour avoir les données à jour
    // (le state 'matches' peut ne pas être à jour si plusieurs matchs sont complétés rapidement)
    const { data: allMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .order('round_number', { ascending: true })
      .order('match_number', { ascending: true });
    
    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return;
    }
    
    if (!allMatches || allMatches.length === 0) {
      console.error('No matches found');
      return;
    }
    
    const bracketType = completedMatch.bracket_type;
    const roundNumber = completedMatch.round_number;
    
    if (bracketType === 'winners') {
      // WINNERS BRACKET : Gagnant avance, perdant va dans Losers
      
      // 1. Faire avancer le gagnant dans le bracket Winners
      const currentWinnersMatches = allMatches.filter(m => m.bracket_type === 'winners' && m.round_number === roundNumber).sort((a,b) => a.match_number - b.match_number);
      const myIndex = currentWinnersMatches.findIndex(m => m.id === completedMatch.id);
      
      if (myIndex === -1) {
        console.error('Match not found in currentWinnersMatches!', completedMatch.id);
        return;
      }
      
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
        // Plus de matchs Winners -> Le gagnant va en Grand Finals
        const grandFinals = allMatches.find(m => !m.bracket_type && !m.is_reset);
        if (grandFinals) {
          await supabase.from('matches').update({ player1_id: winnerTeamId }).eq('id', grandFinals.id);
        }
      }
      
      // 2. Envoyer le perdant dans le bracket Losers
      if (roundNumber === 1) {
        // Perdants du Round 1 Winners vont dans Losers Round 1 (par paires)
        const losersRound1Matches = allMatches.filter(m => m.bracket_type === 'losers' && m.round_number === 1).sort((a,b) => a.match_number - b.match_number);
        if (losersRound1Matches.length > 0) {
          // Trouver un match avec un slot vide (par ordre)
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
        // Perdants des rounds suivants vont dans le Losers round correspondant
        const losersRound = roundNumber;
        const losersMatches = allMatches.filter(m => m.bracket_type === 'losers' && m.round_number === losersRound).sort((a,b) => a.match_number - b.match_number);
        if (losersMatches.length > 0) {
          // Trouver le premier match avec un slot vide
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
      
    } else if (bracketType === 'losers') {
      // LOSERS BRACKET : Gagnant avance, perdant est éliminé
      
      const currentLosersMatches = allMatches.filter(m => m.bracket_type === 'losers' && m.round_number === roundNumber).sort((a,b) => a.match_number - b.match_number);
      const myIndex = currentLosersMatches.findIndex(m => m.id === completedMatch.id);
      const nextLosersRound = roundNumber + 1;
      
      const nextLosersMatches = allMatches.filter(m => m.bracket_type === 'losers' && m.round_number === nextLosersRound).sort((a,b) => a.match_number - b.match_number);
      if (nextLosersMatches.length > 0) {
        // Trouver un match avec un slot vide dans le round suivant
        const availableMatch = nextLosersMatches.find(m => !m.player1_id || !m.player2_id);
        if (availableMatch) {
          if (!availableMatch.player1_id) {
            await supabase.from('matches').update({ player1_id: winnerTeamId }).eq('id', availableMatch.id);
          } else {
            await supabase.from('matches').update({ player2_id: winnerTeamId }).eq('id', availableMatch.id);
          }
        }
      } else {
        // Plus de matchs Losers -> Le gagnant va en Grand Finals
        const grandFinals = allMatches.find(m => !m.bracket_type && !m.is_reset);
        if (grandFinals) {
          await supabase.from('matches').update({ player2_id: winnerTeamId }).eq('id', grandFinals.id);
        }
      }
      
    } else if (completedMatch.is_reset) {
      // RESET MATCH : Le gagnant est le champion final
      triggerConfetti();
      await supabase.from('tournaments').update({ status: 'completed' }).eq('id', id);
    } else {
      // GRAND FINALS
      const grandFinals = completedMatch;
      if (winnerTeamId === grandFinals.player1_id) {
        // Le gagnant des Winners a gagné -> Champion !
        triggerConfetti();
        await supabase.from('tournaments').update({ status: 'completed' }).eq('id', id);
      } else {
        // Le gagnant des Losers a gagné -> Reset match nécessaire
        // Les équipes restent les mêmes pour le reset match
        const resetMatch = allMatches.find(m => m.is_reset);
        if (resetMatch) {
          // Réinitialiser le reset match avec les mêmes équipes (les scores seront réinitialisés)
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

  const saveScore = async () => {
    if (!currentMatch) return;
    const s1 = parseInt(scoreA);
    const s2 = parseInt(scoreB);

    // Mettre à jour le match avec les scores
    const { error: updateError } = await supabase
      .from('matches')
      .update({ score_p1: s1, score_p2: s2, status: 'completed' })
      .eq('id', currentMatch.id);

    if (updateError) {
      alert('Erreur lors de la mise à jour du score : ' + updateError.message);
      return;
    }

    if (s1 !== s2) {
      // Récupérer le match mis à jour depuis la DB pour avoir toutes les propriétés (bracket_type, etc.)
      const { data: updatedMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', currentMatch.id)
        .single();

      if (!updatedMatch) {
        alert('Erreur : Impossible de récupérer le match mis à jour.');
        setIsModalOpen(false);
        fetchData();
        return;
      }

      const winnerTeamId = s1 > s2 ? updatedMatch.player1_id : updatedMatch.player2_id;
      const loserTeamId = s1 > s2 ? updatedMatch.player2_id : updatedMatch.player1_id;
      
      if (tournoi.format === 'double_elimination') {
        // Double Elimination : Logique spéciale
        await handleDoubleEliminationProgression(updatedMatch, winnerTeamId, loserTeamId);
      } else if (tournoi.format === 'elimination') {
        // Single Elimination : Logique standard
        // Récupérer tous les matchs depuis la DB pour avoir les données à jour
        const { data: allMatches } = await supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', id)
          .order('round_number', { ascending: true })
          .order('match_number', { ascending: true });

        if (allMatches) {
          const currentRoundMatches = allMatches.filter(m => m.round_number === updatedMatch.round_number).sort((a,b) => a.match_number - b.match_number);
          const myIndex = currentRoundMatches.findIndex(m => m.id === updatedMatch.id);
          const nextRound = updatedMatch.round_number + 1;
          
          const nextRoundMatches = allMatches.filter(m => m.round_number === nextRound).sort((a,b) => a.match_number - b.match_number);
          const nextMatch = nextRoundMatches[Math.floor(myIndex / 2)];
          
          if (nextMatch) {
            const isPlayer1Slot = (myIndex % 2) === 0;
            await supabase.from('matches').update(isPlayer1Slot ? { player1_id: winnerTeamId } : { player2_id: winnerTeamId }).eq('id', nextMatch.id);
          } else {
            // Finale gagnée
            triggerConfetti();
            await supabase.from('tournaments').update({ status: 'completed' }).eq('id', id);
          }
        }
      }
      // Round Robin n'a pas besoin de progression
    }
    
    setIsModalOpen(false);
    fetchData();
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  if (loading) return <div style={{color:'white', padding:'20px'}}>Chargement...</div>;
  if (!tournoi) return <div style={{color:'white'}}>Tournoi introuvable</div>;
// --- CALCUL DU CLASSEMENT (Pour le format Championnat) ---
  const getStandings = () => {
    if (!participants || !matches) return [];
    // 1. On initialise les scores à 0 pour tout le monde
    const stats = participants.map(p => ({
      ...p,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      goalDiff: 0
    }));

    // 2. On parcourt tous les matchs TERMINÉS pour distribuer les points
    matches.forEach(m => {
      if (m.status !== 'completed') return; // On ignore les matchs non joués

      const p1Index = stats.findIndex(p => p.team_id === m.player1_id);
      const p2Index = stats.findIndex(p => p.team_id === m.player2_id);

      if (p1Index === -1 || p2Index === -1) return;

      stats[p1Index].played++;
      stats[p2Index].played++;

      const diff = m.score_p1 - m.score_p2;
      stats[p1Index].goalDiff += diff;
      stats[p2Index].goalDiff -= diff;

      if (m.score_p1 > m.score_p2) {
        // Victoire J1
        stats[p1Index].wins++;
        stats[p1Index].points += 3;
        stats[p2Index].losses++;
      } else if (m.score_p2 > m.score_p1) {
        // Victoire J2
        stats[p2Index].wins++;
        stats[p2Index].points += 3;
        stats[p1Index].losses++;
      } else {
        // Match Nul (Draw)
        stats[p1Index].draws++;
        stats[p1Index].points += 1;
        stats[p2Index].draws++;
        stats[p2Index].points += 1;
      }
    });

    // 3. On trie : D'abord par Points, puis par Différence de buts (Goal Average)
    return stats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.goalDiff - a.goalDiff;
    });
  };
  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '100%', margin: '0 auto', fontFamily: 'Arial' }}>
      
      {/* HEADER */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #333', paddingBottom:'20px', marginBottom:'30px'}}>
        <div>
           <button onClick={() => navigate('/dashboard')} style={{background:'transparent', border:'1px solid #444', color:'#888', padding:'5px 10px', borderRadius:'4px', cursor:'pointer', marginBottom:'10px'}}>← Retour</button>
           <h1 style={{ margin: 0, color: '#00d4ff' }}>{tournoi.name}</h1>
        </div>
        <div style={{textAlign:'right'}}>
           <div style={{fontWeight:'bold', color: tournoi.status === 'draft' ? 'orange' : '#4ade80'}}>
             {winnerName ? '🏆 TERMINÉ' : (tournoi.status === 'draft' ? '🟠 Inscriptions Ouvertes' : '🟢 En cours')}
           </div>
        </div>
      </div>

      {/* BANNIÈRE VAINQUEUR */}
      {winnerName && (
          <div style={{background: 'linear-gradient(45deg, #FFD700, #FFA500)', color:'black', padding:'20px', borderRadius:'8px', textAlign:'center', marginBottom:'30px'}}>
              <h2 style={{margin:0}}>👑 VAINQUEUR : {winnerName} 👑</h2>
          </div>
      )}

      {/* ADMIN PANEL */}
      {isOwner && tournoi.status === 'ongoing' && (
        <AdminPanel 
          tournamentId={id} 
          supabase={supabase} 
          session={session} 
          participants={participants} 
          matches={matches} 
          onUpdate={fetchDataAndRegenerateIfNeeded} 
        />
      )}
      
      {isOwner && tournoi.status === 'draft' && (
        <div style={{ background: '#222', padding: '20px', borderRadius: '8px', marginBottom: '30px', borderLeft:'4px solid #8e44ad' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' }}>
          <span>{participants.length} équipes inscrites.</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setIsSeedingModalOpen(true)} 
                style={{ 
                  padding: '10px 20px', 
                  background: 'linear-gradient(135deg, #f1c40f, #e67e22)', 
                  color: '#000', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor:'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 10px rgba(241, 196, 15, 0.3)'
                }}
              >
                🎯 God Mode - Seeding
              </button>
              <button 
                onClick={startTournament} 
                style={{ 
                  padding: '10px 20px', 
                  background: '#8e44ad', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor:'pointer',
                  fontWeight: 'bold'
                }}
              >
                Générer l'Arbre et Lancer
              </button>
            </div>
          </div>
          {participants.some(p => p.seed_order !== null && p.seed_order !== undefined) && (
            <div style={{ 
              background: '#2a2a2a', 
              padding: '10px', 
              borderRadius: '5px', 
              fontSize: '0.9rem', 
              color: '#4ade80',
              borderLeft: '3px solid #4ade80'
            }}>
              ✅ Seeding configuré : Les équipes seront placées selon l'ordre défini.
            </div>
          )}
        </div>
      )}

      {/* INSCRIPTION / BOUTONS */}
      {tournoi.status === 'draft' && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          
          {/* NOUVEAU BOUTON INSCRIPTION ÉQUIPE */}
          <TeamJoinButton 
            tournamentId={id} 
            supabase={supabase} 
            session={session} 
            onJoinSuccess={fetchData} // Recharge la liste après inscription
          />

          <CheckInButton tournamentId={id} supabase={supabase} session={session} tournament={tournoi} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems:'flex-start' }}>
        
        {/* LISTE DES ÉQUIPES */}
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
          
          {/* CHAT */}
          <div style={{ borderTop: '1px solid #333', padding: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>💬 Chat Lobby</h3>
            <Chat tournamentId={id} session={session} supabase={supabase} />
          </div>
        </div>
{/* --- BLOC CLASSEMENT (Uniquement pour Round Robin) --- */}
      {tournoi?.format === 'round_robin' && (
        <div style={{ marginBottom: '40px', background: '#1a1a1a', borderRadius: '15px', padding: '20px', border: '1px solid #333' }}>
          <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginTop: 0 }}>🏆 Classement</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
            <thead>
              <tr style={{ background: '#252525', textAlign: 'left' }}>
                <th style={{ padding: '10px', borderRadius:'5px 0 0 5px' }}>Rang</th>
                <th style={{ padding: '10px' }}>Équipe</th>
                <th style={{ padding: '10px', textAlign:'center' }}>Pts</th>
                <th style={{ padding: '10px', textAlign:'center' }}>J</th>
                <th style={{ padding: '10px', textAlign:'center' }}>V</th>
                <th style={{ padding: '10px', textAlign:'center' }}>N</th>
                <th style={{ padding: '10px', textAlign:'center', borderRadius:'0 5px 5px 0' }}>D</th>
              </tr>
            </thead>
            <tbody>
              {getStandings().map((team, index) => (
                <tr key={team.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '10px', fontWeight: index === 0 ? 'bold' : 'normal', color: index === 0 ? '#f1c40f' : 'white' }}>
                    #{index + 1}
                  </td>
                  <td style={{ padding: '10px', display:'flex', alignItems:'center', gap:'10px' }}>
                    <img src={team.teams?.logo_url || `https://ui-avatars.com/api/?name=${team.teams?.tag}`} style={{width:'24px', height:'24px', borderRadius:'50%'}} alt=""/>
                    {team.teams?.name}
                  </td>
                  <td style={{ padding: '10px', textAlign:'center', fontWeight:'bold', fontSize:'1.1rem', color:'#4ade80' }}>{team.points}</td>
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
      {/* --------------------------------------------------- */}
        {/* ARBRE DU TOURNOI */}
        <div style={{ flex: '3', minWidth:'300px', overflowX:'auto' }}>
           {matches.length > 0 ? (
             tournoi.format === 'double_elimination' ? (
               // AFFICHAGE DOUBLE ELIMINATION : Deux brackets séparés
               <div style={{display:'flex', gap:'40px', paddingBottom:'20px'}}>
                 {/* BRACKET WINNERS */}
                 <div style={{flex: 1}}>
                   <h3 style={{textAlign:'center', color:'#4ade80', marginBottom:'20px', fontSize:'1.3rem', fontWeight:'bold'}}>
                     🏆 Winners Bracket
                   </h3>
                   <div style={{display:'flex', gap:'40px'}}>
                     {[...new Set(matches.filter(m => m.bracket_type === 'winners').map(m=>m.round_number))].sort().map(round => (
                       <div key={`winners-${round}`} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                         <h4 style={{textAlign:'center', color:'#666'}}>Round {round}</h4>
                         {matches.filter(m => m.bracket_type === 'winners' && m.round_number === round).map(m => {
                           const hasDisqualified = m.p1_disqualified || m.p2_disqualified;
                           
                           return (
                             <div key={m.id} onClick={()=>handleMatchClick(m)} style={{
                                 width:'240px', 
                                 background: hasDisqualified ? '#3a1a1a' : '#252525', 
                                 border: hasDisqualified ? '1px solid #e74c3c' : (m.status === 'completed' ? '1px solid #4ade80' : '1px solid #444'), 
                                 borderRadius:'8px', 
                                 cursor: isOwner ? 'pointer' : 'default', 
                                 position:'relative',
                                 boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                                 opacity: hasDisqualified ? 0.7 : 1
                             }}>
                               {/* JOUEUR 1 */}
                               <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p1 > m.score_p2 ? '#2f3b2f' : 'transparent', borderRadius:'8px 8px 0 0'}}>
                                 <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                   {m.player1_id && <img src={m.p1_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                   <span style={{
                                     color: m.p1_disqualified ? '#e74c3c' : (m.player1_id ? 'white' : '#666'), 
                                     fontWeight: m.score_p1 > m.score_p2 ? 'bold' : 'normal', 
                                     fontSize:'0.9rem',
                                     textDecoration: m.p1_disqualified ? 'line-through' : 'none',
                                     overflow: 'hidden',
                                     textOverflow: 'ellipsis',
                                     whiteSpace: 'nowrap'
                                   }}>
                                     {m.p1_name.split(' [')[0]} 
                                     {m.p1_name.includes('[') && (
                                       <span style={{fontSize:'0.7rem', color:'#aaa'}}> [{m.p1_name.split('[')[1]}</span>
                                     )}
                                   </span>
                                 </div>
                                 <span style={{fontWeight:'bold', fontSize:'1.1rem', marginLeft: '8px', flexShrink: 0}}>{m.score_p1}</span>
                               </div>
                               
                               <div style={{height:'1px', background:'#333'}}></div>
                               
                               {/* JOUEUR 2 */}
                               <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p2 > m.score_p1 ? '#2f3b2f' : 'transparent', borderRadius:'0 0 8px 8px'}}>
                                 <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                   {m.player2_id && <img src={m.p2_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                   <span style={{
                                     color: m.p2_disqualified ? '#e74c3c' : (m.player2_id ? 'white' : '#666'), 
                                     fontWeight: m.score_p2 > m.score_p1 ? 'bold' : 'normal', 
                                     fontSize:'0.9rem',
                                     textDecoration: m.p2_disqualified ? 'line-through' : 'none',
                                     overflow: 'hidden',
                                     textOverflow: 'ellipsis',
                                     whiteSpace: 'nowrap'
                                   }}>
                                     {m.p2_name.split(' [')[0]} 
                                     {m.p2_name.includes('[') && (
                                       <span style={{fontSize:'0.7rem', color:'#aaa'}}> [{m.p2_name.split('[')[1]}</span>
                                     )}
                                   </span>
                                 </div>
                                 <span style={{fontWeight:'bold', fontSize:'1.1rem', marginLeft: '8px', flexShrink: 0}}>{m.score_p2}</span>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     ))}
                   </div>
                 </div>
                 
                 {/* BRACKET LOSERS */}
                 <div style={{flex: 1}}>
                   <h3 style={{textAlign:'center', color:'#e74c3c', marginBottom:'20px', fontSize:'1.3rem', fontWeight:'bold'}}>
                     💀 Losers Bracket
                   </h3>
                   <div style={{display:'flex', gap:'40px'}}>
                     {[...new Set(matches.filter(m => m.bracket_type === 'losers').map(m=>m.round_number))].sort().map(round => (
                       <div key={`losers-${round}`} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                         <h4 style={{textAlign:'center', color:'#666'}}>Round {round}</h4>
                         {matches.filter(m => m.bracket_type === 'losers' && m.round_number === round).map(m => {
                           const hasDisqualified = m.p1_disqualified || m.p2_disqualified;
                           
                           return (
                             <div key={m.id} onClick={()=>handleMatchClick(m)} style={{
                               width:'240px', 
                               background: hasDisqualified ? '#3a1a1a' : '#1a1a1a', 
                               border: hasDisqualified ? '1px solid #e74c3c' : (m.status === 'completed' ? '1px solid #e74c3c' : '1px solid #555'), 
                               borderRadius:'8px', 
                               cursor: isOwner ? 'pointer' : 'default', 
                               position:'relative',
                               boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                               opacity: hasDisqualified ? 0.7 : 1
                             }}>
                               {/* JOUEUR 1 */}
                               <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p1 > m.score_p2 ? '#2f3b2f' : 'transparent', borderRadius:'8px 8px 0 0'}}>
                                 <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                   {m.player1_id && <img src={m.p1_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                   <span style={{
                                     color: m.p1_disqualified ? '#e74c3c' : (m.player1_id ? 'white' : '#666'), 
                                     fontWeight: m.score_p1 > m.score_p2 ? 'bold' : 'normal', 
                                     fontSize:'0.9rem',
                                     textDecoration: m.p1_disqualified ? 'line-through' : 'none',
                                     overflow: 'hidden',
                                     textOverflow: 'ellipsis',
                                     whiteSpace: 'nowrap'
                                   }}>
                                     {m.p1_name.split(' [')[0]} 
                                     {m.p1_name.includes('[') && (
                                       <span style={{fontSize:'0.7rem', color:'#aaa'}}> [{m.p1_name.split('[')[1]}</span>
                                     )}
                                   </span>
                                 </div>
                                 <span style={{fontWeight:'bold', fontSize:'1.1rem', marginLeft: '8px', flexShrink: 0}}>{m.score_p1}</span>
                               </div>
                               
                               <div style={{height:'1px', background:'#333'}}></div>
                               
                               {/* JOUEUR 2 */}
                               <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p2 > m.score_p1 ? '#2f3b2f' : 'transparent', borderRadius:'0 0 8px 8px'}}>
                                 <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                   {m.player2_id && <img src={m.p2_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                   <span style={{
                                     color: m.p2_disqualified ? '#e74c3c' : (m.player2_id ? 'white' : '#666'), 
                                     fontWeight: m.score_p2 > m.score_p1 ? 'bold' : 'normal', 
                                     fontSize:'0.9rem',
                                     textDecoration: m.p2_disqualified ? 'line-through' : 'none',
                                     overflow: 'hidden',
                                     textOverflow: 'ellipsis',
                                     whiteSpace: 'nowrap'
                                   }}>
                                     {m.p2_name.split(' [')[0]} 
                                     {m.p2_name.includes('[') && (
                                       <span style={{fontSize:'0.7rem', color:'#aaa'}}> [{m.p2_name.split('[')[1]}</span>
                                     )}
                                   </span>
                                 </div>
                                 <span style={{fontWeight:'bold', fontSize:'1.1rem', marginLeft: '8px', flexShrink: 0}}>{m.score_p2}</span>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     ))}
                   </div>
                   
                   {/* GRAND FINALS (si présent) */}
                   {matches.filter(m => !m.bracket_type && !m.is_reset).length > 0 && (
                     <div style={{marginTop:'40px', paddingTop:'20px', borderTop:'2px solid #444'}}>
                       <h3 style={{textAlign:'center', color:'#f1c40f', marginBottom:'20px', fontSize:'1.3rem', fontWeight:'bold'}}>
                         🏅 Grand Finals
                       </h3>
                       <div style={{display:'flex', justifyContent:'center'}}>
                         {matches.filter(m => !m.bracket_type && !m.is_reset).map(m => {
                           const hasDisqualified = m.p1_disqualified || m.p2_disqualified;
                           
                           return (
                             <div key={m.id} onClick={()=>handleMatchClick(m)} style={{
                               width:'240px', 
                               background: hasDisqualified ? '#3a1a1a' : '#2a2a2a', 
                               border: hasDisqualified ? '1px solid #e74c3c' : (m.status === 'completed' ? '1px solid #f1c40f' : '1px solid #666'), 
                               borderRadius:'8px', 
                               cursor: isOwner ? 'pointer' : 'default', 
                               position:'relative',
                               boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                               opacity: hasDisqualified ? 0.7 : 1
                             }}>
                               {/* JOUEUR 1 */}
                               <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p1 > m.score_p2 ? '#2f3b2f' : 'transparent', borderRadius:'8px 8px 0 0'}}>
                                 <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                   {m.player1_id && <img src={m.p1_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                   <span style={{
                                     color: m.p1_disqualified ? '#e74c3c' : (m.player1_id ? 'white' : '#666'), 
                                     fontWeight: m.score_p1 > m.score_p2 ? 'bold' : 'normal', 
                                     fontSize:'0.9rem',
                                     textDecoration: m.p1_disqualified ? 'line-through' : 'none',
                                     overflow: 'hidden',
                                     textOverflow: 'ellipsis',
                                     whiteSpace: 'nowrap'
                                   }}>
                                     {m.p1_name.split(' [')[0]} 
                                     {m.p1_name.includes('[') && (
                                       <span style={{fontSize:'0.7rem', color:'#aaa'}}> [{m.p1_name.split('[')[1]}</span>
                                     )}
                                   </span>
                                 </div>
                                 <span style={{fontWeight:'bold', fontSize:'1.1rem', marginLeft: '8px', flexShrink: 0}}>{m.score_p1}</span>
                               </div>
                               
                               <div style={{height:'1px', background:'#333'}}></div>
                               
                               {/* JOUEUR 2 */}
                               <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p2 > m.score_p1 ? '#2f3b2f' : 'transparent', borderRadius:'0 0 8px 8px'}}>
                                 <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                   {m.player2_id && <img src={m.p2_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                   <span style={{
                                     color: m.p2_disqualified ? '#e74c3c' : (m.player2_id ? 'white' : '#666'), 
                                     fontWeight: m.score_p2 > m.score_p1 ? 'bold' : 'normal', 
                                     fontSize:'0.9rem',
                                     textDecoration: m.p2_disqualified ? 'line-through' : 'none',
                                     overflow: 'hidden',
                                     textOverflow: 'ellipsis',
                                     whiteSpace: 'nowrap'
                                   }}>
                                     {m.p2_name.split(' [')[0]} 
                                     {m.p2_name.includes('[') && (
                                       <span style={{fontSize:'0.7rem', color:'#aaa'}}> [{m.p2_name.split('[')[1]}</span>
                                     )}
                                   </span>
                                 </div>
                                 <span style={{fontWeight:'bold', fontSize:'1.1rem', marginLeft: '8px', flexShrink: 0}}>{m.score_p2}</span>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                       
                       {/* RESET MATCH (si présent) */}
                       {matches.filter(m => m.is_reset).length > 0 && (
                         <div style={{marginTop:'20px'}}>
                           <h4 style={{textAlign:'center', color:'#f39c12', marginBottom:'10px'}}>
                             🔄 Reset Match
                           </h4>
                           <div style={{display:'flex', justifyContent:'center'}}>
                             {matches.filter(m => m.is_reset).map(m => {
                               const hasDisqualified = m.p1_disqualified || m.p2_disqualified;
                               
                               return (
                                 <div key={m.id} onClick={()=>handleMatchClick(m)} style={{
                                   width:'240px', 
                                   background: hasDisqualified ? '#3a1a1a' : '#2a2a2a', 
                                   border: hasDisqualified ? '1px solid #e74c3c' : (m.status === 'completed' ? '1px solid #f39c12' : '1px solid #666'), 
                                   borderRadius:'8px', 
                                   cursor: isOwner ? 'pointer' : 'default', 
                                   position:'relative',
                                   boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                                   opacity: hasDisqualified ? 0.7 : 1
                                 }}>
                                   {/* JOUEUR 1 */}
                                   <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p1 > m.score_p2 ? '#2f3b2f' : 'transparent', borderRadius:'8px 8px 0 0'}}>
                                     <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                       {m.player1_id && <img src={m.p1_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                       <span style={{
                                         color: m.p1_disqualified ? '#e74c3c' : (m.player1_id ? 'white' : '#666'), 
                                         fontWeight: m.score_p1 > m.score_p2 ? 'bold' : 'normal', 
                                         fontSize:'0.9rem',
                                         textDecoration: m.p1_disqualified ? 'line-through' : 'none',
                                         overflow: 'hidden',
                                         textOverflow: 'ellipsis',
                                         whiteSpace: 'nowrap'
                                       }}>
                                         {m.p1_name.split(' [')[0]} 
                                         {m.p1_name.includes('[') && (
                                           <span style={{fontSize:'0.7rem', color:'#aaa'}}> [{m.p1_name.split('[')[1]}</span>
                                         )}
                                       </span>
                                     </div>
                                     <span style={{fontWeight:'bold', fontSize:'1.1rem', marginLeft: '8px', flexShrink: 0}}>{m.score_p1}</span>
                                   </div>
                                   
                                   <div style={{height:'1px', background:'#333'}}></div>
                                   
                                   {/* JOUEUR 2 */}
                                   <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p2 > m.score_p1 ? '#2f3b2f' : 'transparent', borderRadius:'0 0 8px 8px'}}>
                                     <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                       {m.player2_id && <img src={m.p2_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                       <span style={{
                                         color: m.p2_disqualified ? '#e74c3c' : (m.player2_id ? 'white' : '#666'), 
                                         fontWeight: m.score_p2 > m.score_p1 ? 'bold' : 'normal', 
                                         fontSize:'0.9rem',
                                         textDecoration: m.p2_disqualified ? 'line-through' : 'none',
                                         overflow: 'hidden',
                                         textOverflow: 'ellipsis',
                                         whiteSpace: 'nowrap'
                                       }}>
                                         {m.p2_name.split(' [')[0]} 
                                         {m.p2_name.includes('[') && (
                                           <span style={{fontSize:'0.7rem', color:'#aaa'}}> [{m.p2_name.split('[')[1]}</span>
                                         )}
                                       </span>
                                     </div>
                                     <span style={{fontWeight:'bold', fontSize:'1.1rem', marginLeft: '8px', flexShrink: 0}}>{m.score_p2}</span>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               </div>
             ) : (
               // AFFICHAGE STANDARD (Single Elimination ou Round Robin)
               <div style={{display:'flex', gap:'40px', paddingBottom:'20px'}}>
                {[...new Set(matches.map(m=>m.round_number))].sort().map(round => (
                    <div key={round} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                        <h4 style={{textAlign:'center', color:'#666'}}>Round {round}</h4>
                        {matches.filter(m=>m.round_number === round).map(m => {
                          // Marquer le match comme ayant une équipe disqualifiée
                          const hasDisqualified = m.p1_disqualified || m.p2_disqualified;
                          
                          return (
                            <div key={m.id} onClick={()=>handleMatchClick(m)} style={{
                                width:'240px', 
                                background: hasDisqualified ? '#3a1a1a' : '#252525', 
                                border: hasDisqualified ? '1px solid #e74c3c' : (m.status === 'completed' ? '1px solid #4ade80' : '1px solid #444'), 
                                borderRadius:'8px', 
                                cursor: isOwner ? 'pointer' : 'default', 
                                position:'relative',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                                opacity: hasDisqualified ? 0.7 : 1
                            }}>
                                {/* JOUEUR 1 */}
                                <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p1 > m.score_p2 ? '#2f3b2f' : 'transparent', borderRadius:'8px 8px 0 0'}}>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                        {/* Avatar J1 */}
                                        {m.player1_id && <img src={m.p1_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                        <span style={{
                                          color: m.p1_disqualified ? '#e74c3c' : (m.player1_id ? 'white' : '#666'), 
                                          fontWeight: m.score_p1 > m.score_p2 ? 'bold' : 'normal', 
                                          fontSize:'0.9rem',
                                          textDecoration: m.p1_disqualified ? 'line-through' : 'none',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}>
                                            {m.p1_name.split(' [')[0]} 
                                            {m.p1_name.includes('[') && (
                                              <span style={{fontSize:'0.7rem', color:'#aaa'}}> [{m.p1_name.split('[')[1]}</span>
                                            )}
                                        </span>
                                    </div>
                                    <span style={{fontWeight:'bold', fontSize:'1.1rem', marginLeft: '8px', flexShrink: 0}}>{m.score_p1}</span>
                                </div>
                                
                                <div style={{height:'1px', background:'#333'}}></div>
                                
                                {/* JOUEUR 2 */}
                                <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p2 > m.score_p1 ? '#2f3b2f' : 'transparent', borderRadius:'0 0 8px 8px'}}>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                        {/* Avatar J2 */}
                                        {m.player2_id && <img src={m.p2_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                        <span style={{
                                          color: m.p2_disqualified ? '#e74c3c' : (m.player2_id ? 'white' : '#666'), 
                                          fontWeight: m.score_p2 > m.score_p1 ? 'bold' : 'normal', 
                                          fontSize:'0.9rem',
                                          textDecoration: m.p2_disqualified ? 'line-through' : 'none',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}>
                                            {m.p2_name.split(' [')[0]} 
                                            {m.p2_name.includes('[') && (
                                              <span style={{fontSize:'0.7rem', color:'#aaa'}}> [{m.p2_name.split('[')[1]}</span>
                                            )}
                                        </span>
                                    </div>
                                    <span style={{fontWeight:'bold', fontSize:'1.1rem', marginLeft: '8px', flexShrink: 0}}>{m.score_p2}</span>
                                </div>
                            </div>
                          );
                        })}
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

      {/* MODALE SCORE */}
      {isModalOpen && currentMatch && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999}}>
            <div style={{background:'#2a2a2a', padding:'30px', borderRadius:'12px', width:'300px', border:'1px solid #444'}}>
                <h3 style={{textAlign:'center'}}>Score</h3>
                <div style={{display:'flex', justifyContent:'space-between', margin:'20px 0'}}>
                    <input type="number" value={scoreA} onChange={e=>setScoreA(e.target.value)} style={{width:'50px', padding:'10px', background:'#111', color:'white', border:'none'}} />
                    <span>-</span>
                    <input type="number" value={scoreB} onChange={e=>setScoreB(e.target.value)} style={{width:'50px', padding:'10px', background:'#111', color:'white', border:'none'}} />
                </div>
                <button onClick={saveScore} style={{width:'100%', padding:'10px', background:'#4ade80', border:'none', cursor:'pointer'}}>Valider</button>
                <button onClick={()=>setIsModalOpen(false)} style={{width:'100%', padding:'10px', background:'transparent', border:'none', color:'#ccc', marginTop:'10px', cursor:'pointer'}}>Annuler</button>
            </div>
        </div>
      )}

      {/* MODALE SEEDING */}
      <SeedingModal
        isOpen={isSeedingModalOpen}
        onClose={() => setIsSeedingModalOpen(false)}
        participants={participants}
        tournamentId={id}
        supabase={supabase}
        onSave={() => fetchData()} // Recharger les données après sauvegarde
      />
    </div>
  );
}
