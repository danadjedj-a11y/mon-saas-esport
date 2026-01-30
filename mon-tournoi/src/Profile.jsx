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
import { Camera, Loader2, ExternalLink, CheckCircle, AlertCircle, Link2, Shield, Search, ChevronDown, ChevronUp, Trophy, Target, Swords, TrendingUp } from 'lucide-react';
import { verifyValorantAccount, verifyLoLAccount, VALORANT_TIERS, LOL_TIERS } from './services/riotVerification';

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

  // États pour la vérification Riot
  const [verifyingValorant, setVerifyingValorant] = useState(false);
  const [verifyingLoL, setVerifyingLoL] = useState(false);
  const [valorantData, setValorantData] = useState(null);
  const [lolData, setLoLData] = useState(null);
  const [valorantExpanded, setValorantExpanded] = useState(false);
  const [lolExpanded, setLoLExpanded] = useState(false);
  
  // États pour les inputs des jeux
  const [valorantInput, setValorantInput] = useState('');
  const [lolInput, setLoLInput] = useState('');
  const [valorantRegion, setValorantRegion] = useState('eu');
  const [lolRegion, setLoLRegion] = useState('euw');

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

  // Vérifier un compte Valorant
  const handleVerifyValorant = async () => {
    const riotId = valorantInput?.trim() || gamingAccounts.riotId?.trim();
    
    if (!riotId || !riotId.includes('#')) {
      toast.error('Format invalide. Utilisez: GameName#TAG');
      return;
    }
    
    setVerifyingValorant(true);
    
    try {
      const result = await verifyValorantAccount(riotId, valorantRegion);
      console.log('Valorant verification result:', result);
      
      if (result.success) {
        setValorantData(result.account);
        setValorantExpanded(true);
        setGamingAccounts(prev => ({ ...prev, riotId: `${result.account.name}#${result.account.tag}` }));
        toast.success(`✅ Valorant vérifié : ${result.account.name}#${result.account.tag}`);
        
        // Sauvegarder automatiquement
        await saveGamingAccount('valorant', result.account);
      }
    } catch (error) {
      console.error('Valorant verification failed:', error);
      toast.error(error.message || 'Erreur de vérification');
    } finally {
      setVerifyingValorant(false);
    }
  };

  // Vérifier un compte LoL
  const handleVerifyLoL = async () => {
    const riotId = lolInput?.trim() || gamingAccounts.riotId?.trim();
    
    if (!riotId || !riotId.includes('#')) {
      toast.error('Format invalide. Utilisez: GameName#TAG');
      return;
    }
    
    setVerifyingLoL(true);
    
    try {
      const result = await verifyLoLAccount(riotId, lolRegion);
      console.log('LoL verification result:', result);
      
      if (result.success) {
        setLoLData(result.account);
        setLoLExpanded(true);
        toast.success(`✅ League of Legends vérifié : ${result.account.name}#${result.account.tag}`);
        
        // Sauvegarder automatiquement
        await saveGamingAccount('lol', result.account);
      }
    } catch (error) {
      console.error('LoL verification failed:', error);
      toast.error(error.message || 'Erreur de vérification');
    } finally {
      setVerifyingLoL(false);
    }
  };

  // Sauvegarder un compte gaming dans Convex
  const saveGamingAccount = async (game, accountData) => {
    try {
      const newAccounts = { ...gamingAccounts };
      if (game === 'valorant') {
        newAccounts.valorantData = accountData;
        newAccounts.riotId = `${accountData.name}#${accountData.tag}`;
      } else if (game === 'lol') {
        newAccounts.lolData = accountData;
      }
      
      await updateProfile({
        clerkUserId: clerkUser.id,
        gamingAccounts: newAccounts
      });
    } catch (error) {
      console.error('Failed to save gaming account:', error);
    }
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
        const ga = convexUser.gamingAccounts;
        setGamingAccounts({
          discordId: ga.discordId || clerkDiscord || '',
          riotId: ga.riotId || '',
          steamId: ga.steamId || '',
          epicGamesId: ga.epicGamesId || '',
          battleNetId: ga.battleNetId || '',
          valorantData: ga.valorantData || null,
          lolData: ga.lolData || null,
        });
        
        // Charger les données sauvegardées
        if (ga.valorantData) {
          setValorantData(ga.valorantData);
          setValorantInput(ga.riotId || '');
        }
        if (ga.lolData) {
          setLoLData(ga.lolData);
          setLoLInput(ga.riotId || '');
        }
        if (ga.riotId) {
          setValorantInput(ga.riotId);
          setLoLInput(ga.riotId);
        }
      } else if (clerkDiscord) {
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
      {/* Discord OAuth */}
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
            <p className="text-sm text-gray-400 mb-4">Communication & Communauté</p>
            
            {isDiscordConnected() ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <DiscordIcon />
                <div>
                  <p className="text-white font-medium">{getDiscordFromClerk()}</p>
                  <p className="text-xs text-gray-500">Compte Discord lié</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleConnectDiscord}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium transition-colors"
              >
                <DiscordIcon />
                Connecter Discord
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* VALORANT */}
      <Card variant="glass" padding="lg" className="border border-red-500/30">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => valorantData && setValorantExpanded(!valorantExpanded)}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-2xl flex-shrink-0">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display text-xl text-white">VALORANT</h3>
                {valorantData && (
                  <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Vérifié
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {valorantData ? `${valorantData.name}#${valorantData.tag}` : 'FPS tactique par Riot Games'}
              </p>
            </div>
          </div>
          {valorantData && (
            <div className="flex items-center gap-2">
              {valorantData.currentRank && (
                <span className="text-sm font-medium" style={{ color: VALORANT_TIERS[valorantData.currentRank]?.color || '#fff' }}>
                  {VALORANT_TIERS[valorantData.currentRank]?.icon} {valorantData.currentRank}
                </span>
              )}
              {valorantExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          )}
        </div>

        {/* Input pour vérifier */}
        {!valorantData && (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={valorantInput}
              onChange={(e) => setValorantInput(e.target.value)}
              placeholder="GameName#TAG"
              className="flex-1 px-3 py-2 rounded-lg bg-dark-800/50 border border-white/10 text-white placeholder-gray-500 text-sm focus:border-red-500"
            />
            <select
              value={valorantRegion}
              onChange={(e) => setValorantRegion(e.target.value)}
              className="px-3 py-2 rounded-lg bg-dark-800/50 border border-white/10 text-white text-sm"
            >
              <option value="eu">EU</option>
              <option value="na">NA</option>
              <option value="ap">AP</option>
              <option value="kr">KR</option>
              <option value="br">BR</option>
            </select>
            <button
              onClick={handleVerifyValorant}
              disabled={verifyingValorant || !valorantInput}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {verifyingValorant ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Vérifier
            </button>
          </div>
        )}

        {/* Détails Valorant expandés */}
        {valorantData && valorantExpanded && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
            {/* Infos compte */}
            <div className="flex items-center gap-4">
              {valorantData.card && (
                <img src={valorantData.card} alt="Card" className="w-16 h-16 rounded-lg" />
              )}
              <div>
                <p className="text-xl font-bold text-white">{valorantData.name}#{valorantData.tag}</p>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  {valorantData.accountLevel && (
                    <span>Niveau <span className="text-cyan-400 font-semibold">{valorantData.accountLevel}</span></span>
                  )}
                  <span>Région <span className="text-cyan-400">{valorantData.region?.toUpperCase()}</span></span>
                </div>
              </div>
            </div>

            {/* Rang actuel */}
            {valorantData.currentRank && (
              <div className="p-4 rounded-lg bg-dark-800/50">
                <div className="flex items-center gap-4">
                  {valorantData.rankImage && (
                    <img src={valorantData.rankImage} alt={valorantData.currentRank} className="w-16 h-16" />
                  )}
                  <div className="flex-1">
                    <p className="text-2xl font-bold" style={{ color: VALORANT_TIERS[valorantData.currentRank]?.color || '#fff' }}>
                      {VALORANT_TIERS[valorantData.currentRank]?.icon} {valorantData.currentRank}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-gray-400">{valorantData.rankingInTier} <span className="text-xs">RR</span></span>
                      {valorantData.elo && <span className="text-gray-400">{valorantData.elo} <span className="text-xs">ELO</span></span>}
                      {valorantData.mmrChange !== null && valorantData.mmrChange !== undefined && (
                        <span className={valorantData.mmrChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {valorantData.mmrChange >= 0 ? '+' : ''}{valorantData.mmrChange}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {valorantData.highestRank && (
                  <p className="mt-3 text-sm text-gray-500">
                    <Trophy className="w-4 h-4 inline text-yellow-400 mr-1" />
                    Plus haut rang: <span className="text-yellow-400 font-medium">{valorantData.highestRank}</span>
                    {valorantData.highestRankSeason && <span className="text-gray-600 ml-1">({valorantData.highestRankSeason})</span>}
                  </p>
                )}
              </div>
            )}

            {/* Stats */}
            {valorantData.stats && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Stats récentes ({valorantData.stats.matches} matchs - {valorantData.stats.matchType || 'All modes'})
                </p>
                
                {/* Stats principales */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-xl sm:text-2xl font-bold text-white">{valorantData.stats.kills}</p>
                    <p className="text-xs text-gray-500">Kills</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-xl sm:text-2xl font-bold text-white">{valorantData.stats.deaths}</p>
                    <p className="text-xs text-gray-500">Deaths</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-xl sm:text-2xl font-bold text-white">{valorantData.stats.assists}</p>
                    <p className="text-xs text-gray-500">Assists</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-xl sm:text-2xl font-bold text-cyan-400">{valorantData.stats.kd}</p>
                    <p className="text-xs text-gray-500">K/D</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-xl sm:text-2xl font-bold text-green-400">{valorantData.stats.winRate}%</p>
                    <p className="text-xs text-gray-500">Win Rate</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-xl sm:text-2xl font-bold text-red-400">{valorantData.stats.headshotPct}%</p>
                    <p className="text-xs text-gray-500">Headshot</p>
                  </div>
                </div>

                {/* Stats moyennes */}
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-400">
                    📊 Moyenne: <span className="text-cyan-400">{valorantData.stats.avgKills}</span> K / <span className="text-red-400">{valorantData.stats.avgDeaths}</span> D
                  </span>
                  <span className="text-gray-400">
                    W/L: <span className="text-green-400">{valorantData.stats.wins}</span>/<span className="text-red-400">{valorantData.stats.losses}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Agents favoris */}
            {valorantData.recentAgents && valorantData.recentAgents.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">🎭 Agents favoris</p>
                <div className="flex gap-2 flex-wrap">
                  {valorantData.recentAgents.map((a, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
                      {a.agent} <span className="text-red-300/60">({a.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Maps */}
            {valorantData.recentMaps && valorantData.recentMaps.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">🗺️ Maps récentes</p>
                <div className="flex gap-2 flex-wrap">
                  {valorantData.recentMaps.map((m, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-gray-700/50 text-gray-300 text-sm">
                      {m.map} <span className="text-gray-500">({m.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bouton pour modifier */}
            <button
              onClick={() => {
                setValorantData(null);
                setValorantInput('');
              }}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Changer de compte
            </button>
          </div>
        )}
      </Card>

      {/* LEAGUE OF LEGENDS */}
      <Card variant="glass" padding="lg" className="border border-yellow-500/30">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => lolData && setLoLExpanded(!lolExpanded)}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-2xl flex-shrink-0">
              ⚔️
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display text-xl text-white">League of Legends</h3>
                {lolData && (
                  <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Vérifié
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {lolData ? `${lolData.name}#${lolData.tag}` : 'MOBA par Riot Games'}
              </p>
            </div>
          </div>
          {lolData && (
            <div className="flex items-center gap-2">
              {lolData.soloRank && lolData.soloRank !== 'Unranked' && (
                <span className="text-sm font-medium text-yellow-400">
                  🏆 {lolData.soloRank}
                </span>
              )}
              {lolExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          )}
        </div>

        {/* Input pour vérifier */}
        {!lolData && (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={lolInput}
              onChange={(e) => setLoLInput(e.target.value)}
              placeholder="GameName#TAG"
              className="flex-1 px-3 py-2 rounded-lg bg-dark-800/50 border border-white/10 text-white placeholder-gray-500 text-sm focus:border-yellow-500"
            />
            <select
              value={lolRegion}
              onChange={(e) => setLoLRegion(e.target.value)}
              className="px-3 py-2 rounded-lg bg-dark-800/50 border border-white/10 text-white text-sm"
            >
              <option value="euw">EUW</option>
              <option value="eune">EUNE</option>
              <option value="na">NA</option>
              <option value="kr">KR</option>
              <option value="br">BR</option>
              <option value="jp">JP</option>
            </select>
            <button
              onClick={handleVerifyLoL}
              disabled={verifyingLoL || !lolInput}
              className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-medium text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {verifyingLoL ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Vérifier
            </button>
          </div>
        )}

        {/* Détails LoL expandés */}
        {lolData && lolExpanded && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
            {/* Infos compte */}
            <div className="flex items-center gap-4">
              {lolData.profileIcon && (
                <img src={lolData.profileIcon} alt="Icon" className="w-16 h-16 rounded-lg" />
              )}
              <div>
                <p className="text-xl font-bold text-white">{lolData.name}#{lolData.tag}</p>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  {lolData.summonerLevel && (
                    <span>Niveau <span className="text-yellow-400 font-semibold">{lolData.summonerLevel}</span></span>
                  )}
                  <span>Région <span className="text-yellow-400">{lolData.region?.toUpperCase()}</span></span>
                </div>
              </div>
            </div>

            {/* Rangs */}
            <div className="grid grid-cols-2 gap-4">
              {/* Solo/Duo */}
              <div className="p-4 rounded-lg bg-dark-800/50">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Swords className="w-3 h-3" /> Solo/Duo
                </p>
                {lolData.soloRank && lolData.soloRank !== 'Unranked' ? (
                  <>
                    <p className="text-xl font-bold text-yellow-400">{lolData.soloRank}</p>
                    <p className="text-sm text-gray-400">{lolData.soloLP} LP</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {lolData.soloWins}W / {lolData.soloLosses}L
                      {lolData.soloWinrate && <span className="text-green-400 ml-2">{lolData.soloWinrate}%</span>}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">Unranked</p>
                )}
              </div>

              {/* Flex */}
              <div className="p-4 rounded-lg bg-dark-800/50">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Flex
                </p>
                {lolData.flexRank && lolData.flexRank !== 'Unranked' ? (
                  <>
                    <p className="text-xl font-bold text-blue-400">{lolData.flexRank}</p>
                    <p className="text-sm text-gray-400">{lolData.flexLP} LP</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {lolData.flexWins}W / {lolData.flexLosses}L
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">Unranked</p>
                )}
              </div>
            </div>

            {/* Stats */}
            {lolData.stats && (
              <div>
                <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Stats récentes ({lolData.stats.matches} matchs)
                </p>
                <div className="grid grid-cols-5 gap-2">
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-2xl font-bold text-white">{lolData.stats.kills}</p>
                    <p className="text-xs text-gray-500">Kills</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-2xl font-bold text-white">{lolData.stats.deaths}</p>
                    <p className="text-xs text-gray-500">Deaths</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-2xl font-bold text-white">{lolData.stats.assists}</p>
                    <p className="text-xs text-gray-500">Assists</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-2xl font-bold text-yellow-400">{lolData.stats.kda}</p>
                    <p className="text-xs text-gray-500">KDA</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-dark-800/50">
                    <p className="text-2xl font-bold text-green-400">{lolData.stats.winRate}%</p>
                    <p className="text-xs text-gray-500">Win Rate</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bouton pour modifier */}
            <button
              onClick={() => {
                setLoLData(null);
                setLoLInput('');
              }}
              className="text-sm text-yellow-400 hover:text-yellow-300"
            >
              Changer de compte
            </button>
          </div>
        )}
      </Card>

      {/* Autres comptes gaming */}
      <Card variant="glass" padding="lg">
        <h3 className="font-display text-xl text-white mb-4">Autres comptes</h3>
        <div className="space-y-4">
          {GAMING_PLATFORMS.filter(p => p.id !== 'discordId' && p.id !== 'riotId').map((platform) => (
            <div key={platform.id} className="flex gap-3 items-center">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center text-xl`}>
                {platform.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">{platform.name}</p>
                <input
                  type="text"
                  value={gamingAccounts[platform.id] || ''}
                  onChange={(e) => setGamingAccounts({ ...gamingAccounts, [platform.id]: e.target.value })}
                  placeholder={platform.placeholder}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-dark-800/50 border border-white/10 text-white placeholder-gray-500 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <GradientButton 
            onClick={handleSaveGamingAccounts}
            disabled={savingGaming}
            size="sm"
          >
            {savingGaming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sauvegarder
          </GradientButton>
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
