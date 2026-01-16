import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient';
import { toast } from './utils/toast';
import logger from './utils/logger';
import TournamentCard from './components/TournamentCard';
import { TournamentCardSkeleton } from './components/Skeleton';
import { EmptyTournaments } from './components/EmptyState';
import NewsSection from './components/NewsSection';
import DashboardLayout from './layouts/DashboardLayout';

// Temporairement revenir à l'ancien système jusqu'à ce que useAuth soit stable
export default function HomePage() {
  const { t } = useTranslation();
  const [allTournaments, setAllTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  
  // États pour recherche, filtres et pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const isFetchingRef = useRef(false);

  const fetchTournaments = useCallback(async () => {
    if (isFetchingRef.current) {
      logger.debug('Chargement déjà en cours, ignoré');
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    
    try {
      logger.debug('Chargement des tournois...');
      
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['draft', 'ongoing'])
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Erreur chargement tournois', error);
        toast.error(`Erreur: ${error.message}`);
        setAllTournaments([]);
      } else {
        logger.debug('Tournois chargés', { count: data?.length || 0 });
        setAllTournaments(data || []);
      }
    } catch (err) {
      logger.error('Erreur lors du chargement des tournois', { message: err.message });
      toast.error(`Erreur de chargement: ${err.message || 'Erreur inconnue'}`);
      setAllTournaments([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId;
    
    // Vérifier la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSession(session);
    });

    timeoutId = setTimeout(() => {
      if (mounted) {
        fetchTournaments();
      }
    }, 300);

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Récupérer les jeux uniques pour le filtre
  const availableGames = useMemo(() => {
    const games = [...new Set(allTournaments.map(t => t.game).filter(Boolean))];
    return games.sort();
  }, [allTournaments]);

  // Filtrer et trier les tournois
  const filteredAndSortedTournaments = useMemo(() => {
    let filtered = [...allTournaments];

    // Recherche par nom
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name?.toLowerCase().includes(query) ||
        t.game?.toLowerCase().includes(query)
      );
    }

    // Filtre par jeu
    if (gameFilter !== 'all') {
      filtered = filtered.filter(t => t.game === gameFilter);
    }

    // Filtre par format
    if (formatFilter !== 'all') {
      filtered = filtered.filter(t => t.format === formatFilter);
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'date':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    return filtered;
  }, [allTournaments, searchQuery, gameFilter, formatFilter, statusFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTournaments.length / itemsPerPage);
  const paginatedTournaments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTournaments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTournaments, currentPage, itemsPerPage]);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, gameFilter, formatFilter, statusFilter, sortBy]);

  const getStatusStyle = useCallback((status) => {
    switch (status) {
      case 'draft': return { bg: 'bg-gradient-to-r from-orange-500 to-amber-500', text: 'Inscriptions ouvertes', icon: '📝' };
      case 'completed': return { bg: 'bg-gradient-to-r from-pink-500 to-rose-500', text: 'Terminé', icon: '🏁' };
      default: return { bg: 'bg-gradient-to-r from-violet-600 to-cyan-500', text: 'En cours', icon: '⚔️' };
    }
  }, []);

  const getFormatLabel = useCallback((format) => {
    switch (format) {
      case 'elimination': return 'Élimination Directe';
      case 'double_elimination': return 'Double Elimination';
      case 'round_robin': return 'Championnat';
      case 'swiss': return 'Système Suisse';
      default: return format;
    }
  }, []);

  return (
    <DashboardLayout session={session}>
      {/* HERO SECTION */}
      <div className="relative py-16 md:py-24 text-center mb-12 overflow-hidden rounded-3xl">
        {/* Background with glassmorphism */}
        <div className="absolute inset-0 bg-dark-50/50 backdrop-blur-sm border border-glass-border rounded-3xl" />
        
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-violet/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10 px-6">
          {/* Icon */}
          <div className="mb-8">
            <span className="inline-flex items-center justify-center w-20 h-20 text-5xl bg-gradient-to-br from-violet to-cyan rounded-2xl shadow-glow-md float">
              🎮
            </span>
          </div>
          
          {/* Title */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 gradient-text">
            {t('homepage.title')}
          </h1>
          
          {/* Subtitle */}
          <p className="font-body text-lg md:text-xl text-text-secondary mb-3 max-w-2xl mx-auto leading-relaxed">
            {t('homepage.subtitle')}
          </p>
          <p className="font-body text-base text-text-muted mb-10 max-w-xl mx-auto">
            Rejoignez des tournois compétitifs, créez vos équipes et défiez les meilleurs joueurs !
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!session ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="btn-lg px-10 py-4 bg-gradient-to-r from-violet via-violet-dark to-violet text-white rounded-xl font-display font-semibold text-lg transition-all duration-300 shadow-glow-md hover:shadow-glow-lg hover:scale-105"
                >
                  🔐 Se Connecter
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="btn-secondary btn-lg px-10 py-4 border-2 border-glass-border text-text rounded-xl font-display font-semibold text-lg transition-all duration-300 hover:border-violet hover:text-violet-light hover:scale-105"
                >
                  ✨ Créer un Compte
                </button>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/player/dashboard')}
                  className="px-8 py-3.5 bg-gradient-to-r from-violet to-violet-dark text-white rounded-xl font-display font-medium transition-all duration-300 shadow-glow-sm hover:shadow-glow-md hover:scale-105"
                >
                  📊 Mon Tableau de Bord
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/create-team')}
                  className="btn-secondary px-8 py-3.5 border border-glass-border text-text rounded-xl font-display font-medium transition-all duration-300 hover:border-cyan hover:text-cyan hover:scale-105"
                >
                  👥 Créer une Équipe
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card text-center group hover:scale-[1.02]">
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-violet/20 to-violet/5 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
            🏆
          </div>
          <div className="font-display text-4xl font-bold text-violet-light mb-1">
            {allTournaments.length}
          </div>
          <div className="font-body text-text-secondary text-sm">Tournois Actifs</div>
        </div>
        <div className="glass-card text-center group hover:scale-[1.02]">
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-cyan/20 to-cyan/5 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
            ⚔️
          </div>
          <div className="font-display text-4xl font-bold text-cyan mb-1">
            {availableGames.length}
          </div>
          <div className="font-body text-text-secondary text-sm">Jeux Disponibles</div>
        </div>
        <div className="glass-card text-center group hover:scale-[1.02]">
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-pink/20 to-pink/5 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
            🎯
          </div>
          <div className="font-display text-4xl font-bold text-pink mb-1">
            4+
          </div>
          <div className="font-body text-text-secondary text-sm">Formats de Tournois</div>
        </div>
      </div>

      {/* FONCTIONNALITÉS */}
      <div className="glass-card mb-12 p-8">
        <h2 className="font-display text-3xl font-semibold text-center mb-2 gradient-text">
          ✨ Pourquoi Choisir Fluky Boys ?
        </h2>
        <p className="text-center text-text-muted mb-8 font-body">Tout ce dont vous avez besoin pour organiser et participer à des tournois</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="group p-5 bg-dark-50/50 border border-glass-border rounded-xl hover:border-violet/50 transition-all duration-300 hover:bg-dark-50">
            <div className="w-12 h-12 bg-violet/10 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🚀
            </div>
            <h3 className="font-display text-lg font-medium text-text mb-2">Gestion Simple</h3>
            <p className="font-body text-text-muted text-sm leading-relaxed">
              Créez et gérez vos tournois en quelques clics avec une interface intuitive et moderne.
            </p>
          </div>
          <div className="group p-5 bg-dark-50/50 border border-glass-border rounded-xl hover:border-cyan/50 transition-all duration-300 hover:bg-dark-50">
            <div className="w-12 h-12 bg-cyan/10 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              ⚡
            </div>
            <h3 className="font-display text-lg font-medium text-text mb-2">Temps Réel</h3>
            <p className="font-body text-text-muted text-sm leading-relaxed">
              Suivez vos matchs en direct avec des mises à jour en temps réel et des notifications instantanées.
            </p>
          </div>
          <div className="group p-5 bg-dark-50/50 border border-glass-border rounded-xl hover:border-pink/50 transition-all duration-300 hover:bg-dark-50">
            <div className="w-12 h-12 bg-pink/10 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🎮
            </div>
            <h3 className="font-display text-lg font-medium text-text mb-2">Multi-Formats</h3>
            <p className="font-body text-text-muted text-sm leading-relaxed">
              Élimination simple, double élimination, round-robin, système suisse... Choisissez votre format !
            </p>
          </div>
          <div className="group p-5 bg-dark-50/50 border border-glass-border rounded-xl hover:border-success/50 transition-all duration-300 hover:bg-dark-50">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              👥
            </div>
            <h3 className="font-display text-lg font-medium text-text mb-2">Gestion d'Équipes</h3>
            <p className="font-body text-text-muted text-sm leading-relaxed">
              Créez vos équipes, invitez vos amis et participez ensemble aux tournois.
            </p>
          </div>
          <div className="group p-5 bg-dark-50/50 border border-glass-border rounded-xl hover:border-warning/50 transition-all duration-300 hover:bg-dark-50">
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📊
            </div>
            <h3 className="font-display text-lg font-medium text-text mb-2">Statistiques</h3>
            <p className="font-body text-text-muted text-sm leading-relaxed">
              Analysez vos performances avec des statistiques détaillées et des classements.
            </p>
          </div>
          <div className="group p-5 bg-dark-50/50 border border-glass-border rounded-xl hover:border-violet/50 transition-all duration-300 hover:bg-dark-50">
            <div className="w-12 h-12 bg-violet/10 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🏅
            </div>
            <h3 className="font-display text-lg font-medium text-text mb-2">Compétitif</h3>
            <p className="font-body text-text-muted text-sm leading-relaxed">
              Affrontez les meilleurs joueurs et montez dans les classements pour devenir le champion !
            </p>
          </div>
        </div>
      </div>

      {/* NEWS SECTION */}
      <NewsSection />

      {/* CONTENU PRINCIPAL */}
      <div className="w-full">
        {/* BARRE DE RECHERCHE ET FILTRES */}
        <div className="glass-card p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
            {/* Recherche */}
            <input
              type="text"
              placeholder={`🔍 ${t('homepage.searchPlaceholder')}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="col-span-1 md:col-span-2 lg:col-span-2 px-4 py-3 bg-dark-50 border border-glass-border text-text rounded-xl font-body text-sm transition-all duration-200 focus:border-violet focus:ring-2 focus:ring-violet/20 placeholder:text-text-muted"
            />
            
            {/* Filtre Jeu */}
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="px-4 py-3 bg-dark-50 border border-glass-border text-text rounded-xl font-body text-sm cursor-pointer transition-all duration-200 focus:border-violet focus:ring-2 focus:ring-violet/20"
            >
              <option value="all">🎮 {t('common.all')}</option>
              {availableGames.map(game => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>

            {/* Filtre Format */}
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="px-4 py-3 bg-dark-50 border border-glass-border text-text rounded-xl font-body text-sm cursor-pointer transition-all duration-200 focus:border-violet focus:ring-2 focus:ring-violet/20"
            >
              <option value="all">📊 {t('common.all')}</option>
              <option value="elimination">{t('tournament.elimination')}</option>
              <option value="double_elimination">{t('tournament.doubleElimination')}</option>
              <option value="round_robin">{t('tournament.roundRobin')}</option>
              <option value="swiss">{t('tournament.swiss')}</option>
            </select>

            {/* Filtre Statut */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-dark-50 border border-glass-border text-text rounded-xl font-body text-sm cursor-pointer transition-all duration-200 focus:border-violet focus:ring-2 focus:ring-violet/20"
            >
              <option value="all">📝 {t('common.all')}</option>
              <option value="draft">{t('tournament.draft')}</option>
              <option value="ongoing">{t('tournament.ongoing')}</option>
              <option value="completed">{t('tournament.completed')}</option>
            </select>

            {/* Tri */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-dark-50 border border-glass-border text-text rounded-xl font-body text-sm cursor-pointer transition-all duration-200 focus:border-violet focus:ring-2 focus:ring-violet/20"
            >
              <option value="date">📅 Par date</option>
              <option value="name">🔤 Par nom</option>
            </select>
          </div>

          {/* Compteur de résultats */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-text-secondary font-body">
              <span className="text-violet-light font-medium">{filteredAndSortedTournaments.length}</span> tournoi{filteredAndSortedTournaments.length > 1 ? 's' : ''} trouvé{filteredAndSortedTournaments.length > 1 ? 's' : ''}
              {searchQuery || gameFilter !== 'all' || formatFilter !== 'all' || statusFilter !== 'all' ? ' (filtré)' : ''}
            </div>
            {(searchQuery || gameFilter !== 'all' || formatFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setGameFilter('all');
                  setFormatFilter('all');
                  setStatusFilter('all');
                  setSortBy('date');
                }}
                className="btn-ghost px-4 py-2 text-sm hover:text-danger"
              >
                ✕ Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-text">
            <span className="gradient-text">🏆 {t('homepage.availableTournaments')}</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <TournamentCardSkeleton key={i} />
            ))}
          </div>
        ) : paginatedTournaments.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTournaments.map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  getStatusStyle={getStatusStyle}
                  getFormatLabel={getFormatLabel}
                />
              ))}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-10 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-5 py-2.5 rounded-xl font-display text-sm transition-all duration-200 flex items-center gap-2 ${
                    currentPage === 1 
                      ? 'bg-dark-50 text-text-muted cursor-not-allowed opacity-50' 
                      : 'bg-dark-50 border border-glass-border text-text hover:border-violet hover:text-violet-light'
                  }`}
                >
                  ← Précédent
                </button>

                <div className="flex gap-2 items-center font-body">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-xl font-body text-sm transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-violet to-violet-dark text-white shadow-glow-sm'
                            : 'bg-dark-50 border border-glass-border text-text-secondary hover:border-violet hover:text-text'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-5 py-2.5 rounded-xl font-display text-sm transition-all duration-200 flex items-center gap-2 ${
                    currentPage === totalPages 
                      ? 'bg-dark-50 text-text-muted cursor-not-allowed opacity-50' 
                      : 'bg-dark-50 border border-glass-border text-text hover:border-violet hover:text-violet-light'
                  }`}
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyTournaments />
        )}
      </div>
    </DashboardLayout>
  );
}

