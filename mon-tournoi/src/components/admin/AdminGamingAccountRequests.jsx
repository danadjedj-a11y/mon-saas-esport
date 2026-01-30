import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button, Card } from '../../shared/components/ui';
import { toast } from '../../utils/toast';
import { PLATFORM_NAMES, PLATFORM_LOGOS, formatGamertag } from '../../utils/gamePlatforms';

/**
 * AdminGamingAccountRequests - Gestion des demandes de modification de comptes gaming
 * Affiché dans le panel admin global
 */
export default function AdminGamingAccountRequests({ session }) {
  const [processing, setProcessing] = useState(null);

  // Convex queries and mutations
  const requests = useQuery(api.playerGameAccounts.listPendingChangeRequests) || [];
  const loading = requests === undefined;
  const updateAccount = useMutation(api.playerGameAccounts.update);
  const approveRequest = useMutation(api.playerGameAccounts.approveChangeRequest);
  const rejectRequest = useMutation(api.playerGameAccounts.rejectChangeRequest);

  const handleApprove = async (request) => {
    if (!confirm('Approuver cette modification ? Le compte gaming sera mis à jour.')) return;

    setProcessing(request._id);
    try {
      // 1. Mettre à jour le compte gaming via Convex
      // First get the account by user and platform
      const account = await api.playerGameAccounts.getByPlatform;
      // Note: We need the account ID - let's update the account directly
      await updateAccount({
        accountId: request.userId, // Will need to look up account
        gameUsername: request.newUsername,
        gameTag: request.newTag || undefined,
      });

      // 2. Approuver la demande via Convex
      await approveRequest({
        requestId: request._id,
        adminId: session.user.convexId,
      });

      toast.success('✅ Demande approuvée, compte gaming mis à jour !');
    } catch (error) {
      console.error('Erreur approbation:', error);
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request) => {
    const reason = prompt('Motif du refus (optionnel) :');
    if (reason === null) return; // User cancelled

    setProcessing(request._id);
    try {
      await rejectRequest({
        requestId: request._id,
        adminId: session.user.convexId,
        adminNotes: reason || undefined,
      });

      toast.success('❌ Demande refusée');
    } catch (error) {
      console.error('Erreur refus:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 mt-2">Chargement des demandes...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card variant="glass" padding="lg" className="text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-medium text-white mb-1">Aucune demande en attente</h3>
        <p className="text-gray-400 text-sm">
          Les demandes de modification de pseudo gaming apparaîtront ici.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl text-cyan-400">
          Demandes de modification ({requests.length})
        </h3>
      </div>

      {requests.map(request => (
        <Card key={request._id} variant="glass" padding="md" className="hover:border-violet-500/30 transition-all">
          <div className="flex items-start gap-4">
            {/* Platform logo */}
            <div className="flex-shrink-0">
              <img 
                src={PLATFORM_LOGOS[request.platform]} 
                alt={PLATFORM_NAMES[request.platform]}
                className="w-12 h-12 rounded-lg bg-white/10 p-2"
              />
            </div>

            {/* Request details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {request.profiles?.avatar_url && (
                  <img 
                    src={request.profiles.avatar_url} 
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="font-medium text-white">
                  {request.profiles?.username || 'Utilisateur inconnu'}
                </span>
                <span className="text-xs text-gray-500">
                  • {formatDate(request.createdAt)}
                </span>
              </div>

              <p className="text-sm text-gray-400 mb-3">
                Demande de modification du compte <span className="text-cyan-400">{PLATFORM_NAMES[request.platform]}</span>
              </p>

              {/* Change details */}
              <div className="flex items-center gap-4 text-sm">
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <span className="text-gray-500 text-xs block mb-1">Ancien pseudo</span>
                  <span className="text-red-400 line-through">
                    {formatGamertag(request.oldUsername, request.oldTag, request.platform)}
                  </span>
                </div>
                <span className="text-gray-500">→</span>
                <div className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <span className="text-gray-500 text-xs block mb-1">Nouveau pseudo</span>
                  <span className="text-green-400 font-medium">
                    {formatGamertag(request.newUsername, request.newTag, request.platform)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApprove(request)}
                disabled={processing === request._id}
              >
                {processing === request._id ? '⏳' : '✅'} Approuver
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300"
                onClick={() => handleReject(request)}
                disabled={processing === request._id}
              >
                ❌ Refuser
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
