import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button, Card, Input } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';
import { PLATFORM_NAMES, PLATFORM_LOGOS, getPlatformForGame } from '../../../utils/gamePlatforms';

export default function ParticipantDetails() {
  const { id: tournamentId, participantId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchParticipant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  const fetchParticipant = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            email,
            avatar_url,
            gaming_accounts
          ),
          team:team_id (
            id,
            name,
            tag,
            logo_url,
            captain_id,
            team_members (
              id,
              user_id,
              role,
              profiles:user_id (id, username, email, avatar_url, gaming_accounts)
            )
          ),
          temporary_teams:temporary_team_id (
            id,
            name,
            tag,
            logo_url,
            temporary_team_players (
              id,
              user_id,
              profiles:user_id (id, username, email, avatar_url, gaming_accounts)
            )
          )
        `)
        .eq('id', participantId)
        .single();

      if (error) throw error;
      setParticipant(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Participant non trouvé');
      navigate(`/organizer/tournament/${tournamentId}/participants`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce participant ?')) return;

    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      toast.success('Participant supprimé');
      navigate(`/organizer/tournament/${tournamentId}/participants`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleCheckIn = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('participants')
        .update({ checked_in: !participant.checked_in })
        .eq('id', participantId);

      if (error) throw error;

      setParticipant(prev => ({ ...prev, checked_in: !prev.checked_in }));
      toast.success(participant.checked_in ? 'Check-in annulé' : 'Check-in validé');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDisqualified = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('participants')
        .update({ disqualified: !participant.disqualified })
        .eq('id', participantId);

      if (error) throw error;

      setParticipant(prev => ({ ...prev, disqualified: !prev.disqualified }));
      toast.success(participant.disqualified ? 'Participant réintégré' : 'Participant disqualifié');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Participant non trouvé</p>
      </div>
    );
  }

  const isTemporaryTeam = !!participant.temporary_team_id && !participant.team_id;
  const team = isTemporaryTeam ? participant.temporary_teams : participant.team;
  const members = isTemporaryTeam 
    ? participant.temporary_teams?.temporary_team_players?.map(p => ({ ...p, role: 'member' })) 
    : participant.team?.team_members;
  
  const requiredPlatform = tournament?.game ? getPlatformForGame(tournament.game) : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/organizer/tournament/${tournamentId}/participants`)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Retour
          </button>
          <h1 className="text-2xl font-display font-bold text-white">
            Détails du participant
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDelete}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            🗑️ Supprimer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team/Participant Card */}
          <Card variant="glass" padding="lg">
            <div className="flex items-start gap-4 mb-6">
              {team?.logo_url ? (
                <img 
                  src={team.logo_url} 
                  alt="" 
                  className="w-20 h-20 rounded-xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                  {(team?.name || participant.name || '?')[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-white">
                    {team?.name || participant.name || 'Sans nom'}
                  </h2>
                  {team?.tag && (
                    <span className="text-gray-400">[{team.tag}]</span>
                  )}
                  {isTemporaryTeam && (
                    <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                      TEMP
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm">
                  Inscrit le {new Date(participant.created_at || participant.registered_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                participant.checked_in 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {participant.checked_in ? '✅ Check-in validé' : '⏳ En attente de check-in'}
              </span>
              {participant.disqualified && (
                <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-400">
                  ❌ Disqualifié
                </span>
              )}
              {participant.seed_order && (
                <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-500/20 text-violet-400">
                  🌱 Seed #{participant.seed_order}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
              <Button
                variant={participant.checked_in ? 'outline' : 'primary'}
                onClick={handleToggleCheckIn}
                disabled={saving}
              >
                {participant.checked_in ? '↩️ Annuler check-in' : '✓ Valider check-in'}
              </Button>
              <Button
                variant="outline"
                onClick={handleToggleDisqualified}
                disabled={saving}
                className={participant.disqualified ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}
              >
                {participant.disqualified ? '↻ Réintégrer' : '✕ Disqualifier'}
              </Button>
            </div>
          </Card>

          {/* Team Members */}
          {members && members.length > 0 && (
            <Card variant="glass" padding="lg">
              <h3 className="text-lg font-semibold text-white mb-4">
                {isTemporaryTeam ? 'Joueurs' : 'Membres de l\'équipe'} ({members.length})
              </h3>
              <div className="space-y-3">
                {members.map((member) => {
                  const profile = member.profiles;
                  const gamingAccount = profile?.gaming_accounts?.[requiredPlatform];
                  const isCaptain = !isTemporaryTeam && member.user_id === team?.captain_id;

                  return (
                    <div 
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="" 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-violet-500/30 flex items-center justify-center text-white text-sm font-bold">
                          {(profile?.username || '?')[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/player/${member.user_id}`}
                            className="text-white font-medium hover:text-cyan-400 transition-colors"
                          >
                            {profile?.username || 'Joueur inconnu'}
                          </Link>
                          {isCaptain && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                              👑 Capitaine
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm truncate">
                          {profile?.email || '-'}
                        </p>
                      </div>
                      
                      {/* Gaming account */}
                      {requiredPlatform && (
                        <div className="flex items-center gap-2">
                          {PLATFORM_LOGOS[requiredPlatform] && (
                            <img 
                              src={PLATFORM_LOGOS[requiredPlatform]} 
                              alt=""
                              className="w-5 h-5"
                            />
                          )}
                          {gamingAccount ? (
                            <span className="text-sm text-gray-400 italic">
                              {gamingAccount}
                            </span>
                          ) : (
                            <span className="text-sm text-red-400">
                              ⚠️ Non configuré
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card variant="glass" padding="md">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Informations
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">ID Participant</p>
                <p className="text-white font-mono text-sm">{participant.id}</p>
              </div>
              {participant.user_id && (
                <div>
                  <p className="text-xs text-gray-500">ID Utilisateur</p>
                  <p className="text-white font-mono text-sm">{participant.user_id}</p>
                </div>
              )}
              {team?.id && (
                <div>
                  <p className="text-xs text-gray-500">ID Équipe</p>
                  <p className="text-white font-mono text-sm">{team.id}</p>
                </div>
              )}
              {participant.email && (
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-white text-sm">{participant.email}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Gaming Account Status */}
          {requiredPlatform && (
            <Card variant="glass" padding="md">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Compte {PLATFORM_NAMES[requiredPlatform]}
              </h3>
              <div className="flex items-center gap-3">
                {PLATFORM_LOGOS[requiredPlatform] && (
                  <img 
                    src={PLATFORM_LOGOS[requiredPlatform]} 
                    alt=""
                    className="w-10 h-10 bg-white/10 rounded-lg p-2"
                  />
                )}
                <div>
                  {participant.profiles?.gaming_accounts?.[requiredPlatform] ? (
                    <>
                      <p className="text-green-400 text-sm">✓ Configuré</p>
                      <p className="text-white font-medium">
                        {participant.profiles.gaming_accounts[requiredPlatform]}
                      </p>
                    </>
                  ) : (
                    <p className="text-red-400 text-sm">⚠️ Non configuré</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Links */}
          {!isTemporaryTeam && team?.id && (
            <Card variant="glass" padding="md">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Liens
              </h3>
              <div className="space-y-2">
                <Link
                  to={`/team/${team.id}`}
                  target="_blank"
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  🔗 Page de l'équipe
                </Link>
                {team.captain_id && (
                  <Link
                    to={`/player/${team.captain_id}`}
                    target="_blank"
                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    👤 Profil du capitaine
                  </Link>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
