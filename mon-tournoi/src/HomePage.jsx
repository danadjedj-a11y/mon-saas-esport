import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient';
import { toast } from './utils/toast';
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
      console.log('⏸️ Chargement déjà en cours, ignoré');
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    
    try {
      console.log('🔄 Chargement des tournois...');
      
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['draft', 'ongoing'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement tournois:', error);
        toast.error(`Erreur: ${error.message}`);
        setAllTournaments([]);
      } else {
        console.log('✅ Tournois chargés:', data?.length || 0);
        setAllTournaments(data || []);
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des tournois:', err.message || err);
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
      case 'draft': return { bg: '#E7632C', text: 'Inscriptions ouvertes', icon: '📝' };
      case 'completed': return { bg: '#FF36A3', text: 'Terminé', icon: '🏁' };
      default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
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
      <div className="bg-gradient-to-br from-fluky-primary/20 via-fluky-secondary/10 to-fluky-primary/20 py-20 text-center border-4 border-fluky-secondary mb-12 relative overflow-hidden rounded-2xl shadow-2xl shadow-fluky-primary/30">
        {/* Effet de fond animé */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-72 h-72 bg-fluky-secondary rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-fluky-primary rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10 px-4">
          <div className="mb-6">
            <span className="inline-block text-6xl mb-4 animate-bounce">🎮</span>
          </div>
          <h1 className="font-display text-6xl md:text-7xl mb-6 text-fluky-secondary" style={{ textShadow: '0 0 30px rgba(193, 4, 104, 0.6)' }}>
            {t('homepage.title')}
          </h1>
          <p className="font-body text-xl md:text-2xl text-fluky-text mb-4 max-w-2xl mx-auto leading-relaxed">
            {t('homepage.subtitle')}
          </p>
          <p className="font-body text-lg text-fluky-text/80 mb-10 max-w-xl mx-auto">
            Rejoignez des tournois compétitifs, créez vos équipes et défiez les meilleurs joueurs !
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!session ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="px-12 py-5 bg-gradient-to-r from-fluky-primary via-fluky-secondary to-fluky-primary text-white border-4 border-fluky-secondary rounded-xl font-display text-xl uppercase tracking-wider transition-all duration-300 shadow-2xl shadow-fluky-primary/50 hover:scale-110 hover:shadow-fluky-secondary/60 hover:border-fluky-primary transform"
                >
                  🔐 Se Connecter
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="px-12 py-5 bg-transparent border-4 border-fluky-primary text-fluky-secondary rounded-xl font-display text-xl uppercase tracking-wider transition-all duration-300 hover:bg-fluky-primary/20 hover:border-fluky-secondary hover:scale-105"
                >
                  ✨ Créer un Compte
                </button>
              </>
            ) : (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/player/dashboard')}
                  className="px-10 py-4 bg-gradient-to-r from-fluky-primary to-fluky-secondary text-white border-2 border-fluky-secondary rounded-lg font-display text-lg uppercase tracking-wide transition-all duration-300 shadow-lg shadow-fluky-primary/40 hover:scale-105"
                >
                  📊 Mon Tableau de Bord
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/create-team')}
                  className="px-10 py-4 bg-transparent border-2 border-fluky-primary text-fluky-secondary rounded-lg font-display text-lg uppercase tracking-wide transition-all duration-300 hover:bg-fluky-primary/20 hover:scale-105"
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
        <div className="bg-[#030913]/60 backdrop-blur-md border-2 border-fluky-primary rounded-xl p-6 text-center shadow-xl hover:border-fluky-secondary transition-all duration-300 hover:scale-105">
          <div className="text-4xl mb-3">🏆</div>
          <div className="font-display text-3xl text-fluky-secondary mb-2" style={{ textShadow: '0 0 10px rgba(193, 4, 104, 0.5)' }}>
            {allTournaments.length}
          </div>
          <div className="font-body text-fluky-text">Tournois Actifs</div>
        </div>
        <div className="bg-[#030913]/60 backdrop-blur-md border-2 border-fluky-primary rounded-xl p-6 text-center shadow-xl hover:border-fluky-secondary transition-all duration-300 hover:scale-105">
          <div className="text-4xl mb-3">⚔️</div>
          <div className="font-display text-3xl text-fluky-secondary mb-2" style={{ textShadow: '0 0 10px rgba(193, 4, 104, 0.5)' }}>
            {availableGames.length}
          </div>
          <div className="font-body text-fluky-text">Jeux Disponibles</div>
        </div>
        <div className="bg-[#030913]/60 backdrop-blur-md border-2 border-fluky-primary rounded-xl p-6 text-center shadow-xl hover:border-fluky-secondary transition-all duration-300 hover:scale-105">
          <div className="text-4xl mb-3">🎯</div>
          <div className="font-display text-3xl text-fluky-secondary mb-2" style={{ textShadow: '0 0 10px rgba(193, 4, 104, 0.5)' }}>
            Multiple
          </div>
          <div className="font-body text-fluky-text">Formats de Tournois</div>
        </div>
      </div>

      {/* FONCTIONNALITÉS */}
      <div className="bg-[#030913]/60 backdrop-blur-md border-2 border-fluky-secondary rounded-xl p-8 mb-12 shadow-xl">
        <h2 className="font-display text-4xl text-fluky-secondary text-center mb-8" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>
          ✨ Pourquoi Choisir Fluky Boys ?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#030913]/80 border-2 border-fluky-primary/50 rounded-lg p-6 hover:border-fluky-secondary transition-all duration-300">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="font-display text-xl text-fluky-secondary mb-2">Gestion Simple</h3>
            <p className="font-body text-fluky-text/80 text-sm">
              Créez et gérez vos tournois en quelques clics avec une interface intuitive et moderne.
            </p>
          </div>
          <div className="bg-[#030913]/80 border-2 border-fluky-primary/50 rounded-lg p-6 hover:border-fluky-secondary transition-all duration-300">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-display text-xl text-fluky-secondary mb-2">Temps Réel</h3>
            <p className="font-body text-fluky-text/80 text-sm">
              Suivez vos matchs en direct avec des mises à jour en temps réel et des notifications instantanées.
            </p>
          </div>
          <div className="bg-[#030913]/80 border-2 border-fluky-primary/50 rounded-lg p-6 hover:border-fluky-secondary transition-all duration-300">
            <div className="text-3xl mb-3">🎮</div>
            <h3 className="font-display text-xl text-fluky-secondary mb-2">Multi-Formats</h3>
            <p className="font-body text-fluky-text/80 text-sm">
              Élimination simple, double élimination, round-robin, système suisse... Choisissez votre format !
            </p>
          </div>
          <div className="bg-[#030913]/80 border-2 border-fluky-primary/50 rounded-lg p-6 hover:border-fluky-secondary transition-all duration-300">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-display text-xl text-fluky-secondary mb-2">Gestion d'Équipes</h3>
            <p className="font-body text-fluky-text/80 text-sm">
              Créez vos équipes, invitez vos amis et participez ensemble aux tournois.
            </p>
          </div>
          <div className="bg-[#030913]/80 border-2 border-fluky-primary/50 rounded-lg p-6 hover:border-fluky-secondary transition-all duration-300">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-display text-xl text-fluky-secondary mb-2">Statistiques</h3>
            <p className="font-body text-fluky-text/80 text-sm">
              Analysez vos performances avec des statistiques détaillées et des classements.
            </p>
          </div>
          <div className="bg-[#030913]/80 border-2 border-fluky-primary/50 rounded-lg p-6 hover:border-fluky-secondary transition-all duration-300">
            <div className="text-3xl mb-3">🏅</div>
            <h3 className="font-display text-xl text-fluky-secondary mb-2">Compétitif</h3>
            <p className="font-body text-fluky-text/80 text-sm">
              Affrontez les meilleurs joueurs et montez dans les classements pour devenir le champion !
            </p>
          </div>
        </div>
      </div>

      {/* NEWS SECTION */}
      <NewsSection />

      {/* CONTENU PRINCIPAL */}
      <div className="w-full max-w-7xl mx-auto">
        {/* BARRE DE RECHERCHE ET FILTRES */}
        <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
            {/* Recherche */}
            <input
              type="text"
              placeholder={`🔍 ${t('homepage.searchPlaceholder')}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="col-span-1 md:col-span-2 lg:col-span-2 px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
            />
            
            {/* Filtre Jeu */}
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-sm cursor-pointer transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
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
              className="px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-sm cursor-pointer transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
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
              className="px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-sm cursor-pointer transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
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
              className="px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-sm cursor-pointer transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
            >
              <option value="date">📅 Par date</option>
              <option value="name">🔤 Par nom</option>
            </select>
          </div>

          {/* Compteur de résultats */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-fluky-text font-body">
              {filteredAndSortedTournaments.length} tournoi{filteredAndSortedTournaments.length > 1 ? 's' : ''} trouvé{filteredAndSortedTournaments.length > 1 ? 's' : ''}
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
                className="px-4 py-2 bg-transparent border-2 border-fluky-primary text-fluky-text rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 hover:bg-fluky-primary hover:border-fluky-secondary"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="font-display text-4xl text-fluky-secondary" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>🏆 {t('homepage.availableTournaments')}</h2>
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
                  className={`px-5 py-2 border-2 border-fluky-secondary text-fluky-text rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 ${
                    currentPage === 1 
                      ? 'bg-fluky-primary/30 opacity-50 cursor-not-allowed' 
                      : 'bg-fluky-primary hover:bg-fluky-secondary hover:border-fluky-primary'
                  }`}
                >
                  ← Précédent
                </button>

                <div className="flex gap-2 items-center font-body text-fluky-text">
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
                        className={`px-4 py-2 border-2 rounded-lg font-body text-sm transition-all duration-300 min-w-[40px] ${
                          currentPage === pageNum
                            ? 'bg-fluky-secondary border-fluky-primary text-white font-bold'
                            : 'bg-[#030913]/80 border-fluky-secondary text-fluky-text hover:bg-fluky-secondary/50 hover:border-fluky-primary'
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
                  className={`px-5 py-2 border-2 border-fluky-secondary text-fluky-text rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 ${
                    currentPage === totalPages 
                      ? 'bg-fluky-primary/30 opacity-50 cursor-not-allowed' 
                      : 'bg-fluky-primary hover:bg-fluky-secondary hover:border-fluky-primary'
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

