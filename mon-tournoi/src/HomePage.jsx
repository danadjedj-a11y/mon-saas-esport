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
import { GlassCard, GradientButton, NeonBadge } from './shared/components/ui';
import { Trophy, Gamepad2, Layers, Zap, Search, Users, Target } from 'lucide-react';

/**
 * Animated counting hook for stats
 */
function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef(null);
  const frameRef = useRef();

  useEffect(() => {
    const animate = (timestamp) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return count;
}

/**
 * Stat item with animated counter inside GlassCard
 */
function StatItem({ icon, value, label, suffix = "" }) {
  const animatedValue = useCountUp(value);
  return (
    <GlassCard className="flex-1">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-[#00F5FF] drop-shadow-[0_0_10px_rgba(0,245,255,0.6)]">
          {icon}
        </div>
        <div className="text-3xl font-bold text-[#F8FAFC]">
          {animatedValue}{suffix}
        </div>
        <div className="text-sm text-[#94A3B8]">{label}</div>
      </div>
    </GlassCard>
  );
}

/**
 * Floating particles for background effect
 */
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-[#00F5FF]/30 animate-float"
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

  const availableGames = useMemo(() => {
    const games = [...new Set(allTournaments.map(t => t.game).filter(Boolean))];
    return games.sort();
  }, [allTournaments]);

  const filteredAndSortedTournaments = useMemo(() => {
    let filtered = [...allTournaments];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name?.toLowerCase().includes(query) ||
        t.game?.toLowerCase().includes(query)
      );
    }

    if (gameFilter !== 'all') {
      filtered = filtered.filter(t => t.game === gameFilter);
    }

    if (formatFilter !== 'all') {
      filtered = filtered.filter(t => t.format === formatFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

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

  const totalPages = Math.ceil(filteredAndSortedTournaments.length / itemsPerPage);
  const paginatedTournaments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTournaments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTournaments, currentPage, itemsPerPage]);

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
      {/* ======== BACKGROUND EFFECTS (inside layout) ======== */}
      <div className="relative">
        {/* Glowing orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-purple-500/10 blur-[128px]" />
          <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[128px]" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-pink-500/10 blur-[128px]" />
        </div>

        {/* Floating particles */}
        <FloatingParticles />

        {/* ======== HERO SECTION ======== */}
        <div className="relative z-10 py-16 text-center mb-12">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6366F1]/30 bg-[#6366F1]/10 px-4 py-2 text-sm text-[#A5B4FC]">
            <Gamepad2 className="h-4 w-4" />
            Plateforme de Tournois eSport
          </div>

          {/* Headline */}
          <h1 className="mb-4 text-4xl font-bold leading-tight text-[#F8FAFC] md:text-5xl lg:text-6xl">
            Bienvenue sur{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
              Fluky Boys
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mb-10 max-w-2xl mx-auto text-lg text-[#94A3B8]">
            {t('homepage.subtitle', 'La plateforme de tournois e-sport ultime. Rejoignez des milliers de joueurs et participez à des compétitions épiques.')}
          </p>

          {/* CTA Buttons - SAME NAVIGATION AS BEFORE */}
          <div className="flex flex-col gap-4 sm:flex-row justify-center">
            {!session ? (
              <>
                <GradientButton variant="primary" size="lg" className="min-w-[180px]" onClick={() => navigate('/auth')}>
                  <span className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    🔐 Se Connecter
                  </span>
                </GradientButton>
                <GradientButton variant="secondary" size="lg" className="min-w-[180px]" onClick={() => navigate('/auth')}>
                  ✨ Créer un Compte
                </GradientButton>
              </>
            ) : (
              <>
                <GradientButton variant="primary" size="lg" className="min-w-[180px]" onClick={() => navigate('/player/dashboard')}>
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    📊 Mon Tableau de Bord
                  </span>
                </GradientButton>
                <GradientButton variant="secondary" size="lg" className="min-w-[180px]" onClick={() => navigate('/create-team')}>
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    👥 Créer une Équipe
                  </span>
                </GradientButton>
              </>
            )}
          </div>
        </div>

        {/* ======== STATS SECTION ======== */}
        <div className="relative z-10 grid w-full max-w-3xl mx-auto grid-cols-1 gap-6 sm:grid-cols-3 mb-12">
          <StatItem
            icon={<Trophy className="h-8 w-8" />}
            value={allTournaments.length}
            label="Tournois Actifs"
          />
          <StatItem
            icon={<Gamepad2 className="h-8 w-8" />}
            value={availableGames.length}
            label="Jeux Disponibles"
          />
          <StatItem
            icon={<Layers className="h-8 w-8" />}
            value={4}
            suffix="+"
            label="Formats de Jeu"
          />
        </div>

        {/* ======== FEATURES SECTION ======== */}
        <section id="features" className="relative z-10 mb-12">
          <h2 className="mb-4 text-center text-2xl font-bold text-[#F8FAFC] md:text-3xl">
            ✨ Pourquoi Choisir{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
              Fluky Boys
            </span> ?
          </h2>
          <p className="mb-8 text-center text-[#94A3B8]">
            Tout ce dont vous avez besoin pour organiser et participer à des tournois
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GlassCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-400 mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC] mb-2">Gestion Simple</h3>
              <p className="text-sm text-[#94A3B8]">
                Créez et gérez vos tournois en quelques clics avec une interface intuitive et moderne.
              </p>
            </GlassCard>

            <GlassCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20 text-cyan-400 mb-4">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC] mb-2">Temps Réel</h3>
              <p className="text-sm text-[#94A3B8]">
                Suivez vos matchs en direct avec des mises à jour en temps réel et des notifications.
              </p>
            </GlassCard>

            <GlassCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20 text-pink-400 mb-4">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC] mb-2">Multi-Formats</h3>
              <p className="text-sm text-[#94A3B8]">
                Élimination simple, double élimination, round-robin, système suisse...
              </p>
            </GlassCard>

            <GlassCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400 mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC] mb-2">Gestion d'Équipes</h3>
              <p className="text-sm text-[#94A3B8]">
                Créez vos équipes, invitez vos amis et participez ensemble aux tournois.
              </p>
            </GlassCard>

            <GlassCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 mb-4">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC] mb-2">Statistiques</h3>
              <p className="text-sm text-[#94A3B8]">
                Analysez vos performances avec des statistiques détaillées et des classements.
              </p>
            </GlassCard>

            <GlassCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400 mb-4">
                <Gamepad2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC] mb-2">Compétitif</h3>
              <p className="text-sm text-[#94A3B8]">
                Affrontez les meilleurs joueurs et montez dans les classements !
              </p>
            </GlassCard>
          </div>
        </section>

        {/* ======== NEWS SECTION ======== */}
        <section className="relative z-10 mb-12">
          <NewsSection />
        </section>

        {/* ======== TOURNAMENTS SECTION ======== */}
        <section id="tournois" className="relative z-10">
          {/* Search and Filters */}
          <GlassCard className="mb-8">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder={`🔍 ${t('homepage.searchPlaceholder', 'Rechercher un tournoi...')}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[rgba(148,163,184,0.1)] bg-[rgba(13,13,20,0.8)] py-3 pl-12 pr-4 text-[#F8FAFC] placeholder-[#94A3B8] backdrop-blur-xl transition-all focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[rgba(13,13,20,0.8)] py-2.5 px-4 text-[#F8FAFC] focus:border-[#6366F1] focus:outline-none"
                >
                  <option value="all">🎮 {t('common.all', 'Tous les jeux')}</option>
                  {availableGames.map(game => (
                    <option key={game} value={game}>{game}</option>
                  ))}
                </select>

                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[rgba(13,13,20,0.8)] py-2.5 px-4 text-[#F8FAFC] focus:border-[#6366F1] focus:outline-none"
                >
                  <option value="all">📊 {t('common.all', 'Tous les formats')}</option>
                  <option value="elimination">{t('tournament.elimination', 'Élimination')}</option>
                  <option value="double_elimination">{t('tournament.doubleElimination', 'Double Élim.')}</option>
                  <option value="round_robin">{t('tournament.roundRobin', 'Round Robin')}</option>
                  <option value="swiss">{t('tournament.swiss', 'Suisse')}</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[rgba(13,13,20,0.8)] py-2.5 px-4 text-[#F8FAFC] focus:border-[#6366F1] focus:outline-none"
                >
                  <option value="all">📝 {t('common.all', 'Tous les statuts')}</option>
                  <option value="draft">{t('tournament.draft', 'Brouillon')}</option>
                  <option value="ongoing">{t('tournament.ongoing', 'En cours')}</option>
                  <option value="completed">{t('tournament.completed', 'Terminé')}</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[rgba(13,13,20,0.8)] py-2.5 px-4 text-[#F8FAFC] focus:border-[#6366F1] focus:outline-none"
                >
                  <option value="date">📅 Par date</option>
                  <option value="name">🔤 Par nom</option>
                </select>
              </div>

              {/* Results counter */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#94A3B8]">
                  <span className="text-[#A5B4FC] font-medium">{filteredAndSortedTournaments.length}</span> tournoi{filteredAndSortedTournaments.length > 1 ? 's' : ''} trouvé{filteredAndSortedTournaments.length > 1 ? 's' : ''}
                </span>
                {(searchQuery || gameFilter !== 'all' || formatFilter !== 'all' || statusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setGameFilter('all');
                      setFormatFilter('all');
                      setStatusFilter('all');
                      setSortBy('date');
                    }}
                    className="text-[#94A3B8] hover:text-red-400 transition-colors"
                  >
                    ✕ Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Title */}
          <h2 className="mb-8 text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <Trophy className="h-6 w-6 text-[#FFD700]" />
            🏆 {t('homepage.availableTournaments', 'Tournois Disponibles')}
          </h2>

          {/* Tournament Grid */}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-10 flex-wrap">
                  <GradientButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Précédent
                  </GradientButton>

                  <div className="flex gap-2 items-center">
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
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-xl text-sm transition-all ${currentPage === pageNum
                              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]'
                              : 'bg-[#0D0D14] border border-[rgba(148,163,184,0.1)] text-[#94A3B8] hover:border-[#6366F1] hover:text-[#F8FAFC]'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <GradientButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant →
                  </GradientButton>
                </div>
              )}
            </>
          ) : (
            <EmptyTournaments />
          )}
        </section>
      </div>

      {/* CSS for animations */}
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
