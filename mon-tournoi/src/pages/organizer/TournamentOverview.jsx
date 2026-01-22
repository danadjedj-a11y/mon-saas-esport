import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button, Card } from '../../shared/components/ui';
import { toast } from '../../utils/toast';

/**
 * QuickStatCard - Carte de statistique rapide
 */
function QuickStatCard({ icon, label, value, color = 'violet' }) {
  const colorClasses = {
    violet: 'from-violet/20 to-violet/5 border-violet/30',
    cyan: 'from-cyan/20 to-cyan/5 border-cyan/30',
    green: 'from-green/20 to-green/5 border-green/30',
    amber: 'from-amber/20 to-amber/5 border-amber/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-display font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * ActionCard - Carte d'action rapide
 */
function ActionCard({ icon, title, description, to, onClick, variant = 'default' }) {
  const Component = to ? Link : 'button';
  
  return (
    <Component
      to={to}
      onClick={onClick}
      className={`block p-4 rounded-xl border transition-all text-left ${
        variant === 'primary' 
          ? 'bg-gradient-to-r from-violet/20 to-cyan/20 border-violet/30 hover:border-violet/50'
          : 'bg-[#2a2d3e] border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <h4 className="font-medium text-white">{title}</h4>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
      </div>
    </Component>
  );
}

/**
 * TournamentOverview - Vue d'ensemble du tournoi pour l'organisateur
 */
export default function TournamentOverview() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;
  
  const [stats, setStats] = useState({
    participants: 0,
    checkedIn: 0,
    phases: 0,
    matches: 0,
    completedMatches: 0,
  });
  const [_loading, setLoading] = useState(true);
  const [_recentActivity, _setRecentActivity] = useState([]);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const fetchStats = async () => {
    if (!tournamentId) return;
    
    try {
      // Participants
      const { count: participantsCount } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      // Participants checked in
      const { count: checkedInCount } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('checked_in', true);

      // Phases (si table existe)
      let phasesCount = 0;
      try {
        const { count } = await supabase
          .from('tournament_phases')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId);
        phasesCount = count || 0;
      } catch {
        // Table might not exist
      }

      // Matches
      const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      const { count: completedMatchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed');

      setStats({
        participants: participantsCount || 0,
        checkedIn: checkedInCount || 0,
        phases: phasesCount,
        matches: matchesCount || 0,
        completedMatches: completedMatchesCount || 0,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return { label: 'Brouillon', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'ongoing':
        return { label: 'En cours', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
      case 'completed':
        return { label: 'Terminé', className: 'bg-green-500/20 text-green-400 border-green-500/30' };
      default:
        return { label: status, className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    }
  };

  if (!tournament) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(tournament.status);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              Vue d'ensemble
            </h1>
            <p className="text-gray-400">
              Gérez votre tournoi et suivez son avancement
            </p>
          </div>
          
          <span className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Tournament Info Card */}
      <div className="bg-[#2a2d3e] rounded-xl p-6 mb-8 border border-white/10">
        <div className="flex items-start gap-6">
          {tournament.logo_url ? (
            <img 
              src={tournament.logo_url} 
              alt={tournament.name}
              className="w-20 h-20 rounded-xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-violet/20 flex items-center justify-center text-3xl">
              🏆
            </div>
          )}
          
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold text-white mb-1">
              {tournament.name}
            </h2>
            <p className="text-gray-400 text-sm mb-3">{tournament.game}</p>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-gray-400">
                📅 {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('fr-FR') : 'Non défini'}
              </span>
              <span className="text-gray-400">
                👥 {stats.participants}/{tournament.max_teams || '∞'} participants
              </span>
              <span className="text-gray-400">
                🎮 {tournament.format || 'Non défini'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => navigate(`/tournament/${tournamentId}/public`)}
              variant="secondary"
              className="bg-white/5 border-white/10"
            >
              👁️ Voir page publique
            </Button>
            <Button
              onClick={() => navigate(`/organizer/tournament/${tournamentId}/settings/general`)}
              variant="secondary"
              className="bg-white/5 border-white/10"
            >
              ⚙️ Paramètres
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <QuickStatCard 
          icon="👥" 
          label="Participants" 
          value={stats.participants}
          color="violet"
        />
        <QuickStatCard 
          icon="✅" 
          label="Checked-in" 
          value={stats.checkedIn}
          color="green"
        />
        <QuickStatCard 
          icon="🏗️" 
          label="Phases" 
          value={stats.phases}
          color="cyan"
        />
        <QuickStatCard 
          icon="⚔️" 
          label="Matchs joués" 
          value={`${stats.completedMatches}/${stats.matches}`}
          color="amber"
        />
      </div>

      {/* Progress & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Setup Progress */}
        <div className="bg-[#2a2d3e] rounded-xl p-6 border border-white/10">
          <h3 className="font-display font-semibold text-white mb-4">
            🚀 Configuration du tournoi
          </h3>
          
          <div className="space-y-3">
            <ProgressItem 
              done={!!tournament.name && !!tournament.game}
              label="Informations de base"
              to={`/organizer/tournament/${tournamentId}/settings/general`}
            />
            <ProgressItem 
              done={stats.phases > 0}
              label="Structure définie"
              to={`/organizer/tournament/${tournamentId}/structure`}
            />
            <ProgressItem 
              done={stats.participants > 0}
              label="Participants inscrits"
              to={`/organizer/tournament/${tournamentId}/participants`}
            />
            <ProgressItem 
              done={tournament.status === 'ongoing' || tournament.status === 'completed'}
              label="Tournoi lancé"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#2a2d3e] rounded-xl p-6 border border-white/10">
          <h3 className="font-display font-semibold text-white mb-4">
            ⚡ Actions rapides
          </h3>
          
          <div className="space-y-3">
            <ActionCard 
              icon="🏗️"
              title="Configurer la structure"
              description="Définir les phases et le format"
              to={`/organizer/tournament/${tournamentId}/structure`}
              variant="primary"
            />
            <ActionCard 
              icon="👥"
              title="Gérer les participants"
              description="Voir et éditer les inscriptions"
              to={`/organizer/tournament/${tournamentId}/participants`}
            />
            <ActionCard 
              icon="🎯"
              title="Placement des équipes"
              description="Placer les équipes dans le bracket"
              to={`/organizer/tournament/${tournamentId}/placement`}
            />
            <ActionCard 
              icon="📤"
              title="Partager le tournoi"
              description="Widgets et options de partage"
              to={`/organizer/tournament/${tournamentId}/sharing/public`}
            />
          </div>
        </div>
      </div>

      {/* Launch Tournament CTA */}
      {tournament.status === 'draft' && stats.participants >= 2 && stats.phases > 0 && (
        <div className="mt-8 p-6 bg-gradient-to-r from-violet/20 to-cyan/20 border border-violet/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-white mb-1">
                🚀 Prêt à lancer le tournoi ?
              </h3>
              <p className="text-gray-400 text-sm">
                Tout est configuré ! Vous pouvez maintenant lancer le tournoi et générer les matchs.
              </p>
            </div>
            <Button
              onClick={() => toast.info('Fonctionnalité de lancement à venir')}
              className="bg-gradient-to-r from-violet to-cyan"
            >
              🎮 Lancer le tournoi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ProgressItem - Item de progression
 */
function ProgressItem({ done, label, to }) {
  const content = (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
      to ? 'hover:bg-white/5 cursor-pointer' : ''
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
        done 
          ? 'bg-green-500/20 text-green-400' 
          : 'bg-gray-500/20 text-gray-500'
      }`}>
        {done ? '✓' : '○'}
      </div>
      <span className={done ? 'text-gray-300' : 'text-gray-500'}>{label}</span>
      {to && <span className="ml-auto text-gray-600">→</span>}
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
}
