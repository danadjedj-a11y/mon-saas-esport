/**
 * GamePage - Page détaillée d'un jeu
 * 
 * Inspiré de Toornament avec :
 * - Bannière du jeu
 * - Onglets (Vue d'ensemble / Tournois)
 * - Filtres avancés pour les tournois
 * - Stats du jeu sur la plateforme
 */

import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Button, Tabs } from '../../shared/components/ui';
import { TournamentCardSkeleton } from '../../components/Skeleton';

// Base de données des jeux (devrait être dans un fichier partagé)
const GAMES_DATABASE = {
  'valorant': { 
    name: 'Valorant', 
    publisher: 'Riot Games', 
    category: 'FPS',
    description: 'Valorant est un jeu de tir tactique 5v5 free-to-play développé par Riot Games. Le jeu met en scène des agents aux capacités uniques dans des parties compétitives.',
    image: '🎯', 
    color: '#fd4556',
    links: { official: 'https://playvalorant.com', esports: 'https://valorantesports.com' }
  },
  'league-of-legends': { 
    name: 'League of Legends', 
    publisher: 'Riot Games', 
    category: 'MOBA',
    description: 'League of Legends est un jeu de stratégie en équipe dans lequel deux équipes de cinq champions s\'affrontent pour détruire la base adverse.',
    image: '⚔️', 
    color: '#c89b3c',
    links: { official: 'https://leagueoflegends.com', esports: 'https://lolesports.com' }
  },
  'counter-strike-2': { 
    name: 'Counter-Strike 2', 
    publisher: 'Valve', 
    category: 'FPS',
    description: 'Counter-Strike 2 est la suite de CS:GO, le jeu de tir tactique le plus populaire au monde. Affrontez d\'autres joueurs dans des parties compétitives 5v5.',
    image: '🔫', 
    color: '#f7941d',
    links: { official: 'https://counter-strike.net' }
  },
  'rocket-league': { 
    name: 'Rocket League', 
    publisher: 'Psyonix', 
    category: 'Sports',
    description: 'Rocket League est un jeu de football motorisé qui mélange arcade et compétition. Jouez en 1v1, 2v2 ou 3v3 avec des voitures propulsées par fusée.',
    image: '🚗', 
    color: '#0096ff',
    links: { official: 'https://rocketleague.com', esports: 'https://esports.rocketleague.com' }
  },
  'fortnite': { 
    name: 'Fortnite', 
    publisher: 'Epic Games', 
    category: 'Battle Royale',
    description: 'Fortnite est un Battle Royale free-to-play où 100 joueurs s\'affrontent pour être le dernier survivant. Construisez, combattez et survivez !',
    image: '🏝️', 
    color: '#9d4dbb',
    links: { official: 'https://fortnite.com' }
  },
  'fifa': { 
    name: 'FC 25', 
    publisher: 'EA Sports', 
    category: 'Sports',
    description: 'EA Sports FC 25 est le successeur de FIFA, le jeu de simulation de football le plus populaire au monde.',
    image: '⚽', 
    color: '#326295',
    links: { official: 'https://ea.com/games/ea-sports-fc' }
  },
  'call-of-duty': { 
    name: 'Call of Duty', 
    publisher: 'Activision', 
    category: 'FPS',
    description: 'Call of Duty est une franchise de jeux de tir à la première personne. La série propose des modes multijoueur compétitifs intenses.',
    image: '💥', 
    color: '#1a1a1a',
    links: { official: 'https://callofduty.com' }
  },
  'apex-legends': { 
    name: 'Apex Legends', 
    publisher: 'EA', 
    category: 'FPS',
    description: 'Apex Legends est un Battle Royale de héros free-to-play où des escouades de légendes s\'affrontent pour la gloire.',
    image: '🔶', 
    color: '#cd3333',
    links: { official: 'https://ea.com/games/apex-legends' }
  },
};

// Formats de tournoi
const FORMATS = ['Tous', 'Single Elimination', 'Double Elimination', 'Round Robin', 'Swiss', 'Group Stage'];

// Statuts
const STATUSES = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'open', label: 'Inscriptions ouvertes' },
  { value: 'ongoing', label: 'En cours' },
  { value: 'completed', label: 'Terminés' },
];

export default function GamePage({ session }) {
  const { t } = useTranslation();
  const { gameSlug } = useParams();
  const navigate = useNavigate();
  
  // Convex query - automatically reactive
  const gameName = GAMES_DATABASE[gameSlug]?.name || gameSlug?.replace(/-/g, ' ');
  const tournaments = useQuery(api.games.getTournamentsByGame, { gameName: gameName || '' }) ?? [];
  const loading = tournaments === undefined;
  
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filtres
  const [statusFilter, setStatusFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('Tous');
  const [sortBy, setSortBy] = useState('date');

  // Récupérer les infos du jeu
  const gameInfo = GAMES_DATABASE[gameSlug];

  // Stats du jeu
  const stats = useMemo(() => {
    const now = new Date();
    const openCount = tournaments.filter(t => t.status === 'open').length;
    const ongoingCount = tournaments.filter(t => t.status === 'ongoing').length;
    const totalPrizePool = tournaments.reduce((sum, t) => sum + (t.cashprizeTotal || 0), 0);
    const upcomingCount = tournaments.filter(t => new Date(t.startDate) > now).length;
    
    return { openCount, ongoingCount, totalPrizePool, upcomingCount, total: tournaments.length };
  }, [tournaments]);

  // Filtrer et trier les tournois
  const filteredTournaments = useMemo(() => {
    let result = [...tournaments];
    
    // Filtre par statut
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }
    
    // Filtre par format
    if (formatFilter !== 'Tous') {
      result = result.filter(t => t.format === formatFilter);
    }
    
    // Tri
    switch (sortBy) {
      case 'date':
        result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        break;
      case 'prize':
        result.sort((a, b) => (b.cashprizeTotal || 0) - (a.cashprizeTotal || 0));
        break;
      case 'participants':
        result.sort((a, b) => b.maxParticipants - a.maxParticipants);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    
    return result;
  }, [tournaments, statusFilter, formatFilter, sortBy]);

  // Si le jeu n'existe pas dans notre base
  if (!gameInfo) {
    return (
      <DashboardLayout session={session}>
        <div className="max-w-7xl mx-auto text-center py-16">
          <span className="text-6xl mb-4 block">🎮</span>
          <h1 className="text-2xl font-bold text-white mb-4">Jeu non trouvé</h1>
          <p className="text-gray-400 mb-6">Ce jeu n'est pas encore dans notre catalogue</p>
          <Button variant="primary" onClick={() => navigate('/play/games')}>
            Voir tous les jeux
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { id: 'overview', label: t('play.game.overview', 'Vue d\'ensemble') },
    { id: 'tournaments', label: t('play.game.tournaments', `Tournois (${stats.total})`) },
  ];

  return (
    <DashboardLayout session={session}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6">
          <Link to="/play" className="hover:text-violet-400">Play</Link>
          <span className="mx-2">/</span>
          <Link to="/play/games" className="hover:text-violet-400">Jeux</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{gameInfo.name}</span>
        </nav>

        {/* Bannière du jeu */}
        <div 
          className="relative rounded-2xl overflow-hidden mb-8"
          style={{ 
            background: `linear-gradient(135deg, ${gameInfo.color}40, ${gameInfo.color}10, transparent)` 
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-transparent" />
          
          <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Icon du jeu */}
            <div 
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center text-6xl md:text-7xl"
              style={{ background: `${gameInfo.color}30` }}
            >
              {gameInfo.image}
            </div>
            
            {/* Infos */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-gray-800/50 text-gray-300 rounded-full text-sm font-medium">
                  {gameInfo.category}
                </span>
                <span className="text-gray-500">{gameInfo.publisher}</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
                {gameInfo.name}
              </h1>
              
              <p className="text-gray-400 max-w-2xl mb-4">
                {gameInfo.description}
              </p>
              
              {/* Liens externes */}
              {gameInfo.links && (
                <div className="flex gap-3">
                  {gameInfo.links.official && (
                    <a 
                      href={gameInfo.links.official} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-violet-400 hover:text-violet-300"
                    >
                      Site officiel ↗
                    </a>
                  )}
                  {gameInfo.links.esports && (
                    <a 
                      href={gameInfo.links.esports} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-violet-400 hover:text-violet-300"
                    >
                      Esports ↗
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {/* Stats rapides */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <StatBox label="Tournois actifs" value={stats.openCount + stats.ongoingCount} icon="🏆" />
              <StatBox label="Total tournois" value={stats.total} icon="📊" />
              <StatBox label="À venir" value={stats.upcomingCount} icon="📅" />
              <StatBox 
                label="Cashprize total" 
                value={stats.totalPrizePool > 0 ? `${stats.totalPrizePool.toLocaleString()}€` : '-'} 
                icon="💰" 
              />
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-700 mb-6">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-6 py-3 text-sm font-medium transition-all relative
                  ${activeTab === tab.id 
                    ? 'text-violet-400' 
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'overview' ? (
          <OverviewTab 
            gameInfo={gameInfo} 
            stats={stats} 
            tournaments={tournaments}
            navigate={navigate}
          />
        ) : (
          <TournamentsTab
            loading={loading}
            tournaments={filteredTournaments}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            formatFilter={formatFilter}
            setFormatFilter={setFormatFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            navigate={navigate}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// Composant StatBox
function StatBox({ label, value, icon }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 text-center">
      <span className="text-2xl mb-1 block">{icon}</span>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

// Onglet Vue d'ensemble
function OverviewTab({ gameInfo, stats, tournaments, navigate }) {
  const recentTournaments = tournaments.slice(0, 3);
  const openTournaments = tournaments.filter(t => t.status === 'open').slice(0, 3);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Colonne principale */}
      <div className="lg:col-span-2 space-y-8">
        {/* Tournois ouverts aux inscriptions */}
        {openTournaments.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-green-400">●</span>
              Inscriptions ouvertes
            </h2>
            <div className="space-y-4">
              {openTournaments.map(t => (
                <TournamentListItem 
                  key={t.id} 
                  tournament={t} 
                  onClick={() => navigate(`/tournament/${t.id}/public`)}
                />
              ))}
            </div>
          </section>
        )}
        
        {/* Derniers tournois */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">
            Derniers tournois
          </h2>
          {recentTournaments.length > 0 ? (
            <div className="space-y-4">
              {recentTournaments.map(t => (
                <TournamentListItem 
                  key={t.id} 
                  tournament={t} 
                  onClick={() => navigate(`/tournament/${t.id}/public`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-800/30 rounded-xl border border-gray-700">
              <span className="text-4xl mb-2 block">🏆</span>
              <p className="text-gray-400">Aucun tournoi pour ce jeu pour le moment</p>
            </div>
          )}
        </section>
      </div>
      
      {/* Sidebar */}
      <div className="space-y-6">
        {/* À propos */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="font-bold text-white mb-4">À propos de {gameInfo.name}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Éditeur</span>
              <span className="text-white">{gameInfo.publisher}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Catégorie</span>
              <span className="text-white">{gameInfo.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tournois sur la plateforme</span>
              <span className="text-white">{stats.total}</span>
            </div>
          </div>
        </div>
        
        {/* CTA créer tournoi */}
        <div className="bg-gradient-to-br from-violet-900/30 to-cyan-900/30 rounded-xl p-6 border border-violet-500/20">
          <h3 className="font-bold text-white mb-2">Organisez votre tournoi</h3>
          <p className="text-sm text-gray-400 mb-4">
            Créez un tournoi {gameInfo.name} et invitez la communauté
          </p>
          <Button variant="primary" className="w-full" onClick={() => navigate('/create-tournament')}>
            Créer un tournoi
          </Button>
        </div>
      </div>
    </div>
  );
}

// Onglet Tournois
function TournamentsTab({ 
  loading, 
  tournaments, 
  statusFilter, 
  setStatusFilter,
  formatFilter,
  setFormatFilter,
  sortBy,
  setSortBy,
  navigate 
}) {
  return (
    <div>
      {/* Filtres */}
      <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-gray-700">
        {/* Statut */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
        >
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        
        {/* Format */}
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
        >
          {FORMATS.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        
        {/* Tri */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500 ml-auto"
        >
          <option value="date">Plus récents</option>
          <option value="prize">Cashprize</option>
          <option value="participants">Participants</option>
          <option value="name">Nom</option>
        </select>
      </div>
      
      {/* Liste */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <TournamentCardSkeleton key={i} />
          ))}
        </div>
      ) : tournaments.length > 0 ? (
        <div className="space-y-4">
          {tournaments.map(t => (
            <TournamentListItem 
              key={t.id} 
              tournament={t} 
              onClick={() => navigate(`/tournament/${t.id}/public`)}
              detailed
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-700">
          <span className="text-5xl mb-4 block">🔍</span>
          <h3 className="text-xl font-bold text-white mb-2">Aucun tournoi trouvé</h3>
          <p className="text-gray-400">Essayez de modifier vos filtres</p>
        </div>
      )}
    </div>
  );
}

// Composant ligne tournoi
function TournamentListItem({ tournament, onClick, detailed = false }) {
  const statusConfig = {
    draft: { label: 'En préparation', color: 'bg-gray-500/20 text-gray-400' },
    open: { label: 'Inscriptions', color: 'bg-green-500/20 text-green-400' },
    ongoing: { label: 'En cours', color: 'bg-blue-500/20 text-blue-400' },
    completed: { label: 'Terminé', color: 'bg-gray-500/20 text-gray-500' },
  };
  
  const config = statusConfig[tournament.status] || statusConfig.draft;
  
  return (
    <div 
      onClick={onClick}
      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-violet-500/50 transition-all cursor-pointer hover:bg-gray-800/70"
    >
      <div className="flex items-center gap-4">
        {/* Date */}
        <div className="text-center w-16 flex-shrink-0">
          <div className="text-2xl font-bold text-white">
            {new Date(tournament.startDate).getDate()}
          </div>
          <div className="text-xs text-gray-500 uppercase">
            {new Date(tournament.startDate).toLocaleDateString('fr-FR', { month: 'short' })}
          </div>
        </div>
        
        <div className="h-12 w-px bg-gray-700" />
        
        {/* Infos */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{tournament.name}</h3>
          <div className="flex flex-wrap gap-3 text-sm text-gray-400 mt-1">
            <span>👥 {tournament.maxParticipants}</span>
            <span>🏆 {tournament.format}</span>
            {tournament.cashprizeTotal > 0 && (
              <span className="text-yellow-400">💰 {tournament.cashprizeTotal}€</span>
            )}
          </div>
        </div>
        
        {/* Statut */}
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.color} flex-shrink-0`}>
          {config.label}
        </span>
        
        {/* Flèche */}
        <span className="text-gray-600 text-xl">→</span>
      </div>
    </div>
  );
}
