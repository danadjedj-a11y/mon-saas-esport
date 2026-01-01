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
      
      if ((isMem1?.length > 0) || isCaptain1) {
        setMyTeamId(matchData.player1_id);
        myTeam = matchData.player1_id;
      }
    }

    if (session && matchData.player2_id && !myTeam) {
      // Vérifier si je suis membre ou capitaine de l'équipe 2
      const { data: isMem2 } = await supabase.from('team_members').select('*').match({team_id: matchData.player2_id, user_id: session.user.id});
      const { data: team2Data } = await supabase.from('teams').select('captain_id').eq('id', matchData.player2_id).single();
      const isCaptain2 = team2Data?.captain_id === session.user.id;
      
      if ((isMem2?.length > 0) || isCaptain2) {
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
      const currentLosersMatches = allMatches.filter(m => m.bracket_type === 'losers' && m.round_number === roundNumber).sort((a,b) => a.match_number - b.match_number);
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
    if (!myTeamId || !session) return alert("Tu dois être connecté et membre d'une équipe pour déclarer un score.");
    if (myScore < 0 || opponentScore < 0) return alert("Les scores ne peuvent pas être négatifs.");

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

              alert('✅ Scores concordent ! Le match est validé et l\'arbre va se mettre à jour.');
              
              // C. FAIRE AVANCER L'ARBRE (Le cœur du problème résolu ici)
              const updatedMatch = { ...currentMatch, score_p1: team1Report.score_team, score_p2: team1Report.score_opponent, status: 'completed' };
              
              const s1 = updatedMatch.score_p1;
              const s2 = updatedMatch.score_p2;
              
              if (s1 !== s2) {
                const winnerTeamId = s1 > s2 ? updatedMatch.player1_id : updatedMatch.player2_id;
                const loserTeamId = s1 > s2 ? updatedMatch.player2_id : updatedMatch.player1_id;
                
                // Récupérer format
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
              alert('⚠️ Conflit : Les scores ne correspondent pas. Un admin doit intervenir.');
            }
          }
        }
      }

      fetchMatchDetails();
    } catch (error) {
      alert("Erreur : " + error.message);
    }
  };

  const resolveConflict = async (scoreP1, scoreP2) => {
    if (!isAdmin) return alert("Seul l'administrateur peut résoudre un conflit.");

    // 1. Update Match
    await supabase.from('matches').update({ 
      score_p1: scoreP1, score_p2: scoreP2, score_p1_reported: scoreP1, score_p2_reported: scoreP2,
      score_status: 'confirmed', status: 'completed', reported_by_team1: true, reported_by_team2: true
    }).eq('id', id);

    // 2. Resolve reports
    await supabase.from('score_reports').update({ is_resolved: true }).eq('match_id', id);

    alert("✅ Conflit résolu !");
    
    // 3. Avancer Bracket
    const { data: updatedMatch } = await supabase.from('matches').select('*').eq('id', id).single();
    if (updatedMatch) {
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
    
    fetchMatchDetails();
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
  const hasConflict = match.score_status === 'disputed';
  const isConfirmed = match.score_status === 'confirmed';

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      
      {/* COLONNE GAUCHE : INFO MATCH & SCORE */}
      <div>
        <button onClick={() => navigate(`/tournament/${match.tournament_id}`)} style={{background:'none', border:'none', color:'#888', cursor:'pointer', marginBottom:'20px'}}>← Retour Tournoi</button>
        
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
          <h2 style={{color:'#666', fontSize:'0.9rem', textTransform:'uppercase', marginTop: 0}}>Match #{match.match_number} - Round {match.round_number}</h2>
          
          {hasConflict && (
            <div style={{background: '#e74c3c', color: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #c0392b'}}>
              <strong>⚠️ Conflit de scores détecté</strong>
              <p style={{margin: '5px 0 0 0', fontSize: '0.9rem'}}>Les deux équipes ont déclaré des scores différents. Intervention admin requise.</p>
            </div>
          )}

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
                    <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                      <span style={{fontSize:'3rem', fontWeight:'bold', color: match.score_p1 > match.score_p2 ? '#4ade80' : '#666'}}>{match.score_p1}</span>
                        <span style={{fontSize:'2rem', fontWeight:'bold'}}>:</span>
                      <span style={{fontSize:'3rem', fontWeight:'bold', color: match.score_p2 > match.score_p1 ? '#4ade80' : '#666'}}>{match.score_p2}</span>
                    </div>
                  ) : (
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
                <input type="number" defaultValue={match.score_p1_reported || 0} id="admin-score-p1" min="0" style={{fontSize:'1.5rem', width:'80px', textAlign:'center', background:'#fff', color:'#000', borderRadius:'5px', padding: '10px'}} />
                <span style={{fontSize:'2rem'}}>:</span>
                <input type="number" defaultValue={match.score_p2_reported || 0} id="admin-score-p2" min="0" style={{fontSize:'1.5rem', width:'80px', textAlign:'center', background:'#fff', color:'#000', borderRadius:'5px', padding: '10px'}} />
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
      <div style={{ height: '600px', background: '#1a1a1a', borderRadius: '15px', border: '1px solid #333', overflow: 'hidden' }}>
        <div style={{padding:'15px', borderBottom:'1px solid #333', background:'#222'}}>
            <h3 style={{margin:0}}>💬 Chat du Match</h3>
        </div>
        <Chat matchId={id} session={session} supabase={supabase} />
      </div>
    </div>
  );
}