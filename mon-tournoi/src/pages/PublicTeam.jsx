import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Card, Badge, Avatar, Button } from '../shared/components/ui';
import { toast } from '../utils/toast';
import DashboardLayout from '../layouts/DashboardLayout';

export default function PublicTeam({ session }) {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Fetch team via Convex
  const teamData = useQuery(api.teams.getById,
    teamId ? { teamId } : "skip"
  );

  const loading = teamData === undefined;
  const notFound = teamData === null;
  const team = teamData;
  const members = teamData?.members || [];

  // Calculate stats (simplified - would need aggregation from matches)
  const stats = {
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    tournamentsCount: 0,
  };

  // Placeholders for data that would need additional queries
  const recentMatches = [];
  const tournaments = [];

  useEffect(() => {
    if (session?.user?.id && teamId) {
      // Check follow status would need a Convex query
      setIsFollowing(false);
    }
  }, [session, teamId]);

  const handleFollowToggle = async () => {
    if (!session?.user?.id) {
      toast.error('Vous devez être connecté pour suivre une équipe');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // TODO: Implement unfollow mutation
        setIsFollowing(false);
        toast.success('✅ Vous ne suivez plus cette équipe');
      } else {
        // TODO: Implement follow mutation  
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
          <p className="font-body text-white">Chargement de l'équipe...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (notFound) {
    return (
      <DashboardLayout session={session}>
        <Card variant="glass" padding="xl" className="text-center max-w-2xl mx-auto mt-20">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="font-display text-3xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-2">
            Équipe non trouvée
          </h2>
          <p className="font-body text-gray-400 mb-6">
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
    team?.captainId === session.user.id ||
    members.some(m => m.userId === session.user.id)
  );

  return (
    <DashboardLayout session={session}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card variant="glass" padding="lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar
              src={team?.logoUrl}
              name={team?.name}
              size="2xl"
            />
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-4xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-2">
                {team?.name}
              </h1>
              <p className="font-body text-gray-400 text-xl mb-4">
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
              <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
                📊 Statistiques
              </h3>
              {stats && stats.totalMatches > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-black/30 rounded-lg">
                    <div className="text-3xl font-display text-cyan-400">
                      {stats.totalMatches}
                    </div>
                    <div className="text-sm text-gray-400">Matchs</div>
                  </div>
                  <div className="text-center p-4 bg-black/30 rounded-lg">
                    <div className="text-3xl font-display text-green-500">
                      {stats.wins}
                    </div>
                    <div className="text-sm text-gray-400">Victoires</div>
                  </div>
                  <div className="text-center p-4 bg-black/30 rounded-lg">
                    <div className="text-3xl font-display text-red-500">
                      {stats.losses}
                    </div>
                    <div className="text-sm text-gray-400">Défaites</div>
                  </div>
                  <div className="text-center p-4 bg-black/30 rounded-lg">
                    <div className="text-3xl font-display text-cyan-400">
                      {stats.winRate}%
                    </div>
                    <div className="text-sm text-gray-400">Winrate</div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Aucune statistique disponible
                </p>
              )}
            </Card>

            {/* Recent Matches */}
            <Card variant="glass" padding="lg">
              <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
                📜 Matchs Récents
              </h3>
              {recentMatches.length > 0 ? (
                <div className="space-y-3">
                  {recentMatches.map((match) => {
                    const isTeam1 = match.team1Id === teamId;
                    const teamScore = isTeam1 ? match.scoreTeam1 : match.scoreTeam2;
                    const opponentScore = isTeam1 ? match.scoreTeam2 : match.scoreTeam1;
                    const won = teamScore > opponentScore;

                    return (
                      <div
                        key={match.id}
                        className="bg-black/30 border border-violet-500/30 rounded-lg p-4 hover:border-cyan-500 transition-all cursor-pointer"
                        onClick={() => navigate(`/match/${match.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-body text-white text-sm mb-1">
                              {match.tournaments?.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {match.tournaments?.game} • {new Date(match.createdAt).toLocaleDateString('fr-FR')}
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
                <p className="text-center text-gray-500 py-8">
                  Aucun match récent
                </p>
              )}
            </Card>

            {/* Tournaments */}
            <Card variant="glass" padding="lg">
              <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
                🏆 Tournois
              </h3>
              {tournaments.length > 0 ? (
                <div className="space-y-3">
                  {tournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="bg-black/30 border border-violet-500/30 rounded-lg p-4 hover:border-cyan-500 transition-all cursor-pointer"
                      onClick={() => navigate(`/tournament/${tournament.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-body text-white text-sm mb-1">
                            {tournament.name}
                          </div>
                          <div className="text-xs text-gray-500">
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
                <p className="text-center text-gray-500 py-8">
                  Aucun tournoi
                </p>
              )}
            </Card>
          </div>

          {/* Sidebar - Roster */}
          <div className="space-y-6">
            <Card variant="glass" padding="lg">
              <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
                👥 Roster ({members.length})
              </h3>
              <div className="space-y-3">
                {members.map((member) => (
                  <Link
                    key={member.userId}
                    to={`/player/${member.userId}`}
                    className="block bg-black/30 border border-violet-500/30 rounded-lg p-3 hover:border-cyan-500 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={member.user?.avatarUrl}
                        name={member.user?.username}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-body text-white text-sm truncate">
                          {member.user?.username || 'Joueur'}
                        </div>
                        <div className="text-xs text-gray-500">
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
