import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Card, Badge, Avatar, Button } from '../shared/components/ui';
import { formatGamertag, PLATFORM_LOGOS, PLATFORM_NAMES } from '../utils/gamePlatforms';
import { getUserGamingAccounts } from '../shared/services/api/gamingAccounts';
import DashboardLayout from '../layouts/DashboardLayout';

export default function PublicProfile({ session }) {
  const { userId, username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [teams, setTeams] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [gamingAccounts, setGamingAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId, username]);

  const loadProfile = async () => {
    setLoading(true);
    setNotFound(false);

    try {
      let profileData = null;

      // Try to fetch by userId first
      if (userId) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        profileData = data;
      } else if (username) {
        // Fetch by username
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
        profileData = data;
      }

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Check if profile is public
      if (!profileData.is_public && profileData.id !== session?.user?.id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Load all data in parallel
      await Promise.all([
        loadStats(profileData.id),
        loadTeams(profileData.id),
        loadRecentMatches(profileData.id),
        loadGamingAccounts(profileData.id),
      ]);
    } catch (error) {
      console.error('Error loading profile:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (profileId) => {
    // Get all teams
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('captain_id', profileId);
    
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', profileId);

    const allTeamIds = [
      ...(captainTeams?.map(t => t.id) || []),
      ...(memberTeams?.map(tm => tm.team_id) || [])
    ];
    const uniqueTeamIds = [...new Set(allTeamIds)];

    if (uniqueTeamIds.length === 0) {
      setStats({
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        tournamentsCount: 0,
      });
      return;
    }

    // Get all completed matches
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(uniqueTeamIds.map(id => `player1_id.eq.${id},player2_id.eq.${id}`).join(','))
      .eq('status', 'completed');

    let wins = 0;
    let losses = 0;

    (matches || []).forEach(match => {
      const myTeamId = uniqueTeamIds.find(id => id === match.player1_id || id === match.player2_id);
      if (!myTeamId) return;

      const isTeam1 = match.player1_id === myTeamId;
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
      .in('team_id', uniqueTeamIds);

    const tournamentsCount = new Set(participations?.map(p => p.tournament_id) || []).size;

    setStats({
      totalMatches,
      wins,
      losses,
      winRate,
      tournamentsCount,
    });
  };

  const loadTeams = async (profileId) => {
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('captain_id', profileId);
    
    const { data: memberTeamsData } = await supabase
      .from('team_members')
      .select('team_id, teams(*)')
      .eq('user_id', profileId);

    const allTeams = [
      ...(captainTeams || []),
      ...(memberTeamsData?.map(m => m.teams).filter(Boolean) || [])
    ];

    const uniqueTeams = Array.from(new Map(allTeams.map(t => [t.id, { ...t, isCaptain: captainTeams?.some(ct => ct.id === t.id) }])).values());
    setTeams(uniqueTeams);
  };

  const loadRecentMatches = async (profileId) => {
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('captain_id', profileId);
    
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', profileId);

    const allTeamIds = [
      ...(captainTeams?.map(t => t.id) || []),
      ...(memberTeams?.map(tm => tm.team_id) || [])
    ];
    const uniqueTeamIds = [...new Set(allTeamIds)];

    if (uniqueTeamIds.length === 0) {
      setRecentMatches([]);
      return;
    }

    const { data: matches } = await supabase
      .from('matches')
      .select('*, tournaments(name, game)')
      .or(uniqueTeamIds.map(id => `player1_id.eq.${id},player2_id.eq.${id}`).join(','))
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentMatches(matches || []);
  };

  const loadGamingAccounts = async (profileId) => {
    try {
      const accounts = await getUserGamingAccounts(profileId);
      setGamingAccounts(accounts);
    } catch (error) {
      console.error('Error loading gaming accounts:', error);
      setGamingAccounts([]);
    }
  };

  if (loading) {
    return (
      <DashboardLayout session={session}>
        <div className="text-center py-20">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="font-body text-fluky-text">Chargement du profil...</p>
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
            Profil non trouvé
          </h2>
          <p className="font-body text-fluky-text/70 mb-6">
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
        {profile?.banner_url && (
          <div
            className="w-full h-48 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.banner_url})` }}
          />
        )}

        {/* Header */}
        <Card variant="glass" padding="lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.username}
              size="2xl"
            />
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-4xl text-fluky-secondary mb-2">
                {profile?.username || 'Joueur'}
              </h1>
              {profile?.bio && (
                <p className="font-body text-fluky-text/70 mb-4">
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
            {session?.user?.id === profile?.id && (
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
                  {recentMatches.map((match) => (
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
                        <Badge variant={match.score_p1 > match.score_p2 ? 'success' : 'error'} size="sm">
                          {match.score_p1} - {match.score_p2}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-fluky-text/60 py-8">
                  Aucun match récent
                </p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Teams */}
            <Card variant="glass" padding="lg">
              <h3 className="font-display text-2xl text-fluky-secondary mb-4">
                👥 Équipes
              </h3>
              {teams.length > 0 ? (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <Link
                      key={team.id}
                      to={`/team/${team.id}`}
                      className="block bg-black/30 border border-fluky-primary/30 rounded-lg p-3 hover:border-fluky-secondary transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={team.logo_url} name={team.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="font-body text-fluky-text text-sm truncate">
                            {team.name}
                          </div>
                          <div className="text-xs text-fluky-text/60">
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
                <p className="text-center text-fluky-text/60 py-4 text-sm">
                  Aucune équipe
                </p>
              )}
            </Card>

            {/* Gaming Accounts */}
            {gamingAccounts.length > 0 && (
              <Card variant="glass" padding="lg">
                <h3 className="font-display text-2xl text-fluky-secondary mb-4">
                  🎮 Comptes Gaming
                </h3>
                <div className="space-y-3">
                  {gamingAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 bg-black/30 rounded-lg p-3"
                    >
                      <img
                        src={PLATFORM_LOGOS[account.platform]}
                        alt={PLATFORM_NAMES[account.platform]}
                        className="w-8 h-8 rounded bg-white/10 p-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-fluky-text/60">
                          {PLATFORM_NAMES[account.platform]}
                        </div>
                        <div className="font-body text-fluky-text text-sm truncate">
                          {formatGamertag(account.game_username, account.game_tag, account.platform)}
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
