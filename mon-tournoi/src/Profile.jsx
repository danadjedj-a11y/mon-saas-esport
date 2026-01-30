/**
 * PROFILE.JSX - Version Complète Clerk + Convex
 * 
 * Profil utilisateur avec tous les 6 onglets originaux :
 * 1. Vue d'ensemble (infos, avatar, bio)
 * 2. Statistiques (matchs, victoires, taux)
 * 3. Mes Équipes
 * 4. Succès / Badges
 * 5. Comptes Gaming
 * 6. Paramètres
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button, Card, Badge, Tabs, Avatar, Input, ImageUploader, GradientButton } from './shared/components/ui';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';

export default function Profile() {
  const navigate = useNavigate();
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();

  // Données Convex
  const convexUser = useQuery(api.users.getCurrent);
  const userStats = useQuery(api.users.getStats, {});
  const userBadges = useQuery(api.users.getBadges, {});
  const userTeams = useQuery(
    api.teams.listByUser,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Mutations
  const updateProfile = useMutation(api.usersMutations.updateProfile);

  // États locaux
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Gaming accounts state
  const [gamingAccounts, setGamingAccounts] = useState({
    riotId: '',
    steamId: '',
    epicGamesId: '',
    battleNetId: '',
  });

  // Sync initial values when data loads
  useEffect(() => {
    if (convexUser) {
      setUsername(convexUser.username || '');
      setBio(convexUser.bio || '');
      setIsPublic(!convexUser.isPrivate);
      if (convexUser.gamingAccounts) {
        setGamingAccounts({
          riotId: convexUser.gamingAccounts.riotId || '',
          steamId: convexUser.gamingAccounts.steamId || '',
          epicGamesId: convexUser.gamingAccounts.epicGamesId || '',
          battleNetId: convexUser.gamingAccounts.battleNetId || '',
        });
      }
    }
  }, [convexUser]);

  // Chargement
  if (!isLoaded || convexUser === undefined) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="text-gray-400">Chargement du profil...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Non connecté
  if (!clerkUser) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-400 mb-4">Vous devez être connecté pour voir votre profil</p>
          <GradientButton onClick={() => navigate('/auth')}>
            Se connecter
          </GradientButton>
        </div>
      </DashboardLayout>
    );
  }

  // Valeurs affichées
  const displayUsername = convexUser?.username || clerkUser.username || clerkUser.firstName || 'Utilisateur';
  const displayBio = convexUser?.bio || '';
  const avatarUrl = convexUser?.avatarUrl || clerkUser.imageUrl;
  const bannerUrl = convexUser?.bannerUrl || '';
  const email = clerkUser.primaryEmailAddress?.emailAddress || '';
  const role = convexUser?.role || 'player';
  const teams = userTeams || [];
  const stats = userStats || { totalMatches: 0, wins: 0, losses: 0, draws: 0, winRate: '0', tournamentsPlayed: 0, teamsCount: 0 };
  const badges = userBadges || [];

  // Sauvegarder les modifications du profil
  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        username: username.trim() || displayUsername,
        bio: bio.trim(),
      });
      setEditing(false);
      toast.success('✅ Profil mis à jour !');
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    }
  };

  // Sauvegarder les comptes gaming
  const handleSaveGamingAccounts = async () => {
    try {
      await updateProfile({
        gamingAccounts: gamingAccounts,
      });
      toast.success('✅ Comptes gaming mis à jour !');
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    }
  };

  // Upload avatar (via Clerk)
  const handleAvatarUpload = async (file) => {
    try {
      setUploading(true);
      // Pour l'instant, on redirige vers Clerk pour la gestion de l'avatar
      toast.info('Modifiez votre avatar via les paramètres Clerk');
      window.open('https://accounts.clerk.dev/user', '_blank');
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Déconnexion
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // ========================================
  // ONGLET 1 - VUE D'ENSEMBLE
  // ========================================
  const OverviewTab = (
    <div className="space-y-6">
      {/* Informations personnelles */}
      <Card variant="glass" padding="lg">
        <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Parlez de vous..."
                rows={4}
                className="w-full px-4 py-2 rounded-lg border-2 border-violet-500/30 bg-dark-800/50 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div className="flex gap-2">
              <GradientButton onClick={handleSaveProfile}>
                💾 Enregistrer
              </GradientButton>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Nom d'utilisateur</label>
              <p className="text-lg text-white">{displayUsername}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="text-lg text-white">{email}</p>
            </div>
            {displayBio && (
              <div>
                <label className="text-sm text-gray-500">Bio</label>
                <p className="text-gray-300">{displayBio}</p>
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
        <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
          Avatar
        </h3>
        <ImageUploader
          onUpload={handleAvatarUpload}
          currentImage={avatarUrl}
          loading={uploading}
        />
      </Card>

      {/* Banner */}
      <Card variant="glass" padding="lg">
        <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
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
        <p className="text-gray-400 text-sm">
          La bannière peut être personnalisée dans les paramètres avancés.
        </p>
      </Card>

      {/* Public Profile Settings */}
      <Card variant="glass" padding="lg">
        <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
          Profil Public
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-semibold">
                Rendre mon profil public
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Les autres joueurs pourront voir votre profil, statistiques et équipes
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500"></div>
            </label>
          </div>
          {isPublic && convexUser?._id && (
            <Button variant="outline" onClick={() => navigate(`/player/${convexUser._id}`)}>
              👁️ Voir mon profil public
            </Button>
          )}
        </div>
      </Card>
    </div>
  );

  // ========================================
  // ONGLET 2 - STATISTIQUES
  // ========================================
  const StatsTab = (
    <div className="space-y-6">
      {/* Stats globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" padding="lg">
          <div className="text-center">
            <div className="text-4xl mb-2">⚔️</div>
            <div className="text-3xl font-display text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              {stats.totalMatches || 0}
            </div>
            <div className="text-sm text-gray-400">
              Matchs Joués
            </div>
          </div>
        </Card>

        <Card variant="glass" padding="lg">
          <div className="text-center">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-3xl font-display text-green-500">
              {stats.wins || 0}
            </div>
            <div className="text-sm text-gray-400">
              Victoires
            </div>
          </div>
        </Card>

        <Card variant="glass" padding="lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <div className="text-3xl font-display text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
              {stats.winRate || '0'}%
            </div>
            <div className="text-sm text-gray-400">
              Taux de Victoire
            </div>
          </div>
        </Card>

        <Card variant="glass" padding="lg">
          <div className="text-center">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-3xl font-display text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
              {stats.tournamentsPlayed || 0}
            </div>
            <div className="text-sm text-gray-400">
              Tournois
            </div>
          </div>
        </Card>
      </div>

      {/* Historique des matchs - placeholder */}
      <Card variant="glass" padding="lg">
        <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
          📜 Historique des Matchs
        </h3>
        <p className="text-center text-gray-500 py-8">
          Aucun match joué pour le moment
        </p>
      </Card>
    </div>
  );

  // ========================================
  // ONGLET 3 - MES ÉQUIPES
  // ========================================
  const TeamsTab = (
    <div className="space-y-6">
      {teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card
              key={team._id}
              variant="glass"
              hover
              clickable
              onClick={() => navigate('/my-team')}
              className="border-violet-500/30"
            >
              <div className="flex items-center gap-4 mb-4">
                <Avatar
                  src={team.logoUrl}
                  name={team.name}
                  size="lg"
                />
                <div className="flex-1">
                  <h4 className="font-display text-lg text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                    {team.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    [{team.tag}]
                  </p>
                </div>
              </div>
              <Badge
                variant={team.captainId === convexUser?._id ? 'primary' : 'outline'}
                size="sm"
              >
                {team.captainId === convexUser?._id ? '👑 Capitaine' : '👤 Membre'}
              </Badge>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="outlined" padding="xl" className="text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-2">
            Aucune Équipe
          </h3>
          <p className="text-gray-400 mb-6">
            Créez ou rejoignez une équipe pour participer aux tournois
          </p>
          <div className="flex gap-4 justify-center">
            <GradientButton onClick={() => navigate('/create-team')}>
              ➕ Créer une Équipe
            </GradientButton>
            <Button variant="outline" onClick={() => navigate('/')}>
              🔍 Trouver une Équipe
            </Button>
          </div>
        </Card>
      )}
    </div>
  );

  // ========================================
  // ONGLET 4 - SUCCÈS / BADGES
  // ========================================
  const BadgesTab = (
    <Card variant="glass" padding="lg">
      <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400 mb-6">
        🏅 Badges & Succès
      </h3>

      {badges.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="bg-dark-800/50 border border-violet-500/30 rounded-lg p-4 text-center hover:border-violet-400 transition-all"
            >
              <div className="text-4xl mb-2">{badge.icon}</div>
              <h4 className="font-display text-white text-sm mb-1">{badge.name}</h4>
              <p className="text-xs text-gray-500">{badge.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">
          Aucun badge débloqué pour le moment. Participez à des tournois pour en gagner !
        </p>
      )}

      <div className="mt-6 text-center">
        <p className="text-gray-500 text-sm">
          Continuez à jouer pour débloquer plus de badges !
        </p>
      </div>
    </Card>
  );

  // ========================================
  // ONGLET 5 - COMPTES GAMING
  // ========================================
  const GamingAccountsTab = (
    <Card variant="glass" padding="lg">
      <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-6">
        🎮 Comptes Gaming Liés
      </h3>

      <div className="space-y-4">
        <Input
          label="Riot ID (LoL, Valorant)"
          value={gamingAccounts.riotId}
          onChange={(e) => setGamingAccounts({ ...gamingAccounts, riotId: e.target.value })}
          placeholder="GameName#TAG"
        />

        <Input
          label="Steam ID"
          value={gamingAccounts.steamId}
          onChange={(e) => setGamingAccounts({ ...gamingAccounts, steamId: e.target.value })}
          placeholder="Votre ID Steam..."
        />

        <Input
          label="Epic Games ID"
          value={gamingAccounts.epicGamesId}
          onChange={(e) => setGamingAccounts({ ...gamingAccounts, epicGamesId: e.target.value })}
          placeholder="Votre Epic Games ID..."
        />

        <Input
          label="Battle.net ID"
          value={gamingAccounts.battleNetId}
          onChange={(e) => setGamingAccounts({ ...gamingAccounts, battleNetId: e.target.value })}
          placeholder="User#1234"
        />

        <GradientButton onClick={handleSaveGamingAccounts}>
          💾 Sauvegarder les comptes
        </GradientButton>
      </div>
    </Card>
  );

  // ========================================
  // ONGLET 6 - PARAMÈTRES
  // ========================================
  const SettingsTab = (
    <div className="space-y-6">
      <Card variant="glass" padding="lg">
        <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
          ⚙️ Paramètres du Compte
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">ID Utilisateur</label>
            <p className="text-white font-mono text-sm">{convexUser?._id || 'Non disponible'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Rôle</label>
            <p className="text-white">{role === 'organizer' ? '⭐ Organisateur' : '🎮 Joueur'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Inscrit le</label>
            <p className="text-white">
              {convexUser?.createdAt
                ? new Date(convexUser.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })
                : 'Non disponible'
              }
            </p>
          </div>
        </div>
      </Card>

      <Card variant="outlined" padding="lg" className="border-violet-500/30">
        <h3 className="font-display text-xl text-violet-400 mb-4">
          🔐 Données Personnelles & Confidentialité
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Gérez vos données, exportez vos informations ou supprimez votre compte
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/profile/privacy')}
        >
          ⚙️ Gérer mes données
        </Button>
      </Card>

      <Card variant="outlined" padding="lg" className="border-red-500/30">
        <h3 className="font-display text-xl text-red-400 mb-4">
          🚪 Déconnexion
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Vous serez déconnecté de votre compte
        </p>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
        >
          Se déconnecter
        </Button>
      </Card>
    </div>
  );

  // Configuration des tabs
  const tabs = [
    {
      id: 'overview',
      label: 'Vue d\'ensemble',
      icon: '👤',
      content: OverviewTab,
    },
    {
      id: 'stats',
      label: 'Statistiques',
      icon: '📊',
      badge: stats.totalMatches || 0,
      content: StatsTab,
    },
    {
      id: 'teams',
      label: 'Mes Équipes',
      icon: '👥',
      badge: teams.length || 0,
      content: TeamsTab,
    },
    {
      id: 'achievements',
      label: 'Succès',
      icon: '🏅',
      content: BadgesTab,
    },
    {
      id: 'gaming-accounts',
      label: 'Comptes Gaming',
      icon: '🎮',
      content: GamingAccountsTab,
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: '⚙️',
      content: SettingsTab,
    },
  ];

  return (
    <DashboardLayout>
      {/* HEADER PROFILE */}
      <Card variant="glass" padding="lg" className="mb-8 border-violet-500/30">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Avatar
            src={avatarUrl}
            name={displayUsername}
            size="2xl"
            status="online"
          />
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-display text-3xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-1">
              {displayUsername}
            </h1>
            {displayBio && (
              <p className="text-gray-400 text-sm mb-3">
                {displayBio}
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant="primary" size="sm">
                {role === 'organizer' ? '⭐ Organisateur' : '👤 Joueur'}
              </Badge>
              {stats.tournamentsPlayed > 0 && (
                <Badge variant="success" size="sm">
                  🏆 {stats.tournamentsPlayed} Tournois
                </Badge>
              )}
              {parseFloat(stats.winRate) > 50 && (
                <Badge variant="warning" size="sm">
                  🔥 {stats.winRate}% Win Rate
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
