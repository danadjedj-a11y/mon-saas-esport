/**
 * PlayHome - Page d'accueil Play (côté joueur)
 * 
 * Inspiré de Toornament Play avec :
 * - Barre de recherche globale
 * - Tournois en vedette (carousel)
 * - Jeux populaires
 * - Tournois à venir
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../supabaseClient';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Button, Input, Card } from '../../shared/components/ui';
import { TournamentCardSkeleton } from '../../components/Skeleton';

// Constantes pour les jeux populaires avec leurs images
const POPULAR_GAMES = [
  { slug: 'valorant', name: 'Valorant', image: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=200&h=200&fit=crop', color: '#fd4556' },
  { slug: 'league-of-legends', name: 'League of Legends', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop', color: '#c89b3c' },
  { slug: 'counter-strike-2', name: 'Counter-Strike 2', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0b?w=200&h=200&fit=crop', color: '#f7941d' },
  { slug: 'rocket-league', name: 'Rocket League', image: 'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=200&h=200&fit=crop', color: '#0096ff' },
  { slug: 'fortnite', name: 'Fortnite', image: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=200&h=200&fit=crop', color: '#9d4dbb' },
  { slug: 'fifa', name: 'FC 25', image: 'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=200&h=200&fit=crop', color: '#326295' },
  { slug: 'call-of-duty', name: 'Call of Duty', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0b?w=200&h=200&fit=crop', color: '#1a1a1a' },
  { slug: 'apex-legends', name: 'Apex Legends', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop', color: '#cd3333' },
];

// Mapping des noms de jeux vers les slugs
const _gameToSlug = (game) => {
  const mapping = {
    'Valorant': 'valorant',
    'League of Legends': 'league-of-legends',
    'Counter-Strike 2': 'counter-strike-2',
    'CS2': 'counter-strike-2',
    'Rocket League': 'rocket-league',
    'Fortnite': 'fortnite',
    'FC 25': 'fifa',
    'FIFA': 'fifa',
    'Call of Duty': 'call-of-duty',
    'Apex Legends': 'apex-legends',
  };
  return mapping[game] || game?.toLowerCase().replace(/\s+/g, '-');
};

export default function PlayHome({ session }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    fetchTournaments();
  }, []);

  // Auto-rotation du carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % Math.max(1, featuredTournaments.length));
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournaments]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['draft', 'open', 'ongoing'])
        .eq('is_public', true)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Erreur chargement tournois:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tournois en vedette (les plus récents avec cashprize ou les plus gros)
  const featuredTournaments = useMemo(() => {
    return tournaments
      .filter(t => t.cashprize_total > 0 || t.max_participants >= 16)
      .slice(0, 5);
  }, [tournaments]);

  // Tournois à venir (prochains 10)
  const upcomingTournaments = useMemo(() => {
    const now = new Date();
    return tournaments
      .filter(t => new Date(t.start_date) > now)
      .slice(0, 10);
  }, [tournaments]);

  // Jeux avec nombre de tournois
  const gamesWithStats = useMemo(() => {
    const counts = {};
    tournaments.forEach(t => {
      const game = t.game;
      if (game) {
        counts[game] = (counts[game] || 0) + 1;
      }
    });
    
    return POPULAR_GAMES.map(g => ({
      ...g,
      count: Object.entries(counts).find(([key]) => 
        key.toLowerCase().includes(g.slug.replace(/-/g, ' ')) ||
        g.name.toLowerCase().includes(key.toLowerCase())
      )?.[1] || 0
    }));
  }, [tournaments]);

  // Filtrer par recherche
  const filteredTournaments = useMemo(() => {
    if (!searchQuery) return upcomingTournaments;
    const query = searchQuery.toLowerCase();
    return tournaments.filter(t => 
      t.name?.toLowerCase().includes(query) ||
      t.game?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  }, [tournaments, upcomingTournaments, searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/play/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const currentFeatured = featuredTournaments[featuredIndex];

  return (
    <DashboardLayout session={session}>
      <div className="max-w-7xl mx-auto">
        {/* Hero Section avec recherche */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400">
              {t('play.home.title', 'Trouvez votre prochain tournoi')}
            </h1>
            <p className="text-lg text-gray-400 font-body max-w-2xl mx-auto">
              {t('play.home.subtitle', 'Découvrez et participez aux meilleurs tournois esport')}
            </p>
          </div>

          {/* Barre de recherche globale */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('play.home.searchPlaceholder', 'Rechercher un jeu, tournoi ou équipe...')}
                className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-lg"
              />
              <Button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                variant="primary"
              >
                {t('common.search', 'Rechercher')}
              </Button>
            </div>
          </form>
        </section>

        {/* Tournoi en vedette (Carousel) */}
        {featuredTournaments.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-3xl">⭐</span>
              {t('play.home.featured', 'Tournois en vedette')}
            </h2>
            
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/50 to-cyan-900/50 border border-violet-500/30">
              {currentFeatured && (
                <div 
                  className="p-8 md:p-12 cursor-pointer transition-all duration-500"
                  onClick={() => navigate(`/tournament/${currentFeatured.id}/public`)}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-violet-500/20 text-violet-400 rounded-full text-sm font-bold border border-violet-500/30">
                          {currentFeatured.game}
                        </span>
                        <StatusBadge status={currentFeatured.status} />
                      </div>
                      
                      <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
                        {currentFeatured.name}
                      </h3>
                      
                      <div className="flex flex-wrap gap-4 text-gray-300 mb-4">
                        <span className="flex items-center gap-2">
                          📅 {new Date(currentFeatured.start_date).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </span>
                        <span className="flex items-center gap-2">
                          👥 {currentFeatured.max_participants} équipes max
                        </span>
                        {currentFeatured.cashprize_total > 0 && (
                          <span className="flex items-center gap-2 text-yellow-400 font-bold">
                            💰 {currentFeatured.cashprize_total.toLocaleString()}€
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-400 line-clamp-2 mb-6">
                        {currentFeatured.description}
                      </p>
                      
                      <Button variant="primary" size="lg">
                        {t('play.home.viewTournament', 'Voir le tournoi')} →
                      </Button>
                    </div>
                    
                    <div className="hidden md:flex w-48 h-48 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-2xl items-center justify-center text-8xl">
                      🏆
                    </div>
                  </div>
                </div>
              )}
              
              {/* Indicateurs carousel */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {featuredTournaments.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFeaturedIndex(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx === featuredIndex 
                        ? 'bg-violet-500 w-8' 
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Jeux populaires */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🎮</span>
              {t('play.home.popularGames', 'Jeux populaires')}
            </h2>
            <Link 
              to="/play/games" 
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              {t('play.home.viewAllGames', 'Voir tous les jeux')} →
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {gamesWithStats.map(game => (
              <Link
                key={game.slug}
                to={`/play/games/${game.slug}`}
                className="group relative bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-violet-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/20"
              >
                <div 
                  className="w-16 h-16 mx-auto mb-3 rounded-xl flex items-center justify-center text-3xl"
                  style={{ background: `${game.color}20` }}
                >
                  🎮
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-white text-sm group-hover:text-violet-400 transition-colors truncate">
                    {game.name}
                  </h3>
                  {game.count > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {game.count} tournoi{game.count > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Tournois à venir */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📅</span>
              {t('play.home.upcomingTournaments', 'Tournois à venir')}
            </h2>
            <Link 
              to="/play/tournaments" 
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              {t('play.home.viewAllTournaments', 'Voir tous les tournois')} →
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <TournamentCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredTournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTournaments.map(tournament => (
                <TournamentCardEnhanced 
                  key={tournament.id} 
                  tournament={tournament}
                  onClick={() => navigate(`/tournament/${tournament.id}/public`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800/30 rounded-2xl border border-gray-700">
              <span className="text-5xl mb-4 block">🏆</span>
              <h3 className="text-xl font-bold text-white mb-2">
                {t('play.home.noTournaments', 'Aucun tournoi à venir')}
              </h3>
              <p className="text-gray-400">
                {t('play.home.noTournamentsDesc', 'Revenez bientôt pour découvrir de nouveaux tournois !')}
              </p>
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="text-center py-12 bg-gradient-to-r from-violet-900/30 to-cyan-900/30 rounded-2xl border border-violet-500/20 mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
            {t('play.home.cta.title', 'Prêt à rejoindre la compétition ?')}
          </h2>
          <p className="text-gray-400 mb-6 max-w-xl mx-auto">
            {t('play.home.cta.subtitle', 'Inscrivez-vous gratuitement et participez aux meilleurs tournois esport')}
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button variant="primary" size="lg" onClick={() => navigate('/auth')}>
              {t('play.home.cta.register', 'Créer un compte')}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/play/games')}>
              {t('play.home.cta.browse', 'Explorer les jeux')}
            </Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

// Composant Badge de statut
function StatusBadge({ status }) {
  const statusConfig = {
    draft: { label: 'En préparation', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    open: { label: 'Inscriptions ouvertes', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    ongoing: { label: 'En cours', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    completed: { label: 'Terminé', color: 'bg-gray-500/20 text-gray-500 border-gray-500/30' },
  };
  
  const config = statusConfig[status] || statusConfig.draft;
  
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${config.color}`}>
      {config.label}
    </span>
  );
}

// Composant Card Tournoi amélioré
function TournamentCardEnhanced({ tournament, onClick }) {
  const statusConfig = {
    draft: { label: 'En préparation', color: 'border-l-gray-500' },
    open: { label: 'Inscriptions ouvertes', color: 'border-l-green-500' },
    ongoing: { label: 'En cours', color: 'border-l-blue-500' },
    completed: { label: 'Terminé', color: 'border-l-gray-600' },
  };
  
  const config = statusConfig[tournament.status] || statusConfig.draft;
  
  return (
    <div 
      onClick={onClick}
      className={`
        bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden
        hover:border-violet-500/50 transition-all duration-300 cursor-pointer
        hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/20
        border-l-4 ${config.color}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-start justify-between mb-2">
          <span className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded text-xs font-bold">
            {tournament.game}
          </span>
          <span className="text-xs text-gray-500">
            {tournament.format}
          </span>
        </div>
        <h3 className="font-bold text-white text-lg line-clamp-1">
          {tournament.name}
        </h3>
      </div>
      
      {/* Body */}
      <div className="p-4">
        <div className="flex flex-wrap gap-3 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            📅 {new Date(tournament.start_date).toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'short' 
            })}
          </span>
          <span className="flex items-center gap-1">
            👥 {tournament.max_participants}
          </span>
          {tournament.cashprize_total > 0 && (
            <span className="flex items-center gap-1 text-yellow-400 font-medium">
              💰 {tournament.cashprize_total}€
            </span>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-4 py-3 bg-gray-900/30 flex justify-between items-center">
        <StatusBadge status={tournament.status} />
        <span className="text-violet-400 text-sm font-medium">
          Voir →
        </span>
      </div>
    </div>
  );
}
