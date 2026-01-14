import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Card, Badge, Avatar, Button } from '../shared/components/ui';
import { toast } from '../utils/toast';
import DashboardLayout from '../layouts/DashboardLayout';

export default function PublicTeam({ session }) {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    loadTeam();
  }, [teamId]);

  useEffect(() => {
    if (session?.user?.id && teamId) {
      checkFollowStatus();
    }
  }, [session, teamId]);

  const loadTeam = async () => {
    setLoading(true);
    setNotFound(false);

    try {
      // Load team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError || !teamData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setTeam(teamData);

      // Load all data in parallel
      await Promise.all([
        loadMembers(teamId),
        loadStats(teamId),
        loadRecentMatches(teamId),
        loadTournaments(teamId),
      ]);
    } catch (error) {
      console.error('Error loading team:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (tId) => {
    // Get captain
    const { data: teamData } = await supabase
      .from('teams')
      .select('captain_id, profiles!teams_captain_id_fkey(id, username, avatar_url)')
      .eq('id', tId)
      .single();

    // Get other members
    const { data: membersData } = await supabase
      .from('team_members')
      .select('user_id, role, profiles(id, username, avatar_url)')
      .eq('team_id', tId);

    const allMembers = [];

    // Add captain
    if (teamData?.profiles) {
      allMembers.push({
        user_id: teamData.captain_id,
        role: 'captain',
        profiles: teamData.profiles,
      });
    }

    // Add other members
    if (membersData) {
      allMembers.push(...membersData);
    }

    setMembers(allMembers);
  };

  const loadStats = async (tId) => {
    // Get all completed matches
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${tId},player2_id.eq.${tId}`)
      .eq('status', 'completed');

    let wins = 0;
    let losses = 0;

    (matches || []).forEach(match => {
      const isTeam1 = match.player1_id === tId;
      const myScore = isTeam1 ? match.score_p1 : match.score_p2;
      const opponentScore = isTeam1 ? match.score_p2 : match.score_p1;

      if (myScore > opponentScore) wins++;
      else if (myScore < opponentScore) losses++;
    });

    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

    // Get tournament count
    const { data: participations } = await supabase
      .from('participants')
      .select('tournament_id')
      .eq('team_id', tId);

    const tournamentsCount = participations?.length || 0;

    setStats({
      totalMatches,
      wins,
      losses,
      winRate,
      tournamentsCount,
    });
  };

  const loadRecentMatches = async (tId) => {
    const { data: matches } = await supabase
      .from('matches')
      .select('*, tournaments(name, game)')
      .or(`player1_id.eq.${tId},player2_id.eq.${tId}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentMatches(matches || []);
  };

  const loadTournaments = async (tId) => {
    const { data: participations } = await supabase
      .from('participants')
      .select('tournament_id, tournaments(id, name, game, status, start_date)')
      .eq('team_id', tId)
      .order('tournaments(start_date)', { ascending: false })
      .limit(10);

    const tournamentsData = participations?.map(p => p.tournaments).filter(Boolean) || [];
    setTournaments(tournamentsData);
  };

  const checkFollowStatus = async () => {
    try {
      const { data } = await supabase
        .from('team_follows')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('team_id', teamId)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!session?.user?.id) {
      toast.error('Vous devez être connecté pour suivre une équipe');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('team_follows')
          .delete()
          .eq('user_id', session.user.id)
          .eq('team_id', teamId);

        if (error) throw error;
        setIsFollowing(false);
        toast.success('✅ Vous ne suivez plus cette équipe');
      } else {
        // Follow
        const { error } = await supabase
          .from('team_follows')
          .insert([{
            user_id: session.user.id,
            team_id: teamId,
          }]);

        if (error) throw error;
        setIsFollowing(true);
        toast.success('✅ Vous suivez maintenant cette équipe !');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Erreur lors de l\'opération');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout session={session}>
        <div className="text-center py-20">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="font-body text-fluky-text">Chargement de l'équipe...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (notFound) {
    return (
      <DashboardLayout session={session}>
        <Card variant="glass" padding="xl" className="text-center max-w-2xl mx-auto mt-20">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="font-display text-3xl text-fluky-secondary mb-2">
            Équipe non trouvée
          </h2>
          <p className="font-body text-fluky-text/70 mb-6">
            Cette équipe n'existe pas.
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>
            🏠 Retour à l'accueil
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const isMember = session?.user?.id && (
    team?.captain_id === session.user.id ||
    members.some(m => m.user_id === session.user.id)
  );

  return (
    <DashboardLayout session={session}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card variant="glass" padding="lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar
              src={team?.logo_url}
              name={team?.name}
              size="2xl"
            />
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-4xl text-fluky-secondary mb-2">
                {team?.name}
              </h1>
              <p className="font-body text-fluky-text/70 text-xl mb-4">
                [{team?.tag}]
              </p>
              
              {/* Quick Stats */}
              {stats && (
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <Badge variant="primary">
                    ⚔️ {stats.totalMatches} Matchs
                  </Badge>
                  <Badge variant="success">
                    ✅ {stats.wins} Victoires
                  </Badge>
                  <Badge variant="outline">
                    📈 {stats.winRate}% Winrate
                  </Badge>
                  <Badge variant="secondary">
                    🏆 {stats.tournamentsCount} Tournois
                  </Badge>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {isMember && (
                <Button variant="outline" onClick={() => navigate('/my-team')}>
                  ⚙️ Gérer l'équipe
                </Button>
              )}
              {session?.user?.id && !isMember && (
                <Button
                  variant={isFollowing ? 'outline' : 'primary'}
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                >
                  {followLoading ? '⏳' : isFollowing ? '✓ Suivi' : '➕ Suivre'}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <Card variant="glass" padding="lg">
              <h3 className="font-display text-2xl text-fluky-secondary mb-4">
                📊 Statistiques
              </h3>
              {stats && stats.totalMatches > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-black/30 rounded-lg">
                    <div className="text-3xl font-display text-fluky-secondary">
                      {stats.totalMatches}
                    </div>
                    <div className="text-sm text-fluky-text/70">Matchs</div>
                  </div>
                  <div className="text-center p-4 bg-black/30 rounded-lg">
                    <div className="text-3xl font-display text-green-500">
                      {stats.wins}
                    </div>
                    <div className="text-sm text-fluky-text/70">Victoires</div>
                  </div>
                  <div className="text-center p-4 bg-black/30 rounded-lg">
                    <div className="text-3xl font-display text-red-500">
                      {stats.losses}
                    </div>
                    <div className="text-sm text-fluky-text/70">Défaites</div>
                  </div>
                  <div className="text-center p-4 bg-black/30 rounded-lg">
                    <div className="text-3xl font-display text-fluky-secondary">
                      {stats.winRate}%
                    </div>
                    <div className="text-sm text-fluky-text/70">Winrate</div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-fluky-text/60 py-8">
                  Aucune statistique disponible
                </p>
              )}
            </Card>

            {/* Recent Matches */}
            <Card variant="glass" padding="lg">
              <h3 className="font-display text-2xl text-fluky-secondary mb-4">
                📜 Matchs Récents
              </h3>
              {recentMatches.length > 0 ? (
                <div className="space-y-3">
                  {recentMatches.map((match) => {
                    const isTeam1 = match.player1_id === teamId;
                    const teamScore = isTeam1 ? match.score_p1 : match.score_p2;
                    const opponentScore = isTeam1 ? match.score_p2 : match.score_p1;
                    const won = teamScore > opponentScore;

                    return (
                      <div
                        key={match.id}
                        className="bg-black/30 border border-fluky-primary/30 rounded-lg p-4 hover:border-fluky-secondary transition-all cursor-pointer"
                        onClick={() => navigate(`/match/${match.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-body text-fluky-text text-sm mb-1">
                              {match.tournaments?.name}
                            </div>
                            <div className="text-xs text-fluky-text/60">
                              {match.tournaments?.game} • {new Date(match.created_at).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          <Badge variant={won ? 'success' : 'error'} size="sm">
                            {won ? 'Victoire' : 'Défaite'} ({teamScore} - {opponentScore})
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-fluky-text/60 py-8">
                  Aucun match récent
                </p>
              )}
            </Card>

            {/* Tournaments */}
            <Card variant="glass" padding="lg">
              <h3 className="font-display text-2xl text-fluky-secondary mb-4">
                🏆 Tournois
              </h3>
              {tournaments.length > 0 ? (
                <div className="space-y-3">
                  {tournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="bg-black/30 border border-fluky-primary/30 rounded-lg p-4 hover:border-fluky-secondary transition-all cursor-pointer"
                      onClick={() => navigate(`/tournament/${tournament.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-body text-fluky-text text-sm mb-1">
                            {tournament.name}
                          </div>
                          <div className="text-xs text-fluky-text/60">
                            {tournament.game}
                          </div>
                        </div>
                        <Badge
                          variant={
                            tournament.status === 'completed' ? 'outline' :
                            tournament.status === 'in_progress' ? 'primary' :
                            'secondary'
                          }
                          size="sm"
                        >
                          {tournament.status === 'completed' ? 'Terminé' :
                           tournament.status === 'in_progress' ? 'En cours' :
                           'À venir'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-fluky-text/60 py-8">
                  Aucun tournoi
                </p>
              )}
            </Card>
          </div>

          {/* Sidebar - Roster */}
          <div className="space-y-6">
            <Card variant="glass" padding="lg">
              <h3 className="font-display text-2xl text-fluky-secondary mb-4">
                👥 Roster ({members.length})
              </h3>
              <div className="space-y-3">
                {members.map((member) => (
                  <Link
                    key={member.user_id}
                    to={`/player/${member.user_id}`}
                    className="block bg-black/30 border border-fluky-primary/30 rounded-lg p-3 hover:border-fluky-secondary transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={member.profiles?.avatar_url}
                        name={member.profiles?.username}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-body text-fluky-text text-sm truncate">
                          {member.profiles?.username || 'Joueur'}
                        </div>
                        <div className="text-xs text-fluky-text/60">
                          {member.role === 'captain' ? '👑 Capitaine' :
                           member.role === 'manager' ? '📋 Manager' :
                           member.role === 'coach' ? '🎓 Coach' :
                           '👤 Membre'}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
