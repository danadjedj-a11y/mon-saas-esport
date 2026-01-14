import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Tabs, Avatar, Input } from './shared/components/ui';
import { toast } from './utils/toast';
import BadgeDisplay from './components/BadgeDisplay';
import GamingAccountsSection from './components/GamingAccountsSection';
import DashboardLayout from './layouts/DashboardLayout';

export default function Profile({ session }) {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [playerStats, setPlayerStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      loadProfileData();
    }
  }, [session]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        getProfile(),
        fetchPlayerStats(),
        fetchRecentMatches(),
        fetchMyTeams(),
      ]);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

  async function getProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, bio, banner_url, is_public')
      .eq('id', session.user.id)
      .single();
    
    if (data) {
      setUsername(data.username || '');
      setAvatarUrl(data.avatar_url || '');
      setBio(data.bio || '');
      setBannerUrl(data.banner_url || '');
      setIsPublic(data.is_public !== false); // Default to true if null
    }
  }

  async function fetchPlayerStats() {
    // Récupérer toutes les équipes du joueur
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('captain_id', session.user.id);
    
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', session.user.id);

    const allTeamIds = [
      ...(captainTeams?.map(t => t.id) || []),
      ...(memberTeams?.map(tm => tm.team_id) || [])
    ];
    const uniqueTeamIds = [...new Set(allTeamIds)];

    if (uniqueTeamIds.length === 0) {
      setPlayerStats({
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        tournamentsCount: 0,
        teamsCount: 0
      });
      return;
    }

    // Récupérer tous les matchs
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*')
      .or(uniqueTeamIds.map(id => `player1_id.eq.${id},player2_id.eq.${id}`).join(','))
      .eq('status', 'completed');

    let wins = 0;
    let losses = 0;
    let draws = 0;

    (allMatches || []).forEach(match => {
      const myTeamId = uniqueTeamIds.find(id => id === match.player1_id || id === match.player2_id);
      if (!myTeamId) return;

      const isTeam1 = match.player1_id === myTeamId;
      const myScore = isTeam1 ? match.score_p1 : match.score_p2;
      const opponentScore = isTeam1 ? match.score_p2 : match.score_p1;

      if (myScore > opponentScore) wins++;
      else if (myScore < opponentScore) losses++;
      else draws++;
    });

    const totalMatches = wins + losses + draws;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

    // Récupérer le nombre de tournois
    const { data: participations } = await supabase
      .from('participants')
      .select('tournament_id')
      .in('team_id', uniqueTeamIds);

    const tournamentsCount = new Set(participations?.map(p => p.tournament_id) || []).size;

    setPlayerStats({
      totalMatches,
      wins,
      losses,
      draws,
      winRate,
      tournamentsCount,
      teamsCount: uniqueTeamIds.length
    });
  }

  async function fetchRecentMatches() {
    // Récupérer les équipes
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('captain_id', session.user.id);
    
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', session.user.id);

    const allTeamIds = [
      ...(captainTeams?.map(t => t.id) || []),
      ...(memberTeams?.map(tm => tm.team_id) || [])
    ];
    const uniqueTeamIds = [...new Set(allTeamIds)];

    if (uniqueTeamIds.length === 0) {
      setRecentMatches([]);
      return;
    }

    // Récupérer les 10 derniers matchs
    const { data: matches } = await supabase
      .from('matches')
      .select('*, tournaments(name, game)')
      .or(uniqueTeamIds.map(id => `player1_id.eq.${id},player2_id.eq.${id}`).join(','))
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    setRecentMatches(matches || []);
  }

  async function fetchMyTeams() {
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('captain_id', session.user.id);
    
    const { data: memberTeamsData } = await supabase
      .from('team_members')
      .select('team_id, teams(*)')
      .eq('user_id', session.user.id);

    const allTeams = [
      ...(captainTeams || []),
      ...(memberTeamsData?.map(m => m.teams).filter(Boolean) || [])
    ];

    const uniqueTeams = Array.from(new Map(allTeams.map(t => [t.id, t])).values());
    setMyTeams(uniqueTeams);
  }

  async function updateProfile() {
    try {
      setEditing(false);
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: username.trim(),
          bio: bio.trim(),
          is_public: isPublic,
        })
        .eq('id', session.user.id);

      if (error) throw error;

      toast.success('✅ Profil mis à jour avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour: ' + error.message);
      console.error(error);
    }
  }

  async function uploadAvatar(event) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Sélectionnez une image');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('✅ Avatar mis à jour !');
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadBanner(event) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Sélectionnez une image');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${session.user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setBannerUrl(publicUrl);
      toast.success('✅ Bannière mise à jour !');
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

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

  // Tabs configuration
  const tabs = [
    {
      id: 'overview',
      label: 'Vue d\'ensemble',
      icon: '👤',
      content: (
        <div className="space-y-6">
          {/* Informations personnelles */}
          <Card variant="glass" padding="lg">
            <h3 className="font-display text-2xl text-fluky-secondary mb-4">
              Informations Personnelles
            </h3>
            
            {editing ? (
              <div className="space-y-4">
                <Input
                  label="Nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Votre pseudo..."
                />
                <div>
                  <label className="block text-sm font-medium text-fluky-text mb-2">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Parlez de vous..."
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border-2 border-white/10 bg-background/50 text-fluky-text placeholder:text-fluky-text/50 focus:outline-none focus:ring-2 focus:ring-fluky-primary focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={updateProfile}>
                    💾 Enregistrer
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-fluky-text/60 font-body">Nom d'utilisateur</label>
                  <p className="text-lg text-fluky-text font-body">{username || 'Non défini'}</p>
                </div>
                <div>
                  <label className="text-sm text-fluky-text/60 font-body">Email</label>
                  <p className="text-lg text-fluky-text font-body">{session.user.email}</p>
                </div>
                {bio && (
                  <div>
                    <label className="text-sm text-fluky-text/60 font-body">Bio</label>
                    <p className="text-fluky-text font-body">{bio}</p>
                  </div>
                )}
                <Button variant="outline" onClick={() => setEditing(true)}>
                  ✏️ Modifier
                </Button>
              </div>
            )}
          </Card>

          {/* Avatar */}
          <Card variant="glass" padding="lg">
            <h3 className="font-display text-2xl text-fluky-secondary mb-4">
              Avatar
            </h3>
            <div className="flex items-center gap-6">
              <Avatar
                src={avatarUrl}
                name={username || session.user.email}
                size="2xl"
              />
              <div className="flex-1">
                <p className="text-sm text-fluky-text/70 font-body mb-3">
                  Téléchargez une image pour personnaliser votre profil
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  id="avatar-upload"
                  className="hidden"
                />
                <label htmlFor="avatar-upload">
                  <Button variant="outline" size="sm" disabled={uploading} as="span">
                    {uploading ? 'Upload...' : '📷 Changer Avatar'}
                  </Button>
                </label>
              </div>
            </div>
          </Card>

          {/* Banner */}
          <Card variant="glass" padding="lg">
            <h3 className="font-display text-2xl text-fluky-secondary mb-4">
              Bannière du Profil Public
            </h3>
            {bannerUrl && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <img 
                  src={bannerUrl} 
                  alt="Banner" 
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={uploadBanner}
                disabled={uploading}
                id="banner-upload"
                className="hidden"
              />
              <label htmlFor="banner-upload">
                <Button variant="outline" size="sm" disabled={uploading} as="span">
                  {uploading ? 'Upload...' : '🖼️ Changer Bannière'}
                </Button>
              </label>
              {bannerUrl && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={async () => {
                    try {
                      await supabase
                        .from('profiles')
                        .update({ banner_url: null })
                        .eq('id', session.user.id);
                      setBannerUrl('');
                      toast.success('✅ Bannière supprimée');
                    } catch (error) {
                      toast.error('Erreur lors de la suppression');
                    }
                  }}
                >
                  🗑️ Supprimer
                </Button>
              )}
            </div>
          </Card>

          {/* Public Profile Settings */}
          <Card variant="glass" padding="lg">
            <h3 className="font-display text-2xl text-fluky-secondary mb-4">
              Profil Public
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-body text-fluky-text font-semibold">
                    Rendre mon profil public
                  </label>
                  <p className="text-sm text-fluky-text/60 mt-1">
                    Les autres joueurs pourront voir votre profil, statistiques et équipes
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isPublic}
                    onChange={(e) => {
                      setIsPublic(e.target.checked);
                      supabase
                        .from('profiles')
                        .update({ is_public: e.target.checked })
                        .eq('id', session.user.id)
                        .then(() => {
                          toast.success(e.target.checked ? '✅ Profil maintenant public' : '🔒 Profil maintenant privé');
                        });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-fluky-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fluky-primary"></div>
                </label>
              </div>
              {isPublic && (
                <Button variant="outline" onClick={() => navigate(`/player/${session.user.id}`)}>
                  👁️ Voir mon profil public
                </Button>
              )}
            </div>
          </Card>
        </div>
      ),
    },
    {
      id: 'stats',
      label: 'Statistiques',
      icon: '📊',
      badge: playerStats?.totalMatches || 0,
      content: (
        <div className="space-y-6">
          {/* Stats globales */}
          {playerStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="glass" padding="lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">⚔️</div>
                  <div className="text-3xl font-display text-fluky-secondary">
                    {playerStats.totalMatches}
                  </div>
                  <div className="text-sm font-body text-fluky-text/70">
                    Matchs Joués
                  </div>
                </div>
              </Card>

              <Card variant="glass" padding="lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <div className="text-3xl font-display text-green-500">
                    {playerStats.wins}
                  </div>
                  <div className="text-sm font-body text-fluky-text/70">
                    Victoires
                  </div>
                </div>
              </Card>

              <Card variant="glass" padding="lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <div className="text-3xl font-display text-fluky-secondary">
                    {playerStats.winRate}%
                  </div>
                  <div className="text-sm font-body text-fluky-text/70">
                    Taux de Victoire
                  </div>
                </div>
              </Card>

              <Card variant="glass" padding="lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">🏆</div>
                  <div className="text-3xl font-display text-fluky-secondary">
                    {playerStats.tournamentsCount}
                  </div>
                  <div className="text-sm font-body text-fluky-text/70">
                    Tournois
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Matchs récents */}
          <Card variant="glass" padding="lg">
            <h3 className="font-display text-2xl text-fluky-secondary mb-4">
              📜 Historique des Matchs
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
                          {new Date(match.created_at).toLocaleDateString('fr-FR')}
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
              <p className="text-center text-fluky-text/60 font-body py-8">
                Aucun match joué pour le moment
              </p>
            )}
          </Card>
        </div>
      ),
    },
    {
      id: 'teams',
      label: 'Mes Équipes',
      icon: '👥',
      badge: myTeams.length || 0,
      content: (
        <div className="space-y-6">
          {myTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTeams.map((team) => (
                <Card
                  key={team.id}
                  variant="glass"
                  hover
                  clickable
                  onClick={() => navigate('/my-team')}
                  className="border-fluky-primary/30"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar
                      src={team.logo_url}
                      name={team.name}
                      size="lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-display text-lg text-fluky-secondary">
                        {team.name}
                      </h4>
                      <p className="text-sm text-fluky-text/60 font-body">
                        [{team.tag}]
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={team.captain_id === session.user.id ? 'primary' : 'outline'}
                    size="sm"
                  >
                    {team.captain_id === session.user.id ? '👑 Capitaine' : '👤 Membre'}
                  </Badge>
                </Card>
              ))}
            </div>
          ) : (
            <Card variant="outlined" padding="xl" className="text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="font-display text-2xl text-fluky-secondary mb-2">
                Aucune Équipe
              </h3>
              <p className="font-body text-fluky-text/70 mb-6">
                Créez ou rejoignez une équipe pour participer aux tournois
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="primary" onClick={() => navigate('/create-team')}>
                  ➕ Créer une Équipe
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  🔍 Trouver une Équipe
                </Button>
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: 'achievements',
      label: 'Succès',
      icon: '🏅',
      content: (
        <Card variant="glass" padding="lg">
          <h3 className="font-display text-2xl text-fluky-secondary mb-4">
            🏅 Badges & Succès
          </h3>
          <BadgeDisplay userId={session.user.id} />
          <div className="mt-6 text-center">
            <p className="font-body text-fluky-text/60 text-sm">
              Continuez à jouer pour débloquer plus de badges !
            </p>
          </div>
        </Card>
      ),
    },
    {
      id: 'gaming-accounts',
      label: 'Comptes Gaming',
      icon: '🎮',
      content: <GamingAccountsSection session={session} />,
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: '⚙️',
      content: (
        <div className="space-y-6">
          <Card variant="glass" padding="lg">
            <h3 className="font-display text-2xl text-fluky-secondary mb-4">
              ⚙️ Paramètres du Compte
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-fluky-text/60 font-body">ID Utilisateur</label>
                <p className="text-fluky-text font-mono text-sm">{session.user.id}</p>
              </div>
              <div>
                <label className="text-sm text-fluky-text/60 font-body">Inscrit le</label>
                <p className="text-fluky-text font-body">
                  {new Date(session.user.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                </p>
              </div>
            </div>
          </Card>

          <Card variant="outlined" padding="lg" className="border-red-500/30">
            <h3 className="font-display text-xl text-red-500 mb-4">
              ⚠️ Zone Danger
            </h3>
            <p className="text-sm text-fluky-text/70 font-body mb-4">
              Les actions suivantes sont irréversibles
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => toast.info('Fonctionnalité bientôt disponible')}
            >
              🗑️ Supprimer Mon Compte
            </Button>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout session={session}>
      {/* HEADER PROFILE */}
      <Card variant="glass" padding="lg" className="mb-8 border-fluky-primary/30">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Avatar
            src={avatarUrl}
            name={username || session.user.email}
            size="2xl"
            status="online"
          />
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-display text-3xl text-fluky-secondary mb-1">
              {username || session.user.email}
            </h1>
            {bio && (
              <p className="font-body text-fluky-text/70 text-sm mb-3">
                {bio}
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant="primary" size="sm">
                👤 Joueur
              </Badge>
              {playerStats?.tournamentsCount > 0 && (
                <Badge variant="success" size="sm">
                  🏆 {playerStats.tournamentsCount} Tournois
                </Badge>
              )}
              {playerStats && playerStats.winRate > 50 && (
                <Badge variant="warning" size="sm">
                  🔥 {playerStats.winRate}% Win Rate
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setEditing(!editing)}
          >
            ✏️ Modifier Profil
          </Button>
        </div>
      </Card>

      {/* TABS */}
      <Tabs tabs={tabs} defaultTab="overview" />
    </DashboardLayout>
  );
}
