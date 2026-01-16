import React, { useState, useEffect } from 'react';
import { Button, Card, Input } from '../shared/components/ui';
import { toast } from '../utils/toast';
import {
  getUserGamingAccounts,
  addGamingAccount,
  updateGamingAccount,
  deleteGamingAccount,
} from '../shared/services/api/gamingAccounts';
import {
  PLATFORM_NAMES,
  PLATFORM_LOGOS,
  PLATFORM_GAMES,
  platformRequiresTag,
  formatGamertag,
} from '../utils/gamePlatforms';

export default function GamingAccountsSection({ session }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [formData, setFormData] = useState({ username: '', tag: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      loadAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await getUserGamingAccounts(session.user.id);
      setAccounts(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des comptes gaming');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (platform) => {
    const existingAccount = accounts.find(acc => acc.platform === platform);
    if (existingAccount) {
      setFormData({
        username: existingAccount.game_username || '',
        tag: existingAccount.game_tag || '',
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
      
      if (existingAccount) {
        // Update existing
        await updateGamingAccount(
          existingAccount.id,
          formData.username,
          formData.tag || null
        );
        toast.success('✅ Compte mis à jour avec succès !');
      } else {
        // Add new
        await addGamingAccount(
          session.user.id,
          editingPlatform,
          formData.username,
          formData.tag || null
        );
        toast.success('✅ Compte ajouté avec succès !');
      }

      await loadAccounts();
      handleCancel();
    } catch (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
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
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce compte ${PLATFORM_NAMES[platform]} ?`)) {
      return;
    }

    try {
      await deleteGamingAccount(accountId);
      toast.success('✅ Compte supprimé avec succès !');
      await loadAccounts();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    }
  };

  const renderPlatformCard = (platform) => {
    const account = accounts.find(acc => acc.platform === platform);
    const isEditing = editingPlatform === platform;

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
                    {formatGamertag(account.game_username, account.game_tag, platform)}
                  </span>
                </div>
              )}

              {/* Edit Form */}
              {isEditing && (
                <div className="mt-3 space-y-2">
                  <Input
                    placeholder="Nom d'utilisateur"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="text-sm"
                  />
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
                      disabled={saving}
                    >
                      {saving ? '💾 Enregistrement...' : '💾 Enregistrer'}
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
                  onClick={() => handleDelete(account.id, platform)}
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
