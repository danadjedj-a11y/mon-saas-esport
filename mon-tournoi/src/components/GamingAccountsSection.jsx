import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button, Card, Input } from '../shared/components/ui';
import { toast } from '../utils/toast';
import {
  PLATFORM_NAMES,
  PLATFORM_LOGOS,
  PLATFORM_GAMES,
  platformRequiresTag,
  formatGamertag,
  getPlatformForGame,
} from '../utils/gamePlatforms';

export default function GamingAccountsSection({ session }) {
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [formData, setFormData] = useState({ username: '', tag: '' });
  const [saving, setSaving] = useState(false);

  // Convex queries and mutations for gaming accounts
  const accounts = useQuery(api.playerGameAccounts.listByUser,
    session?.user?.id ? { userId: session.user.id } : "skip"
  ) || [];
  
  // Get registered tournaments for the user
  const registeredTournaments = useQuery(
    api.tournamentRegistrations.listByUser,
    session?.user?.id ? { userId: session.user.id } : "skip"
  ) || [];
  
  // Get pending account change requests
  const pendingRequests = useQuery(
    api.playerGameAccounts.listPendingRequests,
    session?.user?.id ? { userId: session.user.id } : "skip"
  ) || [];

  const addAccount = useMutation(api.playerGameAccounts.add);
  const updateAccount = useMutation(api.playerGameAccounts.update);
  const removeAccount = useMutation(api.playerGameAccounts.remove);
  const requestAccountChange = useMutation(api.playerGameAccounts.requestChange);
  
  const loading = session?.user?.id && accounts === undefined;

  // Filter active tournaments (not completed or cancelled)
  const activeTournaments = registeredTournaments.filter(
    t => t.tournament && !['completed', 'cancelled'].includes(t.tournament.status)
  ).map(t => t.tournament);

  // Vérifier si une plateforme est utilisée dans un tournoi actif
  const isPlatformUsedInActiveTournament = (platform) => {
    return activeTournaments.some(t => getPlatformForGame(t?.game) === platform);
  };

  // Obtenir les tournois qui utilisent cette plateforme
  const getTournamentsUsingPlatform = (platform) => {
    return activeTournaments.filter(t => getPlatformForGame(t?.game) === platform);
  };

  // Vérifier si une demande de modification est en attente pour cette plateforme
  const hasPendingRequest = (platform) => {
    return pendingRequests.some(r => r.platform === platform);
  };

  const handleEdit = (platform) => {
    const existingAccount = accounts.find(acc => acc.platform === platform);
    if (existingAccount) {
      setFormData({
        username: existingAccount.gameUsername || '',
        tag: existingAccount.gameTag || '',
      });
    } else {
      setFormData({ username: '', tag: '' });
    }
    setEditingPlatform(platform);
  };

  const handleCancel = () => {
    setEditingPlatform(null);
    setFormData({ username: '', tag: '' });
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      toast.error('Le nom d\'utilisateur est requis');
      return;
    }

    if (platformRequiresTag(editingPlatform) && !formData.tag.trim()) {
      toast.error(`Le tag est requis pour ${PLATFORM_NAMES[editingPlatform]}`);
      return;
    }

    setSaving(true);
    try {
      const existingAccount = accounts.find(acc => acc.platform === editingPlatform);
      
      // Vérifier si la modification doit passer par une demande admin
      if (existingAccount && isPlatformUsedInActiveTournament(editingPlatform)) {
        // Créer une demande de modification via Convex
        try {
          await requestAccountChange({
            userId: session.user.id,
            platform: editingPlatform,
            oldUsername: existingAccount.gameUsername,
            oldTag: existingAccount.gameTag,
            newUsername: formData.username,
            newTag: formData.tag || undefined,
          });
          toast.success('📝 Demande de modification envoyée ! Un admin validera votre changement.');
        } catch (error) {
          // If the request mutation doesn't exist, do direct update
          if (error.message?.includes('not found')) {
            await updateAccount({
              accountId: existingAccount._id,
              gameUsername: formData.username,
              gameTag: formData.tag || undefined,
            });
            toast.success('✅ Compte mis à jour avec succès !');
          } else {
            throw error;
          }
        }
      } else if (existingAccount) {
        // Update existing (pas inscrit à un tournoi actif avec ce jeu)
        await updateAccount({
          accountId: existingAccount._id,
          gameUsername: formData.username,
          gameTag: formData.tag || undefined,
        });
        toast.success('✅ Compte mis à jour avec succès !');
      } else {
        // Add new
        await addAccount({
          userId: session.user.id,
          platform: editingPlatform,
          gameUsername: formData.username,
          gameTag: formData.tag || undefined,
        });
        toast.success('✅ Compte ajouté avec succès !');
      }

      handleCancel();
    } catch (error) {
      // Check for unique constraint violation
      if (error.message?.includes('existe déjà')) {
        toast.error('Un compte existe déjà pour cette plateforme');
      } else if (error.message) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accountId, platform) => {
    // Vérifier si la suppression est bloquée par un tournoi actif
    if (isPlatformUsedInActiveTournament(platform)) {
      const tournaments = getTournamentsUsingPlatform(platform);
      toast.error(`Impossible de supprimer ce compte car vous êtes inscrit à : ${tournaments.map(t => t.name).join(', ')}`);
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce compte ${PLATFORM_NAMES[platform]} ?`)) {
      return;
    }

    try {
      await removeAccount({ accountId });?
      toast.success('✅ Compte supprimé avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    }
  };

  const renderPlatformCard = (platform) => {
    const account = accounts.find(acc => acc.platform === platform);
    const isEditing = editingPlatform === platform;
    const isLockedByTournament = account && isPlatformUsedInActiveTournament(platform);
    const tournamentsUsingThis = getTournamentsUsingPlatform(platform);
    const hasRequest = hasPendingRequest(platform);

    return (
      <Card key={platform} variant="glass" padding="md" className="hover:border-violet-500/50 transition-all">
        <div className="flex items-start justify-between gap-4">
          {/* Platform Info */}
          <div className="flex items-center gap-3 flex-1">
            <img 
              src={PLATFORM_LOGOS[platform]} 
              alt={PLATFORM_NAMES[platform]}
              className="w-10 h-10 rounded-lg bg-white/10 p-2"
            />
            <div className="flex-1">
              <h4 className="font-body text-white font-semibold">
                {PLATFORM_NAMES[platform]}
              </h4>
              <p className="text-xs text-gray-400">
                {PLATFORM_GAMES[platform]?.join(', ')}
              </p>
              
              {/* Display existing account */}
              {account && !isEditing && (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-cyan-400 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {formatGamertag(account.gameUsername, account.gameTag, platform)}
                  </span>
                </div>
              )}

              {/* Warning if locked by active tournament */}
              {isLockedByTournament && !isEditing && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-xs">
                    ⚠️ Vous êtes inscrit à un tournoi actif ({tournamentsUsingThis.map(t => t.name).join(', ')}). 
                    La modification nécessite l'approbation d'un administrateur.
                  </p>
                </div>
              )}

              {/* Pending request indicator */}
              {hasRequest && !isEditing && (
                <div className="mt-2 p-2 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                  <p className="text-violet-400 text-xs">?
                    📝 Demande de modification en attente de validation par un admin
                  </p>
                </div>
              )}

              {/* Edit Form */}
              {isEditing && (
                <div className="mt-3 space-y-2">
                  {isLockedByTournament && (
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-2">
                      <p className="text-yellow-400 text-xs">
                        ⚠️ Cette modification sera soumise à validation car vous êtes inscrit au tournoi : {tournamentsUsingThis.map(t => t.name).join(', ')}
                      </p>
                    </div>
                  )}
                  <Input
                    placeholder="Nom d'utilisateur"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="text-sm"
                  />?
                  {platformRequiresTag(platform) && (
                    <Input
                      placeholder="Tag (ex: 1234)"
                      value={formData.tag}
                      onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                      className="text-sm"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || hasRequest}
                    >
                      {saving ? '💾 Enregistrement...' : isLockedByTournament ? '📝 Demander la modification' : '💾 Enregistrer'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(platform)}
              >
                {account ? '✏️ Modifier' : '➕ Ajouter'}
              </Button>
              {account && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(account._id, platform)}
                  className="text-red-400 hover:text-red-300"
                >
                  🗑️
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2 animate-pulse">🎮</div>
        <p className="text-gray-400">Chargement des comptes gaming...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-display text-2xl text-cyan-400 mb-2">
          Comptes Gaming
        </h3>
        <p className="text-gray-300 text-sm">
          Liez vos comptes de jeu pour participer aux tournois. Ces informations seront affichées dans les lobbies de match.
        </p>
      </div>

      {/* Info banner */}
      <Card variant="glass" padding="md" className="bg-violet-500/10 border-violet-500/30">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div className="flex-1 text-sm text-gray-200">
            <p className="font-semibold mb-1">Pourquoi lier mes comptes ?</p>
            <p>
              Pour rejoindre un tournoi VALORANT, vous devez avoir lié votre compte Riot Games. 
              Votre gamertag sera affiché dans le lobby pour faciliter l'organisation des matchs.
            </p>
          </div>
        </div>
      </Card>

      {/* Platform Cards */}
      <div className="grid gap-3">
        {Object.keys(PLATFORM_NAMES).map(platform => renderPlatformCard(platform))}
      </div>
    </div>
  );
}
