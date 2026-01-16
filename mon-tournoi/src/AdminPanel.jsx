import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateMatchWinner } from './bofUtils';
import { toast } from './utils/toast';
import {
  AdminOverviewTab,
  AdminParticipantsTab,
  AdminMatchesTab,
  AdminConflictsTab,
  AdminTeamsTab,
  AdminScheduleTab,
  AdminStatsTab,
  EditScoreModal
} from './components/admin';

export default function AdminPanel({ tournamentId, supabase, participants, matches, onUpdate, onScheduleMatch }) {
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

  const fetchConflicts = useCallback(async () => {
    // Récupérer les conflits de matchs (single game)
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('score_status', 'disputed');
    
    // Enrichir avec les noms des équipes en une seule requête
    let enriched = [];
    if (matchesData && matchesData.length > 0) {
      // Collecter tous les IDs d'équipes uniques
      const teamIds = [...new Set(matchesData.flatMap(m => [m.player1_id, m.player2_id].filter(Boolean)))];
      
      // Une seule requête pour toutes les équipes
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, tag')
        .in('id', teamIds);
      
      // Créer un map pour accès rapide
      const teamsMap = (teamsData || []).reduce((acc, t) => { acc[t.id] = t; return acc; }, {});
      
      enriched = matchesData.map(match => ({
        ...match,
        team1: teamsMap[match.player1_id] || { name: 'Équipe 1', tag: 'T1' },
        team2: teamsMap[match.player2_id] || { name: 'Équipe 2', tag: 'T2' }
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
            // Récupérer tous les matchs concernés en une requête
            const gameMatchIds = [...new Set(gamesData.map(g => g.match_id))];
            const { data: matchesForGames } = await supabase
              .from('matches')
              .select('*')
              .in('id', gameMatchIds);
            
            const matchesMap = (matchesForGames || []).reduce((acc, m) => { acc[m.id] = m; return acc; }, {});
            
            // Collecter tous les IDs d'équipes
            const teamIdsFromMatches = [...new Set(
              (matchesForGames || []).flatMap(m => [m.player1_id, m.player2_id].filter(Boolean))
            )];
            
            // Une seule requête pour toutes les équipes
            const { data: teamsForGames } = await supabase
              .from('teams')
              .select('id, name, tag')
              .in('id', teamIdsFromMatches);
            
            const teamsMapForGames = (teamsForGames || []).reduce((acc, t) => { acc[t.id] = t; return acc; }, {});
            
            const enrichedGames = gamesData.map(game => {
              const matchData = matchesMap[game.match_id];
              if (!matchData) return null;
              
              return {
                ...game,
                match: matchData,
                team1: teamsMapForGames[matchData.player1_id] || { name: 'Équipe 1', tag: 'T1' },
                team2: teamsMapForGames[matchData.player2_id] || { name: 'Équipe 2', tag: 'T2' }
              };
            });
            
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
  }, [supabase, tournamentId]);

  const calculateStats = useCallback(() => {
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
  }, [participants, matches]);

  const calculateTeamStats = useCallback(() => {
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
  }, [participants, matches]);

  // useEffect pour charger les données selon l'onglet actif
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Chargement légitime basé sur l'onglet
    if (activeTab === 'conflicts') fetchConflicts();
    if (activeTab === 'stats' || activeTab === 'overview') calculateStats();
    if (activeTab === 'teams') calculateTeamStats();
    if (activeTab === 'matches') {
      setSelectedMatch(null);
      setEditScoreModal(false);
    }
  }, [activeTab, fetchConflicts, calculateStats, calculateTeamStats]);

  const handleManualCheckIn = async (participantId) => {
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
            <AdminOverviewTab stats={stats} />
          </div>
        )}

        {/* PARTICIPANTS */}
        {activeTab === 'participants' && (
          <AdminParticipantsTab
            participants={participants}
            onManualCheckIn={handleManualCheckIn}
            onDisqualify={handleDisqualify}
            onUnDisqualify={handleUnDisqualify}
          />
        )}

        {/* MATCHS */}
        {activeTab === 'matches' && (
          <AdminMatchesTab
            matches={matches}
            onViewMatch={(matchId) => navigate(`/match/${matchId}`)}
            onEditScore={handleEditMatchScore}
            onResetMatch={handleResetMatch}
            onScheduleMatch={onScheduleMatch}
          />
        )}

        {/* CONFLITS */}
        {activeTab === 'conflicts' && (
          <AdminConflictsTab
            conflicts={conflicts}
            gameConflicts={gameConflicts}
            onResolveConflict={resolveConflict}
            onResolveGameConflict={resolveGameConflict}
            onViewMatch={(matchId) => navigate(`/match/${matchId}`)}
          />
        )}

        {/* ÉQUIPES */}
        {activeTab === 'teams' && (
          <AdminTeamsTab teamStats={teamStats} />
        )}

        {/* PLANNING */}
        {activeTab === 'schedule' && (
          <AdminScheduleTab
            matches={matches}
            onScheduleMatch={onScheduleMatch}
          />
        )}

        {/* STATISTIQUES */}
        {activeTab === 'stats' && stats && (
          <AdminStatsTab stats={stats} />
        )}
      </div>

      {/* Modal pour modifier un score */}
      <EditScoreModal
        isOpen={editScoreModal}
        match={selectedMatch}
        score1={editScore1}
        score2={editScore2}
        onScore1Change={setEditScore1}
        onScore2Change={setEditScore2}
        onSave={saveEditedScore}
        onClose={() => {
          setEditScoreModal(false);
          setSelectedMatch(null);
        }}
      />
    </div>
  );
}
