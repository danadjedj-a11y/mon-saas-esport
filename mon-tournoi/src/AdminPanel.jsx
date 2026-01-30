import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
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

export default function AdminPanel({ tournamentId, participants, matches, onUpdate, onScheduleMatch }) {
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

  // Convex mutations
  const toggleCheckInMut = useMutation(api.tournamentRegistrationsMutations.toggleCheckIn);
  const disqualifyMut = useMutation(api.tournamentRegistrationsMutations.disqualify);
  const resolveConflictMut = useMutation(api.matchesMutations.resolveScoreConflict);
  const resetMatchMut = useMutation(api.matchesMutations.resetMatch);
  const adminEditScoreMut = useMutation(api.matchesMutations.adminEditScore);

  // Query pour les équipes (pour enrichir les conflits)
  const teamsData = useQuery(api.teams.list) || [];
  const teamsMap = React.useMemo(() => {
    return teamsData.reduce((acc, t) => { acc[t._id] = t; return acc; }, {});
  }, [teamsData]);

  const fetchConflicts = useCallback(() => {
    // Récupérer les conflits de matchs depuis les props matches
    const disputedMatches = (matches || []).filter(m => m.scoreStatus === 'disputed' || m.score_status === 'disputed');
    
    const enriched = disputedMatches.map(match => ({
      ...match,
      team1: teamsMap[match.team1Id || match.player1_id] || { name: 'Équipe 1', tag: 'T1' },
      team2: teamsMap[match.team2Id || match.player2_id] || { name: 'Équipe 2', tag: 'T2' }
    }));
    
    setConflicts(enriched);
    // Les conflits de manches nécessiteraient une query séparée vers matchGames
    // Pour l'instant on ne gère pas les conflits de manches côté Convex
    setGameConflicts([]);
  }, [matches, teamsMap]);

  const calculateStats = useCallback(() => {
    const totalParticipants = participants.length;
    const checkedIn = participants.filter(p => p.checked_in || p.status === 'checked_in').length;
    const disqualified = participants.filter(p => p.disqualified || p.status === 'disqualified').length;
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
    
    try {
      await toggleCheckInMut({ registrationId: participantId, checkedIn: true });
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Erreur : " + error.message);
    }
  };

  const handleDisqualify = async (participantId) => {
    if (!confirm("Disqualifier cette équipe ?")) return;
    
    try {
      await disqualifyMut({ registrationId: participantId, disqualified: true });
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Erreur : " + error.message);
    }
  };

  const handleUnDisqualify = async (participantId) => {
    if (!confirm("Réintégrer cette équipe ?")) return;
    
    try {
      await disqualifyMut({ registrationId: participantId, disqualified: false });
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Erreur : " + error.message);
    }
  };

  const resolveConflict = async (matchId, scoreP1, scoreP2) => {
    if (!confirm(`Confirmer le score ${scoreP1} - ${scoreP2} ?`)) return;

    try {
      await resolveConflictMut({
        matchId: matchId,
        scoreTeam1: scoreP1,
        scoreTeam2: scoreP2
      });
      fetchConflicts();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Erreur : " + error.message);
    }
  };

  const resolveGameConflict = async (gameId, matchId, scoreTeam1, scoreTeam2) => {
    // Les conflits de manches (Best-of-X) ne sont pas encore supportés dans Convex
    // Cette fonctionnalité nécessiterait d'ajouter scoreStatus au schéma matchGames
    toast.error("Résolution des conflits de manches non supportée pour l'instant");
  };

  const handleEditMatchScore = (match) => {
    setSelectedMatch(match);
    setEditScore1(match.scoreTeam1 || match.score_p1 || 0);
    setEditScore2(match.scoreTeam2 || match.score_p2 || 0);
    setEditScoreModal(true);
  };

  const saveEditedScore = async () => {
    if (!selectedMatch) return;
    const s1 = parseInt(editScore1);
    const s2 = parseInt(editScore2);

    try {
      await adminEditScoreMut({
        matchId: selectedMatch._id || selectedMatch.id,
        scoreTeam1: s1,
        scoreTeam2: s2
      });
      setEditScoreModal(false);
      setSelectedMatch(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Erreur : " + error.message);
    }
  };

  const handleResetMatch = async (matchId) => {
    if (!confirm("Réinitialiser ce match ? Les scores seront effacés et le match repassera en attente.")) return;

    try {
      await resetMatchMut({ matchId });
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Erreur : " + error.message);
    }
  };

  const tabs = [
    { id: 'overview', label: '📊 Vue d\'ensemble', count: null },
    { id: 'participants', label: '👥 Participants', count: participants.length },
    { id: 'matches', label: '🎮 Matchs', count: matches.length },
    { id: 'conflicts', label: '⚠️ Conflits', count: conflicts.length + gameConflicts.length },
    { id: 'teams', label: '🏆 Équipes', count: teamStats.length },
    { id: 'schedule', label: '📅 Planning', count: matches.filter(m => m.scheduled_at || m.scheduledTime).length },
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
