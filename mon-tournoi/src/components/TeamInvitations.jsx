/**
 * TEAM INVITATIONS - Version Convex
 * 
 * Composant pour afficher les invitations d'équipe reçues
 * Utilise Convex au lieu de Supabase
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, Button, Avatar, Badge } from '../shared/components/ui';
import { toast } from '../utils/toast';

const TeamInvitations = ({ userId }) => {
  const [processingId, setProcessingId] = useState(null);

  // Récupération des invitations via Convex (temps réel)
  const invitations = useQuery(
    api.teams.listInvitations,
    userId ? { userId, status: "pending" } : "skip"
  );

  // Mutations Convex
  const acceptInvitation = useMutation(api.teamsMutations.acceptInvitation);
  const declineInvitation = useMutation(api.teamsMutations.declineInvitation);

  const handleAccept = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      await acceptInvitation({ invitationId });
      toast.success('✅ Invitation acceptée ! Vous faites maintenant partie de l\'équipe.');
    } catch (error) {
      console.error('Erreur acceptation invitation:', error);
      toast.error('Erreur lors de l\'acceptation de l\'invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      await declineInvitation({ invitationId });
      toast.success('Invitation refusée');
    } catch (error) {
      console.error('Erreur refus invitation:', error);
      toast.error('Erreur lors du refus de l\'invitation');
    } finally {
      setProcessingId(null);
    }
  };

  // Chargement
  if (invitations === undefined) {
    return (
      <Card variant="glass" padding="lg">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent mx-auto mb-3" />
          <p className="text-gray-400 font-body">Chargement des invitations...</p>
        </div>
      </Card>
    );
  }

  // Pas d'invitations
  if (!invitations || invitations.length === 0) {
    return null; // Ne pas afficher de carte vide sur le dashboard
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl text-cyan-400 mb-4">
        📬 Invitations en attente ({invitations.length})
      </h3>

      {invitations.map((invitation) => (
        <Card
          key={invitation._id}
          variant="glass"
          padding="lg"
          className="border-violet-500/30"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Informations de l'équipe */}
            <div className="flex items-center gap-4 flex-1">
              <Avatar
                src={invitation.team?.logoUrl}
                name={invitation.team?.name || 'Équipe'}
                size="lg"
              />
              <div className="flex-1">
                <h4 className="font-display text-lg text-cyan-400 mb-1">
                  {invitation.team?.name}
                </h4>
                <p className="text-sm text-gray-400 font-body mb-2">
                  [{invitation.team?.tag}]
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <Avatar
                    src={invitation.inviter?.avatarUrl}
                    name={invitation.inviter?.username || 'Joueur'}
                    size="xs"
                  />
                  <p className="text-xs text-gray-300 font-body">
                    Invité par <span className="text-cyan-400">{invitation.inviter?.username}</span>
                  </p>
                </div>
                {invitation.message && (
                  <div className="bg-black/30 rounded p-2 mt-2">
                    <p className="text-sm text-gray-200 font-body italic">
                      "{invitation.message}"
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 font-body mt-2">
                  {new Date(invitation._creationTime).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 md:flex-col">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAccept(invitation._id)}
                disabled={processingId !== null}
                loading={processingId === invitation._id}
                fullWidth
              >
                ✓ Accepter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDecline(invitation._id)}
                disabled={processingId !== null}
                fullWidth
              >
                ✕ Refuser
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default TeamInvitations;
