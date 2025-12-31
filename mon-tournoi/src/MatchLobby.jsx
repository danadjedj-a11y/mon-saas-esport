import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Chat from './Chat'; // On réutilise ton chat

export default function MatchLobby({ session, supabase }) {
  const { id } = useParams(); // ID du match
  const navigate = useNavigate();
  
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myTeamId, setMyTeamId] = useState(null);
  
  // États pour le score
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  
  // États pour l'upload de preuve
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState(null);

  useEffect(() => {
    fetchMatchDetails();
    // Realtime pour voir si l'adversaire a validé ou uploadé une preuve
    const channel = supabase.channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, 
      () => fetchMatchDetails())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id]);

  const fetchMatchDetails = async () => {
    // On récupère le match ET les infos des deux équipes (join)
    // Note: On suppose que tu as créé une vue ou que tu fais 2 requêtes. 
    // Pour faire simple ici, on récupère le match brut, puis les équipes.
    
    const { data: matchData } = await supabase.from('matches').select('*').eq('id', id).single();
    
    // Récupérer les noms/logos des équipes
    const { data: team1 } = await supabase.from('teams').select('*').eq('id', matchData.player1_id).single();
    const { data: team2 } = await supabase.from('teams').select('*').eq('id', matchData.player2_id).single();

    // Identifier mon équipe
    if (session) {
      // Suis-je capitaine ou membre de l'équipe 1 ?
      const { data: isMem1 } = await supabase.from('team_members').select('*').match({team_id: matchData.player1_id, user_id: session.user.id});
      if (isMem1?.length > 0) setMyTeamId(matchData.player1_id);

      // Suis-je capitaine ou membre de l'équipe 2 ?
      const { data: isMem2 } = await supabase.from('team_members').select('*').match({team_id: matchData.player2_id, user_id: session.user.id});
      if (isMem2?.length > 0) setMyTeamId(matchData.player2_id);
    }

    setMatch({ ...matchData, team1, team2 });
    if(matchData.proof_url) setProofUrl(matchData.proof_url);
    setScore1(matchData.score_p1);
    setScore2(matchData.score_p2);
    setLoading(false);
  };

  const handleScoreSubmit = async () => {
    if (!myTeamId) return alert("Seuls les joueurs peuvent entrer le score.");
    
    // Logique simple : on update directement (Version MVP)
    // Version Pro : On envoie une "proposition" que l'autre doit valider.
    const { error } = await supabase
      .from('matches')
      .update({ 
        score_p1: score1, 
        score_p2: score2, 
        status: 'completed' // Attention: ça termine le match direct
      })
      .eq('id', id);

    if (error) alert("Erreur: " + error.message);
    else alert("Score envoyé !");
  };

  const uploadProof = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileName = `proof-${id}-${Date.now()}.png`;
      
      // On utilise un bucket 'match-proofs' (à créer)
      const { error: upErr } = await supabase.storage.from('match-proofs').upload(fileName, file);
      if(upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('match-proofs').getPublicUrl(fileName);
      
      // On sauvegarde l'URL dans le match
      await supabase.from('matches').update({ proof_url: publicUrl }).eq('id', id);
      setProofUrl(publicUrl);

    } catch (err) {
      alert("Erreur upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading || !match) return <div style={{color:'white'}}>Chargement du Lobby...</div>;

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      
      {/* COLONNE GAUCHE : INFO MATCH & SCORE */}
      <div>
        <button onClick={() => navigate(`/tournament/${match.tournament_id}`)} style={{background:'none', border:'none', color:'#888', cursor:'pointer', marginBottom:'20px'}}>← Retour Tournoi</button>
        
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', textAlign: 'center', border: '1px solid #333' }}>
            <h2 style={{color:'#666', fontSize:'0.9rem', textTransform:'uppercase'}}>Match #{match.match_number} - Round {match.round_number}</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '30px 0' }}>
                {/* TEAM 1 */}
                <div style={{textAlign:'center'}}>
                    <img src={match.team1?.logo_url} style={{width:'80px', height:'80px', borderRadius:'10px', objectFit:'cover'}} alt=""/>
                    <h3 style={{marginTop:'10px'}}>{match.team1?.name}</h3>
                </div>

                {/* SCORE */}
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    <input type="number" value={score1} onChange={e=>setScore1(e.target.value)} style={{fontSize:'2rem', width:'60px', textAlign:'center', background:'#111', color:'white', border:'1px solid #444', borderRadius:'5px'}} />
                    <span style={{fontSize:'2rem', fontWeight:'bold'}}>:</span>
                    <input type="number" value={score2} onChange={e=>setScore2(e.target.value)} style={{fontSize:'2rem', width:'60px', textAlign:'center', background:'#111', color:'white', border:'1px solid #444', borderRadius:'5px'}} />
                </div>

                {/* TEAM 2 */}
                <div style={{textAlign:'center'}}>
                    <img src={match.team2?.logo_url} style={{width:'80px', height:'80px', borderRadius:'10px', objectFit:'cover'}} alt=""/>
                    <h3 style={{marginTop:'10px'}}>{match.team2?.name}</h3>
                </div>
            </div>

            {myTeamId && (
                <button onClick={handleScoreSubmit} style={{background:'#e67e22', color:'white', border:'none', padding:'15px 30px', fontSize:'1.1rem', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>
                    Valider le Résultat Final
                </button>
            )}

            {match.status === 'completed' && <div style={{marginTop:'20px', color:'#4ade80', fontWeight:'bold'}}>MATCH TERMINÉ</div>}
        </div>

        {/* SECTION PREUVES (SCREENSHOTS) */}
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
                    <input type="file" onChange={uploadProof} disabled={uploading} style={{color:'white'}} />
                    {uploading && <span>Upload en cours...</span>}
                </div>
            )}
        </div>
      </div>

      {/* COLONNE DROITE : CHAT */}
      <div style={{ height: '600px', background: '#1a1a1a', borderRadius: '15px', border: '1px solid #333', overflow: 'hidden' }}>
        <div style={{padding:'15px', borderBottom:'1px solid #333', background:'#222'}}>
            <h3 style={{margin:0}}>💬 Chat du Match</h3>
        </div>
        {/* On réutilise ton composant Chat, mais on lui passera un ID de canal spécifique au match */}
        <Chat matchId={id} session={session} supabase={supabase} />
      </div>

    </div>
  );
}