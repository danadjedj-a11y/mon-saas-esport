import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateMatchWinner } from './bofUtils';
import { toast } from './utils/toast';

export default function AdminPanel({ tournamentId, supabase, session, participants, matches, onUpdate, onScheduleMatch, tournament }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'participants', 'matches', 'conflicts', 'teams', 'schedule', 'stats'
  const [conflicts, setConflicts] = useState([]);
  const [gameConflicts, setGameConflicts] = useState([]);
  const [stats, setStats] = useState(null);
  const [teamStats, setTeamStats] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [editScoreModal, setEditScoreModal] = useState(false);
  const [editScore1, setEditScore1] = useState(0);
  const [editScore2, setEditScore2] = useState(0);

  useEffect(() => {
    if (activeTab === 'conflicts') fetchConflicts();
    if (activeTab === 'stats' || activeTab === 'overview') calculateStats();
    if (activeTab === 'teams') calculateTeamStats();
    if (activeTab === 'matches') {
      // Réinitialiser la sélection quand on change d'onglet
      setSelectedMatch(null);
      setEditScoreModal(false);
    }
  }, [activeTab, matches, participants]);

  const fetchConflicts = async () => {
    // Récupérer les conflits de matchs (single game)
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('score_status', 'disputed');
    
    // Enrichir avec les noms des équipes
    let enriched = [];
    if (matchesData) {
      enriched = await Promise.all(matchesData.map(async (match) => {
        const { data: team1 } = await supabase.from('teams').select('name, tag').eq('id', match.player1_id).single();
        const { data: team2 } = await supabase.from('teams').select('name, tag').eq('id', match.player2_id).single();
        return {
          ...match,
          team1: team1 || { name: 'Équipe 1', tag: 'T1' },
          team2: team2 || { name: 'Équipe 2', tag: 'T2' }
        };
      }));
    }
    setConflicts(enriched || []);
    
    // Récupérer les conflits de manches (Best-of-X)
    try {
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('best_of')
        .eq('id', tournamentId)
        .single();
      
      if (tournamentData?.best_of > 1) {
        const { data: allMatches } = await supabase
          .from('matches')
          .select('id')
          .eq('tournament_id', tournamentId);
        
        if (allMatches && allMatches.length > 0) {
          const matchIds = allMatches.map(m => m.id);
          
          const { data: gamesData } = await supabase
            .from('match_games')
            .select('*')
            .in('match_id', matchIds)
            .eq('score_status', 'disputed');
          
          if (gamesData && gamesData.length > 0) {
            const enrichedGames = await Promise.all(gamesData.map(async (game) => {
              const { data: matchData } = await supabase
                .from('matches')
                .select('*')
                .eq('id', game.match_id)
                .single();
              
              if (!matchData) return null;
              
              const { data: team1 } = await supabase.from('teams').select('name, tag').eq('id', matchData.player1_id).single();
              const { data: team2 } = await supabase.from('teams').select('name, tag').eq('id', matchData.player2_id).single();
              
              return {
                ...game,
                match: matchData,
                team1: team1 || { name: 'Équipe 1', tag: 'T1' },
                team2: team2 || { name: 'Équipe 2', tag: 'T2' }
              };
            }));
            
            const filtered = enrichedGames.filter(g => g !== null);
            setGameConflicts(filtered);
          } else {
            setGameConflicts([]);
          }
        } else {
          setGameConflicts([]);
        }
      } else {
        setGameConflicts([]);
      }
    } catch (error) {
      console.warn('Erreur récupération conflits manches:', error);
      setGameConflicts([]);
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
    const scheduledMatches = matches.filter(m => m.scheduled_at).length;

    // Statistiques par round
    const matchesByRound = {};
    matches.forEach(m => {
      const round = m.round_number || 0;
      if (!matchesByRound[round]) {
        matchesByRound[round] = { total: 0, completed: 0, pending: 0 };
      }
      matchesByRound[round].total++;
      if (m.status === 'completed') matchesByRound[round].completed++;
      else if (m.status === 'pending') matchesByRound[round].pending++;
    });

    // Scores moyens
    const completedMatchScores = matches.filter(m => m.status === 'completed' && m.score_p1 !== null && m.score_p2 !== null);
    const avgScore1 = completedMatchScores.length > 0 
      ? (completedMatchScores.reduce((sum, m) => sum + (m.score_p1 || 0), 0) / completedMatchScores.length).toFixed(1)
      : 0;
    const avgScore2 = completedMatchScores.length > 0
      ? (completedMatchScores.reduce((sum, m) => sum + (m.score_p2 || 0), 0) / completedMatchScores.length).toFixed(1)
      : 0;

    // Statistiques Best-of-X (sera calculé séparément si nécessaire)
    // Note: Calcul asynchrone déplacé pour éviter les problèmes de synchronisation
    const bestOfStats = null;

    setStats({
      totalParticipants,
      checkedIn,
      disqualified,
      totalMatches,
      completedMatches,
      pendingMatches,
      disputedMatches,
      scheduledMatches,
      completionRate: totalMatches > 0 ? ((completedMatches / totalMatches) * 100).toFixed(1) : 0,
      matchesByRound,
      avgScore1,
      avgScore2,
      bestOfStats
    });
  };

  const calculateTeamStats = () => {
    const teamStatsMap = new Map();

    participants.forEach(p => {
      const teamId = p.team_id;
      if (!teamStatsMap.has(teamId)) {
        teamStatsMap.set(teamId, {
          teamId,
          teamName: p.teams?.name || 'Inconnu',
          teamTag: p.teams?.tag || '?',
          teamLogo: p.teams?.logo_url,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          totalScoreFor: 0,
          totalScoreAgainst: 0,
          checkedIn: p.checked_in,
          disqualified: p.disqualified
        });
      }
    });

    matches.forEach(m => {
      if (m.status !== 'completed') return;

      const isTeam1 = m.player1_id;
      const isTeam2 = m.player2_id;

      if (isTeam1 && teamStatsMap.has(m.player1_id)) {
        const stats = teamStatsMap.get(m.player1_id);
        stats.matchesPlayed++;
        stats.totalScoreFor += m.score_p1 || 0;
        stats.totalScoreAgainst += m.score_p2 || 0;
        if ((m.score_p1 || 0) > (m.score_p2 || 0)) stats.wins++;
        else if ((m.score_p1 || 0) < (m.score_p2 || 0)) stats.losses++;
        else stats.draws++;
      }

      if (isTeam2 && teamStatsMap.has(m.player2_id)) {
        const stats = teamStatsMap.get(m.player2_id);
        stats.matchesPlayed++;
        stats.totalScoreFor += m.score_p2 || 0;
        stats.totalScoreAgainst += m.score_p1 || 0;
        if ((m.score_p2 || 0) > (m.score_p1 || 0)) stats.wins++;
        else if ((m.score_p2 || 0) < (m.score_p1 || 0)) stats.losses++;
        else stats.draws++;
      }
    });

    const statsArray = Array.from(teamStatsMap.values()).map(s => ({
      ...s,
      winRate: s.matchesPlayed > 0 ? ((s.wins / s.matchesPlayed) * 100).toFixed(1) : 0,
      scoreDiff: s.totalScoreFor - s.totalScoreAgainst
    })).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return parseFloat(b.winRate) - parseFloat(a.winRate);
      return b.scoreDiff - a.scoreDiff;
    });

    setTeamStats(statsArray);
  };

  const handleManualCheckIn = async (participantId, teamId) => {
    if (!confirm("Marquer cette équipe comme check-in ?")) return;
    
    const { error } = await supabase
      .from('participants')
      .update({ checked_in: true, disqualified: false })
      .eq('id', participantId);
    
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      if (onUpdate) onUpdate();
    }
  };

  const handleDisqualify = async (participantId) => {
    if (!confirm("Disqualifier cette équipe ?")) return;
    
    const { error } = await supabase
      .from('participants')
      .update({ disqualified: true })
      .eq('id', participantId);
    
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      if (onUpdate) onUpdate();
    }
  };

  const handleUnDisqualify = async (participantId) => {
    if (!confirm("Réintégrer cette équipe ?")) return;
    
    const { error } = await supabase
      .from('participants')
      .update({ disqualified: false })
      .eq('id', participantId);
    
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      if (onUpdate) onUpdate();
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
      toast.error("Erreur : " + error.message);
    } else {
      fetchConflicts();
      if (onUpdate) onUpdate();
    }
  };

  const resolveGameConflict = async (gameId, matchId, scoreTeam1, scoreTeam2) => {
    if (!confirm(`Confirmer le score de la manche : ${scoreTeam1} - ${scoreTeam2} ?`)) return;

    const { data: matchData } = await supabase
      .from('matches')
      .select('player1_id, player2_id, tournament_id')
      .eq('id', matchId)
      .single();

    if (!matchData) {
      toast.error("Erreur : Match non trouvé");
      return;
    }

    const winnerTeamId = scoreTeam1 > scoreTeam2 ? matchData.player1_id : (scoreTeam2 > scoreTeam1 ? matchData.player2_id : null);

    const { error: gameError } = await supabase
      .from('match_games')
      .update({
        team1_score: scoreTeam1,
        team2_score: scoreTeam2,
        team1_score_reported: scoreTeam1,
        team2_score_reported: scoreTeam2,
        winner_team_id: winnerTeamId,
        score_status: 'confirmed',
        status: 'completed',
        reported_by_team1: true,
        reported_by_team2: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (gameError) {
      toast.error("Erreur : " + gameError.message);
      return;
    }

    await supabase
      .from('game_score_reports')
      .update({ is_resolved: true })
      .eq('game_id', gameId);

    const { data: allGames } = await supabase
      .from('match_games')
      .select('*')
      .eq('match_id', matchId)
      .order('game_number', { ascending: true });

    if (allGames) {
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('best_of, format')
        .eq('id', matchData.tournament_id)
        .single();

      if (tournamentData?.best_of) {
        const matchResult = calculateMatchWinner(allGames, tournamentData.best_of, matchData.player1_id, matchData.player2_id);

        if (matchResult.isCompleted && matchResult.winner) {
          await supabase
            .from('matches')
            .update({
              score_p1: matchResult.team1Wins,
              score_p2: matchResult.team2Wins,
              status: 'completed',
              score_status: 'confirmed'
            })
            .eq('id', matchId);
        }
      }
    }

    fetchConflicts();
    if (onUpdate) onUpdate();
  };

  const handleEditMatchScore = (match) => {
    setSelectedMatch(match);
    setEditScore1(match.score_p1 || 0);
    setEditScore2(match.score_p2 || 0);
    setEditScoreModal(true);
  };

  const saveEditedScore = async () => {
    if (!selectedMatch) return;
    const s1 = parseInt(editScore1);
    const s2 = parseInt(editScore2);

    const { error } = await supabase
      .from('matches')
      .update({
        score_p1: s1,
        score_p2: s2,
        score_status: 'confirmed',
        status: 'completed',
        score_p1_reported: s1,
        score_p2_reported: s2,
        reported_by_team1: true,
        reported_by_team2: true
      })
      .eq('id', selectedMatch.id);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      setEditScoreModal(false);
      setSelectedMatch(null);
      if (onUpdate) onUpdate();
    }
  };

  const handleResetMatch = async (matchId) => {
    if (!confirm("Réinitialiser ce match ? Les scores seront effacés et le match repassera en attente.")) return;

    const { error } = await supabase
      .from('matches')
      .update({
        score_p1: 0,
        score_p2: 0,
        score_status: 'pending',
        status: 'pending',
        score_p1_reported: null,
        score_p2_reported: null,
        reported_by_team1: false,
        reported_by_team2: false
      })
      .eq('id', matchId);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      if (onUpdate) onUpdate();
    }
  };

  const tabs = [
    { id: 'overview', label: '📊 Vue d\'ensemble', count: null },
    { id: 'participants', label: '👥 Participants', count: participants.length },
    { id: 'matches', label: '🎮 Matchs', count: matches.length },
    { id: 'conflicts', label: '⚠️ Conflits', count: conflicts.length + gameConflicts.length },
    { id: 'teams', label: '🏆 Équipes', count: teamStats.length },
    { id: 'schedule', label: '📅 Planning', count: matches.filter(m => m.scheduled_at).length },
    { id: 'stats', label: '📈 Statistiques' }
  ];

  return (
    <div style={{ background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', marginTop: '20px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '0 0 auto',
              padding: '15px 20px',
              background: activeTab === tab.id ? '#2a2a2a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #8e44ad' : 'none',
              color: activeTab === tab.id ? 'white' : '#aaa',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label} {tab.count !== null && tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* VUE D'ENSEMBLE */}
        {activeTab === 'overview' && stats && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📊 Vue d'ensemble du Tournoi
            </h3>
            
            {/* Métriques principales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              <div style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)', padding: '20px', borderRadius: '8px', border: '1px solid #2980b9' }}>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', fontWeight: 'bold' }}>Participants</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>{stats.totalParticipants}</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', marginTop: '8px' }}>
                  {stats.checkedIn} check-in {stats.disqualified > 0 && `• ${stats.disqualified} DQ`}
                </div>
              </div>
              
              <div style={{ background: 'linear-gradient(135deg, #8e44ad, #7d3c98)', padding: '20px', borderRadius: '8px', border: '1px solid #7d3c98' }}>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', fontWeight: 'bold' }}>Matchs</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>{stats.totalMatches}</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', marginTop: '8px' }}>
                  {stats.completedMatches} terminés ({stats.completionRate}%)
                </div>
              </div>
              
              <div style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)', padding: '20px', borderRadius: '8px', border: '1px solid #e67e22' }}>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', fontWeight: 'bold' }}>En attente</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>{stats.pendingMatches}</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', marginTop: '8px' }}>
                  {stats.scheduledMatches} planifiés
                </div>
              </div>
              
              {stats.disputedMatches > 0 && (
                <div style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)', padding: '20px', borderRadius: '8px', border: '1px solid #c0392b' }}>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', fontWeight: 'bold' }}>Conflits</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>{stats.disputedMatches}</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', marginTop: '8px' }}>
                    Nécessitent une résolution
                  </div>
                </div>
              )}
            </div>

            {/* Statistiques détaillées */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Matchs par Round */}
              {Object.keys(stats.matchesByRound).length > 0 && (
                <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#00d4ff' }}>📋 Matchs par Round</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(stats.matchesByRound)
                      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                      .map(([round, data]) => (
                        <div key={round} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#1a1a1a', borderRadius: '5px' }}>
                          <span style={{ fontWeight: 'bold' }}>Round {round}</span>
                          <span style={{ color: '#aaa' }}>
                            {data.completed}/{data.total} ({data.total > 0 ? ((data.completed / data.total) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Scores moyens */}
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#4ade80' }}>⚽ Scores Moyens</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Équipe 1</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>{stats.avgScore1}</span>
                  </div>
                  <div style={{ height: '1px', background: '#444' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Équipe 2</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>{stats.avgScore2}</span>
                  </div>
                </div>
              </div>

              {/* Stats Best-of-X */}
              {stats.bestOfStats && (
                <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#f39c12' }}>🎮 Best-of-X</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Manches totales</span>
                      <span style={{ fontWeight: 'bold' }}>{stats.bestOfStats.totalGames}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Manches terminées</span>
                      <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{stats.bestOfStats.completedGames}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Taux de complétion</span>
                      <span style={{ fontWeight: 'bold', color: '#00d4ff' }}>{stats.bestOfStats.completionRate}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PARTICIPANTS */}
        {activeTab === 'participants' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Gestion des Participants</h3>
            <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#aaa' }}>
              {participants.filter(p => p.checked_in).length} check-in sur {participants.length} participants
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {participants.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: p.disqualified ? '#3a1a1a' : p.checked_in ? '#1a3a1a' : '#2a2a2a',
                    padding: '15px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #333'
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {p.teams?.logo_url && (
                      <img src={p.teams.logo_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', color: p.disqualified ? '#e74c3c' : p.checked_in ? '#4ade80' : 'white', fontSize: '1.05rem' }}>
                        {p.teams?.name} [{p.teams?.tag}]
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '5px' }}>
                        {p.checked_in ? '✅ Check-in' : '⏳ Pas check-in'} | 
                        {p.disqualified ? ' ❌ Disqualifié' : ' ✅ Actif'}
                        {p.seed_order && ` | Seed #${p.seed_order}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!p.checked_in && (
                      <button
                        onClick={() => handleManualCheckIn(p.id, p.team_id)}
                        style={{
                          padding: '8px 15px',
                          background: '#2ecc71',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}
                      >
                        ✓ Check-in
                      </button>
                    )}
                    {!p.disqualified ? (
                      <button
                        onClick={() => handleDisqualify(p.id)}
                        style={{
                          padding: '8px 15px',
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}
                      >
                        ✕ DQ
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnDisqualify(p.id)}
                        style={{
                          padding: '8px 15px',
                          background: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
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

        {/* MATCHS */}
        {activeTab === 'matches' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Gestion des Matchs</h3>
            <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#aaa' }}>
              {matches.filter(m => m.status === 'completed').length} terminés sur {matches.length} matchs
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {matches
                .sort((a, b) => {
                  if (a.round_number !== b.round_number) return a.round_number - b.round_number;
                  return a.match_number - b.match_number;
                })
                .map(match => {
                  const isCompleted = match.status === 'completed';
                  const isPending = match.status === 'pending';
                  const isDisputed = match.score_status === 'disputed';
                  const matchInfo = match.bracket_type 
                    ? `${match.bracket_type === 'winners' ? '🏆 Winners' : match.bracket_type === 'losers' ? '💀 Losers' : '🇨🇭 Swiss'} - Round ${match.round_number}`
                    : match.bracket_type === 'swiss' ? `🇨🇭 Round ${match.round_number}` : `Round ${match.round_number}`;
                  
                  return (
                    <div
                      key={match.id}
                      style={{
                        background: isDisputed ? '#3a1a1a' : isCompleted ? '#1a3a1a' : '#2a2a2a',
                        padding: '15px',
                        borderRadius: '8px',
                        border: isDisputed ? '1px solid #e74c3c' : isCompleted ? '1px solid #4ade80' : '1px solid #444',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '15px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1.05rem' }}>
                          Match #{match.match_number} - {matchInfo}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {match.p1_avatar && <img src={match.p1_avatar} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />}
                            <span style={{ fontWeight: isCompleted && (match.score_p1 || 0) > (match.score_p2 || 0) ? 'bold' : 'normal' }}>
                              {match.p1_name ? match.p1_name.split(' [')[0] : 'En attente'}
                            </span>
                          </div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: isCompleted ? '#4ade80' : '#666', minWidth: '60px', textAlign: 'center' }}>
                            {isCompleted ? `${match.score_p1 || 0} - ${match.score_p2 || 0}` : 'vs'}
                          </div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                            <span style={{ fontWeight: isCompleted && (match.score_p2 || 0) > (match.score_p1 || 0) ? 'bold' : 'normal' }}>
                              {match.p2_name ? match.p2_name.split(' [')[0] : 'En attente'}
                            </span>
                            {match.p2_avatar && <img src={match.p2_avatar} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />}
                          </div>
                        </div>
                        {match.scheduled_at && (
                          <div style={{ fontSize: '0.85rem', color: '#3498db', marginTop: '5px' }}>
                            📅 {new Date(match.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        )}
                        {isDisputed && (
                          <div style={{ fontSize: '0.85rem', color: '#e74c3c', marginTop: '5px', fontWeight: 'bold' }}>
                            ⚠️ Conflit de score
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => navigate(`/match/${match.id}`)}
                          style={{
                            padding: '8px 15px',
                            background: '#3498db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }}
                        >
                          👁️ Voir
                        </button>
                        {isCompleted && (
                          <button
                            onClick={() => handleEditMatchScore(match)}
                            style={{
                              padding: '8px 15px',
                              background: '#f39c12',
                              color: 'white',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold'
                            }}
                          >
                            ✏️ Modifier
                          </button>
                        )}
                        {isCompleted && (
                          <button
                            onClick={() => handleResetMatch(match.id)}
                            style={{
                              padding: '8px 15px',
                              background: '#e74c3c',
                              color: 'white',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold'
                            }}
                          >
                            ↻ Réinit.
                          </button>
                        )}
                        {onScheduleMatch && isPending && (
                          <button
                            onClick={() => onScheduleMatch(match)}
                            style={{
                              padding: '8px 15px',
                              background: '#9b59b6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold'
                            }}
                          >
                            📅 Planifier
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* CONFLITS */}
        {activeTab === 'conflicts' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Résolution de Conflits</h3>
            {conflicts.length === 0 && gameConflicts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#4ade80', fontSize: '1.1rem' }}>
                ✅ Aucun conflit en cours
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {/* Conflits de matchs (single game) */}
                {conflicts.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: '15px', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>Conflits de Matchs</h4>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {conflicts.map(match => (
                        <div
                          key={match.id}
                          style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '8px',
                            border: '2px solid #e74c3c'
                          }}
                        >
                          <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {match.team1?.name || 'Équipe 1'} [{match.team1?.tag}] vs {match.team2?.name || 'Équipe 2'} [{match.team2?.tag}]
                          </div>
                          <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#aaa' }}>
                            Match #{match.match_number} - Round {match.round_number}
                          </div>
                          <div style={{ marginBottom: '15px', fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>
                            Scores déclarés : {match.score_p1_reported || '?'} - {match.score_p2_reported || '?'}
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              type="number"
                              placeholder="Score 1"
                              defaultValue={match.score_p1_reported || 0}
                              style={{ padding: '8px', width: '80px', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '5px', fontSize: '1rem' }}
                              id={`score1-${match.id}`}
                            />
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>-</span>
                            <input
                              type="number"
                              placeholder="Score 2"
                              defaultValue={match.score_p2_reported || 0}
                              style={{ padding: '8px', width: '80px', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '5px', fontSize: '1rem' }}
                              id={`score2-${match.id}`}
                            />
                            <button
                              onClick={() => {
                                const score1 = parseInt(document.getElementById(`score1-${match.id}`).value);
                                const score2 = parseInt(document.getElementById(`score2-${match.id}`).value);
                                resolveConflict(match.id, score1, score2);
                              }}
                              style={{
                                padding: '10px 20px',
                                background: '#8e44ad',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem'
                              }}
                            >
                              ✅ Résoudre
                            </button>
                            <button
                              onClick={() => navigate(`/match/${match.id}`)}
                              style={{
                                padding: '10px 20px',
                                background: '#3498db',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem'
                              }}
                            >
                              👁️ Voir le match
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Conflits de manches (Best-of-X) */}
                {gameConflicts.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: '15px', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>Conflits de Manches (Best-of-X)</h4>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {gameConflicts.map(game => (
                        <div
                          key={game.id}
                          style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '8px',
                            border: '2px solid #e74c3c'
                          }}
                        >
                          <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {game.team1?.name || 'Équipe 1'} [{game.team1?.tag}] vs {game.team2?.name || 'Équipe 2'} [{game.team2?.tag}]
                          </div>
                          <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#888' }}>
                            Match #{game.match?.match_number} - Round {game.match?.round_number} - Manche {game.game_number}
                          </div>
                          {game.map_name && (
                            <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#aaa' }}>
                              🗺️ Map: {game.map_name}
                            </div>
                          )}
                          <div style={{ marginBottom: '15px', fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>
                            Scores déclarés : {game.team1_score_reported || '?'} - {game.team2_score_reported || '?'}
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              type="number"
                              placeholder="Score 1"
                              defaultValue={game.team1_score_reported || 0}
                              style={{ padding: '8px', width: '80px', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '5px', fontSize: '1rem' }}
                              id={`game-score1-${game.id}`}
                            />
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>-</span>
                            <input
                              type="number"
                              placeholder="Score 2"
                              defaultValue={game.team2_score_reported || 0}
                              style={{ padding: '8px', width: '80px', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '5px', fontSize: '1rem' }}
                              id={`game-score2-${game.id}`}
                            />
                            <button
                              onClick={() => {
                                const score1 = parseInt(document.getElementById(`game-score1-${game.id}`).value);
                                const score2 = parseInt(document.getElementById(`game-score2-${game.id}`).value);
                                resolveGameConflict(game.id, game.match_id, score1, score2);
                              }}
                              style={{
                                padding: '10px 20px',
                                background: '#8e44ad',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem'
                              }}
                            >
                              ✅ Résoudre
                            </button>
                            <button
                              onClick={() => navigate(`/match/${game.match_id}`)}
                              style={{
                                padding: '10px 20px',
                                background: '#3498db',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem'
                              }}
                            >
                              👁️ Voir le match
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ÉQUIPES */}
        {activeTab === 'teams' && teamStats.length > 0 && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Statistiques par Équipe</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                <thead>
                  <tr style={{ background: '#2a2a2a', textAlign: 'left' }}>
                    <th style={{ padding: '12px', borderRadius: '5px 0 0 5px' }}>Rang</th>
                    <th style={{ padding: '12px' }}>Équipe</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>J</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>V</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>N</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>D</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>%V</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Pour</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Contre</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderRadius: '0 5px 5px 0' }}>Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.map((team, index) => (
                    <tr key={team.teamId} style={{ borderBottom: '1px solid #333', background: index % 2 === 0 ? '#1a1a1a' : '#222' }}>
                      <td style={{ padding: '12px', fontWeight: index === 0 ? 'bold' : 'normal', color: index === 0 ? '#f1c40f' : 'white', fontSize: index === 0 ? '1.1rem' : '1rem' }}>
                        #{index + 1}
                      </td>
                      <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {team.teamLogo && <img src={team.teamLogo} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{team.teamName}</div>
                          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>[{team.teamTag}]</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{team.matchesPlayed}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#2ecc71', fontWeight: 'bold' }}>{team.wins}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#f39c12' }}>{team.draws}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#e74c3c' }}>{team.losses}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#3498db' }}>{team.winRate}%</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#4ade80' }}>{team.totalScoreFor}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#e74c3c' }}>{team.totalScoreAgainst}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: team.scoreDiff > 0 ? '#4ade80' : team.scoreDiff < 0 ? '#e74c3c' : '#aaa' }}>
                        {team.scoreDiff > 0 ? '+' : ''}{team.scoreDiff}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PLANNING */}
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
                  if (a.scheduled_at && !b.scheduled_at) return -1;
                  if (!a.scheduled_at && b.scheduled_at) return 1;
                  if (a.scheduled_at && b.scheduled_at) {
                    return new Date(a.scheduled_at) - new Date(b.scheduled_at);
                  }
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
                        borderRadius: '8px',
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
                        <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '1.05rem' }}>
                          Match #{match.match_number} - {matchInfo}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                          {team1Name} <span style={{ color: '#666' }}>vs</span> {team2Name}
                        </div>
                        {match.scheduled_at && (
                          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#4ade80', fontWeight: 'bold' }}>
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

        {/* STATISTIQUES */}
        {activeTab === 'stats' && stats && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Statistiques Détaillées</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '8px' }}>Participants</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3498db' }}>{stats.totalParticipants}</div>
                <div style={{ fontSize: '0.85rem', color: '#4ade80', marginTop: '8px' }}>
                  {stats.checkedIn} check-in {stats.disqualified > 0 && `• ${stats.disqualified} DQ`}
                </div>
              </div>
              
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '8px' }}>Matchs</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8e44ad' }}>{stats.totalMatches}</div>
                <div style={{ fontSize: '0.85rem', color: '#4ade80', marginTop: '8px' }}>
                  {stats.completedMatches} terminés ({stats.completionRate}%)
                </div>
              </div>
              
              <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '8px' }}>En attente</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f39c12' }}>{stats.pendingMatches}</div>
                <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '8px' }}>
                  {stats.scheduledMatches} planifiés
                </div>
              </div>
              
              {stats.disputedMatches > 0 && (
                <div style={{ background: '#3a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #e74c3c' }}>
                  <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '8px' }}>Conflits</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#e74c3c' }}>{stats.disputedMatches}</div>
                  <div style={{ fontSize: '0.85rem', color: '#e74c3c', marginTop: '8px' }}>
                    À résoudre
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal pour modifier un score */}
      {editScoreModal && selectedMatch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#2a2a2a',
            padding: '30px',
            borderRadius: '12px',
            border: '1px solid #444',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Modifier le score</h3>
            <div style={{ marginBottom: '20px', color: '#aaa', fontSize: '0.9rem' }}>
              {selectedMatch.p1_name ? selectedMatch.p1_name.split(' [')[0] : 'Équipe 1'} vs {selectedMatch.p2_name ? selectedMatch.p2_name.split(' [')[0] : 'Équipe 2'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '20px' }}>
              <input
                type="number"
                value={editScore1}
                onChange={(e) => setEditScore1(e.target.value)}
                style={{
                  width: '100px',
                  padding: '12px',
                  background: '#1a1a1a',
                  border: '1px solid #444',
                  color: 'white',
                  borderRadius: '5px',
                  fontSize: '1.5rem',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}
              />
              <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>-</span>
              <input
                type="number"
                value={editScore2}
                onChange={(e) => setEditScore2(e.target.value)}
                style={{
                  width: '100px',
                  padding: '12px',
                  background: '#1a1a1a',
                  border: '1px solid #444',
                  color: 'white',
                  borderRadius: '5px',
                  fontSize: '1.5rem',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setEditScoreModal(false);
                  setSelectedMatch(null);
                }}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid #666',
                  color: '#aaa',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Annuler
              </button>
              <button
                onClick={saveEditedScore}
                style={{
                  padding: '12px 24px',
                  background: '#8e44ad',
                  border: 'none',
                  color: 'white',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
