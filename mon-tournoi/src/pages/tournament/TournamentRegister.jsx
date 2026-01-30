import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from '../../utils/toast';
import { getPlatformForGame, PLATFORM_NAMES, PLATFORM_LOGOS } from '../../utils/gamePlatforms';

/**
 * TournamentRegister - Page d'inscription à un tournoi (Convex)
 */
export default function TournamentRegister({ session }) {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  
  const [registering, setRegistering] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');

  // Convex queries
  const tournament = useQuery(api.tournaments.getById, 
    tournamentId ? { tournamentId } : "skip"
  );
  const currentUser = useQuery(api.users.current);
  const userTeams = useQuery(api.teams.listByCaptain, 
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );
  const registrations = useQuery(api.tournamentRegistrations.listByTournament, 
    tournamentId ? { tournamentId } : "skip"
  );
  
  // Mutation pour l'inscription
  const registerMutation = useMutation(api.tournamentRegistrationsMutations.register);

  // Vérifier si déjà inscrit
  const isRegistered = useMemo(() => {
    if (!registrations || !currentUser) return false;
    return registrations.some(r => 
      r.userId === currentUser._id || 
      (r.teamId && userTeams?.some(t => t._id === r.teamId))
    );
  }, [registrations, currentUser, userTeams]);

  // Déterminer le type d'inscription
  const teamSize = tournament?.teamSize || 1;
  const registrationType = teamSize > 1 ? 'team' : 'solo';

  // Plateforme gaming requise
  const requiredPlatform = tournament?.game ? getPlatformForGame(tournament.game) : null;
  
  // Vérifier si l'utilisateur a le compte gaming requis
  const hasRequiredGamingAccount = useMemo(() => {
    if (!requiredPlatform) return true;
    if (!currentUser?.gamingAccounts) return false;
    const account = currentUser.gamingAccounts[requiredPlatform];
    return account && account.trim() !== '';
  }, [requiredPlatform, currentUser?.gamingAccounts]);

  // Compter les participants
  const participantCount = registrations?.length || 0;

  const handleRegister = async () => {
    if (!session?.user || !currentUser) {
      toast.error('Vous devez être connecté pour vous inscrire');
      navigate('/auth', { state: { returnTo: `/tournament/${tournamentId}/register` } });
      return;
    }

    if (isRegistered) {
      toast.info('Vous êtes déjà inscrit à ce tournoi');
      return;
    }

    // Vérifier si le compte gaming est configuré
    if (requiredPlatform && !hasRequiredGamingAccount) {
      toast.error(`Vous devez configurer votre compte ${PLATFORM_NAMES[requiredPlatform]} dans votre profil pour vous inscrire à ce tournoi`);
      return;
    }

    setRegistering(true);

    try {
      await registerMutation({
        tournamentId,
        teamId: registrationType === 'team' && selectedTeam ? selectedTeam : undefined,
      });

      toast.success(
        tournament?.requireApproval 
          ? 'Inscription envoyée ! En attente de validation.' 
          : 'Inscription confirmée !'
      );
      
      // Rediriger vers la page du tournoi
      setTimeout(() => navigate(`/tournament/${tournamentId}`), 1500);

    } catch (error) {
      console.error('Erreur inscription:', error);
      if (error.message?.includes('déjà inscrit')) {
        toast.error('Vous êtes déjà inscrit à ce tournoi');
      } else {
        toast.error('Erreur lors de l\'inscription');
      }
    } finally {
      setRegistering(false);
    }
  };

  // Loading state
  const loading = tournament === undefined || currentUser === undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-white mb-4">Tournoi non trouvé</p>
          <Link to="/" className="text-cyan-400 hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  const canRegister = tournament.status === 'draft' || tournament.status === 'registration_open';
  const isFull = tournament.maxParticipants && participantCount >= tournament.maxParticipants;

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-cyan-600 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Inscription au tournoi</h1>
          <p className="text-white/80">{tournament.name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 -mt-8">
        <div className="bg-[#161b22] rounded-xl border border-white/10 overflow-hidden">
          {/* Tournament Info */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl">
                🏆
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{tournament.name}</h2>
                <p className="text-gray-400">{tournament.game}</p>
              </div>
            </div>
            
            {tournament.description && (
              <p className="mt-4 text-gray-400 text-sm">{tournament.description}</p>
            )}

            {/* Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-white">
                  {participantCount}
                  {tournament.maxParticipants && <span className="text-gray-500">/{tournament.maxParticipants}</span>}
                </p>
                <p className="text-xs text-gray-500">Participants</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-white">{tournament.teamSize || 1}v{tournament.teamSize || 1}</p>
                <p className="text-xs text-gray-500">Format</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-white">{tournament.prizePool || '-'}</p>
                <p className="text-xs text-gray-500">Prize Pool</p>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div className="p-6">
            {!session?.user ? (
              /* Not logged in */
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Vous devez être connecté pour vous inscrire</p>
                <Link
                  to={`/auth?returnTo=/tournament/${tournamentId}/register`}
                  className="inline-block px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Se connecter
                </Link>
              </div>
            ) : isRegistered ? (
              /* Already registered */
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
                  ✅
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Vous êtes inscrit !</h3>
                <p className="text-gray-400 mb-6">Votre inscription à ce tournoi est confirmée.</p>
                <Link
                  to={`/tournament/${tournamentId}`}
                  className="inline-block px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                >
                  Voir le tournoi
                </Link>
              </div>
            ) : !canRegister ? (
              /* Registration closed */
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
                  🔒
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Inscriptions fermées</h3>
                <p className="text-gray-400">Les inscriptions ne sont plus ouvertes pour ce tournoi.</p>
              </div>
            ) : isFull ? (
              /* Tournament full */
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
                  📋
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Tournoi complet</h3>
                <p className="text-gray-400">Le nombre maximum de participants a été atteint.</p>
              </div>
            ) : (
              /* Registration form */
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Confirmer votre inscription</h3>
                
                {/* Gaming account required warning */}
                {requiredPlatform && !hasRequiredGamingAccount && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      {PLATFORM_LOGOS[requiredPlatform] && (
                        <img 
                          src={PLATFORM_LOGOS[requiredPlatform]} 
                          alt={PLATFORM_NAMES[requiredPlatform]}
                          className="w-8 h-8 flex-shrink-0 mt-0.5"
                        />
                      )}
                      <div>
                        <p className="text-red-400 font-medium mb-1">
                          ⚠️ Compte {PLATFORM_NAMES[requiredPlatform]} requis
                        </p>
                        <p className="text-gray-400 text-sm mb-3">
                          Ce tournoi est sur <strong>{tournament.game}</strong>. Vous devez configurer votre pseudo {PLATFORM_NAMES[requiredPlatform]} dans votre profil pour vous inscrire.
                        </p>
                        <Link 
                          to="/profile" 
                          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors"
                        >
                          <span>⚙️</span>
                          Configurer mon profil
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gaming account configured indicator */}
                {requiredPlatform && hasRequiredGamingAccount && currentUser?.gamingAccounts?.[requiredPlatform] && (
                  <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      {PLATFORM_LOGOS[requiredPlatform] && (
                        <img 
                          src={PLATFORM_LOGOS[requiredPlatform]} 
                          alt={PLATFORM_NAMES[requiredPlatform]}
                          className="w-6 h-6"
                        />
                      )}
                      <div>
                        <p className="text-green-400 text-sm">
                          ✓ Compte {PLATFORM_NAMES[requiredPlatform]} : <span className="font-medium text-white">{currentUser.gamingAccounts[requiredPlatform]}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team selection if needed */}
                {registrationType === 'team' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Sélectionnez votre équipe
                    </label>
                    {userTeams && userTeams.length > 0 ? (
                      <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="">-- Choisir une équipe --</option>
                        {userTeams.map(team => (
                          <option key={team._id} value={team._id}>{team.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-400 text-sm">
                          Vous n'avez pas d'équipe. Créez-en une d'abord.
                        </p>
                        <Link 
                          to="/create-team" 
                          className="text-cyan-400 text-sm hover:underline mt-2 inline-block"
                        >
                          Créer une équipe →
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Player info */}
                <div className="mb-6 p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Inscrit en tant que</p>
                  <p className="text-white font-medium">
                    {registrationType === 'team' && selectedTeam 
                      ? userTeams?.find(t => t._id === selectedTeam)?.name
                      : currentUser?.username || session?.user?.email?.split('@')[0]
                    }
                  </p>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleRegister}
                  disabled={registering || (registrationType === 'team' && !selectedTeam) || (requiredPlatform && !hasRequiredGamingAccount)}
                  className="w-full py-4 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {registering ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Inscription en cours...
                    </>
                  ) : (requiredPlatform && !hasRequiredGamingAccount) ? (
                    <>
                      <span>🔒</span>
                      Compte {PLATFORM_NAMES[requiredPlatform]} requis
                    </>
                  ) : (
                    <>
                      <span>📝</span>
                      S'inscrire au tournoi
                    </>
                  )}
                </button>

                {tournament.requireApproval && (
                  <p className="mt-3 text-center text-xs text-gray-500">
                    ⚠️ L'inscription nécessite l'approbation de l'organisateur
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6 pb-8">
          <Link to={`/tournament/${tournamentId}`} className="text-gray-400 hover:text-white transition-colors">
            ← Retour au tournoi
          </Link>
        </div>
      </div>
    </div>
  );
}
