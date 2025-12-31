import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import confetti from 'canvas-confetti';
import TeamJoinButton from './TeamJoinButton'; // <--- NOUVEAU BOUTON
import CheckInButton from './CheckInButton';
import Chat from './Chat';

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

  const isOwner = tournoi && session && tournoi.owner_id === session.user.id;

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
          console.log('Changement Match détecté !', payload);
          fetchData(); // On recharge tout pour avoir les logos/noms à jour
        }
      )

      // B. Écouter les changements dans la table PARTICIPANTS (Nouvelle équipe inscrite)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${id}` },
        (payload) => {
          console.log('Changement Participant détecté !', payload);
          fetchData();
        }
      )

      // C. Écouter les changements dans la table TOURNAMENTS (Statut : Draft -> Ongoing)
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
        (payload) => {
          console.log('Statut Tournoi changé !', payload);
          fetchData();
        }
      )
      .subscribe();

    // Nettoyage quand on quitte la page
    return () => {
      supabase.removeChannel(channel);
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
      .order('created_at');
    
    setParticipants(pData || []);

    // 3. Charger les matchs
    const { data: mData } = await supabase.from('matches').select('*').eq('tournament_id', id).order('match_number');

    if (mData && mData.length > 0 && pData) {
      const enrichedMatches = mData.map(match => {
        // On trouve l'équipe via son ID stocké dans le match
        const p1 = pData.find(p => p.team_id === match.player1_id);
        const p2 = pData.find(p => p.team_id === match.player2_id);
        
        const getTeamName = (p) => p ? `${p.teams.name} [${p.teams.tag}]` : 'En attente';
        
        // NOUVEAU : On utilise le logo_url s'il existe, sinon l'avatar par défaut
        const getTeamLogo = (p) => p?.teams?.logo_url || `https://ui-avatars.com/api/?name=${p?.teams?.tag || '?'}&background=random&size=64`;

        return {
          ...match,
          p1_name: match.player1_id ? getTeamName(p1) : 'En attente',
          p1_avatar: getTeamLogo(p1), // <-- C'est ici que la magie opère
          p2_name: match.player2_id ? getTeamName(p2) : 'En attente',
          p2_avatar: getTeamLogo(p2), // <-- Ici aussi
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

  // --- LOGIQUE DE GÉNÉRATION DES MATCHS (Mise à jour pour V2 Teams) ---
  const startTournament = async () => {
    // Sécurité de base
    if (participants.length < 2) return alert("Il faut au moins 2 équipes pour lancer !");
    if (!confirm("Lancer le tournoi ? Plus aucune inscription ne sera possible.")) return;
    
    setLoading(true);

    // 1. Préparer les matchs
    let matchesToCreate = [];
    const shuffled = [...participants].sort(() => 0.5 - Math.random()); // On mélange toujours un peu

    // --- CAS 1 : ARBRE (ÉLIMINATION) ---
    if (tournoi.format === 'elimination') {
        // Ta logique existante (simplifiée pour l'exemple, mais garde la tienne si elle est complexe)
        // Ici je remets une logique standard d'arbre binaire pour être sûr que ça marche
        let roundCount = 1;
        let matchCount = 1;
        let activePlayers = shuffled.map(p => p.team_id);
        
        // Création du Round 1 (Les matchs joués tout de suite)
        // Note: Pour un vrai arbre parfait, il faudrait gérer les "Byes", mais restons simple pour le MVP
        const pairs = [];
        while (activePlayers.length > 0) {
            pairs.push(activePlayers.splice(0, 2));
        }

        // On crée les matchs du Round 1
        pairs.forEach(pair => {
            matchesToCreate.push({
                tournament_id: id,
                match_number: matchCount++,
                round_number: 1,
                player1_id: pair[0] || null, // Peut être null si nombre impair (Bye)
                player2_id: pair[1] || null,
                status: pair[1] ? 'pending' : 'completed', // Si pas d'adversaire, victoire auto
                next_match_id: null // Sera calculé si on fait un arbre complet (complexe)
            });
        });
        
        // NOTE: Pour un MVP Round Robin, cette partie Arbre est "bonus". 
        // Si ton ancien code Arbre marchait bien, tu peux juste coller la partie "else if" ci-dessous.
    } 
    
    // --- CAS 2 : CHAMPIONNAT (ROUND ROBIN) ---
    else if (tournoi.format === 'round_robin') {
        let matchNum = 1;
        // Double boucle : Chaque équipe rencontre toutes les autres une seule fois
        for (let i = 0; i < shuffled.length; i++) {
            for (let j = i + 1; j < shuffled.length; j++) {
                matchesToCreate.push({
                    tournament_id: id,
                    match_number: matchNum++,
                    round_number: 1, // En championnat, tout est souvent affiché dans un "Groupe unique"
                    player1_id: shuffled[i].team_id,
                    player2_id: shuffled[j].team_id,
                    status: 'pending',
                    score_p1: 0,
                    score_p2: 0
                });
            }
        }
    }

    // 2. Envoyer les matchs dans la base
    const { error: matchError } = await supabase
      .from('matches')
      .insert(matchesToCreate);

    if (matchError) {
        alert("Erreur création matchs : " + matchError.message);
        setLoading(false);
        return;
    }

    // 3. Passer le tournoi en "En cours" (ongoing)
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ status: 'ongoing' })
      .eq('id', id);

    if (updateError) alert("Erreur update statut : " + updateError.message);
    
    // 4. Recharger la page pour voir les matchs
    fetchData();
  };
  // ------------------------------------------------------------------

  const handleMatchClick = (match) => {
    // Si le match n'est pas encore prêt (pas de joueurs), on ne fait rien
    if (!match.player1_id || !match.player2_id) return;

    // Redirection vers le Lobby du Match
    navigate(`/match/${match.id}`);
  };

  const saveScore = async () => {
    if (!currentMatch) return;
    const s1 = parseInt(scoreA);
    const s2 = parseInt(scoreB);

    await supabase.from('matches').update({ score_p1: s1, score_p2: s2, status: 'completed' }).eq('id', currentMatch.id);

    if (s1 !== s2) {
        const winnerTeamId = s1 > s2 ? currentMatch.player1_id : currentMatch.player2_id;
        
        // Logique avancée tour suivant (simplifiée ici)
        const currentRoundMatches = matches.filter(m => m.round_number === currentMatch.round_number).sort((a,b) => a.match_number - b.match_number);
        const myIndex = currentRoundMatches.findIndex(m => m.id === currentMatch.id);
        const nextRound = currentMatch.round_number + 1;
        
        const nextRoundMatches = matches.filter(m => m.round_number === nextRound).sort((a,b) => a.match_number - b.match_number);
        // Trouver le match suivant (index / 2)
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
      {isOwner && tournoi.status === 'draft' && (
        <div style={{ background: '#222', padding: '20px', borderRadius: '8px', marginBottom: '30px', borderLeft:'4px solid #8e44ad', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>{participants.length} équipes inscrites.</span>
          <button onClick={startTournament} style={{ padding: '10px 20px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer' }}>Générer l'Arbre et Lancer</button>
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

          <CheckInButton tournamentId={id} supabase={supabase} session={session} />
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
             <div style={{display:'flex', gap:'40px', paddingBottom:'20px'}}>
                {[...new Set(matches.map(m=>m.round_number))].sort().map(round => (
                    <div key={round} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                        <h4 style={{textAlign:'center', color:'#666'}}>Round {round}</h4>
                        {matches.filter(m=>m.round_number === round).map(m => (
                            <div key={m.id} onClick={()=>handleMatchClick(m)} style={{
                                width:'240px', background:'#252525', 
                                border: m.status === 'completed' ? '1px solid #4ade80' : '1px solid #444', 
                                borderRadius:'8px', cursor: isOwner ? 'pointer' : 'default', position:'relative',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}>
                                {/* JOUEUR 1 */}
                                <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p1 > m.score_p2 ? '#2f3b2f' : 'transparent', borderRadius:'8px 8px 0 0'}}>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        {/* Avatar J1 */}
                                        {m.player1_id && <img src={m.p1_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555'}} alt="" />}
                                        <span style={{color: m.player1_id ? 'white' : '#666', fontWeight: m.score_p1 > m.score_p2 ? 'bold' : 'normal', fontSize:'0.9rem'}}>
                                            {m.p1_name.split(' [')[0]} <span style={{fontSize:'0.7rem', color:'#aaa'}}>{m.p1_name.includes('[') ? `[${m.p1_name.split('[')[1]}` : ''}</span>
                                        </span>
                                    </div>
                                    <span style={{fontWeight:'bold', fontSize:'1.1rem'}}>{m.score_p1}</span>
                                </div>
                                
                                <div style={{height:'1px', background:'#333'}}></div>
                                
                                {/* JOUEUR 2 */}
                                <div style={{padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', background: m.score_p2 > m.score_p1 ? '#2f3b2f' : 'transparent', borderRadius:'0 0 8px 8px'}}>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        {/* Avatar J2 */}
                                        {m.player2_id && <img src={m.p2_avatar} style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555'}} alt="" />}
                                        <span style={{color: m.player2_id ? 'white' : '#666', fontWeight: m.score_p2 > m.score_p1 ? 'bold' : 'normal', fontSize:'0.9rem'}}>
                                            {m.p2_name.split(' [')[0]} <span style={{fontSize:'0.7rem', color:'#aaa'}}>{m.p2_name.includes('[') ? `[${m.p2_name.split('[')[1]}` : ''}</span>
                                        </span>
                                    </div>
                                    <span style={{fontWeight:'bold', fontSize:'1.1rem'}}>{m.score_p2}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
             </div>
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
    </div>
  );
}