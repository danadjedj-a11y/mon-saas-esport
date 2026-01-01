import { useState, useEffect } from 'react';
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
      .order('seed_order', { ascending: true, nullsLast: true }); // Trier par seed_order si disponible
    
    setParticipants(pData || []);

    // 3. Charger les matchs
    const { data: mData } = await supabase.from('matches').select('*').eq('tournament_id', id).order('match_number');

    if (mData && mData.length > 0 && pData) {
      // Créer une map pour accès rapide aux participants
      const participantsMap = new Map(pData.map(p => [p.team_id, p]));
      
      const enrichedMatches = mData.map(match => {
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

    // --- CAS 1 : ARBRE (ÉLIMINATION) ---
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
                next_match_id: null
            });
        });
    } 
    
    // --- CAS 2 : CHAMPIONNAT (ROUND ROBIN) ---
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
                    score_p2: 0
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
