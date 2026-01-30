/**
 * SearchResults - Page de résultats de recherche (Convex)
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Button, Tabs } from '../../shared/components/ui';
import { TournamentCardSkeleton } from '../../components/Skeleton';

export default function SearchResults({ session }) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [activeTab, setActiveTab] = useState('tournaments');

  // Convex queries
  const tournamentsData = useQuery(api.tournaments.search, 
    query ? { searchQuery: query, limit: 50 } : "skip"
  );
  const teamsData = useQuery(api.teams.list); // TODO: Add search query to teams

  const loading = tournamentsData === undefined;
  
  // Filtrer les équipes par recherche côté client pour l'instant
  const tournaments = tournamentsData ?? [];
  const teams = useMemo(() => {
    if (!teamsData || !query) return [];
    return teamsData.filter(t => 
      t.name?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 50);
  }, [teamsData, query]);

  const totalResults = tournaments.length + teams.length;

  const tabs = [
    { id: 'tournaments', label: `Tournois (${tournaments.length})` },
    { id: 'teams', label: `Équipes (${teams.length})` },
  ];

  return (
    <DashboardLayout session={session}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-sm text-gray-400 mb-4">
            <Link to="/play" className="hover:text-violet-400">Play</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Recherche</span>
          </nav>
          
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Résultats pour "{query}"
          </h1>
          <p className="text-gray-400">
            {totalResults} résultat{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
          </p>
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

        {/* Résultats */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <TournamentCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'tournaments' && (
              <TournamentResults tournaments={tournaments} navigate={navigate} />
            )}
            {activeTab === 'teams' && (
              <TeamResults teams={teams} navigate={navigate} />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function TournamentResults({ tournaments, navigate }) {
  if (tournaments.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-700">
        <span className="text-5xl mb-4 block">🏆</span>
        <h3 className="text-xl font-bold text-white mb-2">Aucun tournoi trouvé</h3>
        <p className="text-gray-400">Essayez avec d'autres termes de recherche</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tournaments.map(tournament => (
        <TournamentRow 
          key={tournament._id} 
          tournament={tournament}
          onClick={() => navigate(`/tournament/${tournament._id}/public`)}
        />
      ))}
    </div>
  );
}

function TeamResults({ teams, navigate }) {
  if (teams.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-700">
        <span className="text-5xl mb-4 block">👥</span>
        <h3 className="text-xl font-bold text-white mb-2">Aucune équipe trouvée</h3>
        <p className="text-gray-400">Essayez avec d'autres termes de recherche</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map(team => (
        <div 
          key={team._id}
          onClick={() => navigate(`/team/${team._id}`)}
          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-violet-500/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center text-2xl">
              {team.logo || '👥'}
            </div>
            <div>
              <h3 className="font-bold text-white">{team.name}</h3>
              <p className="text-sm text-gray-400">{team.tag}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TournamentRow({ tournament, onClick }) {
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
      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-violet-500/50 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="text-center w-16 flex-shrink-0">
          <div className="text-2xl font-bold text-white">
            {new Date(tournament.startDate).getDate()}
          </div>
          <div className="text-xs text-gray-500 uppercase">
            {new Date(tournament.startDate).toLocaleDateString('fr-FR', { month: 'short' })}
          </div>
        </div>
        
        <div className="h-12 w-px bg-gray-700" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded text-xs font-bold">
              {tournament.game}
            </span>
          </div>
          <h3 className="font-bold text-white truncate">{tournament.name}</h3>
          <div className="flex gap-3 text-sm text-gray-400 mt-1">
            <span>👥 {tournament.maxParticipants}</span>
            {(tournament.cashprizeTotal ?? 0) > 0 && (
              <span className="text-yellow-400">💰 {tournament.cashprizeTotal}€</span>
            )}
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>
          {config.label}
        </span>
        
        <span className="text-gray-600 text-xl">→</span>
      </div>
    </div>
  );
}
