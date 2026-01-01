import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Chat from './Chat';

export default function MatchLobby({ session, supabase }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myTeamId, setMyTeamId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tournamentOwnerId, setTournamentOwnerId] = useState(null);
  
  // États pour le score déclaré par MON équipe
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  
  // États pour l'upload de preuve
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState(null);
  
  // Historique des déclarations
  const [scoreReports, setScoreReports] = useState([]);

  useEffect(() => {
    fetchMatchDetails();
    // Realtime pour voir les changements de scores
    const channel = supabase.channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, 
      () => fetchMatchDetails())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'score_reports', filter: `match_id=eq.${id}` }, 
      () => fetchScoreReports())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id]);

  const fetchMatchDetails = async () => {
    const { data: matchData } = await supabase.from('matches').select('*').eq('id', id).single();
    
    if (!matchData) {
      setLoading(false);
      return;
    }

    // Récupérer le tournoi pour vérifier si on est admin
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('owner_id')
      .eq('id', matchData.tournament_id)
      .single();
    
    if (tournament) {
      setTournamentOwnerId(tournament.owner_id);
      setIsAdmin(session?.user?.id === tournament.owner_id);
    }
    
    // Récupérer les noms/logos des équipes
    const { data: team1 } = await supabase.from('teams').select('*').eq('id', matchData.player1_id).single();
    const { data: team2 } = await supabase.from('teams').select('*').eq('id', matchData.player2_id).single();

    // Identifier mon équipe
    let myTeam = null;
    if (session && matchData.player1_id) {
      // Vérifier si je suis membre ou capitaine de l'équipe 1
      const { data: isMem1 } = await supabase.from('team_members').select('*').match({team_id: matchData.player1_id, user_id: session.user.id});
      const { data: team1Data } = await supabase.from('teams').select('captain_id').eq('id', matchData.player1_id).single();
      const isCaptain1 = team1Data?.captain_id === session.user.id;
      
      if (isMem1?.length > 0 || isCaptain1) {
        setMyTeamId(matchData.player1_id);
        myTeam = matchData.player1_id;
      }
    }

    if (session && matchData.player2_id && !myTeam) {
      // Vérifier si je suis membre ou capitaine de l'équipe 2
      const { data: isMem2 } = await supabase.from('team_members').select('*').match({team_id: matchData.player2_id, user_id: session.user.id});
      const { data: team2Data } = await supabase.from('teams').select('captain_id').eq('id', matchData.player2_id).single();
      const isCaptain2 = team2Data?.captain_id === session.user.id;
      
      if (isMem2?.length > 0 || isCaptain2) {
        setMyTeamId(matchData.player2_id);
        myTeam = matchData.player2_id;
      }
    }

    setMatch({ ...matchData, team1, team2 });
    if(matchData.proof_url) setProofUrl(matchData.proof_url);
    
    // Initialiser les scores déclarés par mon équipe (si déjà déclaré)
    if (myTeam === matchData.player1_id && matchData.reported_by_team1) {
      setMyScore(matchData.score_p1_reported || 0);
      setOpponentScore(matchData.score_p2_reported || 0);
    } else if (myTeam === matchData.player2_id && matchData.reported_by_team2) {
      setMyScore(matchData.score_p2_reported || 0);
      setOpponentScore(matchData.score_p1_reported || 0);
    }
    
    fetchScoreReports();
    setLoading(false);
  };


  const fetchScoreReports = async () => {
    const { data } = await supabase
      .from('score_reports')
      .select('*, teams(name, tag), profiles(username)')
      .eq('match_id', id)
      .order('created_at', { ascending: false });
    setScoreReports(data || []);
  };

  const submitScoreReport = async () => {
    if (!myTeamId || !session) return alert("Tu dois être connecté et membre d'une équipe pour déclarer un score.");
    if (myScore < 0 || opponentScore < 0) return alert("Les scores ne peuvent pas être négatifs.");

    const isTeam1 = myTeamId === match.player1_id;
    const scoreForTeam1 = isTeam1 ? myScore : opponentScore;
    const scoreForTeam2 = isTeam1 ? opponentScore : myScore;
    
    console.log('[MatchLobby.jsx] isTeam1:', isTeam1, 'scoreForTeam1:', scoreForTeam1, 'scoreForTeam2:', scoreForTeam2);

    try {
      // 1. Enregistrer dans score_reports (historique)
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
        ? {
            score_p1_reported: scoreForTeam1,
            score_p2_reported: scoreForTeam2,
            reported_by_team1: true
          }
        : {
            score_p1_reported: scoreForTeam1,
            score_p2_reported: scoreForTeam2,
            reported_by_team2: true
          };

      const { data: updatedMatch, error: matchError } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (matchError) throw matchError;

      // 3. Vérifier si les deux équipes ont déclaré leur score
      const { data: currentMatch } = await supabase
        .from('matches')
        .select('reported_by_team1, reported_by_team2, score_p1_reported, score_p2_reported, score_status')
        .eq('id', id)
        .single();

      if (currentMatch?.reported_by_team1 && currentMatch?.reported_by_team2) {
        // Les deux équipes ont déclaré leur score - vérifier la concordance
        const team1Declared = {
          p1: currentMatch.score_p1_reported,
          p2: currentMatch.score_p2_reported
        };
        
        // Vérifier si les scores concordent (les deux équipes ont déclaré les mêmes scores, juste inversés)
        const scoresMatch = 
          (team1Declared.p1 === currentMatch.score_p1_reported && 
           team1Declared.p2 === currentMatch.score_p2_reported);

        // En fait, on compare directement car les deux équipes déclarent pour le même match
        // Si team1 déclare (3, 2) et team2 déclare (2, 3), ça concorde
        // On vérifie donc : score_p1_reported de team1 = score_p2_reported de team2 et vice versa
        // Mais comme on stocke les mêmes valeurs, on vérifie simplement que les deux ont déclaré
        // et que les valeurs sont cohérentes (même si team2 a déclaré après, on garde les valeurs de team1)
        
        // Pour une vraie vérification, on devrait comparer avec les scores dans score_reports
        // mais pour simplifier, on va dire que si les deux ont déclaré et que score_p1_reported + score_p2_reported sont cohérents
        // alors on valide
        
        // Vérifier dans score_reports si les deux équipes ont déclaré les mêmes scores
        const { data: reports } = await supabase
          .from('score_reports')
          .select('id, team_id, score_team, score_opponent')
          .eq('match_id', id)
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(2);

        console.log('📊 Score reports récupérés:', reports);

        if (reports && reports.length === 2) {
          const team1Report = reports.find(r => r.team_id === match.player1_id);
          const team2Report = reports.find(r => r.team_id === match.player2_id);

          console.log('🔍 Team1 report:', team1Report);
          console.log('🔍 Team2 report:', team2Report);

          if (team1Report && team2Report) {
            // Vérifier concordance : team1 déclare (X, Y) et team2 déclare (Y, X)
            const scoresConcord = 
              team1Report.score_team === team2Report.score_opponent &&
              team1Report.score_opponent === team2Report.score_team;
            
            console.log('🔍 Scores concordent?', scoresConcord);

            if (scoresConcord) {
              console.log('[MatchLobby.jsx] ✅ SCORES CONCORDENT - Validation automatique');
              // ✅ CONCORDANCE - Validation automatique
              const updateResult = await supabase
                .from('matches')
                .update({
                  score_p1: team1Report.score_team,
                  score_p2: team1Report.score_opponent,
                  score_status: 'confirmed',
                  status: 'completed'
                })
                .eq('id', id);

              if (updateResult.error) {
                console.error('[MatchLobby.jsx] Erreur lors de la mise à jour du match:', updateResult.error);
                return;
              }

              // Marquer les rapports comme résolus
              const reportIds = reports.map(r => r.id).filter(id => id); // Filtrer les undefined au cas où
              if (reportIds.length > 0) {
                await supabase
                  .from('score_reports')
                  .update({ is_resolved: true })
                  .in('id', reportIds);
              }

              alert('✅ Scores concordent ! Le match est automatiquement validé.');
              
              // Récupérer le match mis à jour avec toutes les colonnes (bracket_type, score_p1, score_p2, etc.)
              // EXACTEMENT comme dans Tournament.jsx saveScore
              const { data: updatedMatch, error: fetchError } = await supabase
                .from('matches')
                .select('*')
                .eq('id', id)
                .single();
              
              if (fetchError) {
                console.error('Erreur lors de la récupération du match:', fetchError);
                return;
              }
              
              if (!updatedMatch) {
                console.error('Match mis à jour non trouvé');
                return;
              }

              // Calculer winnerTeamId et loserTeamId à partir des scores finaux (comme dans Tournament.jsx)
              const s1 = updatedMatch.score_p1;
              const s2 = updatedMatch.score_p2;
              
              if (s1 !== s2) {
                const winnerTeamId = s1 > s2 ? updatedMatch.player1_id : updatedMatch.player2_id;
                const loserTeamId = s1 > s2 ? updatedMatch.player2_id : updatedMatch.player1_id;
                
                // Récupérer le format du tournoi pour savoir quelle progression utiliser
                const { data: tournament } = await supabase
                  .from('tournaments')
                  .select('format, id')
                  .eq('id', updatedMatch.tournament_id)
                  .single();
                
                if (tournament && tournament.format === 'double_elimination') {
                  // Double Elimination : utiliser handleDoubleEliminationProgression directement
                  // Récupérer tous les matchs depuis la DB (comme dans Tournament.jsx)
                  const { data: allMatches, error: matchesError } = await supabase
                    .from('matches')
                    .select('*')
                    .eq('tournament_id', updatedMatch.tournament_id)
                    .order('round_number', { ascending: true })
                    .order('match_number', { ascending: true });
                  
                  if (!matchesError && allMatches) {
                    await handleDoubleEliminationProgression(updatedMatch, winnerTeamId, loserTeamId, allMatches, tournament.id);
                  }
                } else {
                  // Single Elimination ou autres formats : utiliser advanceWinner
                  await advanceWinner(updatedMatch, winnerTeamId);
                }
              }
            } else {
              // ❌ CONFLIT - Signalement pour intervention admin
              await supabase
                .from('matches')
                .update({ score_status: 'disputed' })
                .eq('id', id);

              alert('⚠️ Conflit détecté ! Les scores ne concordent pas. Un administrateur va vérifier.');
            }
          }
        }
      }

      fetchMatchDetails();
    } catch (error) {
      alert("Erreur lors de la déclaration : " + error.message);
      console.error(error);
    }
  };

  const advanceWinner = async (matchData, winnerTeamId) => {
    // Récupérer le format du tournoi
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('format, id')
      .eq('id', matchData.tournament_id)
      .single();

    if (tournamentError) {
      console.error('Erreur lors de la récupération du tournoi:', tournamentError);
      return;
    }

    if (!tournament) {
      console.error('Tournament not found');
      return;
    }

    // Récupérer tous les matchs du tournoi (inclure bracket_type, is_reset, etc.)
    const { data: allMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', matchData.tournament_id)
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

    const loserTeamId = winnerTeamId === matchData.player1_id ? matchData.player2_id : matchData.player1_id;

    // Double Elimination : Logique spéciale
    if (tournament.format === 'double_elimination') {
      await handleDoubleEliminationProgression(matchData, winnerTeamId, loserTeamId, allMatches, tournament.id);
      return;
    }

    // Single Elimination ou Round Robin : Logique standard
    const currentRoundMatches = allMatches.filter(m => m.round_number === matchData.round_number).sort((a, b) => a.match_number - b.match_number);
    const myIndex = currentRoundMatches.findIndex(m => m.id === matchData.id);
    const nextRound = matchData.round_number + 1;
    
    const nextRoundMatches = allMatches.filter(m => m.round_number === nextRound).sort((a, b) => a.match_number - b.match_number);
    const nextMatch = nextRoundMatches[Math.floor(myIndex / 2)];

    if (nextMatch) {
      const isPlayer1Slot = (myIndex % 2) === 0;
      await supabase
        .from('matches')
        .update(isPlayer1Slot ? { player1_id: winnerTeamId } : { player2_id: winnerTeamId })
        .eq('id', nextMatch.id);
    } else {
      // Finale gagnée
      await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournament.id);
    }
  };

  const handleDoubleEliminationProgression = async (completedMatch, winnerTeamId, loserTeamId, matches, tournamentId) => {
    const bracketType = completedMatch.bracket_type;
    const roundNumber = completedMatch.round_number;
    
    if (bracketType === 'winners') {
      // WINNERS BRACKET : Gagnant avance, perdant va dans Losers
      
      // 1. Faire avancer le gagnant dans le bracket Winners
      const currentWinnersMatches = matches.filter(m => m.bracket_type === 'winners' && m.round_number === roundNumber).sort((a,b) => a.match_number - b.match_number);
      const myIndex = currentWinnersMatches.findIndex(m => m.id === completedMatch.id);
      
      if (myIndex === -1) {
        console.error('Match not found in currentWinnersMatches!', completedMatch.id);
        return;
      }
      
      const nextWinnersRound = roundNumber + 1;
      const nextWinnersMatches = matches.filter(m => m.bracket_type === 'winners' && m.round_number === nextWinnersRound).sort((a,b) => a.match_number - b.match_number);
      
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
        const grandFinals = matches.find(m => !m.bracket_type && !m.is_reset);
        if (grandFinals) {
          await supabase.from('matches').update({ player1_id: winnerTeamId }).eq('id', grandFinals.id);
        }
      }
      
      // 2. Envoyer le perdant dans le bracket Losers
      if (roundNumber === 1) {
        // Perdants du Round 1 Winners vont dans Losers Round 1 (par paires)
        const losersRound1Matches = matches.filter(m => m.bracket_type === 'losers' && m.round_number === 1).sort((a,b) => a.match_number - b.match_number);
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
        const losersMatches = matches.filter(m => m.bracket_type === 'losers' && m.round_number === losersRound).sort((a,b) => a.match_number - b.match_number);
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
      
      const currentLosersMatches = matches.filter(m => m.bracket_type === 'losers' && m.round_number === roundNumber).sort((a,b) => a.match_number - b.match_number);
      const myIndex = currentLosersMatches.findIndex(m => m.id === completedMatch.id);
      const nextLosersRound = roundNumber + 1;
      
      const nextLosersMatches = matches.filter(m => m.bracket_type === 'losers' && m.round_number === nextLosersRound).sort((a,b) => a.match_number - b.match_number);
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
        const grandFinals = matches.find(m => !m.bracket_type && !m.is_reset);
        if (grandFinals) {
          await supabase.from('matches').update({ player2_id: winnerTeamId }).eq('id', grandFinals.id);
        }
      }
      
    } else if (completedMatch.is_reset) {
      // RESET MATCH : Le gagnant est le champion final
      await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId);
    } else {
      // GRAND FINALS
      const grandFinals = completedMatch;
      if (winnerTeamId === grandFinals.player1_id) {
        // Le gagnant des Winners a gagné -> Champion !
        await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId);
      } else {
        // Le gagnant des Losers a gagné -> Reset match nécessaire
        const resetMatch = matches.find(m => m.is_reset);
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

  const resolveConflict = async (scoreP1, scoreP2) => {
    if (!isAdmin) return alert("Seul l'administrateur peut résoudre un conflit.");

    const { error } = await supabase
      .from('matches')
      .update({
        score_p1: scoreP1,
        score_p2: scoreP2,
        score_p1_reported: scoreP1,
        score_p2_reported: scoreP2,
        score_status: 'confirmed',
        status: 'completed',
        reported_by_team1: true,
        reported_by_team2: true
      })
      .eq('id', id);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      // Marquer tous les rapports comme résolus
      await supabase
        .from('score_reports')
        .update({ is_resolved: true })
        .eq('match_id', id);

      alert("✅ Conflit résolu ! Le score a été validé.");
      
      // Récupérer le match mis à jour avec toutes les colonnes (bracket_type, etc.)
      const { data: updatedMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();
      
      if (updatedMatch) {
        // Avancer le vainqueur
        const winnerTeamId = scoreP1 > scoreP2 ? updatedMatch.player1_id : updatedMatch.player2_id;
        await advanceWinner(updatedMatch, winnerTeamId);
      }
      
      fetchMatchDetails();
    }
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
      alert("Erreur upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading || !match) return <div style={{color:'white', padding:'20px'}}>Chargement du Lobby...</div>;

  const isTeam1 = myTeamId === match.player1_id;
  const reportedByMe = isTeam1 ? match.reported_by_team1 : match.reported_by_team2;
  const reportedByOpponent = isTeam1 ? match.reported_by_team2 : match.reported_by_team1;
  const hasConflict = match.score_status === 'disputed';
  const isConfirmed = match.score_status === 'confirmed';

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      
      {/* COLONNE GAUCHE : INFO MATCH & SCORE */}
      <div>
        <button onClick={() => navigate(`/tournament/${match.tournament_id}`)} style={{background:'none', border:'none', color:'#888', cursor:'pointer', marginBottom:'20px'}}>← Retour Tournoi</button>
        
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
          <h2 style={{color:'#666', fontSize:'0.9rem', textTransform:'uppercase', marginTop: 0}}>Match #{match.match_number} - Round {match.round_number}</h2>
          
          {/* ALERTE CONFLIT */}
          {hasConflict && (
            <div style={{background: '#e74c3c', color: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #c0392b'}}>
              <strong>⚠️ Conflit de scores détecté</strong>
              <p style={{margin: '5px 0 0 0', fontSize: '0.9rem'}}>Les deux équipes ont déclaré des scores différents. Intervention admin requise.</p>
            </div>
          )}

          {/* ALERTE CONFIRMÉ */}
          {isConfirmed && (
            <div style={{background: '#27ae60', color: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #229954'}}>
              <strong>✅ Scores confirmés</strong>
              <p style={{margin: '5px 0 0 0', fontSize: '0.9rem'}}>Les scores ont été validés automatiquement.</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '30px 0' }}>
            {/* TEAM 1 */}
            <div style={{textAlign:'center', flex: 1}}>
              <img 
                src={match.team1?.logo_url || `https://ui-avatars.com/api/?name=${match.team1?.tag}&background=random&size=128`} 
                style={{width:'80px', height:'80px', borderRadius:'10px', objectFit:'cover', border: isTeam1 ? '3px solid #00d4ff' : '2px solid #555'}} 
                alt=""
              />
              <h3 style={{marginTop:'10px'}}>{match.team1?.name}</h3>
              {isTeam1 && <span style={{fontSize:'0.8rem', color:'#00d4ff'}}>👤 Mon équipe</span>}
              {reportedByMe && isTeam1 && (
                <div style={{marginTop:'5px', fontSize:'0.75rem', color:'#4ade80'}}>✅ Score déclaré</div>
              )}
            </div>

            {/* SCORE */}
            <div style={{display:'flex', flexDirection:'column', gap:'10px', alignItems:'center', padding: '0 30px'}}>
              {isConfirmed ? (
                // Score final confirmé
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                  <span style={{fontSize:'3rem', fontWeight:'bold', color: match.score_p1 > match.score_p2 ? '#4ade80' : '#666'}}>{match.score_p1}</span>
                  <span style={{fontSize:'2rem', fontWeight:'bold'}}>:</span>
                  <span style={{fontSize:'3rem', fontWeight:'bold', color: match.score_p2 > match.score_p1 ? '#4ade80' : '#666'}}>{match.score_p2}</span>
                </div>
              ) : (
                // Score déclaré (si admin ou si j'ai déclaré)
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                  <span style={{fontSize:'2.5rem', fontWeight:'bold'}}>{match.score_p1_reported ?? '-'}</span>
                  <span style={{fontSize:'2rem'}}>:</span>
                  <span style={{fontSize:'2.5rem', fontWeight:'bold'}}>{match.score_p2_reported ?? '-'}</span>
                </div>
              )}
            </div>

            {/* TEAM 2 */}
            <div style={{textAlign:'center', flex: 1}}>
              <img 
                src={match.team2?.logo_url || `https://ui-avatars.com/api/?name=${match.team2?.tag}&background=random&size=128`} 
                style={{width:'80px', height:'80px', borderRadius:'10px', objectFit:'cover', border: !isTeam1 && myTeamId ? '3px solid #00d4ff' : '2px solid #555'}} 
                alt=""
              />
              <h3 style={{marginTop:'10px'}}>{match.team2?.name}</h3>
              {!isTeam1 && myTeamId && <span style={{fontSize:'0.8rem', color:'#00d4ff'}}>👤 Mon équipe</span>}
              {reportedByMe && !isTeam1 && (
                <div style={{marginTop:'5px', fontSize:'0.75rem', color:'#4ade80'}}>✅ Score déclaré</div>
              )}
            </div>
          </div>

          {/* ZONE DE DÉCLARATION DE SCORE */}
          {myTeamId && !reportedByMe && !isConfirmed && (
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
                  width: '100%',
                  marginTop: '15px',
                  background:'#f1c40f', 
                  color:'#000', 
                  border:'none', 
                  padding:'15px', 
                  fontSize:'1.1rem', 
                  borderRadius:'5px', 
                  cursor:'pointer', 
                  fontWeight:'bold'
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
                <input 
                  type="number" 
                  defaultValue={match.score_p1_reported || 0}
                  id="admin-score-p1"
                  min="0"
                  style={{fontSize:'1.5rem', width:'80px', textAlign:'center', background:'#fff', color:'#000', border:'2px solid #fff', borderRadius:'5px', padding: '10px'}} 
                />
                <span style={{fontSize:'2rem'}}>:</span>
                <input 
                  type="number" 
                  defaultValue={match.score_p2_reported || 0}
                  id="admin-score-p2"
                  min="0"
                  style={{fontSize:'1.5rem', width:'80px', textAlign:'center', background:'#fff', color:'#000', border:'2px solid #fff', borderRadius:'5px', padding: '10px'}} 
                />
              </div>
              <button 
                onClick={() => {
                  const scoreP1 = parseInt(document.getElementById('admin-score-p1').value) || 0;
                  const scoreP2 = parseInt(document.getElementById('admin-score-p2').value) || 0;
                  resolveConflict(scoreP1, scoreP2);
                }} 
                style={{
                  width: '100%',
                  marginTop: '15px',
                  background:'#fff', 
                  color:'#c0392b', 
                  border:'none', 
                  padding:'15px', 
                  fontSize:'1.1rem', 
                  borderRadius:'5px', 
                  cursor:'pointer', 
                  fontWeight:'bold'
                }}
              >
                ✅ Valider ce score
              </button>
            </div>
          )}

          {match.status === 'completed' && !hasConflict && (
            <div style={{marginTop:'20px', color:'#4ade80', fontWeight:'bold', textAlign: 'center', padding: '10px', background: '#1a3a1a', borderRadius: '5px'}}>
              🏁 MATCH TERMINÉ
            </div>
          )}
        </div>

        {/* SECTION PREUVES */}
        <div style={{ marginTop: '20px', background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}>
          <h3>📷 Preuve du résultat (Screenshot)</h3>
          {proofUrl ? (
            <a href={proofUrl} target="_blank" rel="noreferrer">
              <img src={proofUrl} style={{maxWidth:'100%', maxHeight:'300px', borderRadius:'5px', border:'1px solid #555'}} alt="Preuve" />
            </a>
          ) : (
            <p style={{color:'#666'}}>Aucune preuve envoyée.</p>
          )}
          
          {myTeamId && (
            <div style={{marginTop:'10px'}}>
              <input type="file" accept="image/*" onChange={uploadProof} disabled={uploading} style={{color:'white'}} />
              {uploading && <span style={{marginLeft: '10px', color: '#aaa'}}>Upload en cours...</span>}
            </div>
          )}
        </div>

        {/* HISTORIQUE DES DÉCLARATIONS */}
        {scoreReports.length > 0 && (
          <div style={{ marginTop: '20px', background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}>
            <h3>📋 Historique des déclarations</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px'}}>
              {scoreReports.map((report, index) => (
                <div 
                  key={report.id} 
                  style={{
                    padding: '12px',
                    background: report.is_resolved ? '#1a3a1a' : '#2a2a2a',
                    borderRadius: '8px',
                    border: report.is_resolved ? '1px solid #27ae60' : '1px solid #555',
                    opacity: report.is_resolved ? 0.7 : 1
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <strong>{report.teams?.name || 'Équipe'}</strong> a déclaré : 
                      <span style={{marginLeft: '10px', fontSize: '1.2rem', fontWeight: 'bold'}}>
                        {report.score_team} - {report.score_opponent}
                      </span>
                    </div>
                    <div style={{fontSize: '0.8rem', color: '#888'}}>
                      {new Date(report.created_at).toLocaleString('fr-FR')}
                      {report.is_resolved && <span style={{marginLeft: '10px', color: '#4ade80'}}>✅ Résolu</span>}
                    </div>
                  </div>
                  {report.profiles?.username && (
                    <div style={{fontSize: '0.75rem', color: '#aaa', marginTop: '5px'}}>
                      Déclaré par {report.profiles.username}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* COLONNE DROITE : CHAT */}
      <div style={{ height: '600px', background: '#1a1a1a', borderRadius: '15px', border: '1px solid #333', overflow: 'hidden' }}>
        <div style={{padding:'15px', borderBottom:'1px solid #333', background:'#222'}}>
          <h3 style={{margin:0}}>💬 Chat du Match</h3>
        </div>
        <Chat matchId={id} session={session} supabase={supabase} />
      </div>
    </div>
  );
}
