/**
 * ORGANIZER DASHBOARD - Version Convex
 * 
 * Dashboard organisateur utilisant Convex au lieu de Supabase
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import { AdminGamingAccountRequests } from './components/admin';
import { GlassCard, GradientButton, NeonBadge } from './shared/components/ui';
import { Search, Plus, Settings, Trash2, Gamepad2, Eye, Trophy, Clock, FileEdit, CheckCircle2 } from 'lucide-react';
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

const statusBadgeVariant = {
  active: "live",
  ongoing: "live",
  draft: "draft",
  completed: "completed",
};

const statusLabels = {
  active: "En cours",
  ongoing: "En cours",
  draft: "Brouillon",
  completed: "Terminé",
};

const filterConfig = [
  { key: 'all', label: 'Total', color: 'from-purple-500 to-indigo-500', icon: Trophy },
  { key: 'active', label: 'En cours', color: 'from-emerald-500 to-cyan-500', icon: Clock },
  { key: 'draft', label: 'Brouillons', color: 'from-amber-500 to-orange-500', icon: FileEdit },
  { key: 'completed', label: 'Terminés', color: 'from-blue-500 to-indigo-500', icon: CheckCircle2 },
];

export default function OrganizerDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showGamingRequests, setShowGamingRequests] = useState(false);
  const navigate = useNavigate();
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();

  // Données Convex
  const convexUser = useQuery(api.users.getCurrent);

  // Tournois de l'organisateur
  const tournaments = useQuery(
    api.tournaments.listByOrganizer,
    convexUser?._id ? { organizerId: convexUser._id } : "skip"
  );

  // Compteur de demandes en attente (si admin/organizer)
  const pendingRequestsCount = useQuery(
    api.gamingAccounts.countPending,
    convexUser?.role === "organizer" ? {} : "skip"
  );

  // Mutation pour supprimer un tournoi
  const deleteTournamentMutation = useMutation(api.tournamentsMutations.remove);

  const deleteTournament = async (e, tournamentId) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("⚠️ Supprimer ce tournoi définitivement ?")) return;

    try {
      await deleteTournamentMutation({ tournamentId });
      toast.success("Tournoi supprimé");
    } catch (error) {
      toast.error("Erreur: " + error.message);
    }
  };

  // Stats calculées
  const stats = useMemo(() => {
    const list = tournaments || [];
    return {
      total: list.length,
      active: list.filter(t => t.status === 'ongoing' || t.status === 'active').length,
      draft: list.filter(t => t.status === 'draft').length,
      completed: list.filter(t => t.status === 'completed').length,
    };
  }, [tournaments]);

  // Filter tournaments
  const filteredTournaments = useMemo(() => {
    let filtered = tournaments || [];

    if (activeFilter !== 'all') {
      if (activeFilter === 'active') {
        filtered = filtered.filter(t => t.status === 'ongoing' || t.status === 'active');
      } else {
        filtered = filtered.filter(t => t.status === activeFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.game?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [tournaments, searchQuery, activeFilter]);

  const getFilterCount = (key) => {
    if (key === 'all') return stats.total;
    if (key === 'active') return stats.active;
    if (key === 'draft') return stats.draft;
    if (key === 'completed') return stats.completed;
    return 0;
  };

  // Chargement
  const loading = !isLoaded || convexUser === undefined || tournaments === undefined;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-[#00F5FF]/30 border-t-[#00F5FF] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

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

        {/* Main Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#F8FAFC]">Mes Tournois</h1>
              <p className="text-[#94A3B8]">{stats.total} tournois • {stats.active} en cours</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGamingRequests(!showGamingRequests)}
                className={clsx(
                  'relative px-4 py-2.5 rounded-lg font-medium transition-all border',
                  showGamingRequests
                    ? 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/50'
                    : 'bg-[#0D0D14] text-[#94A3B8] border-[rgba(148,163,184,0.1)] hover:text-[#F8FAFC] hover:border-[#8B5CF6]/30'
                )}
              >
                🎮 Demandes Gaming
                {(pendingRequestsCount || 0) > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#FF3E9D] text-white text-xs rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(255,62,157,0.5)]">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
              <GradientButton onClick={() => navigate('/create-tournament')}>
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nouveau tournoi
                </span>
              </GradientButton>
            </div>
          </div>

          {/* Gaming Account Requests Section */}
          {showGamingRequests && (
            <GlassCard className="mb-8">
              <AdminGamingAccountRequests userId={convexUser?._id} />
            </GlassCard>
          )}

          {/* Stats Filter Bar */}
          <div className="mb-6 flex flex-wrap gap-3">
            {filterConfig.map(({ key, label, color, icon: Icon }) => {
              const isActive = activeFilter === key;
              const count = getFilterCount(key);
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={clsx(
                    "group relative overflow-hidden rounded-full px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-2",
                    isActive
                      ? `bg-gradient-to-r ${color} text-white shadow-lg`
                      : "bg-[#0D0D14] border border-[rgba(148,163,184,0.1)] text-[#94A3B8] hover:bg-[#1a1a24] hover:text-[#F8FAFC]"
                  )}
                  style={isActive ? { boxShadow: "0 0 20px rgba(99,102,241,0.3)" } : {}}
                >
                  <Icon className="h-4 w-4" />
                  <span>{count} {label}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Rechercher un tournoi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[rgba(13,13,20,0.8)] py-3 pl-12 pr-4 text-[#F8FAFC] placeholder-[#94A3B8] backdrop-blur-xl transition-all focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
            />
          </div>

          {/* Tournament Grid */}
          {filteredTournaments.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTournaments.map((tournament) => (
                <TournamentCard
                  key={tournament._id}
                  tournament={tournament}
                  onDelete={deleteTournament}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="text-center py-12">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-[#F8FAFC] mb-2">
                {searchQuery || activeFilter !== 'all' ? 'Aucun résultat' : 'Créez votre premier tournoi'}
              </h3>
              <p className="text-[#94A3B8] mb-6">
                {searchQuery || activeFilter !== 'all'
                  ? 'Essayez avec d\'autres filtres'
                  : 'Lancez-vous et organisez votre première compétition !'
                }
              </p>
              {!searchQuery && activeFilter === 'all' && (
                <GradientButton onClick={() => navigate('/create-tournament')}>
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Créer un tournoi
                  </span>
                </GradientButton>
              )}
            </GlassCard>
          )}
        </div>
      </div>

      {/* CSS for floating animation */}
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

// Tournament Card Component with V0 style
function TournamentCard({ tournament, onDelete }) {
  const navigate = useNavigate();

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFormatLabel = (format) => {
    switch (format) {
      case 'elimination': return 'Élimination';
      case 'double_elimination': return 'Double Élim.';
      case 'round_robin': return 'Round Robin';
      case 'swiss': return 'Suisse';
      default: return format;
    }
  };

  return (
    <GlassCard>
      <div className="flex flex-col gap-4">
        {/* Game icon and status */}
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-pink-500/20 text-red-400 overflow-hidden">
            {tournament.logoUrl ? (
              <img src={tournament.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Gamepad2 className="h-6 w-6" />
            )}
          </div>
          <NeonBadge variant={statusBadgeVariant[tournament.status] || 'draft'}>
            {statusLabels[tournament.status] || 'Brouillon'}
          </NeonBadge>
        </div>

        {/* Tournament info */}
        <div>
          <h3 className="mb-1 text-lg font-bold text-[#F8FAFC]">{tournament.name}</h3>
          <span className="inline-block rounded-md bg-[#1a1a24] px-2 py-0.5 text-xs font-medium text-[#94A3B8]">
            {tournament.game || 'Jeu non défini'}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tournament.startDate && (
            <span className="rounded-full bg-[#1a1a24] px-3 py-1 text-xs text-[#94A3B8]">
              📅 {formatDate(tournament.startDate)}
            </span>
          )}
          <span className="rounded-full bg-[#1a1a24] px-3 py-1 text-xs text-[#94A3B8]">
            {tournament.format === 'double_elimination' ? '🔄' : '⚔️'} {getFormatLabel(tournament.format)}
          </span>
          {tournament.maxTeams && (
            <span className="rounded-full bg-[#1a1a24] px-3 py-1 text-xs text-[#94A3B8]">
              👥 {tournament.maxTeams}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-[rgba(148,163,184,0.1)] pt-4">
          <GradientButton
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/organizer/tournament/${tournament._id}`);
            }}
          >
            Gérer
          </GradientButton>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/tournament/${tournament._id}`, '_blank');
            }}
            className="rounded-lg bg-[#1a1a24] p-2.5 text-[#94A3B8] transition-colors hover:bg-[#2a2a34] hover:text-[#00F5FF]"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => onDelete(e, tournament._id)}
            className="rounded-lg bg-[#1a1a24] p-2.5 text-[#94A3B8] transition-colors hover:bg-red-500/20 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
