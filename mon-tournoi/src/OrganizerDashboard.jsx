import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Button, Card, Badge, Tabs, Pagination } from './shared/components/ui';
import TournamentMetrics from './features/tournaments/components/TournamentMetrics';
import NotificationCenter from './NotificationCenter';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';

export default function OrganizerDashboard({ session }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3 colonnes x 3 lignes
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchMyTournaments = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement:', error);
        setTournaments([]);
      } else {
        setTournaments(data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteTournament = async (e, id) => {
    e.stopPropagation();
    if (!confirm("⚠️ Supprimer ce tournoi et tous ses matchs ? C'est irréversible.")) return;

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Impossible de supprimer: " + error.message);
      console.error(error);
    } else {
      toast.success("Tournoi supprimé avec succès");
      setTournaments(tournaments.filter(t => t.id !== id));
    }
  };

  const duplicateTournament = async (e, tournament) => {
    e.stopPropagation();
    if (!confirm("Dupliquer ce tournoi ?")) return;

    try {
      const { id: _id, created_at: _created_at, updated_at: _updated_at, ...tournamentData } = tournament;
      const newTournament = {
        ...tournamentData,
        name: `${tournament.name} (Copie)`,
        status: 'draft',
      };

      const { data: _data, error } = await supabase
        .from('tournaments')
        .insert([newTournament])
        .select()
        .single();

      if (error) throw error;

      toast.success("Tournoi dupliqué avec succès");
      fetchMyTournaments();
    } catch (error) {
      toast.error("Erreur lors de la duplication: " + error.message);
      console.error(error);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'draft': return { bg: '#E7632C', text: 'Brouillon', icon: '📝' };
      case 'completed': return { bg: '#FF36A3', text: 'Terminé', icon: '🏁' };
      default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
    }
  };

  const getFormatLabel = (format) => {
    switch (format) {
      case 'elimination': return 'Élimination';
      case 'double_elimination': return 'Double Élimination';
      case 'round_robin': return 'Round Robin';
      case 'swiss': return 'Système Suisse';
      default: return format;
    }
  };

  // Filtrer les tournois
  const filteredTournaments = useMemo(() => {
    return activeFilter === 'all' 
      ? tournaments 
      : tournaments.filter(t => t.status === activeFilter);
  }, [tournaments, activeFilter]);

  // Réinitialiser la page quand le filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  // Calculer les tournois paginés
  const paginatedTournaments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTournaments.slice(startIndex, endIndex);
  }, [filteredTournaments, currentPage, itemsPerPage]);

  // Calculer le nombre total de pages
  const totalPages = Math.ceil(filteredTournaments.length / itemsPerPage);

  if (loading) {
    return (
      <DashboardLayout session={session}>
        <div className="text-fluky-text font-body text-center py-20">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p>Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout session={session}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl text-fluky-secondary mb-2" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>
            🎯 Dashboard Organisateur
          </h1>
          <p className="font-body text-fluky-text/70">
            Gérez vos tournois et suivez leurs performances
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationCenter session={session} />
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/create-tournament')}
            className="font-display"
          >
            ➕ Créer un Tournoi
          </Button>
        </div>
      </div>

      {/* MÉTRIQUES */}
      <div className="mb-8">
        <TournamentMetrics tournaments={tournaments} />
      </div>

      {/* FILTRES PAR TABS */}
      <Card variant="glass" padding="none" className="mb-8">
        <div className="flex border-b border-white/10 overflow-x-auto">
          {[
            { id: 'all', label: 'Tous', count: tournaments.length },
            { id: 'draft', label: 'Brouillons', count: tournaments.filter(t => t.status === 'draft').length },
            { id: 'ongoing', label: 'En cours', count: tournaments.filter(t => t.status === 'ongoing').length },
            { id: 'completed', label: 'Terminés', count: tournaments.filter(t => t.status === 'completed').length },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-6 py-4 font-body text-base transition-all duration-200 border-b-2 ${
                activeFilter === filter.id
                  ? 'border-fluky-primary text-fluky-secondary'
                  : 'border-transparent text-fluky-text/60 hover:text-fluky-text hover:border-fluky-primary/50'
              }`}
            >
              {filter.label}
              {filter.count > 0 && (
                <Badge variant="primary" size="sm" className="ml-2">
                  {filter.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* LISTE DES TOURNOIS */}
      {filteredTournaments.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedTournaments.map((tournament) => {
            const statusStyle = getStatusStyle(tournament.status);
            return (
              <Card
                key={tournament.id}
                variant="glass"
                hover
                clickable
                onClick={() => navigate(`/organizer/tournament/${tournament.id}`)}
                className="border-fluky-primary/30"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-display text-xl text-fluky-secondary line-clamp-2">
                    {tournament.name}
                  </h3>
                  <Badge 
                    variant={
                      tournament.status === 'ongoing' ? 'success' : 
                      tournament.status === 'completed' ? 'info' : 
                      'warning'
                    }
                    size="sm"
                  >
                    {statusStyle.icon} {statusStyle.text}
                  </Badge>
                </div>

                {/* Infos */}
                <div className="space-y-2 text-sm font-body text-fluky-text/70 mb-4">
                  <div>🎮 {tournament.game || 'Non spécifié'}</div>
                  <div>📊 {getFormatLabel(tournament.format)}</div>
                  {tournament.start_date && (
                    <div>📅 {new Date(tournament.start_date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                  )}
                  {tournament.max_participants && (
                    <div>👥 Max: {tournament.max_participants} équipes</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/organizer/tournament/${tournament.id}`);
                    }}
                    className="flex-1"
                  >
                    📊 Gérer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => duplicateTournament(e, tournament)}
                    className="flex-1"
                  >
                    📋 Dupliquer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteTournament(e, tournament.id)}
                    className="text-red-500 hover:text-red-400"
                  >
                    🗑️
                  </Button>
                </div>
              </Card>
            );
          })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                isLoading={loading}
              />
              <div className="text-center text-fluky-text/70 text-sm font-body">
                Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredTournaments.length)} sur {filteredTournaments.length} tournoi{filteredTournaments.length > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </>
      ) : (
        <Card variant="outlined" padding="xl" className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="font-display text-2xl text-fluky-secondary mb-2">
            {activeFilter === 'all' ? 'Aucun Tournoi' : 'Aucun tournoi dans cette catégorie'}
          </h3>
          <p className="font-body text-fluky-text/70 mb-6">
            {activeFilter === 'all' 
              ? 'Créez votre premier tournoi pour commencer !'
              : 'Changez de filtre pour voir d\'autres tournois.'
            }
          </p>
          {activeFilter === 'all' && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/create-tournament')}
            >
              ➕ Créer Mon Premier Tournoi
            </Button>
          )}
        </Card>
      )}

      {/* QUICK TIPS */}
      {tournaments.length > 0 && (
        <Card variant="glass" padding="lg" className="mt-8 border-fluky-secondary/30">
          <h3 className="font-display text-xl text-fluky-secondary mb-4">
            💡 Astuces Organisateur
          </h3>
          <div className="space-y-2 text-sm font-body text-fluky-text/70">
            <p>• Utilisez les templates pour créer rapidement des tournois similaires</p>
            <p>• Dupliquez un tournoi existant pour gagner du temps</p>
            <p>• Vérifiez régulièrement les conflits de scores dans le panel admin</p>
            <p>• Activez le check-in pour éviter les absences de dernière minute</p>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
