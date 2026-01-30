import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Avatar } from '../shared/components/ui';

/**
 * Composant de recherche de joueur avec autocomplete
 * - Input de recherche
 * - Recherche par pseudonyme (username)
 * - Affichage de l'avatar et du pseudo des résultats
 * - Exclusion des joueurs déjà dans l'équipe
 */
const PlayerSearch = ({
  onSelectPlayer,
  excludedUserIds = [],
  placeholder = 'Rechercher un joueur...',
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Debounce du terme de recherche
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rechercher les joueurs via Convex
  const searchResults = useQuery(
    api.users.search,
    debouncedSearchTerm.length >= 2 ? { query: debouncedSearchTerm, limit: 10 } : "skip"
  );

  const loading = debouncedSearchTerm.length >= 2 && searchResults === undefined;

  // Filtrer les joueurs déjà dans l'équipe et mapper les champs pour compatibilité
  const results = useMemo(() => {
    if (!searchResults) return [];
    return searchResults
      .filter((player) => !excludedUserIds.includes(player._id))
      .map((player) => ({
        id: player._id,
        username: player.username,
        avatar_url: player.avatarUrl,
      }));
  }, [searchResults, excludedUserIds]);

  // Mettre à jour le dropdown quand les résultats changent
  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [debouncedSearchTerm, results]);

  const handleSelectPlayer = (player) => {
    if (onSelectPlayer) {
      onSelectPlayer(player);
    }
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setShowDropdown(false);
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Input de recherche */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-10 bg-black/50 border-2 border-violet-500 text-white rounded-lg font-body text-base transition-all duration-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-xl">
          🔍
        </div>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
          </div>
        )}
      </div>

      {/* Dropdown avec résultats */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#030913] border-2 border-violet-500 rounded-lg shadow-xl shadow-violet-500/20 max-h-80 overflow-y-auto">
          {results.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => handleSelectPlayer(player)}
              className="w-full flex items-center gap-3 p-3 hover:bg-violet-500/10 transition-all duration-200 border-b border-white/5 last:border-b-0"
            >
              <Avatar
                src={player.avatar_url}
                name={player.username || 'Joueur'}
                size="sm"
              />
              <div className="flex-1 text-left">
                <p className="font-body text-white">
                  {player.username || 'Joueur sans pseudo'}
                </p>
              </div>
              <div className="text-cyan-400 text-sm font-body">
                Sélectionner
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Message si aucun résultat */}
      {!loading && debouncedSearchTerm.length >= 2 && results.length === 0 && showDropdown && (
        <div className="absolute z-50 w-full mt-2 bg-[#030913] border-2 border-violet-500 rounded-lg shadow-xl shadow-violet-500/20 p-4">
          <p className="text-center text-gray-400 font-body">
            Aucun joueur trouvé pour "{debouncedSearchTerm}"
          </p>
        </div>
      )}
    </div>
  );
};

export default PlayerSearch;
