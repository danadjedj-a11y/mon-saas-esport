import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { toast } from '../../utils/toast';
import { getPlatformForGame, PLATFORM_NAMES, PLATFORM_LOGOS } from '../../utils/gamePlatforms';

/**
 * TournamentRegister - Page d'inscription à un tournoi
 */
export default function TournamentRegister({ session }) {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [registrationType, setRegistrationType] = useState('solo'); // 'solo' ou 'team'
  const [userProfile, setUserProfile] = useState(null);
  const [hasRequiredGamingAccount, setHasRequiredGamingAccount] = useState(false);
  const [requiredPlatform, setRequiredPlatform] = useState(null);

  useEffect(() => {
    fetchData();
  }, [tournamentId, session]);

  const fetchData = async () => {
    try {
      // Charger le tournoi
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Déterminer la plateforme gaming requise pour ce jeu
      const platform = getPlatformForGame(tournamentData.game);
      setRequiredPlatform(platform);

      // Déterminer le type d'inscription
      const teamSize = tournamentData.team_size || 1;
      setRegistrationType(teamSize > 1 ? 'team' : 'solo');

      if (session?.user) {
        // Charger le profil utilisateur avec les comptes gaming
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, gaming_accounts')
          .eq('id', session.user.id)
          .single();
        
        setUserProfile(profileData);

        // Vérifier si l'utilisateur a le compte gaming requis
        if (platform && profileData?.gaming_accounts) {
          const gamingAccounts = profileData.gaming_accounts;
          const hasAccount = gamingAccounts[platform] && gamingAccounts[platform].trim() !== '';
          setHasRequiredGamingAccount(hasAccount);
        } else if (!platform) {
          // Si aucune plateforme n'est requise, on permet l'inscription
          setHasRequiredGamingAccount(true);
        }

        // Vérifier si déjà inscrit
        const { data: existingReg } = await supabase
          .from('participants')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('user_id', session.user.id)
          .single();

        setIsRegistered(!!existingReg);

        // Charger les équipes de l'utilisateur si inscription par équipe
        if (teamSize > 1) {
          const { data: teams } = await supabase
            .from('teams')
            .select('*')
            .or(`captain_id.eq.${session.user.id},members.cs.{${session.user.id}}`);
          
          setUserTeams(teams || []);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger le tournoi');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!session?.user) {
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
      const participantData = {
        tournament_id: tournamentId,
        user_id: session.user.id,
        name: session.user.user_metadata?.username || session.user.email?.split('@')[0],
        status: tournament.require_approval ? 'pending' : 'confirmed',
        registered_at: new Date().toISOString(),
      };

      // Si inscription par équipe
      if (registrationType === 'team' && selectedTeam) {
        const team = userTeams.find(t => t.id === selectedTeam);
        participantData.team_id = selectedTeam;
        participantData.team_name = team?.name;
        participantData.name = team?.name;
      }

      const { error } = await supabase
        .from('participants')
        .insert([participantData]);

      if (error) throw error;

      toast.success(
        tournament.require_approval 
          ? 'Inscription envoyée ! En attente de validation.' 
          : 'Inscription confirmée !'
      );
      setIsRegistered(true);
      
      // Rediriger vers la page du tournoi
      setTimeout(() => navigate(`/tournament/${tournamentId}`), 1500);

    } catch (error) {
      console.error('Erreur inscription:', error);
      if (error.code === '23505') {
        toast.error('Vous êtes déjà inscrit à ce tournoi');
        setIsRegistered(true);
      } else {
        toast.error('Erreur lors de l\'inscription');
      }
    } finally {
      setRegistering(false);
    }
  };

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
  const isFull = tournament.max_participants && tournament.participant_count >= tournament.max_participants;

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
                  {tournament.participant_count || 0}
                  {tournament.max_participants && <span className="text-gray-500">/{tournament.max_participants}</span>}
                </p>
                <p className="text-xs text-gray-500">Participants</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-white">{tournament.team_size || 1}v{tournament.team_size || 1}</p>
                <p className="text-xs text-gray-500">Format</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-white">{tournament.prize_pool || '-'}</p>
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
                {requiredPlatform && hasRequiredGamingAccount && userProfile?.gaming_accounts?.[requiredPlatform] && (
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
                          ✓ Compte {PLATFORM_NAMES[requiredPlatform]} : <span className="font-medium text-white">{userProfile.gaming_accounts[requiredPlatform]}</span>
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
                    {userTeams.length > 0 ? (
                      <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="">-- Choisir une équipe --</option>
                        {userTeams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
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
                      ? userTeams.find(t => t.id === selectedTeam)?.name
                      : session.user.user_metadata?.username || session.user.email?.split('@')[0]
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

                {tournament.require_approval && (
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
