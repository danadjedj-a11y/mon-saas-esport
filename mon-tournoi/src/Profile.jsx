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

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button, Card, Badge, Tabs, Avatar, Input, GradientButton } from './shared/components/ui';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import { Camera, Loader2, ExternalLink, CheckCircle, AlertCircle, Link2 } from 'lucide-react';

// Icône Discord SVG
const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

// Fonction pour compresser une image avant upload
const compressImage = async (file, maxWidth = 400, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionner si nécessaire
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// Icônes pour les plateformes de jeu
const GAMING_PLATFORMS = [
  { 
    id: 'discordId', 
    name: 'Discord', 
    icon: '💬',
    placeholder: 'username ou User#0000',
    games: 'Communication, Communauté',
    color: 'from-indigo-500 to-indigo-600',
    verifyUrl: 'https://discord.com/'
  },
  { 
    id: 'riotId', 
    name: 'Riot Games', 
    icon: '🎮',
    placeholder: 'GameName#TAG',
    games: 'Valorant, League of Legends, TFT',
    color: 'from-red-500 to-red-600',
    verifyUrl: 'https://developer.riotgames.com/'
  },
  { 
    id: 'steamId', 
    name: 'Steam', 
    icon: '🎯',
    placeholder: 'Votre ID Steam ou URL profil',
    games: 'CS2, Dota 2, etc.',
    color: 'from-blue-600 to-blue-700',
    verifyUrl: 'https://steamcommunity.com/'
  },
  { 
    id: 'epicGamesId', 
    name: 'Epic Games', 
    icon: '🚀',
    placeholder: 'Votre Epic Games ID',
    games: 'Fortnite, Rocket League',
    color: 'from-gray-700 to-gray-800',
    verifyUrl: 'https://www.epicgames.com/'
  },
  { 
    id: 'battleNetId', 
    name: 'Battle.net', 
    icon: '⚔️',
    placeholder: 'User#1234',
    games: 'Overwatch 2, WoW, Diablo',
    color: 'from-blue-500 to-indigo-600',
    verifyUrl: 'https://battle.net/'
  },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const fileInputRef = useRef(null);

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
  const generateUploadUrl = useMutation(api.usersMutations.generateUploadUrl);
  const updateAvatar = useMutation(api.usersMutations.updateAvatar);

  // États locaux
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [savingGaming, setSavingGaming] = useState(false);
  const [connectingDiscord, setConnectingDiscord] = useState(false);

  // Gaming accounts state
  const [gamingAccounts, setGamingAccounts] = useState({
    discordId: '',
    riotId: '',
    steamId: '',
    epicGamesId: '',
    battleNetId: '',
  });

  // Récupérer le Discord ID depuis Clerk si connecté via Discord
  const getDiscordFromClerk = () => {
    if (!clerkUser) return null;
    // Chercher dans les comptes externes
    const discordAccount = clerkUser.externalAccounts?.find(
      account => account.provider === 'discord' || account.provider === 'oauth_discord'
    );
    if (discordAccount) {
      return discordAccount.username || discordAccount.externalId;
    }
    return null;
  };

  // Vérifier si Discord est déjà connecté via Clerk
  const isDiscordConnected = () => {
    if (!clerkUser) return false;
    return clerkUser.externalAccounts?.some(
      account => account.provider === 'discord' || account.provider === 'oauth_discord'
    );
  };

  // Connecter Discord via Clerk OAuth
  const handleConnectDiscord = () => {
    // Ouvrir le modal Clerk qui gère la vérification automatiquement
    openUserProfile();
    toast.info('💡 Allez dans "Comptes connectés" pour lier Discord');
  };

  // Déconnecter Discord
  const handleDisconnectDiscord = () => {
    // Ouvrir le modal Clerk pour gérer les connexions
    openUserProfile();
    toast.info('💡 Allez dans "Comptes connectés" pour délier Discord');
  };

  // Sync initial values when data loads
  useEffect(() => {
    if (convexUser) {
      setUsername(convexUser.username || '');
      setBio(convexUser.bio || '');
      setIsPublic(!convexUser.isPrivate);
      
      // Récupérer Discord depuis Clerk si pas déjà défini
      const clerkDiscord = getDiscordFromClerk();
      
      if (convexUser.gamingAccounts) {
        setGamingAccounts({
          discordId: convexUser.gamingAccounts.discordId || clerkDiscord || '',
          riotId: convexUser.gamingAccounts.riotId || '',
          steamId: convexUser.gamingAccounts.steamId || '',
          epicGamesId: convexUser.gamingAccounts.epicGamesId || '',
          battleNetId: convexUser.gamingAccounts.battleNetId || '',
        });
      } else if (clerkDiscord) {
        // Si pas de gaming accounts mais Discord via Clerk
        setGamingAccounts(prev => ({
          ...prev,
          discordId: clerkDiscord
        }));
      }
    }
  }, [convexUser, clerkUser]);

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

  // Upload avatar via Convex Storage
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 10MB');
      return;
    }

    try {
      setUploading(true);
      
      // 1. Compresser l'image (400px max, qualité 80%)
      const compressedFile = await compressImage(file, 400, 0.8);
      console.log(`Image compressée: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);
      
      // 2. Obtenir l'URL d'upload
      const uploadUrl = await generateUploadUrl();
      
      // 3. Upload le fichier compressé
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': compressedFile.type },
        body: compressedFile,
      });
      
      const { storageId } = await result.json();
      
      // 4. Mettre à jour le profil avec le storage ID
      await updateAvatar({ storageId });
      
      toast.success('✅ Avatar mis à jour !');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

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
      setSavingGaming(true);
      await updateProfile({
        gamingAccounts: gamingAccounts,
      });
      toast.success('✅ Comptes gaming mis à jour !');
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setSavingGaming(false);
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
        
        <div className="flex items-center gap-6">
          {/* Avatar preview */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-violet-500/30">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center text-3xl font-bold text-white">
                  {displayUsername.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Upload overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <p className="text-white font-medium mb-1">Photo de profil</p>
            <p className="text-sm text-gray-400 mb-3">
              JPG, PNG ou GIF. Max 5MB.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Upload...' : '📷 Changer l\'avatar'}
            </Button>
          </div>
        </div>
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
    <div className="space-y-6">
      {/* Discord OAuth - Section spéciale */}
      <Card variant="glass" padding="lg" className="border border-indigo-500/30">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <DiscordIcon />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-xl text-white">Discord</h3>
              {isDiscordConnected() && (
                <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Connecté
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Connectez votre compte Discord pour synchroniser automatiquement votre profil
            </p>
            
            {isDiscordConnected() ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                    <DiscordIcon />
                  </div>
                  <div>
                    <p className="text-white font-medium">{getDiscordFromClerk()}</p>
                    <p className="text-xs text-gray-500">Compte Discord lié</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectDiscord}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Déconnecter Discord
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectDiscord}
                disabled={connectingDiscord}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium transition-colors disabled:opacity-50"
              >
                {connectingDiscord ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <DiscordIcon />
                    Connecter avec Discord
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Autres comptes gaming */}
      <Card variant="glass" padding="lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              🎮 Comptes Gaming Liés
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Liez vos comptes pour faciliter la vérification lors des tournois
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {GAMING_PLATFORMS.filter(p => p.id !== 'discordId').map((platform) => (
            <div 
              key={platform.id}
              className="p-4 rounded-xl bg-[rgba(5,5,10,0.5)] border border-white/5 hover:border-violet-500/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                  {platform.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white">{platform.name}</h4>
                    {gamingAccounts[platform.id] && (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{platform.games}</p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gamingAccounts[platform.id]}
                      onChange={(e) => setGamingAccounts({ 
                        ...gamingAccounts, 
                        [platform.id]: e.target.value 
                      })}
                      placeholder={platform.placeholder}
                      className="flex-1 px-3 py-2 rounded-lg bg-[rgba(5,5,10,0.6)] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    />
                    <a
                      href={platform.verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                      title="Trouver mon ID"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <GradientButton 
            onClick={handleSaveGamingAccounts}
            disabled={savingGaming}
            className="w-full sm:w-auto"
          >
            {savingGaming ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde...
              </span>
            ) : (
              '💾 Sauvegarder les comptes'
            )}
          </GradientButton>
        </div>
      </Card>

      {/* Info OAuth */}
      <Card variant="outlined" padding="lg" className="border-cyan-500/30">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <AlertCircle className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h4 className="font-semibold text-cyan-400 mb-1">
              Connexion directe aux plateformes
            </h4>
            <p className="text-sm text-gray-400">
              La connexion OAuth directe avec Riot Games, Steam et autres plateformes sera disponible prochainement. 
              En attendant, entrez manuellement vos identifiants ci-dessus.
            </p>
          </div>
        </div>
      </Card>
    </div>
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
