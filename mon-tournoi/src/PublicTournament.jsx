import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function PublicTournament() {
  const { id } = useParams();
  
  const [tournoi, setTournoi] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'participants', 'bracket', 'results'

  useEffect(() => {
    fetchData();

    // Abonnement temps réel pour les mises à jour publiques
    const channel = supabase.channel('public-tournament-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` }, 
      () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${id}` }, 
      () => fetchData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` }, 
      () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  const fetchData = async () => {
    // 1. Charger le tournoi
    const { data: tData } = await supabase.from('tournaments').select('*').eq('id', id).single();
    setTournoi(tData);

    // 2. Charger les participants
    const { data: pData } = await supabase
      .from('participants')
      .select('*, teams(*)')
      .eq('tournament_id', id)
      .order('seed_order', { ascending: true, nullsLast: true });
    
    setParticipants(pData || []);

    // 3. Charger les matchs
    const { data: mData } = await supabase.from('matches').select('*').eq('tournament_id', id).order('match_number');

    if (mData && mData.length > 0 && pData) {
      const enrichedMatches = mData.map(match => {
        const p1 = pData.find(p => p.team_id === match.player1_id);
        const p2 = pData.find(p => p.team_id === match.player2_id);
        
        const getTeamName = (p) => p ? `${p.teams.name} [${p.teams.tag}]` : 'En attente';
        const getTeamLogo = (p) => p?.teams?.logo_url || `https://ui-avatars.com/api/?name=${p?.teams?.tag || '?'}&background=random&size=64`;

        return {
          ...match,
          p1_name: match.player1_id ? getTeamName(p1) : 'En attente',
          p1_avatar: getTeamLogo(p1),
          p2_name: match.player2_id ? getTeamName(p2) : 'En attente',
          p2_avatar: getTeamLogo(p2),
        };
      });
      setMatches(enrichedMatches);
    }
    setLoading(false);
  };

  // Calcul du classement pour Round Robin
  const getStandings = () => {
    if (!participants || !matches) return [];

    const stats = participants.map(p => ({
      ...p,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      goalDiff: 0
    }));

    matches.forEach(m => {
      if (m.status !== 'completed') return;

      const p1Index = stats.findIndex(p => p.team_id === m.player1_id);
      const p2Index = stats.findIndex(p => p.team_id === m.player2_id);

      if (p1Index === -1 || p2Index === -1) return;

      stats[p1Index].played++;
      stats[p2Index].played++;

      const diff = (m.score_p1 || 0) - (m.score_p2 || 0);
      stats[p1Index].goalDiff += diff;
      stats[p2Index].goalDiff -= diff;

      if ((m.score_p1 || 0) > (m.score_p2 || 0)) {
        stats[p1Index].wins++;
        stats[p1Index].points += 3;
        stats[p2Index].losses++;
      } else if ((m.score_p2 || 0) > (m.score_p1 || 0)) {
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

    return stats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.goalDiff - a.goalDiff;
    });
  };

  if (loading) return <div style={{color:'white', padding:'20px', textAlign:'center'}}>Chargement du tournoi...</div>;
  if (!tournoi) return <div style={{color:'white', padding:'20px', textAlign:'center'}}>Tournoi introuvable</div>;

  const winnerMatch = matches.find(m => m.round_number === Math.max(...matches.map(m => m.round_number), 0) && m.status === 'completed');
  const winnerName = winnerMatch ? (winnerMatch.score_p1 > winnerMatch.score_p2 ? winnerMatch.p1_name : winnerMatch.p2_name) : null;

  const tabs = [
    { id: 'overview', label: '📋 Présentation', icon: '📋' },
    { id: 'participants', label: '👥 Participants', icon: '👥' },
    { id: 'bracket', label: '🏆 Arbre / Classement', icon: '🏆' },
    { id: 'results', label: '📊 Résultats', icon: '📊' }
  ];

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Arial', background: '#111', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #333' }}>
        <h1 style={{ margin: '10px 0', color: '#00d4ff', fontSize: '2.5rem' }}>{tournoi.name}</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '15px', flexWrap: 'wrap' }}>
          <span style={{ background: '#2a2a2a', padding: '8px 15px', borderRadius: '20px', fontSize: '0.9rem' }}>
            🎮 {tournoi.game}
          </span>
          <span style={{ background: '#2a2a2a', padding: '8px 15px', borderRadius: '20px', fontSize: '0.9rem' }}>
            📊 {tournoi.format === 'elimination' ? 'Élimination Directe' : tournoi.format === 'round_robin' ? 'Championnat' : tournoi.format}
          </span>
          <span style={{ 
            background: tournoi.status === 'completed' ? '#27ae60' : tournoi.status === 'ongoing' ? '#3498db' : '#f39c12', 
            padding: '8px 15px', 
            borderRadius: '20px', 
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}>
            {tournoi.status === 'completed' ? '🏁 Terminé' : tournoi.status === 'ongoing' ? '🟢 En cours' : '🟠 Inscriptions'}
          </span>
        </div>
      </div>

      {/* BANNIÈRE VAINQUEUR */}
      {winnerName && (
        <div style={{
          background: 'linear-gradient(135deg, #FFD700, #FFA500)', 
          color:'black', 
          padding:'25px', 
          borderRadius:'15px', 
          textAlign:'center', 
          marginBottom:'30px',
          boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{margin:0, fontSize: '1.8rem'}}>👑 VAINQUEUR : {winnerName.split(' [')[0]} 👑</h2>
        </div>
      )}

      {/* ONGLETS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #333', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '15px 25px',
              background: activeTab === tab.id ? '#8e44ad' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#aaa',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #00d4ff' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENU DES ONGLETS */}
      <div style={{ minHeight: '400px' }}>
        
        {/* ONGLET PRÉSENTATION */}
        {activeTab === 'overview' && (
          <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
            <h2 style={{ marginTop: 0, color: '#00d4ff' }}>Informations du tournoi</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '5px' }}>Jeu</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{tournoi.game}</div>
              </div>
              
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '5px' }}>Format</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
                  {tournoi.format === 'elimination' ? 'Élimination Directe' : tournoi.format === 'round_robin' ? 'Championnat (Round Robin)' : tournoi.format}
                </div>
              </div>
              
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '5px' }}>Équipes inscrites</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{participants.length}</div>
              </div>
              
              {tournoi.start_date && (
                <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '5px' }}>Date de début</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                    {new Date(tournoi.start_date).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
            </div>

            {matches.length > 0 && (
              <div style={{ marginTop: '30px', background: '#2a2a2a', padding: '20px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>Progression</div>
                <div style={{ fontSize: '1.1rem' }}>
                  {matches.filter(m => m.status === 'completed').length} / {matches.length} matchs joués
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '10px', 
                  background: '#1a1a1a', 
                  borderRadius: '5px', 
                  marginTop: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${(matches.filter(m => m.status === 'completed').length / matches.length) * 100}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #8e44ad, #3498db)',
                    transition: 'width 0.3s'
                  }}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ONGLET PARTICIPANTS */}
        {activeTab === 'participants' && (
          <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
            <h2 style={{ marginTop: 0, color: '#00d4ff', marginBottom: '20px' }}>
              Participants ({participants.length})
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {participants.map(p => (
                <div 
                  key={p.id}
                  style={{ 
                    background: '#2a2a2a', 
                    padding: '15px', 
                    borderRadius: '10px', 
                    textAlign: 'center',
                    border: '1px solid #333',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img 
                    src={p.teams?.logo_url || `https://ui-avatars.com/api/?name=${p.teams?.tag || '?'}&background=random&size=128`}
                    alt=""
                    style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', marginBottom: '10px' }}
                  />
                  <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{p.teams?.name || 'Équipe inconnue'}</div>
                  <div style={{ color: '#00d4ff', fontSize: '0.85rem', marginTop: '5px' }}>[{p.teams?.tag || '?'}]</div>
                  {p.seed_order && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '0.75rem', 
                      color: p.seed_order <= 3 ? '#f1c40f' : '#aaa',
                      fontWeight: p.seed_order <= 3 ? 'bold' : 'normal'
                    }}>
                      Seed #{p.seed_order}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {participants.length === 0 && (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>Aucun participant pour le moment.</p>
            )}
          </div>
        )}

        {/* ONGLET ARBRE / CLASSEMENT */}
        {activeTab === 'bracket' && (
          <div>
            {tournoi.format === 'round_robin' ? (
              // CLASSEMENT (Round Robin)
              <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
                <h2 style={{ marginTop: 0, color: '#00d4ff', marginBottom: '25px' }}>🏆 Classement</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                    <thead>
                      <tr style={{ background: '#252525', textAlign: 'left' }}>
                        <th style={{ padding: '12px', borderRadius:'5px 0 0 5px' }}>Rang</th>
                        <th style={{ padding: '12px' }}>Équipe</th>
                        <th style={{ padding: '12px', textAlign:'center' }}>Pts</th>
                        <th style={{ padding: '12px', textAlign:'center' }}>J</th>
                        <th style={{ padding: '12px', textAlign:'center' }}>V</th>
                        <th style={{ padding: '12px', textAlign:'center' }}>N</th>
                        <th style={{ padding: '12px', textAlign:'center', borderRadius:'0 5px 5px 0' }}>D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getStandings().map((team, index) => (
                        <tr key={team.id} style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ padding: '12px', fontWeight: index === 0 ? 'bold' : 'normal', color: index === 0 ? '#f1c40f' : 'white', fontSize: '1.1rem' }}>
                            #{index + 1}
                          </td>
                          <td style={{ padding: '12px', display:'flex', alignItems:'center', gap:'10px' }}>
                            <img src={team.teams?.logo_url || `https://ui-avatars.com/api/?name=${team.teams?.tag}`} style={{width:'32px', height:'32px', borderRadius:'50%'}} alt=""/>
                            <span style={{ fontWeight: index === 0 ? 'bold' : 'normal' }}>{team.teams?.name}</span>
                          </td>
                          <td style={{ padding: '12px', textAlign:'center', fontWeight:'bold', fontSize:'1.2rem', color:'#4ade80' }}>{team.points}</td>
                          <td style={{ padding: '12px', textAlign:'center', color:'#888' }}>{team.played}</td>
                          <td style={{ padding: '12px', textAlign:'center' }}>{team.wins}</td>
                          <td style={{ padding: '12px', textAlign:'center' }}>{team.draws}</td>
                          <td style={{ padding: '12px', textAlign:'center' }}>{team.losses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // ARBRE (Elimination)
              <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '1px solid #333', overflowX: 'auto' }}>
                <h2 style={{ marginTop: 0, color: '#00d4ff', marginBottom: '25px' }}>🏆 Arbre du Tournoi</h2>
                {matches.length > 0 ? (
                  <div style={{display:'flex', gap:'40px', paddingBottom:'20px', minWidth: 'fit-content'}}>
                    {[...new Set(matches.map(m=>m.round_number))].sort().map(round => (
                      <div key={round} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                        <h4 style={{textAlign:'center', color:'#666', marginBottom: '15px'}}>Round {round}</h4>
                        {matches.filter(m=>m.round_number === round).map(m => (
                          <div key={m.id} style={{
                            width:'260px', 
                            background:'#252525', 
                            border: m.status === 'completed' ? '2px solid #4ade80' : '1px solid #444', 
                            borderRadius:'10px', 
                            position:'relative',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                          }}>
                            {/* JOUEUR 1 */}
                            <div style={{
                              padding:'15px', 
                              display:'flex', 
                              justifyContent:'space-between', 
                              alignItems:'center', 
                              background: (m.score_p1 || 0) > (m.score_p2 || 0) ? '#2f3b2f' : 'transparent', 
                              borderRadius:'10px 10px 0 0'
                            }}>
                              <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                {m.player1_id && <img src={m.p1_avatar} style={{width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                <span style={{
                                  color: m.player1_id ? 'white' : '#666', 
                                  fontWeight: (m.score_p1 || 0) > (m.score_p2 || 0) ? 'bold' : 'normal', 
                                  fontSize:'0.9rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {m.p1_name.split(' [')[0]}
                                </span>
                              </div>
                              <span style={{fontWeight:'bold', fontSize:'1.2rem', marginLeft: '10px'}}>{m.score_p1 || '-'}</span>
                            </div>
                            
                            <div style={{height:'1px', background:'#333'}}></div>
                            
                            {/* JOUEUR 2 */}
                            <div style={{
                              padding:'15px', 
                              display:'flex', 
                              justifyContent:'space-between', 
                              alignItems:'center', 
                              background: (m.score_p2 || 0) > (m.score_p1 || 0) ? '#2f3b2f' : 'transparent', 
                              borderRadius:'0 0 10px 10px'
                            }}>
                              <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                {m.player2_id && <img src={m.p2_avatar} style={{width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                <span style={{
                                  color: m.player2_id ? 'white' : '#666', 
                                  fontWeight: (m.score_p2 || 0) > (m.score_p1 || 0) ? 'bold' : 'normal', 
                                  fontSize:'0.9rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {m.p2_name.split(' [')[0]}
                                </span>
                              </div>
                              <span style={{fontWeight:'bold', fontSize:'1.2rem', marginLeft: '10px'}}>{m.score_p2 || '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{textAlign:'center', padding:'50px', border:'2px dashed #333', borderRadius:'8px', color:'#666'}}>
                    L'arbre apparaîtra une fois le tournoi lancé.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ONGLET RÉSULTATS */}
        {activeTab === 'results' && (
          <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', border: '1px solid #333' }}>
            <h2 style={{ marginTop: 0, color: '#00d4ff', marginBottom: '25px' }}>📊 Résultats des matchs</h2>
            
            {matches.filter(m => m.status === 'completed').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {matches
                  .filter(m => m.status === 'completed')
                  .sort((a, b) => {
                    if (a.round_number !== b.round_number) return a.round_number - b.round_number;
                    return a.match_number - b.match_number;
                  })
                  .map(m => (
                    <div 
                      key={m.id}
                      style={{ 
                        background: '#2a2a2a', 
                        padding: '20px', 
                        borderRadius: '10px', 
                        border: '1px solid #333',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '15px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '8px' }}>
                          Round {m.round_number} - Match #{m.match_number}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <img src={m.p1_avatar} style={{width:'40px', height:'40px', borderRadius:'50%', objectFit:'cover'}} alt="" />
                            <span style={{ fontWeight: (m.score_p1 || 0) > (m.score_p2 || 0) ? 'bold' : 'normal' }}>
                              {m.p1_name.split(' [')[0]}
                            </span>
                          </div>
                          <div style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold',
                            minWidth: '60px',
                            textAlign: 'center'
                          }}>
                            {m.score_p1 || 0} - {m.score_p2 || 0}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
                            <span style={{ fontWeight: (m.score_p2 || 0) > (m.score_p1 || 0) ? 'bold' : 'normal' }}>
                              {m.p2_name.split(' [')[0]}
                            </span>
                            <img src={m.p2_avatar} style={{width:'40px', height:'40px', borderRadius:'50%', objectFit:'cover'}} alt="" />
                          </div>
                        </div>
                      </div>
                      {(m.score_p1 || 0) > (m.score_p2 || 0) ? (
                        <div style={{ color: '#4ade80', fontWeight: 'bold' }}>✅ {m.p1_name.split(' [')[0]}</div>
                      ) : (m.score_p2 || 0) > (m.score_p1 || 0) ? (
                        <div style={{ color: '#4ade80', fontWeight: 'bold' }}>✅ {m.p2_name.split(' [')[0]}</div>
                      ) : (
                        <div style={{ color: '#f39c12', fontWeight: 'bold' }}>🤝 Match nul</div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>Aucun résultat pour le moment.</p>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #333', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
        <p>Vue publique - Les résultats sont mis à jour en temps réel</p>
        <p style={{ marginTop: '5px' }}>
          <a href="/" style={{ color: '#00d4ff', textDecoration: 'none' }}>← Retour à l'accueil</a>
        </p>
      </div>
    </div>
  );
}



