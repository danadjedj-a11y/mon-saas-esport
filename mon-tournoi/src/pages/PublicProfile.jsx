import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Card, Badge, Avatar, Button } from '../shared/components/ui';
import { formatGamertag, PLATFORM_LOGOS, PLATFORM_NAMES } from '../utils/gamePlatforms';
import DashboardLayout from '../layouts/DashboardLayout';

export default function PublicProfile({ session }) {
  const { userId, username } = useParams();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  // Fetch profile via Convex
  const profileById = useQuery(api.users.getById, 
    userId ? { userId } : "skip"
  );
  const profileByUsername = useQuery(api.users.getByUsername,
    username && !userId ? { username } : "skip"
  );

  const profile = profileById || profileByUsername;
  const loading = (userId && profileById === undefined) || (username && !userId && profileByUsername === undefined);

  // Fetch teams via Convex
  const teams = useQuery(api.teams.listByUser,
    profile?._id ? { userId: profile._id } : "skip"
  ) || [];

  // Fetch gaming accounts via Convex
  const gamingAccounts = useQuery(api.playerGameAccounts.listByUser,
    profile?._id ? { userId: profile._id } : "skip"
  ) || [];

  // Fetch matches via Convex (requires team IDs)
  const teamIds = teams.map(t => t._id);

  // Calculate stats from matches (simplified - would need proper aggregation)
  const stats = {
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    tournamentsCount: 0,
  };

  // Recent matches placeholder
  const recentMatches = [];

  useEffect(() => {
    if (profile === null && !loading) {
      setNotFound(true);
    } else if (profile) {
      setNotFound(false);
      // Check if profile is public
      if (!profile.isPublic && profile._id !== session?.user?.id) {
        setNotFound(true);
      }
    }
  }, [profile, loading, session]);

  if (loading) {
    return (
      <DashboardLayout session={session}>
        <div className="text-center py-20">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="font-body text-white">Chargement du profil...</p>
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
            Profil non trouvé
          </h2>
          <p className="font-body text-gray-400 mb-6">
            Ce profil n'existe pas ou n'est pas public.
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>
            🏠 Retour à l'accueil
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout session={session}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner */}
        {profile?.bannerUrl && (
          <div
            className="w-full h-48 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.bannerUrl})` }}
          />
        )}

        {/* Header */}
        <Card variant="glass" padding="lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar
              src={profile?.avatarUrl}
              name={profile?.username}
              size="2xl"
            />
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-4xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-2">
                {profile?.username || 'Joueur'}
              </h1>
              {profile?.bio && (
                <p className="font-body text-gray-400 mb-4">
                  {profile.bio}
                </p>
              )}
              
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

            {/* View My Profile button if it's the current user */}
            {session?.user?.id === profile?._id && (
              <Button variant="outline" onClick={() => navigate('/profile')}>
                ✏️ Modifier mon profil
              </Button>
            )}
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
                  {recentMatches.map((match) => (
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
                        <Badge variant={match.scoreTeam1 > match.scoreTeam2 ? 'success' : 'error'} size="sm">
                          {match.scoreTeam1} - {match.scoreTeam2}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Aucun match récent
                </p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Teams */}
            <Card variant="glass" padding="lg">
              <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
                👥 Équipes
              </h3>
              {teams.length > 0 ? (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <Link
                      key={team._id}
                      to={`/team/${team._id}`}
                      className="block bg-black/30 border border-violet-500/30 rounded-lg p-3 hover:border-cyan-500 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={team.logoUrl} name={team.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="font-body text-white text-sm truncate">
                            {team.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            [{team.tag}]
                          </div>
                        </div>
                        {team.isCaptain && (
                          <Badge variant="primary" size="sm">👑</Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4 text-sm">
                  Aucune équipe
                </p>
              )}
            </Card>

            {/* Gaming Accounts */}
            {gamingAccounts.length > 0 && (
              <Card variant="glass" padding="lg">
                <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
                  🎮 Comptes Gaming
                </h3>
                <div className="space-y-3">
                  {gamingAccounts.map((account) => (
                    <div
                      key={account._id}
                      className="flex items-center gap-3 bg-black/30 rounded-lg p-3"
                    >
                      <img
                        src={PLATFORM_LOGOS[account.platform]}
                        alt={PLATFORM_NAMES[account.platform]}
                        className="w-8 h-8 rounded bg-white/10 p-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500">
                          {PLATFORM_NAMES[account.platform]}
                        </div>
                        <div className="font-body text-white text-sm truncate">
                          {formatGamertag(account.gameUsername, account.gameTag, account.platform)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
