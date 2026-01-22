import { useState } from 'react';
import { Button, Input } from '../../shared/components/ui';
import clsx from 'clsx';

/**
 * Options de format de match
 */
const MATCH_FORMAT_OPTIONS = [
  { value: 'inherited', label: 'Format hérité' },
  { value: 'none', label: 'Aucune manche' },
  { value: 'single', label: 'Manche unique' },
  { value: 'home_away', label: 'Aller-Retour' },
  { value: 'best_of', label: 'Best-of' },
  { value: 'fixed', label: 'Manches fixes' },
];

const BEST_OF_OPTIONS = [
  { value: 1, label: 'BO1' },
  { value: 3, label: 'BO3' },
  { value: 5, label: 'BO5' },
  { value: 7, label: 'BO7' },
];

/**
 * GroupConfigEditor - Éditeur de configuration pour les groupes (Winners/Losers Bracket)
 * Permet de configurer le nom du groupe et les paramètres de match par tour
 */
export default function GroupConfigEditor({ 
  group,
  groupKey,
  rounds = [],
  onChange,
  parentMatchFormat = 'best_of',
  parentBestOf = 3,
}) {
  const [activeRound, setActiveRound] = useState(null);
  const [localConfig, setLocalConfig] = useState({
    name: group?.name || 'Groupe',
    matchFormat: group?.matchFormat || 'inherited',
    bestOf: group?.bestOf || null,
    rounds: rounds.map(r => ({
      ...r,
      matchFormat: r.matchFormat || 'inherited',
      bestOf: r.bestOf || null,
    })),
  });

  const handleGroupChange = (field, value) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onChange?.(groupKey, newConfig);
  };

  const handleRoundChange = (roundIndex, field, value) => {
    const newRounds = [...localConfig.rounds];
    newRounds[roundIndex] = { ...newRounds[roundIndex], [field]: value };
    const newConfig = { ...localConfig, rounds: newRounds };
    setLocalConfig(newConfig);
    onChange?.(groupKey, newConfig);
  };

  // Obtenir le format effectif d'un round (héritage)
  const getEffectiveFormat = (round) => {
    if (round.matchFormat !== 'inherited') {
      return round.matchFormat;
    }
    if (localConfig.matchFormat !== 'inherited') {
      return localConfig.matchFormat;
    }
    return parentMatchFormat;
  };

  const getEffectiveBestOf = (round) => {
    if (round.bestOf) return round.bestOf;
    if (localConfig.bestOf) return localConfig.bestOf;
    return parentBestOf;
  };

  return (
    <div className="space-y-6">
      {/* Configuration du groupe */}
      <div className="p-4 bg-[#2a2d3e] rounded-xl border border-white/10">
        <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <span className={groupKey === 'winners' ? 'text-green-400' : 'text-orange-400'}>
            {groupKey === 'winners' ? '🏆' : '🔄'}
          </span>
          Configuration du {localConfig.name}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nom du groupe */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom du groupe
            </label>
            <Input
              value={localConfig.name}
              onChange={(e) => handleGroupChange('name', e.target.value)}
              placeholder="Ex: Winners Bracket"
              className="bg-[#1e2235] border-white/10"
            />
          </div>

          {/* Format de match par défaut */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Format de match par défaut
            </label>
            <select
              value={localConfig.matchFormat}
              onChange={(e) => handleGroupChange('matchFormat', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1e2235] border border-white/10 rounded-lg text-white focus:border-violet focus:outline-none"
            >
              {MATCH_FORMAT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Best-of si format = best_of */}
          {localConfig.matchFormat === 'best_of' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Best of
              </label>
              <div className="flex gap-2">
                {BEST_OF_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleGroupChange('bestOf', opt.value)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg border text-sm transition-all',
                      localConfig.bestOf === opt.value
                        ? 'bg-cyan-600 border-cyan-500 text-white'
                        : 'bg-[#1e2235] border-white/10 text-gray-400 hover:border-white/30'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration par tour */}
      <div className="p-4 bg-[#2a2d3e] rounded-xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-white">
            Configuration par tour
          </h3>
          <select
            value={activeRound ?? ''}
            onChange={(e) => setActiveRound(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-1.5 bg-[#1e2235] border border-white/10 rounded-lg text-white text-sm focus:border-violet focus:outline-none"
          >
            <option value="">Sélectionner un tour</option>
            {localConfig.rounds.map((round, idx) => (
              <option key={idx} value={idx}>{round.name || `Tour ${idx + 1}`}</option>
            ))}
          </select>
        </div>

        {/* Liste des tours */}
        {activeRound === null ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {localConfig.rounds.map((round, idx) => {
              const effectiveFormat = getEffectiveFormat(round);
              const effectiveBestOf = getEffectiveBestOf(round);
              
              return (
                <button
                  key={idx}
                  onClick={() => setActiveRound(idx)}
                  className="p-3 bg-[#1e2235] rounded-lg border border-white/10 hover:border-violet/50 transition-colors text-left"
                >
                  <p className="text-sm font-medium text-white truncate">
                    {round.name || `Tour ${idx + 1}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {effectiveFormat === 'best_of' 
                      ? `BO${effectiveBestOf}` 
                      : effectiveFormat === 'inherited' 
                        ? 'Hérité'
                        : effectiveFormat}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          // Édition d'un tour spécifique
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium">
                {localConfig.rounds[activeRound]?.name || `Tour ${activeRound + 1}`}
              </h4>
              <button
                onClick={() => setActiveRound(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ← Voir tous les tours
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom du tour */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom du tour
                </label>
                <Input
                  value={localConfig.rounds[activeRound]?.name || ''}
                  onChange={(e) => handleRoundChange(activeRound, 'name', e.target.value)}
                  placeholder={`Tour ${activeRound + 1}`}
                  className="bg-[#1e2235] border-white/10"
                />
              </div>

              {/* Format de match */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Format de match
                </label>
                <select
                  value={localConfig.rounds[activeRound]?.matchFormat || 'inherited'}
                  onChange={(e) => handleRoundChange(activeRound, 'matchFormat', e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1e2235] border border-white/10 rounded-lg text-white focus:border-violet focus:outline-none"
                >
                  {MATCH_FORMAT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Best-of pour ce tour */}
              {localConfig.rounds[activeRound]?.matchFormat === 'best_of' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Best of pour ce tour
                  </label>
                  <div className="flex gap-2">
                    {BEST_OF_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleRoundChange(activeRound, 'bestOf', opt.value)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg border text-sm transition-all',
                          localConfig.rounds[activeRound]?.bestOf === opt.value
                            ? 'bg-cyan-600 border-cyan-500 text-white'
                            : 'bg-[#1e2235] border-white/10 text-gray-400 hover:border-white/30'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info sur l'héritage */}
            <div className="p-3 bg-violet/10 border border-violet/30 rounded-lg text-sm text-gray-400">
              💡 Si "Format hérité" est sélectionné, ce tour utilisera le format défini au niveau du groupe 
              ({localConfig.matchFormat === 'best_of' 
                ? `BO${localConfig.bestOf || parentBestOf}` 
                : localConfig.matchFormat || parentMatchFormat})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
