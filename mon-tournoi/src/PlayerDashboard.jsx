/**
 * PLAYER DASHBOARD - Version Convex
 * 
 * Dashboard joueur utilisant Convex au lieu de Supabase
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import DashboardLayout from './layouts/DashboardLayout';
import TeamInvitations from './components/TeamInvitations';
import { GlassCard, GradientButton, NeonBadge, StatCard } from './shared/components/ui';
import { Gamepad2, Trophy, Users, Swords, History, Clock, Medal, Zap, LayoutDashboard, Search, Plus } from 'lucide-react';
import clsx from 'clsx';

/**
 * Floating particles for background effect
 */
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-[#8B5CF6]/30 animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${5 + Math.random() * 10}s`,
            animationDelay: `${Math.random() * 5}s`
          }}
        />
      ))}
    </div>
  );
}

// Tabs
const TABS = [
  { id: 'overview', label: 'Aperçu', icon: LayoutDashboard },
  { id: 'tournaments', label: 'Tournois', icon: Trophy },
  { id: 'teams', label: 'Équipes', icon: Users },
  { id: 'matches', label: 'Matchs', icon: Swords },
  { id: 'activity', label: 'Historique', icon: History },
];

export default function PlayerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();

  // Données Convex
  const convexUser = useQuery(api.users.getCurrent);
  const userStats = useQuery(api.users.getStats, {});

  // Équipes de l'utilisateur
  const myTeams = useQuery(
    api.teams.listByUser,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Tournois où l'utilisateur participe
  const myTournaments = useQuery(
    api.tournaments.listByParticipant,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Matchs à venir et récents
  const upcomingMatches = useQuery(
    api.matches.listUpcoming,
    convexUser?._id ? { userId: convexUser._id, limit: 10 } : "skip"
  );

  const recentMatches = useQuery(
    api.matches.listRecent,
    convexUser?._id ? { userId: convexUser._id, limit: 10 } : "skip"
  );

  // Stats calculées
  const stats = useMemo(() => {
    const teams = myTeams || [];
    const tournaments = myTournaments || [];
    const matches = recentMatches || [];

    return {
      teams: teams.length,
      tournaments: tournaments.length,
      ongoing: tournaments.filter(t => t.status === 'ongoing').length,
      wins: userStats?.wins || 0,
      upcomingMatches: (upcomingMatches || []).length,
    };
  }, [myTeams, myTournaments, recentMatches, upcomingMatches, userStats]);

  // Chargement
  const loading = !isLoaded || convexUser === undefined || myTeams === undefined;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-[#00F5FF]/30 border-t-[#00F5FF] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const username = convexUser?.username || clerkUser?.firstName || 'Joueur';
  const teamsList = myTeams || [];
  const tournamentsList = myTournaments || [];
  const upcomingMatchesList = upcomingMatches || [];
  const recentResultsList = recentMatches || [];

  return (
    <DashboardLayout>
      {/* Background effects */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-purple-500/10 blur-[128px]" />
          <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[128px]" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-pink-500/10 blur-[128px]" />
        </div>
        <FloatingParticles />

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <GlassCard className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-cyan-600/5 to-pink-600/10" />
            <div className="relative flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-4xl font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {username}
                </h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <span className="px-3 py-1 rounded-full bg-[#161b22] border border-white/10 text-xs text-[#94A3B8]">
                    {stats.teams} équipe{stats.teams > 1 ? 's' : ''}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#161b22] border border-white/10 text-xs text-[#94A3B8]">
                    {stats.tournaments} tournoi{stats.tournaments > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <GradientButton variant="secondary" onClick={() => navigate('/play')}>
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Explorer
                  </span>
                </GradientButton>
                <GradientButton variant="primary" onClick={() => navigate('/create-team')}>
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Créer équipe
                  </span>
                </GradientButton>
              </div>
            </div>
          </GlassCard>

          {/* Navigation Tabs */}
          <div className="flex gap-2 pb-2 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#6366F1]/20 to-[#00F5FF]/20 text-[#00F5FF] border border-[#00F5FF]/30 shadow-[0_0_10px_rgba(0,245,255,0.2)]'
                    : 'bg-[#0D0D14] text-[#94A3B8] border border-[rgba(148,163,184,0.1)] hover:text-white hover:border-[#6366F1]/30'
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats}
              upcomingMatches={upcomingMatchesList}
              recentResults={recentResultsList}
              myTournaments={tournamentsList}
              myTeams={teamsList}
              convexUser={convexUser}
              navigate={navigate}
            />
          )}

          {activeTab === 'tournaments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournamentsList.map(t => (
                <TournamentCard key={t._id} tournament={t} navigate={navigate} />
              ))}
              {tournamentsList.length === 0 && <EmptyState icon="🏆" label="Aucun tournoi" />}
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamsList.map(t => (
                <TeamCard key={t._id} team={t} convexUser={convexUser} navigate={navigate} />
              ))}
              {teamsList.length === 0 && <EmptyState icon="👥" label="Aucune équipe" />}
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Matchs à venir</h3>
              <div className="space-y-4">
                {upcomingMatchesList.length > 0 ? (
                  upcomingMatchesList.map(m => (
                    <MatchRow key={m._id} match={m} navigate={navigate} type="upcoming" />
                  ))
                ) : (
                  <p className="text-[#94A3B8]">Aucun match prévu</p>
                )}
              </div>

              <h3 className="text-xl font-bold text-white pt-6">Derniers résultats</h3>
              <div className="space-y-4">
                {recentResultsList.length > 0 ? (
                  recentResultsList.map(m => (
                    <MatchRow key={m._id} match={m} navigate={navigate} type="result" />
                  ))
                ) : (
                  <p className="text-[#94A3B8]">Aucun résultat récent</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <GlassCard className="text-center py-12">
              <History className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Historique d'activité</h3>
              <p className="text-[#94A3B8]">Vos activités récentes apparaîtront ici.</p>
            </GlassCard>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.8; }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </DashboardLayout>
  );
}

function OverviewTab({ stats, upcomingMatches, recentResults, myTournaments, myTeams, convexUser, navigate }) {
  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard value={stats.teams} label="Équipes" icon={<Users />} color="violet" />
        <StatCard value={stats.tournaments} label="Tournois" icon={<Trophy />} color="cyan" />
        <StatCard value={stats.ongoing} label="En cours" icon={<Zap />} color="emerald" />
        <StatCard value={stats.upcomingMatches} label="À jouer" icon={<GameController />} color="pink" />
        <StatCard value={stats.wins} label="Victoires" icon={<Medal />} color="amber" />
      </div>

      <TeamInvitations userId={convexUser?._id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Matchs à venir */}
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Swords className="h-5 w-5 text-[#FF3E9D]" />
              Prochains Matchs
            </h3>
            {upcomingMatches.length > 0 && (
              <NeonBadge variant="live">{upcomingMatches.length}</NeonBadge>
            )}
          </div>
          <div className="space-y-3">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.slice(0, 4).map(m => (
                <MatchRow key={m._id} match={m} navigate={navigate} type="upcoming" />
              ))
            ) : (
              <p className="text-[#94A3B8] text-sm text-center py-4">Aucun match à venir</p>
            )}
          </div>
        </GlassCard>

        {/* Résultats */}
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-[#00F5FF]" />
              Derniers Résultats
            </h3>
          </div>
          <div className="space-y-3">
            {recentResults.length > 0 ? (
              recentResults.slice(0, 4).map(m => (
                <MatchRow key={m._id} match={m} navigate={navigate} type="result" />
              ))
            ) : (
              <p className="text-[#94A3B8] text-sm text-center py-4">Aucun résultat récent</p>
            )}
          </div>
        </GlassCard>
      </div>

      {myTeams.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#8B5CF6]" />
            Mes Équipes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {myTeams.slice(0, 3).map(t => (
              <TeamCard key={t._id} team={t} convexUser={convexUser} navigate={navigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function GameController() {
  return <Gamepad2 className="h-6 w-6" />;
}

function MatchRow({ match, navigate, type }) {
  return (
    <div
      onClick={() => navigate(`/match/${match._id}`)}
      className="group flex items-center justify-between p-3 rounded-xl bg-[#1a1a24]/50 border border-white/5 hover:border-[#6366F1]/30 hover:bg-[#6366F1]/10 transition-all cursor-pointer"
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <span>{match.team1?.name || 'TBD'}</span>
          <span className="text-[#94A3B8] text-xs">vs</span>
          <span>{match.team2?.name || 'TBD'}</span>
        </div>
        <div className="text-xs text-[#94A3B8]">{match.tournament?.name}</div>
      </div>

      {type === 'upcoming' && match.scheduledAt && (
        <span className="text-xs font-medium text-[#FF3E9D] bg-[#FF3E9D]/10 px-2 py-1 rounded-lg">
          {new Date(match.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      )}

      {type === 'result' && (
        <span className="text-sm font-bold text-[#00F5FF]">
          {match.scoreTeam1 || 0} - {match.scoreTeam2 || 0}
        </span>
      )}
    </div>
  );
}

function TeamCard({ team, convexUser, navigate }) {
  const isCaptain = convexUser?._id === team.captainId;
  return (
    <GlassCard
      className="cursor-pointer hover:border-[#8B5CF6]/50 group transition-all"
      onClick={() => navigate('/my-team')}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#00F5FF]/20 flex items-center justify-center text-xl overflow-hidden border border-white/10">
          {team.logoUrl ? <img src={team.logoUrl} alt="" className="w-full h-full object-cover" /> : '🛡️'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white truncate group-hover:text-[#8B5CF6] transition-colors">{team.name}</h4>
          <p className="text-xs text-[#94A3B8]">[{team.tag}]</p>
        </div>
        {isCaptain && <NeonBadge variant="warning">Capitaine</NeonBadge>}
      </div>
    </GlassCard>
  );
}

function TournamentCard({ tournament, navigate }) {
  const statusLabels = { ongoing: 'En cours', open: 'Inscriptions', draft: 'Brouillon', completed: 'Terminé' };
  const badgeVariant = { ongoing: 'live', open: 'upcoming', completed: 'completed', draft: 'draft' };

  return (
    <GlassCard
      className="cursor-pointer hover:border-[#00F5FF]/50 group transition-all"
      onClick={() => navigate(`/player/tournament/${tournament._id}`)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#1a1a24] flex items-center justify-center">
          {tournament.logoUrl ? <img src={tournament.logoUrl} className="w-full h-full object-cover rounded-lg" /> : <Trophy className="h-5 w-5 text-[#00F5FF]" />}
        </div>
        <NeonBadge variant={badgeVariant[tournament.status] || 'draft'}>
          {statusLabels[tournament.status] || tournament.status}
        </NeonBadge>
      </div>
      <h4 className="font-bold text-white mb-1 group-hover:text-[#00F5FF] transition-colors">{tournament.name}</h4>
      <p className="text-xs text-[#94A3B8] flex items-center gap-2">
        <span>{tournament.game}</span>
        <span>•</span>
        <span>{tournament.format}</span>
      </p>
    </GlassCard>
  );
}

function EmptyState({ icon, label }) {
  return (
    <div className="py-8 text-center">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-[#94A3B8]">{label}</p>
    </div>
  );
}
