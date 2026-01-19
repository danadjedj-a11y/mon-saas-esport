/**
 * GamesDirectory - Répertoire complet des jeux
 * 
 * Inspiré de Toornament avec :
 * - Recherche de jeux
 * - Grille de tous les jeux
 * - Stats par jeu (nombre de tournois)
 * - Catégorisation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../supabaseClient';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Input, Button } from '../../shared/components/ui';

// Base de données des jeux avec catégories
const GAMES_DATABASE = [
  // FPS
  { slug: 'valorant', name: 'Valorant', category: 'FPS', publisher: 'Riot Games', image: '🎯', color: '#fd4556' },
  { slug: 'counter-strike-2', name: 'Counter-Strike 2', category: 'FPS', publisher: 'Valve', image: '🔫', color: '#f7941d' },
  { slug: 'call-of-duty', name: 'Call of Duty', category: 'FPS', publisher: 'Activision', image: '💥', color: '#1a1a1a' },
  { slug: 'apex-legends', name: 'Apex Legends', category: 'FPS', publisher: 'EA', image: '🔶', color: '#cd3333' },
  { slug: 'overwatch-2', name: 'Overwatch 2', category: 'FPS', publisher: 'Blizzard', image: '🦸', color: '#fa9c1e' },
  { slug: 'rainbow-six', name: 'Rainbow Six Siege', category: 'FPS', publisher: 'Ubisoft', image: '🛡️', color: '#409cff' },
  
  // MOBA
  { slug: 'league-of-legends', name: 'League of Legends', category: 'MOBA', publisher: 'Riot Games', image: '⚔️', color: '#c89b3c' },
  { slug: 'dota-2', name: 'Dota 2', category: 'MOBA', publisher: 'Valve', image: '🛡️', color: '#a32d2d' },
  { slug: 'mobile-legends', name: 'Mobile Legends', category: 'MOBA', publisher: 'Moonton', image: '📱', color: '#6c5ce7' },
  
  // Battle Royale
  { slug: 'fortnite', name: 'Fortnite', category: 'Battle Royale', publisher: 'Epic Games', image: '🏝️', color: '#9d4dbb' },
  { slug: 'pubg', name: 'PUBG', category: 'Battle Royale', publisher: 'Krafton', image: '🪂', color: '#f2a900' },
  { slug: 'warzone', name: 'Warzone', category: 'Battle Royale', publisher: 'Activision', image: '🎖️', color: '#2e7d32' },
  
  // Sports
  { slug: 'fifa', name: 'FC 25', category: 'Sports', publisher: 'EA Sports', image: '⚽', color: '#326295' },
  { slug: 'rocket-league', name: 'Rocket League', category: 'Sports', publisher: 'Psyonix', image: '🚗', color: '#0096ff' },
  { slug: 'nba-2k', name: 'NBA 2K', category: 'Sports', publisher: '2K Sports', image: '🏀', color: '#ff6b00' },
  
  // Fighting
  { slug: 'street-fighter-6', name: 'Street Fighter 6', category: 'Fighting', publisher: 'Capcom', image: '👊', color: '#ff0000' },
  { slug: 'tekken-8', name: 'Tekken 8', category: 'Fighting', publisher: 'Bandai Namco', image: '🥊', color: '#e53935' },
  { slug: 'mortal-kombat', name: 'Mortal Kombat 1', category: 'Fighting', publisher: 'WB Games', image: '🐉', color: '#ffab00' },
  { slug: 'super-smash-bros', name: 'Super Smash Bros', category: 'Fighting', publisher: 'Nintendo', image: '💫', color: '#e91e63' },
  
  // Strategy / Card
  { slug: 'tft', name: 'Teamfight Tactics', category: 'Strategy', publisher: 'Riot Games', image: '♟️', color: '#00bcd4' },
  { slug: 'hearthstone', name: 'Hearthstone', category: 'Card', publisher: 'Blizzard', image: '🃏', color: '#ff9800' },
  { slug: 'magic-arena', name: 'MTG Arena', category: 'Card', publisher: 'Wizards', image: '🧙', color: '#6a1b9a' },
  
  // Racing
  { slug: 'gran-turismo', name: 'Gran Turismo 7', category: 'Racing', publisher: 'Sony', image: '🏎️', color: '#1565c0' },
  { slug: 'f1', name: 'F1 24', category: 'Racing', publisher: 'EA Sports', image: '🏁', color: '#e10600' },
  
  // Other
  { slug: 'clash-royale', name: 'Clash Royale', category: 'Mobile', publisher: 'Supercell', image: '👑', color: '#ffcc00' },
  { slug: 'brawl-stars', name: 'Brawl Stars', category: 'Mobile', publisher: 'Supercell', image: '⭐', color: '#f9ca24' },
  { slug: 'minecraft', name: 'Minecraft', category: 'Sandbox', publisher: 'Mojang', image: '⛏️', color: '#8bc34a' },
];

// Catégories
const CATEGORIES = ['Tous', 'FPS', 'MOBA', 'Battle Royale', 'Sports', 'Fighting', 'Strategy', 'Card', 'Racing', 'Mobile', 'Sandbox'];

export default function GamesDirectory({ session }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'Tous');

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('game')
        .eq('is_public', true);

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Erreur chargement stats jeux:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculer les stats par jeu
  const gamesWithStats = useMemo(() => {
    const counts = {};
    tournaments.forEach(t => {
      if (t.game) {
        const key = t.game.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    
    return GAMES_DATABASE.map(game => {
      // Chercher correspondance dans les tournois
      const matchingKey = Object.keys(counts).find(key => 
        key.includes(game.slug.replace(/-/g, ' ')) ||
        game.name.toLowerCase().includes(key) ||
        key.includes(game.name.toLowerCase())
      );
      
      return {
        ...game,
        tournamentCount: matchingKey ? counts[matchingKey] : 0
      };
    });
  }, [tournaments]);

  // Filtrer par recherche et catégorie
  const filteredGames = useMemo(() => {
    let result = gamesWithStats;
    
    // Filtre par catégorie
    if (selectedCategory !== 'Tous') {
      result = result.filter(g => g.category === selectedCategory);
    }
    
    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.publisher?.toLowerCase().includes(query) ||
        g.category?.toLowerCase().includes(query)
      );
    }
    
    // Trier par nombre de tournois puis par nom
    return result.sort((a, b) => b.tournamentCount - a.tournamentCount || a.name.localeCompare(b.name));
  }, [gamesWithStats, searchQuery, selectedCategory]);

  // Stats globales
  const totalTournaments = tournaments.length;
  const activeGames = gamesWithStats.filter(g => g.tournamentCount > 0).length;

  return (
    <DashboardLayout session={session}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-sm text-gray-400 mb-4">
            <Link to="/play" className="hover:text-violet-400">Play</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Jeux</span>
          </nav>
          
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            {t('play.games.title', 'Tous les jeux')}
          </h1>
          
          <div className="flex gap-6 text-gray-400">
            <span className="flex items-center gap-2">
              <span className="text-2xl">🎮</span>
              {GAMES_DATABASE.length} jeux supportés
            </span>
            <span className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              {totalTournaments} tournois actifs
            </span>
            <span className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              {activeGames} jeux avec tournois
            </span>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-8 space-y-4">
          {/* Barre de recherche */}
          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('play.games.searchPlaceholder', 'Rechercher un jeu...')}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>
          
          {/* Catégories */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${selectedCategory === category 
                    ? 'bg-violet-500 text-white' 
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Grille des jeux */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl animate-pulse">
                <div className="aspect-square bg-gray-700/50 rounded-t-xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-700/50 rounded w-3/4" />
                  <div className="h-3 bg-gray-700/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredGames.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredGames.map(game => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700">
            <span className="text-5xl mb-4 block">🔍</span>
            <h3 className="text-xl font-bold text-white mb-2">
              {t('play.games.noResults', 'Aucun jeu trouvé')}
            </h3>
            <p className="text-gray-400 mb-4">
              {t('play.games.noResultsDesc', 'Essayez de modifier vos filtres de recherche')}
            </p>
            <Button variant="secondary" onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Tous');
            }}>
              Réinitialiser les filtres
            </Button>
          </div>
        )}

        {/* Section Demander un jeu */}
        <section className="mt-12 text-center py-8 bg-gradient-to-r from-violet-900/20 to-cyan-900/20 rounded-2xl border border-violet-500/20">
          <h3 className="text-xl font-bold text-white mb-2">
            {t('play.games.requestTitle', 'Votre jeu n\'est pas dans la liste ?')}
          </h3>
          <p className="text-gray-400 mb-4">
            {t('play.games.requestDesc', 'Contactez-nous pour ajouter un nouveau jeu à la plateforme')}
          </p>
          <Button variant="secondary">
            Demander un jeu
          </Button>
        </section>
      </div>
    </DashboardLayout>
  );
}

// Composant Card Jeu
function GameCard({ game }) {
  return (
    <Link
      to={`/play/games/${game.slug}`}
      className="group bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden hover:border-violet-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/20"
    >
      {/* Image / Icon */}
      <div 
        className="aspect-square flex items-center justify-center text-6xl relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${game.color}30, ${game.color}10)` }}
      >
        <span className="transform group-hover:scale-110 transition-transform duration-300">
          {game.image}
        </span>
        
        {/* Badge tournois */}
        {game.tournamentCount > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold border border-green-500/30">
            {game.tournamentCount} tournoi{game.tournamentCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-white group-hover:text-violet-400 transition-colors truncate">
          {game.name}
        </h3>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500">{game.publisher}</span>
          <span className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-400 rounded">
            {game.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
