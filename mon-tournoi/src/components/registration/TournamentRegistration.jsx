/**
 * TournamentRegistration - Composant principal d'inscription à un tournoi
 * 
 * Permet aux joueurs de s'inscrire avec :
 * - Une équipe existante (si capitaine)
 * - Une équipe temporaire créée à la volée
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../utils/toast';
import { Button, Card, Modal } from '../../shared/components/ui';
import RegistrationTypeSelector from './RegistrationTypeSelector';
import ExistingTeamSelector from './ExistingTeamSelector';
import TemporaryTeamForm from './TemporaryTeamForm';
import {
  checkRegistrationEligibility,
  getUserTeams,
  registerExistingTeam,
  registerTemporaryTeam,
  addToWaitlist
} from '../../shared/services/api/registration';
import { getPlatformForGame, getRequiredPlatformName } from '../../utils/gamePlatforms';
import { checkUserHasPlatformAccount } from '../../shared/services/api/gamingAccounts';

/**
 * @param {Object} props
 * @param {string} props.tournamentId - ID du tournoi
 * @param {Object} props.tournament - Données du tournoi
 * @param {Object} props.session - Session utilisateur
 * @param {Function} props.onSuccess - Callback après inscription réussie
 */
export default function TournamentRegistration({ 
  tournamentId, 
  tournament, 
  session, 
  onSuccess 
}) {
  const navigate = useNavigate();
  
  // États
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState('type'); // 'type' | 'existing' | 'temporary'
  const [registrationType, setRegistrationType] = useState(null); // 'existing' | 'temporary'
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  // Vérifier l'éligibilité à l'inscription
  useEffect(() => {
    if (session?.user?.id && tournamentId) {
      checkEligibility();
    } else {
      setCheckingEligibility(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, tournamentId]);

  const checkEligibility = async () => {
    setCheckingEligibility(true);
    try {
      const result = await checkRegistrationEligibility(tournamentId, session.user.id);
      setEligibility(result);
      
      // Charger les équipes si éligible
      if (result.canRegister || !result.existingParticipation) {
        const teams = await getUserTeams(session.user.id);
        setUserTeams(teams);
      }
    } catch (error) {
      console.error('Erreur vérification éligibilité:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Vérifier le compte gaming requis
  const checkGamingAccount = async () => {
    const game = tournament?.game;
    if (!game) return true;

    const requiredPlatform = getPlatformForGame(game);
    if (!requiredPlatform) return true;

    const hasAccount = await checkUserHasPlatformAccount(session.user.id, requiredPlatform);
    if (!hasAccount) {
      const platformName = getRequiredPlatformName(game);
      toast.error(
        `⚠️ Compte ${platformName} requis`,
        {
          description: `Pour rejoindre ce tournoi ${game}, vous devez lier votre compte ${platformName}. Allez dans votre profil > Comptes Gaming pour l'ajouter.`,
          action: {
            label: '👤 Aller au profil',
            onClick: () => navigate('/profile'),
          },
        }
      );
      return false;
    }
    return true;
  };

  // Ouvrir la modale d'inscription
  const handleOpenRegistration = async () => {
    if (!session) {
      toast.info('Connectez-vous pour vous inscrire');
      navigate('/auth');
      return;
    }

    // Vérifier le compte gaming
    const hasAccount = await checkGamingAccount();
    if (!hasAccount) return;

    setIsModalOpen(true);
    setStep('type');
    setRegistrationType(null);
  };

  // Gérer le choix du type d'inscription
  const handleTypeSelect = (type) => {
    setRegistrationType(type);
    setStep(type);
  };

  // Inscription avec équipe existante
  const handleExistingTeamSubmit = async (teamId) => {
    setLoading(true);
    try {
      // Vérifier si le tournoi est plein
      if (eligibility?.isFull) {
        const waitlistResult = await addToWaitlist(tournamentId, teamId, false);
        if (waitlistResult.success) {
          toast.success(`🕐 Ajouté à la liste d'attente (position #${waitlistResult.position})`);
          setIsModalOpen(false);
          onSuccess?.();
        } else {
          toast.error(waitlistResult.error);
        }
        return;
      }

      const result = await registerExistingTeam(tournamentId, teamId);
      
      if (result.success) {
        toast.success('✅ Équipe inscrite au tournoi !');
        setIsModalOpen(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'inscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Inscription avec équipe temporaire
  const handleTemporaryTeamSubmit = async (teamData, players) => {
    setLoading(true);
    try {
      // Vérifier si le tournoi est plein
      if (eligibility?.isFull) {
        // Pour une équipe temporaire, on doit d'abord la créer puis l'ajouter à la waitlist
        // Pour l'instant, on refuse simplement
        toast.warning('Le tournoi est complet. Créez une équipe temporaire quand même pour rejoindre la liste d\'attente ?');
        // TODO: Implémenter waitlist pour équipes temporaires
        setLoading(false);
        return;
      }

      const result = await registerTemporaryTeam(tournamentId, teamData, players);
      
      if (result.success) {
        toast.success('✅ Équipe créée et inscrite au tournoi !');
        setIsModalOpen(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'inscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Si pas connecté
  if (!session) {
    return (
      <Card variant="glass" padding="lg" className="border-2 border-violet-500/50">
        <div className="text-center">
          <h3 className="text-2xl font-display text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
            🎯 Inscription au Tournoi
          </h3>
          <p className="text-gray-400 mb-6">
            Connectez-vous pour vous inscrire à ce tournoi
          </p>
          <Button onClick={() => navigate('/auth')} variant="primary" size="lg">
            🔐 Se Connecter
          </Button>
        </div>
      </Card>
    );
  }

  // Chargement
  if (checkingEligibility) {
    return (
      <Card variant="glass" padding="lg" className="border-2 border-violet-500/50">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
          <span className="text-gray-400">Vérification de l'éligibilité...</span>
        </div>
      </Card>
    );
  }

  // Déjà inscrit
  if (eligibility?.existingParticipation) {
    return (
      <Card variant="glass" padding="lg" className="border-2 border-green-500/50 bg-green-500/10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <div>
            <h3 className="text-xl font-display text-green-400">
              Vous êtes inscrit !
            </h3>
            <p className="text-gray-400 text-sm">
              Votre équipe est inscrite à ce tournoi
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Inscriptions fermées
  if (!eligibility?.canRegister) {
    return (
      <Card variant="glass" padding="lg" className="border-2 border-orange-500/50 bg-orange-500/10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚠️</span>
          <div>
            <h3 className="text-xl font-display text-orange-400">
              Inscriptions fermées
            </h3>
            <p className="text-gray-400 text-sm">
              {eligibility?.reason || 'Les inscriptions ne sont plus disponibles'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Carte d'inscription */}
      <Card 
        variant="glass" 
        padding="lg" 
        className="border-2 border-violet-500/50 hover:border-cyan-400/50 transition-colors"
      >
        <div className="text-center">
          <h3 className="text-2xl font-display text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-2">
            🎯 Inscription au Tournoi
          </h3>
          
          {/* Infos sur les places */}
          {eligibility?.maxParticipants && (
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className={eligibility.isFull ? 'text-orange-400' : 'text-gray-400'}>
                  {eligibility.currentCount} / {eligibility.maxParticipants} équipes
                </span>
                {eligibility.isFull ? (
                  <span className="text-orange-400 font-semibold">• Complet</span>
                ) : (
                  <span className="text-green-400">
                    • {eligibility.spotsLeft} place{eligibility.spotsLeft > 1 ? 's' : ''} restante{eligibility.spotsLeft > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              {/* Barre de progression */}
              <div className="w-full h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    eligibility.isFull 
                      ? 'bg-orange-500' 
                      : 'bg-gradient-to-r from-violet-500 to-cyan-500'
                  }`}
                  style={{ width: `${(eligibility.currentCount / eligibility.maxParticipants) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleOpenRegistration} 
            variant="primary" 
            size="lg"
            fullWidth
          >
            {eligibility?.isFull ? '📋 Rejoindre la liste d\'attente' : '✨ S\'inscrire maintenant'}
          </Button>
        </div>
      </Card>

      {/* Modale d'inscription */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Inscription au Tournoi"
        size="lg"
      >
        <div className="space-y-6">
          {/* Étape 1 : Choix du type */}
          {step === 'type' && (
            <RegistrationTypeSelector
              hasExistingTeams={userTeams.length > 0}
              onSelect={handleTypeSelect}
              tournament={tournament}
            />
          )}

          {/* Étape 2a : Sélection équipe existante */}
          {step === 'existing' && (
            <ExistingTeamSelector
              teams={userTeams}
              onSubmit={handleExistingTeamSubmit}
              onBack={() => setStep('type')}
              loading={loading}
              tournament={tournament}
            />
          )}

          {/* Étape 2b : Création équipe temporaire */}
          {step === 'temporary' && (
            <TemporaryTeamForm
              tournament={tournament}
              onSubmit={handleTemporaryTeamSubmit}
              onBack={() => setStep('type')}
              loading={loading}
              userEmail={session?.user?.email}
            />
          )}
        </div>
      </Modal>
    </>
  );
}
