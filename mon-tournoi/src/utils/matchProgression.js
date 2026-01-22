/**
 * Logique de progression des matchs pour les différents formats de tournoi
 */

/**
 * Gère la progression après un match terminé en Single Elimination
 */
export async function handleSingleEliminationProgression(supabase, tournamentId, updatedMatch, winnerId, allMatches, triggerConfetti) {
  const currentRoundMatches = allMatches
    .filter(m => m.round_number === updatedMatch.round_number)
    .sort((a, b) => a.match_number - b.match_number);
  
  const currentMatchIndexInRound = currentRoundMatches.findIndex(m => m.id === updatedMatch.id);
  const nextRoundMatches = allMatches
    .filter(m => m.round_number === updatedMatch.round_number + 1)
    .sort((a, b) => a.match_number - b.match_number);
  
  if (nextRoundMatches.length > 0) {
    const nextMatchIndex = Math.floor(currentMatchIndexInRound / 2);
    const nextMatch = nextRoundMatches[nextMatchIndex];
    if (nextMatch) {
      const updateField = currentMatchIndexInRound % 2 === 0 ? 'player1_id' : 'player2_id';
      await supabase.from('matches').update({ [updateField]: winnerId }).eq('id', nextMatch.id);
    }
  } else {
    // C'est la finale
    const winnerParticipant = await getParticipantByTeamId(supabase, tournamentId, winnerId);
    if (triggerConfetti) triggerConfetti();
    return winnerParticipant?.teams?.name || 'Vainqueur';
  }
  
  return null;
}

/**
 * Gère la progression après un match terminé en Double Elimination
 */
export async function handleDoubleEliminationProgression(supabase, tournamentId, match, winnerId, loserId) {
  const { data: allMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('match_number');

  // Trier les matchs par bracket
  const winnersMatches = allMatches.filter(m => m.bracket_type === 'winners').sort((a, b) => a.round_number - b.round_number || a.match_number - b.match_number);
  const losersMatches = allMatches.filter(m => m.bracket_type === 'losers').sort((a, b) => a.round_number - b.round_number || a.match_number - b.match_number);
  const grandFinalMatches = allMatches.filter(m => m.bracket_type === 'grand_final').sort((a, b) => a.match_number - b.match_number);
  
  const grandFinal = grandFinalMatches.find(m => !m.is_reset);
  const resetMatch = grandFinalMatches.find(m => m.is_reset);

  // A. Match dans Winners Bracket
  if (match.bracket_type === 'winners') {
    const currentRoundWinnersMatches = winnersMatches.filter(m => m.round_number === match.round_number);
    const nextRoundWinnersMatches = winnersMatches.filter(m => m.round_number === match.round_number + 1);
    
    const matchIndexInRound = currentRoundWinnersMatches.findIndex(m => m.id === match.id);

    // 1. Gagnant avance dans Winners
    if (nextRoundWinnersMatches.length > 0) {
      const nextMatchIndex = Math.floor(matchIndexInRound / 2);
      const nextMatch = nextRoundWinnersMatches[nextMatchIndex];
      if (nextMatch) {
        const slot = matchIndexInRound % 2 === 0 ? 'player1_id' : 'player2_id';
        await supabase.from('matches').update({ [slot]: winnerId }).eq('id', nextMatch.id);
      }
    } else {
      // Winners Final → Gagnant va en Grande Finale
      if (grandFinal) {
        await supabase.from('matches').update({ player1_id: winnerId }).eq('id', grandFinal.id);
      }
    }

    // 2. Perdant descend dans Losers
    const losersRoundForDrop = (match.round_number - 1) * 2 + 1;
    const targetLosersRound = losersMatches.filter(m => m.round_number === losersRoundForDrop);
    
    if (targetLosersRound.length > 0) {
      // Trouver le premier slot vide
      for (const losersMatch of targetLosersRound) {
        if (!losersMatch.player1_id) {
          await supabase.from('matches').update({ player1_id: loserId }).eq('id', losersMatch.id);
          break;
        } else if (!losersMatch.player2_id) {
          await supabase.from('matches').update({ player2_id: loserId }).eq('id', losersMatch.id);
          break;
        }
      }
    }
  }
  
  // B. Match dans Losers Bracket
  else if (match.bracket_type === 'losers') {
    const currentRoundLosersMatches = losersMatches.filter(m => m.round_number === match.round_number);
    const nextRoundLosersMatches = losersMatches.filter(m => m.round_number === match.round_number + 1);
    
    const matchIndexInRound = currentRoundLosersMatches.findIndex(m => m.id === match.id);

    if (nextRoundLosersMatches.length > 0) {
      // Le gagnant avance dans Losers
      const isOddRound = match.round_number % 2 !== 0;
      let nextMatchIndex, slot;
      
      if (isOddRound) {
        nextMatchIndex = matchIndexInRound;
        slot = 'player1_id';
      } else {
        nextMatchIndex = Math.floor(matchIndexInRound / 2);
        slot = matchIndexInRound % 2 === 0 ? 'player1_id' : 'player2_id';
      }
      
      const nextMatch = nextRoundLosersMatches[nextMatchIndex];
      if (nextMatch) {
        await supabase.from('matches').update({ [slot]: winnerId }).eq('id', nextMatch.id);
      }
    } else {
      // Losers Final → Gagnant va en Grande Finale (player2)
      if (grandFinal) {
        await supabase.from('matches').update({ player2_id: winnerId }).eq('id', grandFinal.id);
      }
    }
  }
  
  // C. Grande Finale
  else if (match.bracket_type === 'grand_final' && !match.is_reset) {
    // Si le joueur du Winners bracket gagne → terminé
    if (winnerId === match.player1_id) {
      return winnerId; // Tournoi terminé
    } 
    // Si le joueur du Losers gagne → Reset match
    else if (resetMatch) {
      await supabase.from('matches').update({ 
        player1_id: match.player1_id, 
        player2_id: winnerId 
      }).eq('id', resetMatch.id);
    }
  }
  
  // D. Reset Match
  else if (match.bracket_type === 'grand_final' && match.is_reset) {
    return winnerId; // Le gagnant du reset est le champion
  }

  return null;
}

/**
 * Helper pour récupérer un participant par son team_id
 */
async function getParticipantByTeamId(supabase, tournamentId, teamId) {
  const { data } = await supabase
    .from('participants')
    .select('*, teams(*)')
    .eq('tournament_id', tournamentId)
    .eq('team_id', teamId)
    .single();
  return data;
}

/**
 * Détermine le vainqueur du tournoi si terminé
 */
export async function checkTournamentWinner(supabase, tournamentId, format, matches) {
  if (format === 'elimination') {
    // Single Elim: Dernier match complété du dernier round
    const maxRound = Math.max(...matches.map(m => m.round_number));
    const finalMatch = matches.find(m => m.round_number === maxRound && m.status === 'completed');
    
    if (finalMatch) {
      const winnerId = finalMatch.score_p1 > finalMatch.score_p2 
        ? finalMatch.player1_id 
        : finalMatch.player2_id;
      const participant = await getParticipantByTeamId(supabase, tournamentId, winnerId);
      return participant?.teams?.name || null;
    }
  }
  
  if (format === 'double_elimination') {
    // Double Elim: Vérifier la Grande Finale ou le Reset
    const grandFinalMatches = matches.filter(m => m.bracket_type === 'grand_final');
    const resetMatch = grandFinalMatches.find(m => m.is_reset && m.status === 'completed');
    const grandFinal = grandFinalMatches.find(m => !m.is_reset && m.status === 'completed');
    
    let winnerId = null;
    if (resetMatch) {
      winnerId = resetMatch.score_p1 > resetMatch.score_p2 
        ? resetMatch.player1_id 
        : resetMatch.player2_id;
    } else if (grandFinal && grandFinal.score_p1 > grandFinal.score_p2) {
      // Player1 (from Winners) won without reset
      winnerId = grandFinal.player1_id;
    }
    
    if (winnerId) {
      const participant = await getParticipantByTeamId(supabase, tournamentId, winnerId);
      return participant?.teams?.name || null;
    }
  }
  
  return null;
}
