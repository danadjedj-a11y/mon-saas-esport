import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import NotificationCenter from './NotificationCenter';
import { TournamentCardSkeleton } from './components/Skeleton';
import { EmptyTournaments } from './components/EmptyState';
import DashboardLayout from './layouts/DashboardLayout';
import TeamInvitations from './components/TeamInvitations';
import { Button } from './shared/components/ui';

// Filtres de tournois
const TOURNAMENT_FILTERS = [
  { id: 'all', label: 'Tous', icon: '📋' },
  { id: 'upcoming', label: 'À venir', icon: '📅' },
  { id: 'ongoing', label: 'En cours', icon: '⚔️' },
  { id: 'completed', label: 'Terminés', icon: '🏁' },
];

export default function PlayerDashboard({ session }) {
  const [myTournaments, setMyTournaments] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [followedTournaments, setFollowedTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tournamentFilter, setTournamentFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlayerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchPlayerData = async () => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      // Paralléliser les requêtes pour les équipes permanentes ET temporaires
      const [captainTeamsResult, memberTeamsResult, tempTeamsResult, allTournamentsResult] = await Promise.all([
        // Équipes permanentes dont je suis capitaine
        supabase
          .from('teams')
          .select('id')
          .eq('captain_id', session.user.id),
        // Équipes permanentes dont je suis membre
        supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', session.user.id),
        // Équipes temporaires dont je suis capitaine
        supabase
          .from('temporary_teams')
          .select('id, tournament_id')
          .eq('captain_id', session.user.id),
        // Tous les tournois disponibles
        supabase
          .from('tournaments')
          .select('*')
          .in('status', ['draft', 'open', 'ongoing'])
          .order('created_at', { ascending: false })
      ]);

      const captainTeams = captainTeamsResult.data || [];
      const memberTeams = memberTeamsResult.data || [];
      const tempTeams = tempTeamsResult.data || [];
      const allTournaments = allTournamentsResult.data || [];

      setAvailableTournaments(allTournaments);

      // IDs des équipes permanentes
      const allTeamIds = [
        ...captainTeams.map(t => t.id),
        ...memberTeams.map(tm => tm.team_id)
      ];
      const uniqueTeamIds = [...new Set(allTeamIds)];

      // IDs des équipes temporaires
      const tempTeamIds = tempTeams.map(tt => tt.id);
      
      // Tournois via équipes temporaires (directement disponibles)
      const tempTournamentIds = tempTeams.map(tt => tt.tournament_id);

      // Si aucune équipe, vérifier quand même les équipes temporaires
      if (uniqueTeamIds.length === 0 && tempTeamIds.length === 0) {
        setMyTournaments([]);
        setUpcomingMatches([]);
        setLoading(false);
        return;
      }

      // Récupérer les participants (équipes permanentes) et les matchs en parallèle
      const promises = [];
      
      if (uniqueTeamIds.length > 0) {
        promises.push(
          supabase
            .from('participants')
            .select('tournament_id')
            .in('team_id', uniqueTeamIds)
        );
        promises.push(
          supabase
            .from('matches')
            .select('*, tournaments(*)')
            .or(`player1_id.in.(${uniqueTeamIds.join(',')}),player2_id.in.(${uniqueTeamIds.join(',')})`)
            .eq('status', 'pending')
            .order('scheduled_at', { ascending: true })
            .limit(10)
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: [] }));
      }

      const [participantsResult, matchesResult] = await Promise.all(promises);

      const participants = participantsResult.data || [];
      const matches = matchesResult.data || [];

      // Combiner les IDs de tournois (équipes permanentes + temporaires)
      const permanentTournamentIds = participants.map(p => p.tournament_id);
      const allTournamentIds = [...new Set([...permanentTournamentIds, ...tempTournamentIds])];

      if (allTournamentIds.length > 0) {
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('*')
          .in('id', allTournamentIds)
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

  // Filtrer les tournois selon le filtre actif
  const filteredMyTournaments = useMemo(() => {
    const now = new Date();
    
    switch (tournamentFilter) {
      case 'upcoming':
        return myTournaments.filter(t => 
          t.status === 'draft' || t.status === 'open' || 
          (t.start_date && new Date(t.start_date) > now)
        );
      case 'ongoing':
        return myTournaments.filter(t => t.status === 'ongoing');
      case 'completed':
        return myTournaments.filter(t => t.status === 'completed');
      default:
        return myTournaments;
    }
  }, [myTournaments, tournamentFilter]);

  // Stats rapides
  const quickStats = useMemo(() => {
    const now = new Date();
    return {
      total: myTournaments.length,
      ongoing: myTournaments.filter(t => t.status === 'ongoing').length,
      upcoming: myTournaments.filter(t => t.status === 'draft' || t.status === 'open').length,
      completed: myTournaments.filter(t => t.status === 'completed').length,
      followed: followedTournaments.length,
      upcomingMatches: upcomingMatches.length,
    };
  }, [myTournaments, followedTournaments, upcomingMatches]);

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
        {/* HEADER AVEC QUICK STATS */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 mb-2">
                Bonjour {session?.user?.user_metadata?.username || 'Joueur'} 👋
              </h1>
              <p className="text-gray-400">
                Bienvenue sur votre tableau de bord
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={() => navigate('/play')}
                className="flex items-center gap-2"
              >
                🎮 Explorer
              </Button>
              <Button 
                variant="primary"
                onClick={() => navigate('/play/games')}
                className="flex items-center gap-2"
              >
                🏆 Trouver un tournoi
              </Button>
            </div>
          </div>

          {/* QUICK STATS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickStatCard 
              icon="🏆" 
              value={quickStats.total} 
              label="Tournois inscrits"
              color="violet"
            />
            <QuickStatCard 
              icon="⚔️" 
              value={quickStats.ongoing} 
              label="En cours"
              color="cyan"
              highlight={quickStats.ongoing > 0}
            />
            <QuickStatCard 
              icon="📅" 
              value={quickStats.upcomingMatches} 
              label="Matchs à venir"
              color="pink"
              highlight={quickStats.upcomingMatches > 0}
            />
            <QuickStatCard 
              icon="⭐" 
              value={quickStats.followed} 
              label="Tournois suivis"
              color="yellow"
            />
          </div>
        </div>

        {/* INVITATIONS D'ÉQUIPE */}
        <div className="mb-8">
          <TeamInvitations userId={session?.user?.id} onUpdate={fetchPlayerData} />
        </div>

        {/* MATCHS À VENIR - WIDGET PRIORITAIRE */}
        {upcomingMatches.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Matchs à venir
              <span className="ml-2 px-2 py-0.5 bg-pink-500/20 text-pink-400 text-sm rounded-full">
                {upcomingMatches.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMatches.map((match) => (
                <MatchCard key={match.id} match={match} navigate={navigate} />
              ))}
            </div>
          </div>
        )}

        {/* SECTION PRINCIPALE : MES TOURNOIS */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Mes Tournois
              <span className="ml-2 px-2 py-0.5 bg-violet-500/20 text-violet-400 text-sm rounded-full">
                {filteredMyTournaments.length}
              </span>
            </h2>
            
            {/* FILTRES */}
            <div className="flex gap-2 flex-wrap">
              {TOURNAMENT_FILTERS.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setTournamentFilter(filter.id)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1
                    ${tournamentFilter === filter.id 
                      ? 'bg-violet-500 text-white' 
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                    }
                  `}
                >
                  <span>{filter.icon}</span>
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredMyTournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMyTournaments.map((t) => (
                <TournamentCard 
                  key={t.id} 
                  tournament={t} 
                  onClick={() => navigate(`/player/tournament/${t.id}`)}
                  variant="registered"
                />
              ))}
            </div>
          ) : (
            <div className="glass-card border-violet-500/30 p-10 text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="font-display text-xl text-white mb-2">
                {tournamentFilter === 'all' 
                  ? "Vous n'êtes inscrit à aucun tournoi"
                  : `Aucun tournoi ${TOURNAMENT_FILTERS.find(f => f.id === tournamentFilter)?.label.toLowerCase()}`
                }
              </h3>
              <p className="text-gray-500 text-sm mb-4">Explorez les tournois disponibles et rejoignez la compétition</p>
              <Button variant="primary" onClick={() => navigate('/play')}>
                Explorer les tournois
              </Button>
            </div>
          )}
        </div>

        {/* TOURNOIS SUIVIS */}
        {followedTournaments.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              Tournois suivis
              <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
                {followedTournaments.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {followedTournaments.map((t) => (
                <TournamentCard 
                  key={t.id} 
                  tournament={t} 
                  onClick={() => navigate(`/tournament/${t.id}/public`)}
                  variant="followed"
                />
              ))}
            </div>
          </div>
        )}

        {/* TOURNOIS DISPONIBLES */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🌟</span>
              Tournois disponibles
            </h2>
            <Link 
              to="/play"
              className="text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
            >
              Voir tous →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTournaments
              .filter(t => !myTournaments.some(mt => mt.id === t.id))
              .slice(0, 6)
              .map((t) => (
                <TournamentCard 
                  key={t.id} 
                  tournament={t} 
                  onClick={() => navigate(`/tournament/${t.id}/public`)}
                  variant="available"
                />
              ))}
            
            {availableTournaments.filter(t => !myTournaments.some(mt => mt.id === t.id)).length === 0 && (
              <div className="col-span-full">
                <EmptyTournaments />
              </div>
            )}
          </div>
        </div>

        {/* VOIR STATS COMPLET */}
        <div className="text-center py-6">
          <Button variant="secondary" onClick={() => navigate('/stats')}>
            📊 Voir toutes mes statistiques
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Composant QuickStatCard
function QuickStatCard({ icon, value, label, color, highlight = false }) {
  const colorClasses = {
    violet: 'from-violet-500/20 to-violet-500/10 border-violet-500/30',
    cyan: 'from-cyan-500/20 to-cyan-500/10 border-cyan-500/30',
    pink: 'from-pink-500/20 to-pink-500/10 border-pink-500/30',
    yellow: 'from-yellow-500/20 to-yellow-500/10 border-yellow-500/30',
  };
  
  const textClasses = {
    violet: 'text-violet-400',
    cyan: 'text-cyan-400',
    pink: 'text-pink-400',
    yellow: 'text-yellow-400',
  };
  
  return (
    <div className={`
      bg-gradient-to-br ${colorClasses[color]} 
      rounded-xl p-4 border
      ${highlight ? 'animate-pulse' : ''}
    `}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`font-display text-3xl font-bold ${textClasses[color]}`}>
        {value}
      </div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}

// Composant MatchCard
function MatchCard({ match, navigate }) {
  return (
    <div
      onClick={() => navigate(`/match/${match.id}`)}
      className="glass-card border-pink-500/30 p-4 cursor-pointer transition-all duration-300 hover:border-pink-400 hover:-translate-y-1 hover:shadow-glow-pink"
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-400 rounded font-bold">
          {match.tournaments?.name || 'Tournoi'}
        </span>
        {match.scheduled_at && (
          <span className="text-xs text-pink-400 font-medium">
            📅 {new Date(match.scheduled_at).toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        )}
      </div>
      <div className="text-white font-medium">
        Round {match.round_number} • Match #{match.match_number}
      </div>
      <div className="mt-2 flex justify-end">
        <span className="text-sm text-pink-400">Voir le match →</span>
      </div>
    </div>
  );
}

// Composant TournamentCard amélioré
function TournamentCard({ tournament, onClick, variant = 'default' }) {
  const statusConfig = {
    draft: { bg: 'from-orange-500 to-amber-500', text: 'Inscriptions', icon: '📝' },
    open: { bg: 'from-green-500 to-emerald-500', text: 'Inscriptions ouvertes', icon: '✅' },
    ongoing: { bg: 'from-violet-600 to-cyan-500', text: 'En cours', icon: '⚔️' },
    completed: { bg: 'from-gray-500 to-gray-600', text: 'Terminé', icon: '🏁' },
  };
  
  const config = statusConfig[tournament.status] || statusConfig.draft;
  
  const borderColor = {
    registered: 'border-violet-500/30 hover:border-violet-400',
    followed: 'border-yellow-500/30 hover:border-yellow-400',
    available: 'border-cyan-500/30 hover:border-cyan-400',
    default: 'border-gray-700 hover:border-violet-400',
  };
  
  return (
    <div 
      onClick={onClick}
      className={`
        glass-card ${borderColor[variant]} p-4 cursor-pointer 
        transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
        relative
      `}
    >
      {/* Badge variant */}
      {variant === 'followed' && (
        <div className="absolute top-3 right-3 text-xl">⭐</div>
      )}
      
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded text-xs font-bold">
            {tournament.game}
          </span>
          {tournament.cashprize_total > 0 && (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">
              💰 {tournament.cashprize_total}€
            </span>
          )}
        </div>
        <h3 className="font-display text-lg text-white font-bold line-clamp-1">
          {tournament.name}
        </h3>
      </div>
      
      {/* Infos */}
      <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-3">
        <span className="flex items-center gap-1">
          📊 {tournament.format}
        </span>
        <span className="flex items-center gap-1">
          👥 {tournament.max_participants}
        </span>
        {tournament.start_date && (
          <span className="flex items-center gap-1">
            📅 {new Date(tournament.start_date).toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'short' 
            })}
          </span>
        )}
      </div>
      
      {/* Footer */}
      <div className="pt-3 border-t border-gray-700/50 flex justify-between items-center">
        <span className={`bg-gradient-to-r ${config.bg} px-3 py-1 rounded-lg text-xs font-bold text-white`}>
          {config.icon} {config.text}
        </span>
        <span className="text-violet-400 text-sm font-medium">
          Voir →
        </span>
      </div>
    </div>
  );
}
