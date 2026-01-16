import React, { useState, useEffect } from 'react';
import { Card, Button, Avatar, Badge } from '../shared/components/ui';
import { getUserInvitations, acceptInvitation, declineInvitation } from '../shared/services/api/teams';
import { toast } from '../utils/toast';

/**
 * Composant pour afficher les invitations d'équipe reçues
 * - Liste des invitations en attente
 * - Boutons Accepter/Refuser
 * - Mise à jour automatique après action
 */
const TeamInvitations = ({ userId, onUpdate }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (userId) {
      loadInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await getUserInvitations(userId);
      setInvitations(data);
    } catch (error) {
      console.error('Erreur chargement invitations:', error);
      toast.error('Erreur lors du chargement des invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      await acceptInvitation(invitationId);
      toast.success('✅ Invitation acceptée ! Vous faites maintenant partie de l\'équipe.');
      
      // Recharger les invitations
      await loadInvitations();
      
      // Notifier le parent pour rafraîchir les données
      if (onUpdate) {
        onUpdate();
      }
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
      await declineInvitation(invitationId);
      toast.success('Invitation refusée');
      
      // Recharger les invitations
      await loadInvitations();
    } catch (error) {
      console.error('Erreur refus invitation:', error);
      toast.error('Erreur lors du refus de l\'invitation');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card variant="glass" padding="lg">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-fluky-secondary border-t-transparent mx-auto mb-3" />
          <p className="text-fluky-text/60 font-body">Chargement des invitations...</p>
        </div>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card variant="outlined" padding="lg">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📬</div>
          <h3 className="font-display text-xl text-fluky-text/70 mb-2">
            Aucune invitation
          </h3>
          <p className="text-fluky-text/60 font-body text-sm">
            Vous n'avez pas d'invitation d'équipe en attente
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {invitations.map((invitation) => (
        <Card
          key={invitation.id}
          variant="glass"
          padding="lg"
          className="border-fluky-primary/30"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Informations de l'équipe */}
            <div className="flex items-center gap-4 flex-1">
              <Avatar
                src={invitation.team?.logo_url}
                name={invitation.team?.name || 'Équipe'}
                size="lg"
              />
              <div className="flex-1">
                <h4 className="font-display text-lg text-fluky-secondary mb-1">
                  {invitation.team?.name}
                </h4>
                <p className="text-sm text-fluky-text/60 font-body mb-2">
                  [{invitation.team?.tag}]
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <Avatar
                    src={invitation.invited_by_user?.avatar_url}
                    name={invitation.invited_by_user?.username || 'Joueur'}
                    size="xs"
                  />
                  <p className="text-xs text-fluky-text/70 font-body">
                    Invité par <span className="text-fluky-secondary">{invitation.invited_by_user?.username}</span>
                  </p>
                </div>
                {invitation.message && (
                  <div className="bg-black/30 rounded p-2 mt-2">
                    <p className="text-sm text-fluky-text/80 font-body italic">
                      "{invitation.message}"
                    </p>
                  </div>
                )}
                <p className="text-xs text-fluky-text/50 font-body mt-2">
                  {new Date(invitation.created_at).toLocaleDateString('fr-FR', {
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
                onClick={() => handleAccept(invitation.id)}
                disabled={processingId !== null}
                loading={processingId === invitation.id}
                fullWidth
              >
                ✓ Accepter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDecline(invitation.id)}
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
