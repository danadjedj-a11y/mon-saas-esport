import React, { useState } from 'react';
import { Modal, Button, Avatar, Textarea } from '../shared/components/ui';
import PlayerSearch from './PlayerSearch';

/**
 * Modal d'invitation de joueur dans une équipe
 * - Utilise PlayerSearch pour trouver les joueurs
 * - Champ message optionnel pour l'invitation
 * - Bouton d'envoi
 */
const InvitePlayerModal = ({
  isOpen,
  onClose,
  onInvite,
  excludedUserIds = [],
  loading = false,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [message, setMessage] = useState('');

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player);
  };

  const handleInvite = async () => {
    if (!selectedPlayer) return;
    
    if (onInvite) {
      await onInvite(selectedPlayer.id, message);
    }
    
    // Réinitialiser le formulaire
    setSelectedPlayer(null);
    setMessage('');
  };

  const handleClose = () => {
    setSelectedPlayer(null);
    setMessage('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Inviter un joueur"
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleInvite}
            disabled={!selectedPlayer || loading}
            loading={loading}
          >
            📧 Envoyer l'invitation
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Recherche de joueur */}
        <div>
          <label className="block text-sm font-medium text-fluky-text mb-2">
            Rechercher un joueur <span className="text-red-500">*</span>
          </label>
          <PlayerSearch
            onSelectPlayer={handleSelectPlayer}
            excludedUserIds={excludedUserIds}
            placeholder="Rechercher par pseudonyme..."
          />
        </div>

        {/* Joueur sélectionné */}
        {selectedPlayer && (
          <div className="bg-fluky-primary/10 border border-fluky-primary/30 rounded-lg p-4">
            <p className="text-sm text-fluky-text/60 font-body mb-2">
              Joueur sélectionné :
            </p>
            <div className="flex items-center gap-3">
              <Avatar
                src={selectedPlayer.avatar_url}
                name={selectedPlayer.username || 'Joueur'}
                size="md"
              />
              <div className="flex-1">
                <p className="font-body text-fluky-text text-lg">
                  {selectedPlayer.username || 'Joueur sans pseudo'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="text-red-400 hover:text-red-300 transition-colors text-sm font-body"
              >
                ✕ Retirer
              </button>
            </div>
          </div>
        )}

        {/* Message d'invitation */}
        <div>
          <label className="block text-sm font-medium text-fluky-text mb-2">
            Message personnel (optionnel)
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ajoute un message pour inviter ce joueur à rejoindre ton équipe..."
            rows={4}
            disabled={loading}
          />
          <p className="text-xs text-fluky-text/50 font-body mt-1">
            Le joueur recevra une notification et un email avec ton invitation
          </p>
        </div>

        {/* Informations */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-sm text-blue-300 font-body">
            💡 <strong>Info :</strong> Le joueur pourra accepter ou refuser l'invitation depuis son tableau de bord.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default InvitePlayerModal;
