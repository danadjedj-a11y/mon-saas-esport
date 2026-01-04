import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient';
import { toast } from './utils/toast';
import TournamentCard from './components/TournamentCard';
import { TournamentCardSkeleton } from './components/Skeleton';
import { EmptyTournaments } from './components/EmptyState';
import LanguageSelector from './components/LanguageSelector';

export default function HomePage() {
  const { t } = useTranslation();
  const [allTournaments, setAllTournaments] = useState([]); // Tous les tournois chargés
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  
  // États pour recherche, filtres et pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'participants'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const isFetchingRef = useRef(false);

  const fetchTournaments = useCallback(async () => {
    // Éviter les appels multiples simultanés avec un ref
    if (isFetchingRef.current) {
      console.log('⏸️ Chargement déjà en cours, ignoré');
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    
    try {
      console.log('🔄 Chargement des tournois...');
      
      // Requête simple sans timeout au premier chargement
      // Le timeout peut causer des problèmes si Supabase met du temps à s'initialiser
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

    // Attendre un peu que Supabase soit prêt avant de charger les tournois
    // Cela évite les problèmes de connexion au démarrage
    // En mode développement avec StrictMode, React peut appeler useEffect deux fois
    // Le ref isFetchingRef empêche les appels multiples
    timeoutId = setTimeout(() => {
      if (mounted) {
        fetchTournaments();
      }
    }, 300); // Petit délai de 300ms pour laisser Supabase s'initialiser

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []); // Retirer fetchTournaments des dépendances pour éviter les re-renders

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
    <div style={{ minHeight: '100vh', background: '#030913', color: '#F8F6F2' }}>
      {/* HEADER */}
      <div style={{ background: 'rgba(3, 9, 19, 0.95)', borderBottom: '3px solid #FF36A3', padding: '20px 30px', boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#FF36A3', cursor: 'pointer', fontFamily: "'Shadows Into Light', cursive" }} onClick={() => navigate('/')}>
              ⚔️ Fluky Boys
            </h1>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <LanguageSelector />
            {session ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/player/dashboard')}
                  style={{
                    padding: '10px 20px',
                    background: '#C10468',
                    color: '#F8F6F2',
                    border: '2px solid #FF36A3',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: "'Shadows Into Light', cursive",
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FF36A3';
                    e.currentTarget.style.borderColor = '#C10468';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#C10468';
                    e.currentTarget.style.borderColor = '#FF36A3';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  🎮 {t('homepage.playerSpace')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { error } = await supabase.auth.signOut();
                      if (error) {
                        console.error('Erreur déconnexion:', error);
                      } else {
                        navigate('/');
                        window.location.reload(); // Force le rafraîchissement pour mettre à jour la session
                      }
                    } catch (err) {
                      console.error('Erreur déconnexion:', err);
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '2px solid #C10468',
                    color: '#F8F6F2',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: "'Shadows Into Light', cursive",
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#C10468';
                    e.currentTarget.style.borderColor = '#FF36A3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#C10468';
                  }}
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  style={{
                    padding: '10px 20px',
                    background: '#C10468',
                    border: '2px solid #FF36A3',
                    color: '#F8F6F2',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: "'Shadows Into Light', cursive",
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FF36A3';
                    e.currentTarget.style.borderColor = '#C10468';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#C10468';
                    e.currentTarget.style.borderColor = '#FF36A3';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {t('nav.login')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* HERO SECTION */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(193, 4, 104, 0.1) 0%, rgba(255, 54, 163, 0.05) 100%)', 
        padding: '60px 30px',
        textAlign: 'center',
        borderBottom: '3px solid #FF36A3',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '3rem', margin: '0 0 20px 0', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive", fontWeight: '400' }}>
            {t('homepage.title')}
          </h2>
          <p style={{ fontSize: '1.3rem', color: '#F8F6F2', margin: '0 0 30px 0', fontFamily: "'Protest Riot', sans-serif" }}>
            {t('homepage.subtitle')}
          </p>
          {!session && (
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/auth')}
                style={{
                  padding: '15px 40px',
                  background: '#C10468',
                  color: '#F8F6F2',
                  border: '2px solid #FF36A3',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Shadows Into Light', cursive",
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(193, 4, 104, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                  e.currentTarget.style.background = '#FF36A3';
                  e.currentTarget.style.borderColor = '#C10468';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 54, 163, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.background = '#C10468';
                  e.currentTarget.style.borderColor = '#FF36A3';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(193, 4, 104, 0.4)';
                }}
              >
                🔐 Se Connecter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 30px' }}>
        {/* BARRE DE RECHERCHE ET FILTRES */}
        <div style={{ 
          background: 'rgba(3, 9, 19, 0.95)', 
          padding: '25px', 
          borderRadius: '12px', 
          border: '2px solid #FF36A3',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            {/* Recherche */}
            <input
              type="text"
              placeholder={`🔍 ${t('homepage.searchPlaceholder')}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '12px',
                background: 'rgba(3, 9, 19, 0.8)',
                border: '2px solid #C10468',
                color: '#F8F6F2',
                borderRadius: '8px',
                fontFamily: "'Protest Riot', sans-serif",
                fontSize: '0.95rem',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF36A3';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#C10468';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            
            {/* Filtre Jeu */}
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              style={{
                padding: '12px',
                background: 'rgba(3, 9, 19, 0.8)',
                border: '2px solid #C10468',
                color: '#F8F6F2',
                borderRadius: '8px',
                fontFamily: "'Protest Riot', sans-serif",
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF36A3';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#C10468';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
              style={{
                padding: '12px',
                background: 'rgba(3, 9, 19, 0.8)',
                border: '2px solid #C10468',
                color: '#F8F6F2',
                borderRadius: '8px',
                fontFamily: "'Protest Riot', sans-serif",
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF36A3';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#C10468';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
              style={{
                padding: '12px',
                background: 'rgba(3, 9, 19, 0.8)',
                border: '2px solid #C10468',
                color: '#F8F6F2',
                borderRadius: '8px',
                fontFamily: "'Protest Riot', sans-serif",
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF36A3';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#C10468';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
              style={{
                padding: '12px',
                background: 'rgba(3, 9, 19, 0.8)',
                border: '2px solid #C10468',
                color: '#F8F6F2',
                borderRadius: '8px',
                fontFamily: "'Protest Riot', sans-serif",
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF36A3';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#C10468';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="date">📅 Par date</option>
              <option value="name">🔤 Par nom</option>
            </select>
          </div>

          {/* Compteur de résultats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.95rem', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
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
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '2px solid #C10468',
                  color: '#F8F6F2',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Shadows Into Light', cursive",
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#C10468';
                  e.currentTarget.style.borderColor = '#FF36A3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#C10468';
                }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>🏆 {t('homepage.availableTournaments')}</h2>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <TournamentCardSkeleton key={i} />
            ))}
          </div>
        ) : paginatedTournaments.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
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
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '10px', 
                marginTop: '40px',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '10px 20px',
                    background: currentPage === 1 ? 'rgba(193, 4, 104, 0.3)' : '#C10468',
                    border: '2px solid #FF36A3',
                    color: '#F8F6F2',
                    borderRadius: '8px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontFamily: "'Shadows Into Light', cursive",
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.background = '#FF36A3';
                      e.currentTarget.style.borderColor = '#C10468';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.background = '#C10468';
                      e.currentTarget.style.borderColor = '#FF36A3';
                    }
                  }}
                >
                  ← Précédent
                </button>

                <div style={{ 
                  display: 'flex', 
                  gap: '5px', 
                  alignItems: 'center',
                  fontFamily: "'Protest Riot', sans-serif",
                  color: '#F8F6F2'
                }}>
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
                        style={{
                          padding: '10px 15px',
                          background: currentPage === pageNum ? '#FF36A3' : 'rgba(3, 9, 19, 0.8)',
                          border: `2px solid ${currentPage === pageNum ? '#C10468' : '#FF36A3'}`,
                          color: '#F8F6F2',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontFamily: "'Protest Riot', sans-serif",
                          fontSize: '0.9rem',
                          fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                          transition: 'all 0.3s ease',
                          minWidth: '40px'
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== pageNum) {
                            e.currentTarget.style.background = 'rgba(255, 54, 163, 0.5)';
                            e.currentTarget.style.borderColor = '#C10468';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== pageNum) {
                            e.currentTarget.style.background = 'rgba(3, 9, 19, 0.8)';
                            e.currentTarget.style.borderColor = '#FF36A3';
                          }
                        }}
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
                  style={{
                    padding: '10px 20px',
                    background: currentPage === totalPages ? 'rgba(193, 4, 104, 0.3)' : '#C10468',
                    border: '2px solid #FF36A3',
                    color: '#F8F6F2',
                    borderRadius: '8px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontFamily: "'Shadows Into Light', cursive",
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease',
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.background = '#FF36A3';
                      e.currentTarget.style.borderColor = '#C10468';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.background = '#C10468';
                      e.currentTarget.style.borderColor = '#FF36A3';
                    }
                  }}
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

      {/* FOOTER */}
      <div style={{ 
        marginTop: '60px', 
        padding: '40px 30px', 
        background: 'rgba(3, 9, 19, 0.95)', 
        borderTop: '3px solid #FF36A3',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <p style={{ color: '#F8F6F2', margin: '0 0 10px 0', fontFamily: "'Protest Riot', sans-serif" }}>© 2024 Fluky Boys - Plateforme de gestion de tournois e-sport</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
            <a href="#" style={{ color: '#FF36A3', textDecoration: 'none', fontSize: '0.9rem', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#C10468'} onMouseLeave={(e) => e.currentTarget.style.color = '#FF36A3'}>À propos</a>
            <a href="#" style={{ color: '#FF36A3', textDecoration: 'none', fontSize: '0.9rem', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#C10468'} onMouseLeave={(e) => e.currentTarget.style.color = '#FF36A3'}>Contact</a>
            <a href="#" style={{ color: '#FF36A3', textDecoration: 'none', fontSize: '0.9rem', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#C10468'} onMouseLeave={(e) => e.currentTarget.style.color = '#FF36A3'}>Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}

