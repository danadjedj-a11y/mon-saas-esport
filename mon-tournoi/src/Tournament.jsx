import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Ajout de useNavigate
import { supabase } from './supabaseClient';
import confetti from 'canvas-confetti'; // <--- LA MAGIE
import JoinButton from './JoinButton'       // <--- 2. Importe le bouton ici
import CheckInButton from './CheckInButton';
import Chat from './Chat';

export default function Tournament({ session }) {
  const { id } = useParams();
  const navigate = useNavigate(); // Pour changer de page
  
  const [tournoi, setTournoi] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [winnerName, setWinnerName] = useState(null); // Pour afficher le gagnant final

  const isOwner = tournoi && session && tournoi.owner_id === session.user.id;

  useEffect(() => {
    fetchData();
    const sub = supabase.channel(`participants-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${id}` }, 
      () => { fetchData() })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [id]);

  const fetchData = async () => {
    const { data: tData } = await supabase.from('tournaments').select('*').eq('id', id).single();
    setTournoi(tData);

    const { data: pData } = await supabase.from('participants').select('*').eq('tournament_id', id).order('created_at');
    setParticipants(pData || []);

    const { data: mData } = await supabase.from('matches').select('*').eq('tournament_id', id).order('match_number');

    if (mData && mData.length > 0 && pData) {
      const enrichedMatches = mData.map(match => {
        const player1 = pData.find(p => p.id === match.player1_id);
        const player2 = pData.find(p => p.id === match.player2_id);
        return {
          ...match,
          player1_name: player1 ? player1.name : (match.player1_id ? '???' : 'En attente'),
          player2_name: player2 ? player2.name : (match.player2_id ? '???' : 'En attente')
        };
      });
      setMatches(enrichedMatches);
      
      // Vérifier si le tournoi est fini (Dernier match complété)
      const lastMatch = enrichedMatches[enrichedMatches.length - 1];
      if (lastMatch && lastMatch.status === 'completed') {
          const winner = lastMatch.score_p1 > lastMatch.score_p2 ? lastMatch.player1_name : lastMatch.player2_name;
          setWinnerName(winner);
      }
    }
    setLoading(false);
  };

  const addParticipant = async () => {
    if (!newPlayerName) return;
    const userIdToAdd = isOwner ? null : session.user.id;
    const { error } = await supabase.from('participants').insert([{ tournament_id: id, name: newPlayerName, user_id: userIdToAdd }]);
    if (error) alert(error.message);
    else setNewPlayerName('');
  };

  const removeParticipant = async (pid) => {
    if (!confirm("Exclure ?")) return;
    setParticipants(curr => curr.filter(p => p.id !== pid));
    await supabase.from('participants').delete().eq('id', pid);
  };

  const startTournament = async () => {
    const count = participants.length;
    // Vérification Puissance de 2 (4, 8, 16, 32...)
    if (count < 4 || (count & (count - 1)) !== 0) {
      alert(`Nombre de joueurs invalide (${count}). Il faut 4, 8, 16, 32... joueurs.`);
      return;
    }
    if (!confirm("Lancer le tournoi ?")) return;
    setLoading(true);

    let shuffled = [...participants].sort(() => Math.random() - 0.5);
    let matchesToInsert = [];
    let matchGlobalIndex = 1;
    let totalRounds = Math.log2(count);
    let nbMatchsCeRound = count / 2;

    for (let r = 1; r <= totalRounds; r++) {
      for (let m = 1; m <= nbMatchsCeRound; m++) {
        matchesToInsert.push({
          tournament_id: id,
          round_number: r,
          match_number: matchGlobalIndex,
          player1_id: r === 1 ? shuffled[(m - 1) * 2].id : null,
          player2_id: r === 1 ? shuffled[(m - 1) * 2 + 1].id : null,
          status: 'pending'
        });
        matchGlobalIndex++;
      }
      nbMatchsCeRound /= 2;
    }

    const { error } = await supabase.from('matches').insert(matchesToInsert);
    if (error) { alert(error.message); setLoading(false); return; }
    await supabase.from('tournaments').update({ status: 'ongoing' }).eq('id', id);
    window.location.reload();
  };

  const handleMatchClick = (match) => {
    if (!isOwner || !match.player1_id || !match.player2_id) return;
    setCurrentMatch(match);
    setScoreA(match.score_p1 || 0);
    setScoreB(match.score_p2 || 0);
    setIsModalOpen(true);
  };

  const saveScore = async () => {
    if (!currentMatch) return;
    const s1 = parseInt(scoreA);
    const s2 = parseInt(scoreB);

    // 1. On sauvegarde le score du match
    await supabase.from('matches').update({ score_p1: s1, score_p2: s2, status: 'completed' }).eq('id', currentMatch.id);

    if (s1 !== s2) {
        const winnerId = s1 > s2 ? currentMatch.player1_id : currentMatch.player2_id;
        
        // Trouver match suivant
        const currentRoundMatches = matches.filter(m => m.round_number === currentMatch.round_number).sort((a,b) => a.match_number - b.match_number);
        const myIndex = currentRoundMatches.findIndex(m => m.id === currentMatch.id);
        const nextRound = currentMatch.round_number + 1;
        
        // Si c'est la FINALE (pas de round suivant)
        const totalRounds = Math.max(...matches.map(m => m.round_number));
        
        if (currentMatch.round_number === totalRounds) {
            // C'EST GAGNÉ !
            triggerConfetti();
            const winnerName = s1 > s2 ? currentMatch.player1_name : currentMatch.player2_name;
            setWinnerName(winnerName);

            // 👇👇👇 NOUVEAU : On dit à la base de données que c'est FINI 👇👇👇
            await supabase
              .from('tournaments')
              .update({ status: 'completed' }) 
              .eq('id', id); // 'id' vient de useParams() au début du fichier
            // 👆👆👆 FIN DU NOUVEAU 👆👆👆

        } else {
            // Avancement normal vers le round suivant
            const nextRoundMatches = matches.filter(m => m.round_number === nextRound).sort((a,b) => a.match_number - b.match_number);
            const nextMatch = nextRoundMatches[Math.floor(myIndex / 2)];
            if (nextMatch) {
                const isPlayer1Slot = (myIndex % 2) === 0;
                await supabase.from('matches').update(isPlayer1Slot ? { player1_id: winnerId } : { player2_id: winnerId }).eq('id', nextMatch.id);
            }
        }
    }
    setIsModalOpen(false);
    fetchData();
  };

  const triggerConfetti = () => {
    var duration = 3 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    var interval = setInterval(function() {
      var timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) { return clearInterval(interval); }
      var particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
    }, 250);
  };

  if (loading) return <div style={{color:'white', padding:'20px'}}>Chargement...</div>;

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '100%', margin: '0 auto', fontFamily: 'Arial' }}>
      
      {/* HEADER AVEC BOUTON RETOUR */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #333', paddingBottom:'20px', marginBottom:'30px'}}>
        <div>
           <button onClick={() => navigate('/dashboard')} style={{background:'transparent', border:'1px solid #444', color:'#888', padding:'5px 10px', borderRadius:'4px', cursor:'pointer', marginBottom:'10px'}}>← Retour</button>
           <h1 style={{ margin: 0, color: '#00d4ff' }}>{tournoi.name}</h1>
        </div>
        <div style={{textAlign:'right'}}>
           <div style={{fontWeight:'bold', color: tournoi.status === 'draft' ? 'orange' : '#4ade80'}}>
             {winnerName ? '🏆 TERMINÉ' : (tournoi.status === 'draft' ? '🟠 Brouillon' : '🟢 En cours')}
           </div>
        </div>
      </div>

      {/* BANNIÈRE VAINQUEUR */}
      {winnerName && (
          <div style={{background: 'linear-gradient(45deg, #FFD700, #FFA500)', color:'black', padding:'20px', borderRadius:'8px', textAlign:'center', marginBottom:'30px', animation:'pop 0.5s ease-out'}}>
              <h2 style={{margin:0, fontSize:'2rem'}}>👑 VAINQUEUR : {winnerName} 👑</h2>
          </div>
      )}

      {/* ADMIN PANEL (Brouillon) */}
      {isOwner && tournoi.status === 'draft' && (
        <div style={{ background: '#222', padding: '20px', borderRadius: '8px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft:'4px solid #8e44ad' }}>
          <span>{participants.length} joueurs inscrits.</span>
          <button onClick={startTournament} disabled={participants.length < 4} style={{ padding: '10px 20px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer', opacity: participants.length < 4 ? 0.5 : 1 }}>Lancer le Tournoi</button>
        </div>
      )}

      {tournoi.status === 'draft' && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          
          {/* Bouton d'inscription */}
          <JoinButton 
            tournamentId={id} 
            supabase={supabase} 
            session={session} 
          />

          {/* NOUVEAU : Bouton de Check-in */}
          <CheckInButton 
            tournamentId={id} 
            supabase={supabase} 
            session={session} 
          />

        </div>
      )}

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems:'flex-start' }}>
        {/* COLONNE GAUCHE */}
<div style={{ flex: '1', minWidth: '300px', maxWidth: '400px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
  <div style={{padding:'15px', borderBottom:'1px solid #333'}}>
    <h3 style={{margin:0}}>Joueurs</h3>
  </div>
  
  {tournoi.status === 'draft' && (
      <div style={{display:'flex', padding:'10px', gap:'10px'}}>
        <input type="text" placeholder="Ajouter joueur..." value={newPlayerName} onChange={e=>setNewPlayerName(e.target.value)} onKeyDown={e=>e.key==='Enter' && addParticipant()} style={{flex:1, padding:'8px', background:'#111', border:'1px solid #444', color:'white', borderRadius:'4px'}} />
        <button onClick={addParticipant} style={{background:'#4ade80', border:'none', borderRadius:'4px', padding:'0 15px', fontWeight:'bold'}}>+</button>
      </div>
  )}

  <ul style={{listStyle:'none', padding:0, margin:0, maxHeight:'300px', overflowY:'auto'}}> {/* J'ai réduit le maxHeight de 500 à 300 pour laisser de la place au chat */}
    {participants.map(p => (
        <li key={p.id} style={{padding:'10px 15px', borderBottom:'1px solid #2a2a2a', display:'flex', justifyContent:'space-between'}}>
            <span>{p.name}</span>
            {isOwner && <button onClick={()=>removeParticipant(p.id)} style={{background:'transparent', border:'none', color:'#666', cursor:'pointer'}}>✕</button>}
        </li>
    ))}
  </ul>

  {/* --- AJOUT DU CHAT ICI (Juste après le </ul>) --- */}
  <div style={{ borderTop: '1px solid #333', padding: '15px' }}>
    <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>💬 Chat</h3>
    <Chat 
      tournamentId={id} 
      session={session} 
      supabase={supabase} 
    />
  </div>
  {/* --------------------------------------------- */}

</div>

        {/* COLONNE DROITE (ARBRE) */}
        <div style={{ flex: '3', minWidth:'300px', overflowX:'auto' }}>
           {matches.length > 0 ? (
             <div style={{display:'flex', gap:'40px', paddingBottom:'20px'}}>
                {[...new Set(matches.map(m=>m.round_number))].sort().map(round => (
                    <div key={round} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                        <h4 style={{textAlign:'center', color:'#666'}}>Round {round}</h4>
                        {matches.filter(m=>m.round_number === round).map(m => (
                            <div key={m.id} onClick={()=>handleMatchClick(m)} style={{
                                width:'220px', background:'#252525', border: m.status === 'completed' ? '1px solid #4ade80' : '1px solid #444', 
                                borderRadius:'8px', cursor: isOwner ? 'pointer' : 'default', position:'relative'
                            }}>
                                <div style={{padding:'10px', display:'flex', justifyContent:'space-between', background: m.score_p1 > m.score_p2 ? '#2f3b2f' : 'transparent', borderRadius:'8px 8px 0 0'}}>
                                    <span style={{color: m.player1_id ? 'white' : '#666', fontWeight: m.score_p1 > m.score_p2 ? 'bold' : 'normal'}}>{m.player1_name}</span>
                                    <span>{m.score_p1}</span>
                                </div>
                                <div style={{height:'1px', background:'#333'}}></div>
                                <div style={{padding:'10px', display:'flex', justifyContent:'space-between', background: m.score_p2 > m.score_p1 ? '#2f3b2f' : 'transparent', borderRadius:'0 0 8px 8px'}}>
                                    <span style={{color: m.player2_id ? 'white' : '#666', fontWeight: m.score_p2 > m.score_p1 ? 'bold' : 'normal'}}>{m.player2_name}</span>
                                    <span>{m.score_p2}</span>
                                    
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
             </div>
           ) : (
             <div style={{textAlign:'center', padding:'50px', border:'2px dashed #333', borderRadius:'8px', color:'#666'}}>L'arbre apparaîtra ici.</div>
           )}
        </div>
      </div>

      {/* MODALE SCORE */}
      {isModalOpen && currentMatch && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999}}>
            <div style={{background:'#2a2a2a', padding:'30px', borderRadius:'12px', width:'300px', border:'1px solid #444'}}>
                <h3 style={{textAlign:'center', marginTop:0}}>Résultat</h3>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', margin:'20px 0'}}>
                    <div style={{textAlign:'center'}}>
                        <div style={{marginBottom:'5px', fontSize:'0.8rem', color:'#aaa'}}>{currentMatch.player1_name}</div>
                        <input type="number" value={scoreA} onChange={e=>setScoreA(e.target.value)} style={{width:'50px', padding:'10px', background:'#111', border:'1px solid #444', color:'white', textAlign:'center', fontSize:'1.2rem', borderRadius:'4px'}} />
                    </div>
                    <span style={{fontWeight:'bold'}}>VS</span>
                    <div style={{textAlign:'center'}}>
                        <div style={{marginBottom:'5px', fontSize:'0.8rem', color:'#aaa'}}>{currentMatch.player2_name}</div>
                        <input type="number" value={scoreB} onChange={e=>setScoreB(e.target.value)} style={{width:'50px', padding:'10px', background:'#111', border:'1px solid #444', color:'white', textAlign:'center', fontSize:'1.2rem', borderRadius:'4px'}} />
                    </div>
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={()=>setIsModalOpen(false)} style={{flex:1, padding:'10px', background:'transparent', border:'1px solid #555', color:'#ccc', borderRadius:'4px', cursor:'pointer'}}>Annuler</button>
                    <button onClick={saveScore} style={{flex:1, padding:'10px', background:'#4ade80', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>Valider</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}