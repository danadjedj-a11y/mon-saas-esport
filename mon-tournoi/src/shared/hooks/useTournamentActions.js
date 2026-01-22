/**
 * Hook pour gérer les actions admin d'un tournoi
 */
import { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from '../../utils/toast';
import { generateBracket } from '../../utils/bracketGenerator';
import { initializeSwissScores, swissPairing, getSwissScores } from '../../swissUtils';
import confetti from 'canvas-confetti';

/**
 * Fonction pour lancer les confettis
 */
export function triggerConfetti() {
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#8B5CF6', '#06B6D4', '#EC4899', '#F59E0B']
  });
}

/**
 * Hook pour gérer les actions d'un tournoi
 */
export function useTournamentActions(tournamentId, tournament, participants, refetch) {
  const [actionLoading, setActionLoading] = useState(false);

  /**
   * Démarre le tournoi et génère les matchs
   */
  const startTournament = useCallback(async () => {
    if (!tournament) return;
    
    setActionLoading(true);
    try {
      // Filtrer les participants check-in
      const checkedInParticipants = participants.filter(p => p.checked_in && !p.disqualified);
      
      if (checkedInParticipants.length < 2) {
        toast.error('Il faut au moins 2 équipes check-in pour lancer le tournoi.');
        return;
      }

      // Générer les matchs
      const matchesToCreate = generateBracket(tournamentId, tournament.format, checkedInParticipants);

      // Insérer les matchs
      const { error: matchesError } = await supabase
        .from('matches')
        .insert(matchesToCreate);

      if (matchesError) {
        toast.error('Erreur lors de la création des matchs : ' + matchesError.message);
        return;
      }

      // Initialiser les scores suisses si nécessaire
      if (tournament.format === 'swiss') {
        await initializeSwissScores(supabase, tournamentId, checkedInParticipants);
      }

      // Mettre à jour le statut du tournoi
      const { error: statusError } = await supabase
        .from('tournaments')
        .update({ status: 'ongoing' })
        .eq('id', tournamentId);

      if (statusError) {
        toast.error('Erreur lors du changement de statut : ' + statusError.message);
        return;
      }

      toast.success('🎮 Le tournoi a démarré ! Les matchs ont été générés.');
      triggerConfetti();
      refetch();
    } finally {
      setActionLoading(false);
    }
  }, [tournamentId, tournament, participants, refetch]);

  /**
   * Génère le prochain round Swiss
   */
  const generateNextSwissRound = useCallback(async () => {
    if (!tournament || tournament.format !== 'swiss') return;

    setActionLoading(true);
    try {
      const { data: allMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number');
      
      const swissScores = await getSwissScores(supabase, tournamentId);
      
      const maxRound = Math.max(...(allMatches || []).map(m => m.round_number), 0);
      
      // Vérifier que tous les matchs du dernier round sont terminés
      const lastRoundMatches = (allMatches || []).filter(m => m.round_number === maxRound);
      const allCompleted = lastRoundMatches.every(m => m.status === 'completed');
      
      if (!allCompleted) {
        toast.warning('Tous les matchs du round actuel doivent être terminés.');
        return;
      }

      // Vérifier si le tournoi devrait se terminer
      const totalRounds = tournament.swiss_rounds || Math.ceil(Math.log2(participants.length));
      if (maxRound >= totalRounds) {
        await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId);
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
      
      // Créer les matchs
      const nextRound = maxRound + 1;
      let matchNum = Math.max(...(allMatches || []).map(m => m.match_number), 0) + 1;
      const matchesToCreate = pairs.map(pair => ({
        tournament_id: tournamentId,
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
    } finally {
      setActionLoading(false);
    }
  }, [tournamentId, tournament, participants, refetch]);

  /**
   * Promouvoir une équipe depuis la waitlist
   */
  const promoteFromWaitlist = useCallback(async (waitlistEntryId, teamId) => {
    if (tournament?.max_participants) {
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      if ((count || 0) >= tournament.max_participants) {
        toast.error('Le tournoi est complet. Impossible de promouvoir cette équipe.');
        return;
      }
    }

    const { error: insertError } = await supabase
      .from('participants')
      .insert([{
        tournament_id: tournamentId,
        team_id: teamId,
        checked_in: false,
        disqualified: false
      }]);

    if (insertError) {
      toast.error('Erreur lors de la promotion : ' + insertError.message);
      return;
    }

    await supabase.from('waitlist').delete().eq('id', waitlistEntryId);

    // Réorganiser les positions
    const { data: remainingWaitlist } = await supabase
      .from('waitlist')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('position', { ascending: true });

    if (remainingWaitlist?.length > 0) {
      for (let i = 0; i < remainingWaitlist.length; i++) {
        await supabase
          .from('waitlist')
          .update({ position: i + 1 })
          .eq('id', remainingWaitlist[i].id);
      }
    }

    toast.success('Équipe promue avec succès !');
    refetch();
  }, [tournamentId, tournament, refetch]);

  /**
   * Exclure un participant
   */
  const removeParticipant = useCallback(async (participantId) => {
    if (!confirm("Exclure cette équipe ?")) return;
    
    const { error } = await supabase.from('participants').delete().eq('id', participantId);
    
    if (error) {
      toast.error('Erreur lors de la suppression : ' + error.message);
      return;
    }
    
    refetch();
  }, [refetch]);

  /**
   * Check-in admin pour un participant
   */
  const handleAdminCheckIn = useCallback(async (participantId, currentStatus) => {
    const { error } = await supabase
      .from('participants')
      .update({ checked_in: !currentStatus, disqualified: false })
      .eq('id', participantId);
    
    if (error) {
      toast.error('Erreur lors du check-in : ' + error.message);
      return;
    }
    
    refetch();
  }, [refetch]);

  /**
   * Copier le lien public
   */
  const copyPublicLink = useCallback(() => {
    const publicUrl = `${window.location.origin}/tournament/${tournamentId}/public`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      toast.success('Lien public copié dans le presse-papier !');
    }).catch(() => {
      toast.error('Erreur lors de la copie du lien');
    });
  }, [tournamentId]);

  /**
   * Export PDF (lazy loaded)
   */
  const exportToPDF = useCallback(async (matches, swissScores) => {
    if (!tournament || !participants || !matches) {
      toast.error('Données incomplètes pour l\'export PDF');
      return;
    }
    
    let standings = null;
    
    if (tournament.format === 'round_robin') {
      const stats = participants.map(p => ({
        ...p,
        played: 0, wins: 0, draws: 0, losses: 0, points: 0, goalDiff: 0
      }));
      
      matches.filter(m => m.status === 'completed').forEach(m => {
        const p1Index = stats.findIndex(p => p.team_id === m.player1_id);
        const p2Index = stats.findIndex(p => p.team_id === m.player2_id);
        if (p1Index === -1 || p2Index === -1) return;
        
        stats[p1Index].played++;
        stats[p2Index].played++;
        stats[p1Index].goalDiff += (m.score_p1 || 0) - (m.score_p2 || 0);
        stats[p2Index].goalDiff += (m.score_p2 || 0) - (m.score_p1 || 0);
        
        if (m.score_p1 > m.score_p2) {
          stats[p1Index].wins++;
          stats[p1Index].points += 3;
          stats[p2Index].losses++;
        } else if (m.score_p2 > m.score_p1) {
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
      
      standings = stats.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff);
    } else if (tournament.format === 'swiss' && swissScores?.length > 0) {
      standings = swissScores.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.buchholz_score - a.buchholz_score;
      }).map(score => {
        const team = participants.find(p => p.team_id === score.team_id);
        return { ...score, teams: team?.teams, name: team?.teams?.name };
      });
    }
    
    // Lazy load du module PDF
    const { exportTournamentToPDF } = await import('../../utils/pdfExport');
    await exportTournamentToPDF(tournament, participants, matches, standings);
  }, [tournament, participants]);

  return {
    actionLoading,
    startTournament,
    generateNextSwissRound,
    promoteFromWaitlist,
    removeParticipant,
    handleAdminCheckIn,
    copyPublicLink,
    exportToPDF,
    triggerConfetti
  };
}
