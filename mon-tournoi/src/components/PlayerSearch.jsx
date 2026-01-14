import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
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
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

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

  // Rechercher les joueurs
  useEffect(() => {
    const searchPlayers = async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `%${searchTerm}%`)
          .limit(10);

        if (error) throw error;

        // Filtrer les joueurs déjà dans l'équipe
        const filteredResults = (data || []).filter(
          (player) => !excludedUserIds.includes(player.id)
        );

        setResults(filteredResults);
        setShowDropdown(filteredResults.length > 0);
      } catch (error) {
        console.error('Erreur recherche joueurs:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchPlayers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, excludedUserIds]);

  const handleSelectPlayer = (player) => {
    if (onSelectPlayer) {
      onSelectPlayer(player);
    }
    setSearchTerm('');
    setShowDropdown(false);
    setResults([]);
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
          className="w-full px-4 py-3 pl-10 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fluky-text/50 text-xl">
          🔍
        </div>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-fluky-secondary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Dropdown avec résultats */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#030913] border-2 border-fluky-primary rounded-lg shadow-xl shadow-fluky-primary/20 max-h-80 overflow-y-auto">
          {results.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => handleSelectPlayer(player)}
              className="w-full flex items-center gap-3 p-3 hover:bg-fluky-primary/10 transition-all duration-200 border-b border-white/5 last:border-b-0"
            >
              <Avatar
                src={player.avatar_url}
                name={player.username || 'Joueur'}
                size="sm"
              />
              <div className="flex-1 text-left">
                <p className="font-body text-fluky-text">
                  {player.username || 'Joueur sans pseudo'}
                </p>
              </div>
              <div className="text-fluky-secondary text-sm font-body">
                Sélectionner
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Message si aucun résultat */}
      {!loading && searchTerm.length >= 2 && results.length === 0 && showDropdown && (
        <div className="absolute z-50 w-full mt-2 bg-[#030913] border-2 border-fluky-primary rounded-lg shadow-xl shadow-fluky-primary/20 p-4">
          <p className="text-center text-fluky-text/60 font-body">
            Aucun joueur trouvé pour "{searchTerm}"
          </p>
        </div>
      )}
    </div>
  );
};

export default PlayerSearch;
