import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import DashboardLayout from './layouts/DashboardLayout';
import TeamInvitations from './components/TeamInvitations';
import clsx from 'clsx';

// Tabs pour la navigation interne
const TABS = [
  { id: 'overview', label: 'Aperçu', icon: '🏠' },
  { id: 'tournaments', label: 'Tournois', icon: '🏆' },
  { id: 'teams', label: 'Équipes', icon: '👥' },
  { id: 'matches', label: 'Matchs', icon: '⚔️' },
  { id: 'activity', label: 'Historique', icon: '📜' },
];

export default function PlayerDashboard({ session }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [myTeams, setMyTeams] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) fetchPlayerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchPlayerData = async () => {
    setLoading(true);
    try {
      // Récupérer mes équipes (capitaine ou membre)
      const [captainResult, memberResult, tempTeamsResult] = await Promise.all([
        supabase.from('teams').select('*').eq('captain_id', session.user.id),
        supabase.from('team_members').select('team_id, teams(*)').eq('user_id', session.user.id),
        supabase.from('temporary_teams').select('id, tournament_id, name').eq('captain_id', session.user.id),
      ]);

      const captainTeams = captainResult.data || [];
      const memberTeams = (memberResult.data || []).map(m => m.teams).filter(Boolean);
      const allTeams = [...captainTeams, ...memberTeams];
      const uniqueTeams = Array.from(new Map(allTeams.map(t => [t.id, t])).values());
      setMyTeams(uniqueTeams);

      // IDs des équipes
      const teamIds = uniqueTeams.map(t => t.id);
      const tempTeamIds = (tempTeamsResult.data || []).map(t => t.id);
      const tempTournamentIds = (tempTeamsResult.data || []).map(t => t.tournament_id);

      // Récupérer les tournois
      let tournamentIds = [...tempTournamentIds];
      if (teamIds.length > 0) {
        const { data: participants } = await supabase
          .from('participants')
          .select('tournament_id')
          .in('team_id', teamIds);
        tournamentIds = [...new Set([...tournamentIds, ...(participants || []).map(p => p.tournament_id)])];
      }

      if (tournamentIds.length > 0) {
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('*')
          .in('id', tournamentIds)
          .order('start_date', { ascending: false });
        setMyTournaments(tournaments || []);
      }

      // Récupérer les matchs (à venir + récents)
      const allTeamIds = [...teamIds, ...tempTeamIds];
      if (allTeamIds.length > 0) {
        const { data: pendingMatches } = await supabase
          .from('matches')
          .select('*, tournament:tournament_id(name, game)')
          .or(`player1_id.in.(${allTeamIds.join(',')}),player2_id.in.(${allTeamIds.join(',')})`)
          .in('status', ['pending', 'in_progress'])
          .order('scheduled_at', { ascending: true })
          .limit(10);

        // Enrichir avec noms d'équipes
        if (pendingMatches?.length > 0) {
          const matchTeamIds = [...new Set(pendingMatches.flatMap(m => [m.player1_id, m.player2_id]).filter(Boolean))];
          const { data: teamsData } = await supabase.from('teams').select('id, name').in('id', matchTeamIds);
          const teamsMap = Object.fromEntries((teamsData || []).map(t => [t.id, t]));
          
          setUpcomingMatches(pendingMatches.map(m => ({
            ...m,
            team1: teamsMap[m.player1_id],
            team2: teamsMap[m.player2_id],
          })));
        }

        // Résultats récents
        const { data: completedMatches } = await supabase
          .from('matches')
          .select('*, tournament:tournament_id(name, game)')
          .or(`player1_id.in.(${allTeamIds.join(',')}),player2_id.in.(${allTeamIds.join(',')})`)
          .eq('status', 'completed')
          .order('updated_at', { ascending: false })
          .limit(10);

        if (completedMatches?.length > 0) {
          const matchTeamIds = [...new Set(completedMatches.flatMap(m => [m.player1_id, m.player2_id]).filter(Boolean))];
          const { data: teamsData } = await supabase.from('teams').select('id, name').in('id', matchTeamIds);
          const teamsMap = Object.fromEntries((teamsData || []).map(t => [t.id, t]));
          
          setRecentResults(completedMatches.map(m => ({
            ...m,
            team1: teamsMap[m.player1_id],
            team2: teamsMap[m.player2_id],
          })));
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats calculées
  const stats = useMemo(() => ({
    teams: myTeams.length,
    tournaments: myTournaments.length,
    ongoing: myTournaments.filter(t => t.status === 'ongoing').length,
    wins: recentResults.filter(m => {
      const myTeamIds = myTeams.map(t => t.id);
      const isPlayer1 = myTeamIds.includes(m.player1_id);
      return isPlayer1 ? m.score_p1 > m.score_p2 : m.score_p2 > m.score_p1;
    }).length,
    upcomingMatches: upcomingMatches.length,
  }), [myTeams, myTournaments, recentResults, upcomingMatches]);

  if (loading) {
    return (
      <DashboardLayout session={session}>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout session={session}>
      {/* Hero Banner */}
      <div className="relative mb-8 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/30 via-cyan-600/20 to-pink-600/30" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="relative px-8 py-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-violet-500/30">
              {session?.user?.user_metadata?.username?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-1">
                {session?.user?.user_metadata?.username || 'Joueur'}
              </h1>
              <p className="text-gray-400">
                {stats.teams} équipe{stats.teams > 1 ? 's' : ''} • {stats.tournaments} tournoi{stats.tournaments > 1 ? 's' : ''}
              </p>
            </div>
            <div className="ml-auto flex gap-3">
              <button
                onClick={() => navigate('/play')}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-medium transition-all"
              >
                🔍 Explorer
              </button>
              <button
                onClick={() => navigate('/create-team')}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20"
              >
                + Créer une équipe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 mb-8 bg-[#161b22] rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <OverviewTab
          stats={stats}
          upcomingMatches={upcomingMatches}
          recentResults={recentResults}
          myTournaments={myTournaments}
          myTeams={myTeams}
          session={session}
          navigate={navigate}
          onRefresh={fetchPlayerData}
        />
      )}
      {activeTab === 'tournaments' && (
        <TournamentsTab tournaments={myTournaments} navigate={navigate} />
      )}
      {activeTab === 'teams' && (
        <TeamsTab teams={myTeams} session={session} navigate={navigate} />
      )}
      {activeTab === 'matches' && (
        <MatchesTab upcomingMatches={upcomingMatches} recentResults={recentResults} navigate={navigate} />
      )}
      {activeTab === 'activity' && (
        <ActivityTab recentResults={recentResults} myTournaments={myTournaments} />
      )}
    </DashboardLayout>
  );
}

// ============== TAB COMPONENTS ==============

function OverviewTab({ stats, upcomingMatches, recentResults, myTournaments, myTeams, session, navigate, onRefresh }) {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard value={stats.teams} label="Équipes" icon="👥" color="violet" />
        <StatCard value={stats.tournaments} label="Tournois" icon="🏆" color="cyan" />
        <StatCard value={stats.ongoing} label="En cours" icon="⚡" color="green" highlight />
        <StatCard value={stats.upcomingMatches} label="Matchs à venir" icon="📅" color="pink" highlight={stats.upcomingMatches > 0} />
        <StatCard value={stats.wins} label="Victoires" icon="🎖️" color="yellow" />
      </div>

      {/* Team Invitations */}
      <TeamInvitations userId={session?.user?.id} onUpdate={onRefresh} />

      {/* Two columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Matchs à venir */}
        <div className="bg-[#161b22] rounded-xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-display font-semibold text-white flex items-center gap-2">
              <span className="text-lg">⚔️</span> À jouer
            </h3>
            {upcomingMatches.length > 0 && (
              <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-xs rounded-full font-medium">
                {upcomingMatches.length}
              </span>
            )}
          </div>
          <div className="p-4">
            {upcomingMatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingMatches.slice(0, 4).map(match => (
                  <MatchRow key={match.id} match={match} navigate={navigate} type="upcoming" />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-6">Aucun match à venir</p>
            )}
          </div>
        </div>

        {/* Derniers résultats */}
        <div className="bg-[#161b22] rounded-xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-display font-semibold text-white flex items-center gap-2">
              <span className="text-lg">📊</span> Derniers résultats
            </h3>
          </div>
          <div className="p-4">
            {recentResults.length > 0 ? (
              <div className="space-y-3">
                {recentResults.slice(0, 4).map(match => (
                  <MatchRow key={match.id} match={match} navigate={navigate} type="result" />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-6">Aucun résultat récent</p>
            )}
          </div>
        </div>
      </div>

      {/* Mes équipes (aperçu) */}
      {myTeams.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white flex items-center gap-2">
              <span className="text-lg">👥</span> Mes équipes
            </h3>
            <button
              onClick={() => navigate('/my-team')}
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              Voir tout →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {myTeams.slice(0, 3).map(team => (
              <TeamCard key={team.id} team={team} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* Tournois en cours */}
      {myTournaments.filter(t => t.status === 'ongoing').length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white flex items-center gap-2">
              <span className="text-lg">🔥</span> Tournois en cours
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myTournaments.filter(t => t.status === 'ongoing').slice(0, 3).map(tournament => (
              <TournamentCard key={tournament.id} tournament={tournament} navigate={navigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TournamentsTab({ tournaments, navigate }) {
  const [filter, setFilter] = useState('all');
  
  const filtered = useMemo(() => {
    if (filter === 'all') return tournaments;
    return tournaments.filter(t => t.status === filter);
  }, [tournaments, filter]);

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'all', label: 'Tous' },
          { id: 'ongoing', label: 'En cours' },
          { id: 'open', label: 'Inscriptions' },
          { id: 'completed', label: 'Terminés' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              filter === f.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-[#161b22] text-gray-400 hover:text-white'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tournament => (
            <TournamentCard key={tournament.id} tournament={tournament} navigate={navigate} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🏆"
          title="Aucun tournoi"
          description="Explorez les tournois disponibles et inscrivez-vous !"
          action={{ label: 'Explorer', onClick: () => navigate('/play') }}
        />
      )}
    </div>
  );
}

function TeamsTab({ teams, session, navigate }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400">
          {teams.length} équipe{teams.length > 1 ? 's' : ''}
        </p>
        <button
          onClick={() => navigate('/create-team')}
          className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition-colors"
        >
          + Créer une équipe
        </button>
      </div>

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <TeamCard key={team.id} team={team} session={session} navigate={navigate} showDetails />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="👥"
          title="Aucune équipe"
          description="Créez votre première équipe ou rejoignez-en une !"
          action={{ label: 'Créer une équipe', onClick: () => navigate('/create-team') }}
        />
      )}
    </div>
  );
}

function MatchesTab({ upcomingMatches, recentResults, navigate }) {
  const [tab, setTab] = useState('upcoming');

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('upcoming')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'upcoming'
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
              : 'bg-[#161b22] text-gray-400 hover:text-white'
          )}
        >
          À jouer ({upcomingMatches.length})
        </button>
        <button
          onClick={() => setTab('results')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'results'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-[#161b22] text-gray-400 hover:text-white'
          )}
        >
          Résultats ({recentResults.length})
        </button>
      </div>

      {tab === 'upcoming' && (
        upcomingMatches.length > 0 ? (
          <div className="space-y-3">
            {upcomingMatches.map(match => (
              <MatchRow key={match.id} match={match} navigate={navigate} type="upcoming" expanded />
            ))}
          </div>
        ) : (
          <EmptyState icon="⚔️" title="Aucun match à venir" description="Inscrivez-vous à des tournois pour participer !" />
        )
      )}

      {tab === 'results' && (
        recentResults.length > 0 ? (
          <div className="space-y-3">
            {recentResults.map(match => (
              <MatchRow key={match.id} match={match} navigate={navigate} type="result" expanded />
            ))}
          </div>
        ) : (
          <EmptyState icon="📊" title="Aucun résultat" description="Jouez des matchs pour voir vos résultats ici" />
        )
      )}
    </div>
  );
}

function ActivityTab({ recentResults, myTournaments: _myTournaments }) {
  // Combine et trie les événements par date
  const activities = useMemo(() => {
    const items = [];
    
    recentResults.forEach(m => {
      items.push({
        type: 'match',
        date: m.updated_at,
        data: m,
      });
    });
    
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
  }, [recentResults]);

  return (
    <div>
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-lg flex-shrink-0">
                {activity.type === 'match' ? '⚔️' : '🏆'}
              </div>
              <div className="flex-1 bg-[#161b22] rounded-lg p-4 border border-white/10">
                <p className="text-white text-sm">
                  Match terminé: <span className="font-medium">{activity.data.team1?.name || 'Équipe 1'}</span> vs <span className="font-medium">{activity.data.team2?.name || 'Équipe 2'}</span>
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Score: {activity.data.score_p1} - {activity.data.score_p2} • {activity.data.tournament?.name}
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  {new Date(activity.date).toLocaleDateString('fr-FR', { 
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="📜" title="Aucune activité" description="Votre historique d'activité apparaîtra ici" />
      )}
    </div>
  );
}

// ============== SHARED COMPONENTS ==============

function StatCard({ value, label, icon, color, highlight = false }) {
  const colors = {
    violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/30 text-pink-400',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400',
  };

  return (
    <div className={clsx(
      'bg-gradient-to-br rounded-xl p-4 border',
      colors[color],
      highlight && value > 0 && 'ring-2 ring-offset-2 ring-offset-[#0d1117]'
    )}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function MatchRow({ match, navigate, type, expanded: _expanded = false }) {
  return (
    <div
      onClick={() => navigate(`/match/${match.id}`)}
      className={clsx(
        'flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all',
        'bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">
          {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {match.tournament?.name} • Round {match.round_number}
        </p>
      </div>
      {type === 'result' && (
        <div className="text-lg font-bold text-white">
          {match.score_p1} - {match.score_p2}
        </div>
      )}
      {type === 'upcoming' && match.scheduled_at && (
        <div className="text-xs text-pink-400 whitespace-nowrap">
          {new Date(match.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

function TournamentCard({ tournament, navigate }) {
  const statusColors = {
    ongoing: 'bg-green-500/20 text-green-400',
    open: 'bg-cyan-500/20 text-cyan-400',
    draft: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <div
      onClick={() => navigate(`/player/tournament/${tournament.id}`)}
      className="bg-[#161b22] rounded-xl p-5 border border-white/10 hover:border-cyan-500/30 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-display font-semibold text-white truncate">{tournament.name}</h4>
          <p className="text-sm text-gray-400">{tournament.game}</p>
        </div>
        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[tournament.status])}>
          {tournament.status === 'ongoing' ? 'En cours' : tournament.status === 'open' ? 'Inscriptions' : tournament.status === 'completed' ? 'Terminé' : 'Brouillon'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {tournament.start_date && (
          <span>📅 {new Date(tournament.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
        )}
        <span>📊 {tournament.format}</span>
      </div>
    </div>
  );
}

function TeamCard({ team, session, navigate, showDetails = false }) {
  const isCaptain = session?.user?.id === team.captain_id;

  return (
    <div
      onClick={() => navigate('/my-team')}
      className="bg-[#161b22] rounded-xl p-5 border border-white/10 hover:border-violet-500/30 cursor-pointer transition-all"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center text-xl">
          {team.logo_url ? <img src={team.logo_url} alt="" className="w-full h-full rounded-xl object-cover" /> : '👥'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display font-semibold text-white truncate">{team.name}</h4>
          <p className="text-xs text-gray-400">[{team.tag}]</p>
        </div>
        {isCaptain && (
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Capitaine</span>
        )}
      </div>
      {showDetails && team.game && (
        <p className="text-sm text-gray-500">{team.game}</p>
      )}
    </div>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <div className="bg-[#161b22] rounded-xl p-12 text-center border border-white/10">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-display font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-lg font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
