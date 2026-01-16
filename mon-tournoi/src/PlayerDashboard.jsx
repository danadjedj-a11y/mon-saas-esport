import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import NotificationCenter from './NotificationCenter';
import { TournamentCardSkeleton } from './components/Skeleton';
import { EmptyTournaments } from './components/EmptyState';
import DashboardLayout from './layouts/DashboardLayout';
import TeamInvitations from './components/TeamInvitations';

export default function PlayerDashboard({ session }) {
  const [myTournaments, setMyTournaments] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [followedTournaments, setFollowedTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlayerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchPlayerData = async () => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      // Paralléliser les requêtes pour les équipes
      const [captainTeamsResult, memberTeamsResult, allTournamentsResult] = await Promise.all([
        supabase
          .from('teams')
          .select('id')
          .eq('captain_id', session.user.id),
        supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', session.user.id),
        supabase
          .from('tournaments')
          .select('*')
          .in('status', ['draft', 'ongoing'])
          .order('created_at', { ascending: false })
      ]);

      const captainTeams = captainTeamsResult.data || [];
      const memberTeams = memberTeamsResult.data || [];
      const allTournaments = allTournamentsResult.data || [];

      setAvailableTournaments(allTournaments);

      const allTeamIds = [
        ...captainTeams.map(t => t.id),
        ...memberTeams.map(tm => tm.team_id)
      ];
      const uniqueTeamIds = [...new Set(allTeamIds)];

      if (uniqueTeamIds.length === 0) {
        setMyTournaments([]);
        setUpcomingMatches([]);
        setLoading(false);
        return;
      }

      // Récupérer les participants et les matchs en parallèle
      const [participantsResult, matchesResult] = await Promise.all([
        supabase
          .from('participants')
          .select('tournament_id')
          .in('team_id', uniqueTeamIds),
        supabase
          .from('matches')
          .select('*, tournaments(*)')
          .in('player1_id', uniqueTeamIds)
          .or(`player2_id.in.(${uniqueTeamIds.join(',')})`)
          .eq('status', 'pending')
          .order('scheduled_at', { ascending: true })
          .limit(10)
      ]);

      const participants = participantsResult.data || [];
      const matches = matchesResult.data || [];

      if (participants.length > 0) {
        const tournamentIds = [...new Set(participants.map(p => p.tournament_id))];
        
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('*')
          .in('id', tournamentIds)
          .order('created_at', { ascending: false });
        
        setMyTournaments(tournaments || []);
      } else {
        setMyTournaments([]);
      }

      setUpcomingMatches(matches);

      // Récupérer les tournois suivis
      const { data: follows } = await supabase
        .from('tournament_follows')
        .select('tournament_id')
        .eq('user_id', session.user.id);

      if (follows && follows.length > 0) {
        const followedIds = follows.map(f => f.tournament_id);
        const { data: followed } = await supabase
          .from('tournaments')
          .select('*')
          .in('id', followedIds)
          .order('created_at', { ascending: false });
        
        setFollowedTournaments(followed || []);
      } else {
        setFollowedTournaments([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setMyTournaments([]);
      setAvailableTournaments([]);
      setUpcomingMatches([]);
      setFollowedTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const _handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur déconnexion:', error);
      } else {
        navigate('/');
        window.location.reload();
      }
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    }
  };

  if (loading) {
    return (
      <DashboardLayout session={session}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <TournamentCardSkeleton key={i} />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-7xl mx-auto">
        {/* INVITATIONS D'ÉQUIPE */}
        <div className="mb-10">
          <h2 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-5 drop-shadow-glow">
            📬 Invitations d'équipe
          </h2>
          <TeamInvitations userId={session?.user?.id} onUpdate={fetchPlayerData} />
        </div>

        {/* MATCHS À VENIR - EN HAUT */}
        {upcomingMatches.length > 0 && (
          <div className="mb-10">
            <h2 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 mb-5 drop-shadow-glow">⚡ Mes Prochains Matchs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => navigate(`/match/${match.id}`)}
                  className="glass-card border-cyan-500/30 p-5 cursor-pointer transition-all duration-300 hover:border-cyan-400 hover:-translate-y-1 hover:shadow-glow-cyan"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-display text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                      {match.tournaments?.name || 'Tournoi'}
                    </div>
                    {match.scheduled_at && (
                      <div className="text-xs text-white bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-1 rounded-lg">
                        📅 {new Date(match.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    Round {match.round_number} • Match #{match.match_number}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOURNOIS SUIVIS - SECTION DÉDIÉE */}
        {followedTournaments.length > 0 && (
          <div className="mb-10">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-3xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400 drop-shadow-glow">
                ⭐ Tournois Suivis
              </h2>
              <span className="text-sm text-gray-400">
                {followedTournaments.length} tournoi{followedTournaments.length > 1 ? 's' : ''} suivi{followedTournaments.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {followedTournaments.map((t) => {
                const getStatusStyle = (status) => {
                  switch (status) {
                    case 'draft': return { bg: 'bg-gradient-to-r from-orange-500 to-amber-500', text: 'Inscriptions', icon: '📝' };
                    case 'completed': return { bg: 'bg-gradient-to-r from-pink-500 to-rose-500', text: 'Terminé', icon: '🏁' };
                    default: return { bg: 'bg-gradient-to-r from-violet-600 to-cyan-500', text: 'En cours', icon: '⚔️' };
                  }
                };
                const statusStyle = getStatusStyle(t.status);
                
                return (
                  <div 
                    key={t.id} 
                    onClick={() => navigate(`/tournament/${t.id}/public`)}
                    className="glass-card border-violet-500/30 p-5 cursor-pointer transition-all duration-300 hover:border-violet-400 hover:-translate-y-1 hover:shadow-glow-violet relative group"
                  >
                    <div className="absolute top-3 right-3 text-xl">
                      ⭐
                    </div>
                    <div className="flex justify-between items-start mb-3 pr-8">
                      <div className="flex-1">
                        <h3 className="font-display text-lg text-white mb-1">
                          {t.name}
                        </h3>
                        <div className="text-sm text-gray-400 flex gap-4 mt-2">
                          <span>🎮 {t.game}</span>
                          <span>📊 {t.format}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-violet-500/20 flex justify-between items-center">
                      <span className={`${statusStyle.bg} px-3 py-1 rounded-lg text-xs font-bold text-white`}>
                        {statusStyle.icon} {statusStyle.text}
                      </span>
                      <div className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-lg text-sm text-white font-medium group-hover:shadow-glow-violet transition-all">
                        Voir →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* COLONNE GAUCHE : MES TOURNOIS */}
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 drop-shadow-glow">🎯 Mes Tournois</h2>
              <span className="text-sm text-gray-400">{myTournaments.length} tournoi(s)</span>
            </div>

            {myTournaments.length > 0 ? (
              <div className="flex flex-col gap-4">
                {myTournaments.map((t) => {
                  const getStatusStyle = (status) => {
                    switch (status) {
                      case 'draft': return { bg: 'bg-gradient-to-r from-orange-500 to-amber-500', text: 'Inscriptions', icon: '📝' };
                      case 'completed': return { bg: 'bg-gradient-to-r from-pink-500 to-rose-500', text: 'Terminé', icon: '🏁' };
                      default: return { bg: 'bg-gradient-to-r from-violet-600 to-cyan-500', text: 'En cours', icon: '⚔️' };
                    }
                  };
                  const statusStyle = getStatusStyle(t.status);
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => navigate(`/player/tournament/${t.id}`)}
                      className="glass-card border-violet-500/30 p-5 cursor-pointer transition-all duration-300 hover:border-violet-400 hover:translate-x-1 hover:shadow-glow-violet"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-display text-lg text-white mb-1">{t.name}</h3>
                          <div className="text-sm text-gray-400 flex gap-4 mt-2">
                            <span>🎮 {t.game}</span>
                            <span>📊 {t.format}</span>
                          </div>
                        </div>
                        <span className={`${statusStyle.bg} px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap text-white`}>
                          {statusStyle.icon} {statusStyle.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card border-violet-500/30 p-10 text-center">
                <div className="text-5xl mb-4">🎯</div>
                <p className="text-white">Vous n'êtes inscrit à aucun tournoi</p>
                <p className="text-gray-500 text-sm mt-2">Rejoignez un tournoi disponible ci-contre</p>
              </div>
            )}
          </div>

          {/* COLONNE DROITE : TOURNOIS DISPONIBLES */}
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 drop-shadow-glow">🌟 Tournois Disponibles</h2>
              <span className="text-sm text-gray-400">{availableTournaments.filter(t => !myTournaments.some(mt => mt.id === t.id)).length} disponible(s)</span>
            </div>

            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto">
              {availableTournaments
                .filter(t => !myTournaments.some(mt => mt.id === t.id))
                .map((t) => {
                  const getStatusStyle = (status) => {
                    switch (status) {
                      case 'draft': return { bg: 'bg-gradient-to-r from-orange-500 to-amber-500', text: 'Inscriptions ouvertes', icon: '📝' };
                      default: return { bg: 'bg-gradient-to-r from-violet-600 to-cyan-500', text: 'En cours', icon: '⚔️' };
                    }
                  };
                  const statusStyle = getStatusStyle(t.status);
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => navigate(`/tournament/${t.id}/public`)}
                      className="glass-card border-cyan-500/30 p-5 cursor-pointer transition-all duration-300 hover:border-cyan-400 hover:translate-x-1 hover:shadow-glow-cyan"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-display text-lg text-white mb-1">{t.name}</h3>
                          <div className="text-sm text-gray-400 flex gap-4 mt-2">
                            <span>🎮 {t.game}</span>
                            <span>📊 {t.format}</span>
                          </div>
                        </div>
                        <span className={`${statusStyle.bg} px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap text-white`}>
                          {statusStyle.icon} {statusStyle.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              
              {availableTournaments.filter(t => !myTournaments.some(mt => mt.id === t.id)).length === 0 && (
                <EmptyTournaments />
              )}
            </div>
          </div>
        </div>

        {/* STATISTIQUES RAPIDES */}
        <div className="mt-10 glass-card border-violet-500/30 p-6">
          <h3 className="font-display text-xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-5 drop-shadow-glow">📊 Aperçu Statistiques</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">{myTournaments.length}</div>
              <div className="text-sm text-gray-400 mt-2">Tournois</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-cyan-400">{upcomingMatches.length}</div>
              <div className="text-sm text-gray-400 mt-2">Matchs à venir</div>
            </div>
            <div className="text-center cursor-pointer" onClick={() => navigate('/stats')}>
              <div className="text-sm text-violet-400 underline hover:text-cyan-400 transition-colors">Voir toutes les stats →</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
