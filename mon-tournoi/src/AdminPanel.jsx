import React, { useState, useEffect } from 'react';

export default function AdminPanel({ tournamentId, supabase, session, participants, matches, onUpdate, onScheduleMatch }) {
  const [activeTab, setActiveTab] = useState('participants'); // 'participants', 'conflicts', 'stats', 'schedule'
  const [conflicts, setConflicts] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (activeTab === 'conflicts') fetchConflicts();
    if (activeTab === 'stats') calculateStats();
  }, [activeTab, matches, participants]);

  const fetchConflicts = async () => {
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('score_status', 'disputed');
    
    // Enrichir avec les noms des équipes
    if (matchesData) {
      const enriched = await Promise.all(matchesData.map(async (match) => {
        const { data: team1 } = await supabase.from('teams').select('name, tag').eq('id', match.player1_id).single();
        const { data: team2 } = await supabase.from('teams').select('name, tag').eq('id', match.player2_id).single();
        return {
          ...match,
          team1: team1 || { name: 'Équipe 1', tag: 'T1' },
          team2: team2 || { name: 'Équipe 2', tag: 'T2' }
        };
      }));
      setConflicts(enriched);
    } else {
      setConflicts([]);
    }
  };

  const calculateStats = () => {
    const totalParticipants = participants.length;
    const checkedIn = participants.filter(p => p.checked_in).length;
    const disqualified = participants.filter(p => p.disqualified).length;
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const pendingMatches = matches.filter(m => m.status === 'pending').length;
    const disputedMatches = matches.filter(m => m.score_status === 'disputed').length;

    setStats({
      totalParticipants,
      checkedIn,
      disqualified,
      totalMatches,
      completedMatches,
      pendingMatches,
      disputedMatches,
      completionRate: totalMatches > 0 ? ((completedMatches / totalMatches) * 100).toFixed(1) : 0
    });
  };

  const handleManualCheckIn = async (participantId, teamId) => {
    if (!confirm("Marquer cette équipe comme check-in ?")) return;
    
    const { error } = await supabase
      .from('participants')
      .update({ checked_in: true, disqualified: false })
      .eq('id', participantId);
    
    if (error) {
      console.error("Erreur check-in manuel:", error);
      alert("Erreur : " + error.message);
    } else {
      alert("✅ Check-in validé manuellement");
      // Attendre un peu pour laisser la DB se synchroniser
      setTimeout(() => {
        if (onUpdate) onUpdate();
      }, 100);
    }
  };

  const handleDisqualify = async (participantId) => {
    if (!confirm("Disqualifier cette équipe ?")) return;
    
    const { error } = await supabase
      .from('participants')
      .update({ disqualified: true })
      .eq('id', participantId);
    
    if (error) {
      console.error("Erreur disqualification:", error);
      alert("Erreur : " + error.message);
    } else {
      alert("❌ Équipe disqualifiée");
      // Attendre un peu pour laisser la DB se synchroniser
      setTimeout(() => {
        if (onUpdate) onUpdate();
      }, 100);
    }
  };

  const handleUnDisqualify = async (participantId) => {
    if (!confirm("Réintégrer cette équipe ?")) return;
    
    const { error } = await supabase
      .from('participants')
      .update({ disqualified: false })
      .eq('id', participantId);
    
    if (error) {
      console.error("Erreur réintégration:", error);
      alert("Erreur : " + error.message);
    } else {
      alert("✅ Équipe réintégrée");
      // Attendre un peu pour laisser la DB se synchroniser
      setTimeout(() => {
        if (onUpdate) onUpdate();
      }, 100);
    }
  };

  const resolveConflict = async (matchId, scoreP1, scoreP2) => {
    if (!confirm(`Confirmer le score ${scoreP1} - ${scoreP2} ?`)) return;

    const { error } = await supabase
      .from('matches')
      .update({
        score_p1: scoreP1,
        score_p2: scoreP2,
        score_status: 'confirmed',
        status: 'completed',
        score_p1_reported: scoreP1,
        score_p2_reported: scoreP2,
        reported_by_team1: true,
        reported_by_team2: true
      })
      .eq('id', matchId);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      alert("✅ Conflit résolu");
      fetchConflicts();
      if (onUpdate) onUpdate();
    }
  };

  return (
    <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', marginTop: '20px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
        {[
          { id: 'participants', label: '👥 Participants', count: participants.length },
          { id: 'conflicts', label: '⚠️ Conflits', count: conflicts.length },
          { id: 'schedule', label: '📅 Planning', count: matches.filter(m => m.scheduled_at).length },
          { id: 'stats', label: '📊 Statistiques' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '15px',
              background: activeTab === tab.id ? '#2a2a2a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #8e44ad' : 'none',
              color: activeTab === tab.id ? 'white' : '#aaa',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.95rem'
            }}
          >
            {tab.label} {tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {activeTab === 'participants' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Gestion des Participants</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {participants.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: p.disqualified ? '#3a1a1a' : p.checked_in ? '#1a3a1a' : '#2a2a2a',
                    padding: '12px',
                    borderRadius: '5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #333'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: p.disqualified ? '#e74c3c' : p.checked_in ? '#4ade80' : 'white' }}>
                      {p.teams?.name} [{p.teams?.tag}]
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '5px' }}>
                      {p.checked_in ? '✅ Check-in' : '⏳ Pas check-in'} | 
                      {p.disqualified ? ' ❌ Disqualifié' : ' ✅ Actif'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!p.checked_in && (
                      <button
                        onClick={() => handleManualCheckIn(p.id, p.team_id)}
                        style={{
                          padding: '6px 12px',
                          background: '#2ecc71',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        ✓ Check-in
                      </button>
                    )}
                    {!p.disqualified ? (
                      <button
                        onClick={() => handleDisqualify(p.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        ✕ DQ
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnDisqualify(p.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        ↻ Réintégrer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'conflicts' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Résolution de Conflits</h3>
            {conflicts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#4ade80' }}>
                ✅ Aucun conflit en cours
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {conflicts.map(match => (
                  <div
                    key={match.id}
                    style={{
                      background: '#2a2a2a',
                      padding: '15px',
                      borderRadius: '5px',
                      border: '1px solid #e74c3c'
                    }}
                  >
                    <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                      {match.team1?.name || 'Équipe 1'} [{match.team1?.tag}] vs {match.team2?.name || 'Équipe 2'} [{match.team2?.tag}]
                    </div>
                    <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#aaa' }}>
                      Scores déclarés : {match.score_p1_reported || '?'} - {match.score_p2_reported || '?'}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="number"
                        placeholder="Score 1"
                        defaultValue={match.score_p1_reported || 0}
                        style={{ padding: '5px', width: '60px', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '3px' }}
                        id={`score1-${match.id}`}
                      />
                      <span>-</span>
                      <input
                        type="number"
                        placeholder="Score 2"
                        defaultValue={match.score_p2_reported || 0}
                        style={{ padding: '5px', width: '60px', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '3px' }}
                        id={`score2-${match.id}`}
                      />
                      <button
                        onClick={() => {
                          const score1 = parseInt(document.getElementById(`score1-${match.id}`).value);
                          const score2 = parseInt(document.getElementById(`score2-${match.id}`).value);
                          resolveConflict(match.id, score1, score2);
                        }}
                        style={{
                          padding: '8px 15px',
                          background: '#8e44ad',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        Résoudre
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>📅 Planning des Matchs</h3>
            <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#aaa' }}>
              Cliquez sur un match pour le planifier ou modifier sa date/heure.
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {matches
                .filter(m => m.status === 'pending' || m.scheduled_at)
                .sort((a, b) => {
                  // Trier : matchs planifiés en premier (par date), puis non planifiés
                  if (a.scheduled_at && !b.scheduled_at) return -1;
                  if (!a.scheduled_at && b.scheduled_at) return 1;
                  if (a.scheduled_at && b.scheduled_at) {
                    return new Date(a.scheduled_at) - new Date(b.scheduled_at);
                  }
                  // Sinon trier par round puis match_number
                  if (a.round_number !== b.round_number) return a.round_number - b.round_number;
                  return a.match_number - b.match_number;
                })
                .map(match => {
                  const matchInfo = match.bracket_type 
                    ? `${match.bracket_type === 'winners' ? '🏆 Winners' : '💀 Losers'} - Round ${match.round_number}`
                    : `Round ${match.round_number}`;
                  
                  const team1Name = match.p1_name ? match.p1_name.split(' [')[0] : 'En attente';
                  const team2Name = match.p2_name ? match.p2_name.split(' [')[0] : 'En attente';
                  
                  return (
                    <div
                      key={match.id}
                      onClick={() => onScheduleMatch && onScheduleMatch(match)}
                      style={{
                        background: match.scheduled_at ? '#1a3a1a' : '#2a2a2a',
                        padding: '15px',
                        borderRadius: '5px',
                        border: match.scheduled_at ? '1px solid #27ae60' : '1px solid #444',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = match.scheduled_at ? '#1a4a1a' : '#333';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = match.scheduled_at ? '#1a3a1a' : '#2a2a2a';
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          Match #{match.match_number} - {matchInfo}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                          {team1Name} <span style={{ color: '#666' }}>vs</span> {team2Name}
                        </div>
                        {match.scheduled_at && (
                          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#4ade80' }}>
                            📅 {new Date(match.scheduled_at).toLocaleString('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '1.5rem', color: match.scheduled_at ? '#4ade80' : '#666' }}>
                        📅
                      </div>
                    </div>
                  );
                })}
            </div>
            {matches.filter(m => m.status === 'pending' || m.scheduled_at).length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                Aucun match à planifier
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Statistiques du Tournoi</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '5px', border: '1px solid #333' }}>
                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>Participants</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db' }}>{stats.totalParticipants}</div>
                <div style={{ fontSize: '0.8rem', color: '#4ade80', marginTop: '5px' }}>
                  {stats.checkedIn} check-in ({stats.disqualified > 0 && `${stats.disqualified} DQ`})
                </div>
              </div>
              
              <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '5px', border: '1px solid #333' }}>
                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>Matchs</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8e44ad' }}>{stats.totalMatches}</div>
                <div style={{ fontSize: '0.8rem', color: '#4ade80', marginTop: '5px' }}>
                  {stats.completedMatches} terminés ({stats.completionRate}%)
                </div>
              </div>
              
              <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '5px', border: '1px solid #333' }}>
                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>En attente</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f39c12' }}>{stats.pendingMatches}</div>
              </div>
              
              {stats.disputedMatches > 0 && (
                <div style={{ background: '#3a1a1a', padding: '15px', borderRadius: '5px', border: '1px solid #e74c3c' }}>
                  <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>Conflits</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e74c3c' }}>{stats.disputedMatches}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

