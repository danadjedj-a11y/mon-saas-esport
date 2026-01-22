import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import { AdminGamingAccountRequests } from './components/admin';
import clsx from 'clsx';

export default function OrganizerDashboard({ session }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showGamingRequests, setShowGamingRequests] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      fetchData();
      fetchPendingRequestsCount();
    }
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: tournamentsData, error: tError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false });

      if (tError) throw tError;
      setTournaments(tournamentsData || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequestsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('gaming_account_change_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!error) {
        setPendingRequestsCount(count || 0);
      }
    } catch (error) {
      // Table might not exist yet
      console.log('Table gaming_account_change_requests not found');
    }
  };

  const deleteTournament = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("⚠️ Supprimer ce tournoi définitivement ?")) return;

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success("Tournoi supprimé");
      setTournaments(tournaments.filter(t => t.id !== id));
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: tournaments.length,
    active: tournaments.filter(t => t.status === 'ongoing' || t.status === 'active').length,
    draft: tournaments.filter(t => t.status === 'draft').length,
    completed: tournaments.filter(t => t.status === 'completed').length,
  }), [tournaments]);

  // Filter tournaments
  const filteredTournaments = useMemo(() => {
    let filtered = tournaments;
    
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ongoing':
      case 'active':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">En cours</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">Terminé</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">Brouillon</span>;
    }
  };

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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">
            Mes Tournois
          </h1>
          <p className="text-gray-400 mt-1">
            {stats.total} tournoi{stats.total > 1 ? 's' : ''} • {stats.active} en cours
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Gaming account requests button */}
          <button
            onClick={() => setShowGamingRequests(!showGamingRequests)}
            className={clsx(
              'relative px-4 py-2.5 rounded-lg font-medium transition-all',
              showGamingRequests
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50'
                : 'bg-[#161b22] text-gray-400 hover:text-white border border-white/10 hover:border-violet-500/30'
            )}
          >
            🎮 Demandes Gaming
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/create-tournament')}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20"
          >
            + Nouveau tournoi
          </button>
        </div>
      </div>

      {/* Gaming Account Requests Section */}
      {showGamingRequests && (
        <div className="mb-8 p-6 bg-[#161b22] rounded-xl border border-violet-500/30">
          <AdminGamingAccountRequests session={session} />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setActiveFilter('all')}
          className={clsx(
            'p-4 rounded-xl border transition-all text-left',
            activeFilter === 'all'
              ? 'bg-white/10 border-cyan-500/50'
              : 'bg-[#161b22] border-white/10 hover:border-white/20'
          )}
        >
          <div className="text-3xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">Total</div>
        </button>
        <button
          onClick={() => setActiveFilter('active')}
          className={clsx(
            'p-4 rounded-xl border transition-all text-left',
            activeFilter === 'active'
              ? 'bg-green-500/10 border-green-500/50'
              : 'bg-[#161b22] border-white/10 hover:border-green-500/30'
          )}
        >
          <div className="text-3xl font-bold text-green-400">{stats.active}</div>
          <div className="text-sm text-gray-400">En cours</div>
        </button>
        <button
          onClick={() => setActiveFilter('draft')}
          className={clsx(
            'p-4 rounded-xl border transition-all text-left',
            activeFilter === 'draft'
              ? 'bg-yellow-500/10 border-yellow-500/50'
              : 'bg-[#161b22] border-white/10 hover:border-yellow-500/30'
          )}
        >
          <div className="text-3xl font-bold text-yellow-400">{stats.draft}</div>
          <div className="text-sm text-gray-400">Brouillons</div>
        </button>
        <button
          onClick={() => setActiveFilter('completed')}
          className={clsx(
            'p-4 rounded-xl border transition-all text-left',
            activeFilter === 'completed'
              ? 'bg-blue-500/10 border-blue-500/50'
              : 'bg-[#161b22] border-white/10 hover:border-blue-500/30'
          )}
        >
          <div className="text-3xl font-bold text-blue-400">{stats.completed}</div>
          <div className="text-sm text-gray-400">Terminés</div>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Rechercher un tournoi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 bg-[#161b22] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
        </div>
      </div>

      {/* Tournaments Grid */}
      {filteredTournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTournaments.map(tournament => (
            <TournamentCard 
              key={tournament.id} 
              tournament={tournament} 
              onDelete={deleteTournament}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#161b22] rounded-xl p-12 text-center border border-white/10">
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="text-xl font-display font-semibold text-white mb-2">
            {searchQuery || activeFilter !== 'all' ? 'Aucun résultat' : 'Créez votre premier tournoi'}
          </h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || activeFilter !== 'all'
              ? 'Essayez avec d\'autres filtres'
              : 'Lancez-vous et organisez votre première compétition !'
            }
          </p>
          {!searchQuery && activeFilter === 'all' && (
            <button
              onClick={() => navigate('/create-tournament')}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-lg font-medium"
            >
              + Créer un tournoi
            </button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

// Tournament Card Component
function TournamentCard({ tournament, onDelete, getStatusBadge }) {
  const navigate = useNavigate();

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div 
      onClick={() => navigate(`/organizer/tournament/${tournament.id}`)}
      className="bg-[#161b22] rounded-xl p-5 border border-white/10 hover:border-cyan-500/30 cursor-pointer transition-all group"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center text-xl flex-shrink-0">
          {tournament.logo_url ? (
            <img src={tournament.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
          ) : (
            '🏆'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-white truncate mb-1">{tournament.name}</h3>
          <p className="text-sm text-gray-400">{tournament.game || 'Jeu non défini'}</p>
        </div>
        {getStatusBadge(tournament.status)}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        {tournament.start_date && (
          <span className="flex items-center gap-1">
            📅 {formatDate(tournament.start_date)}
          </span>
        )}
        {tournament.max_participants && (
          <span className="flex items-center gap-1">
            👥 {tournament.max_participants}
          </span>
        )}
        <span className="flex items-center gap-1">
          {tournament.format === 'double_elimination' ? '🔄' : '⚔️'} {
            tournament.format === 'elimination' ? 'Élimination' :
            tournament.format === 'double_elimination' ? 'Double Élim.' :
            tournament.format === 'round_robin' ? 'Round Robin' :
            tournament.format === 'swiss' ? 'Suisse' : tournament.format
          }
        </span>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-white/10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/organizer/tournament/${tournament.id}`);
          }}
          className="flex-1 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium transition-colors"
        >
          Gérer
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/tournament/${tournament.id}`, '_blank');
          }}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
        >
          👁️
        </button>
        <button
          onClick={(e) => onDelete(e, tournament.id)}
          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
