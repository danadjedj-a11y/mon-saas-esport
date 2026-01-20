import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Input } from '../../shared/components/ui';
import { toast } from '../../utils/toast';
import { generateBracketMatches } from '../../utils/matchGenerator';
import clsx from 'clsx';

/**
 * MATCH TYPES - Étape 1
 */
const MATCH_TYPES = [
  {
    id: 'duel',
    label: 'Duel',
    description: 'Les matchs impliquant deux participants (joueurs ou équipes) nécessitent une des phases de duel, telles que les arbres à simple ou double élimination, le Gauntlet, les groupes de type "round-robin" ou le système suisse.',
    icon: (
      <svg viewBox="0 0 60 40" className="w-16 h-10">
        <circle cx="18" cy="20" r="10" fill="currentColor" opacity="0.7"/>
        <circle cx="42" cy="20" r="10" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
  },
  {
    id: 'ffa',
    label: 'FFA',
    description: 'Les matchs impliquant plus de deux participants, également appelés mêlées générales, Free-For-All (FFA) en anglais, nécessitent une structure composée de phases spécialement conçues pour ce type de match.',
    icon: (
      <svg viewBox="0 0 60 40" className="w-16 h-10">
        <circle cx="15" cy="15" r="8" fill="currentColor" opacity="0.7"/>
        <circle cx="45" cy="15" r="8" fill="currentColor" opacity="0.7"/>
        <circle cx="22" cy="30" r="8" fill="currentColor" opacity="0.7"/>
        <circle cx="38" cy="30" r="8" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
  },
];

/**
 * PHASE TYPES - Étape 2 (pour Duel)
 */
const PHASE_TYPES_DUEL = [
  {
    id: 'elimination',
    label: 'Élimination directe',
    description: 'Arbre dans lequel les participants sont éliminés après une défaite.',
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14 text-violet/60">
        <line x1="10" y1="10" x2="25" y2="10" stroke="currentColor" strokeWidth="2"/>
        <line x1="10" y1="25" x2="25" y2="25" stroke="currentColor" strokeWidth="2"/>
        <line x1="25" y1="10" x2="25" y2="25" stroke="currentColor" strokeWidth="2"/>
        <line x1="25" y1="17" x2="40" y2="17" stroke="currentColor" strokeWidth="2"/>
        <line x1="10" y1="40" x2="25" y2="40" stroke="currentColor" strokeWidth="2"/>
        <line x1="10" y1="55" x2="25" y2="55" stroke="currentColor" strokeWidth="2"/>
        <line x1="25" y1="40" x2="25" y2="55" stroke="currentColor" strokeWidth="2"/>
        <line x1="25" y1="47" x2="40" y2="47" stroke="currentColor" strokeWidth="2"/>
        <line x1="40" y1="17" x2="40" y2="47" stroke="currentColor" strokeWidth="2"/>
        <line x1="40" y1="32" x2="55" y2="32" stroke="currentColor" strokeWidth="2"/>
        <circle cx="62" cy="32" r="5" fill="#00bcd4"/>
      </svg>
    ),
  },
  {
    id: 'double_elimination',
    label: 'Double élimination',
    description: 'Arbre dans lequel un participant doit perdre deux matchs pour être éliminé.',
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14 text-violet/60">
        {/* Winners bracket */}
        <line x1="10" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="2"/>
        <line x1="10" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="2"/>
        <line x1="22" y1="8" x2="22" y2="18" stroke="currentColor" strokeWidth="2"/>
        <line x1="22" y1="13" x2="35" y2="13" stroke="currentColor" strokeWidth="2"/>
        <line x1="35" y1="13" x2="35" y2="25" stroke="currentColor" strokeWidth="2"/>
        <line x1="35" y1="25" x2="50" y2="25" stroke="currentColor" strokeWidth="2"/>
        {/* Losers bracket */}
        <line x1="10" y1="42" x2="22" y2="42" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
        <line x1="10" y1="52" x2="22" y2="52" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
        <line x1="22" y1="42" x2="22" y2="52" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
        <line x1="22" y1="47" x2="35" y2="47" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
        <line x1="35" y1="47" x2="35" y2="25" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
        <circle cx="57" cy="25" r="5" fill="#00bcd4"/>
      </svg>
    ),
  },
  {
    id: 'gauntlet',
    label: 'Gauntlet',
    description: 'Arbre dans lequel les participants moins bien classés rencontrent progressivement des adversaires mieux classés.',
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14 text-violet/60">
        <line x1="10" y1="50" x2="25" y2="50" stroke="currentColor" strokeWidth="2"/>
        <line x1="25" y1="50" x2="25" y2="40" stroke="currentColor" strokeWidth="2"/>
        <line x1="10" y1="40" x2="40" y2="40" stroke="currentColor" strokeWidth="2"/>
        <line x1="40" y1="40" x2="40" y2="30" stroke="currentColor" strokeWidth="2"/>
        <line x1="10" y1="30" x2="55" y2="30" stroke="currentColor" strokeWidth="2"/>
        <line x1="55" y1="30" x2="55" y2="20" stroke="currentColor" strokeWidth="2"/>
        <line x1="10" y1="20" x2="70" y2="20" stroke="currentColor" strokeWidth="2"/>
        <circle cx="70" cy="20" r="5" fill="#00bcd4"/>
      </svg>
    ),
  },
  {
    id: 'groups',
    label: 'Groupes d\'arbres',
    description: 'Groupes dans lesquels les participants jouent dans de petits arbres à simple ou double élimination.',
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14 text-violet/60">
        <rect x="5" y="5" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,2"/>
        <line x1="10" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="10" y1="20" x2="18" y2="20" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="18" y1="12" x2="18" y2="20" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="18" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="1.5"/>
        
        <rect x="45" y="5" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,2"/>
        <line x1="50" y1="12" x2="58" y2="12" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="50" y1="20" x2="58" y2="20" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="58" y1="12" x2="58" y2="20" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="58" y1="16" x2="68" y2="16" stroke="currentColor" strokeWidth="1.5"/>
        
        <rect x="5" y="33" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,2"/>
        <rect x="45" y="33" width="30" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,2"/>
      </svg>
    ),
  },
  {
    id: 'custom',
    label: 'Arbre personnalisé',
    description: 'Arbre dans lequel la progression des participants peut être personnalisée.',
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14 text-violet/60">
        <line x1="10" y1="15" x2="25" y2="15" stroke="currentColor" strokeWidth="2" strokeDasharray="4,2"/>
        <line x1="10" y1="30" x2="25" y2="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4,2"/>
        <line x1="25" y1="15" x2="25" y2="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4,2"/>
        <line x1="25" y1="22" x2="45" y2="22" stroke="currentColor" strokeWidth="2" strokeDasharray="4,2"/>
        <line x1="10" y1="45" x2="45" y2="45" stroke="currentColor" strokeWidth="2" strokeDasharray="4,2"/>
        <line x1="45" y1="22" x2="45" y2="45" stroke="currentColor" strokeWidth="2" strokeDasharray="4,2"/>
        <line x1="45" y1="33" x2="60" y2="33" stroke="currentColor" strokeWidth="2" strokeDasharray="4,2"/>
        <circle cx="67" cy="33" r="5" fill="#00bcd4"/>
      </svg>
    ),
  },
  {
    id: 'round_robin',
    label: 'Groupes "round-robin"',
    description: 'Petits groupes dans lesquels les participants affrontent tous les adversaires présents dans leur groupe.',
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14 text-violet/60">
        <circle cx="20" cy="15" r="6" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="60" cy="15" r="6" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="20" cy="45" r="6" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="60" cy="45" r="6" fill="none" stroke="currentColor" strokeWidth="2"/>
        <line x1="26" y1="15" x2="54" y2="15" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="26" y1="45" x2="54" y2="45" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="20" y1="21" x2="20" y2="39" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="60" y1="21" x2="60" y2="39" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="25" y1="20" x2="55" y2="40" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="25" y1="40" x2="55" y2="20" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'league',
    label: 'Système de ligue',
    description: 'Grandes divisions dans lesquelles les participants jouent sur plusieurs journées.',
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14 text-violet/60">
        <rect x="10" y="8" width="60" height="10" fill="currentColor" opacity="0.3" rx="2"/>
        <rect x="10" y="22" width="60" height="10" fill="currentColor" opacity="0.2" rx="2"/>
        <rect x="10" y="36" width="60" height="10" fill="currentColor" opacity="0.15" rx="2"/>
        <rect x="10" y="50" width="60" height="6" fill="currentColor" opacity="0.1" rx="2"/>
        <line x1="30" y1="8" x2="30" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="50" y1="8" x2="50" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      </svg>
    ),
  },
  {
    id: 'swiss',
    label: 'Système suisse',
    description: 'Phase dans laquelle les participants affrontent des adversaires avec des résultats similaires.',
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14 text-violet/60">
        <rect x="8" y="8" width="64" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3"/>
        <line x1="8" y1="20" x2="72" y2="20" stroke="currentColor" strokeWidth="1"/>
        <line x1="8" y1="32" x2="72" y2="32" stroke="currentColor" strokeWidth="1"/>
        <line x1="8" y1="44" x2="72" y2="44" stroke="currentColor" strokeWidth="1"/>
        <line x1="28" y1="8" x2="28" y2="52" stroke="currentColor" strokeWidth="1"/>
        <line x1="52" y1="8" x2="52" y2="52" stroke="currentColor" strokeWidth="1"/>
        <text x="18" y="16" fontSize="6" fill="currentColor" textAnchor="middle">1</text>
        <text x="40" y="16" fontSize="6" fill="currentColor" textAnchor="middle">W</text>
        <text x="62" y="16" fontSize="6" fill="currentColor" textAnchor="middle">L</text>
      </svg>
    ),
  },
];

/**
 * GRAND FINAL OPTIONS
 */
const GRAND_FINAL_OPTIONS = [
  { id: 'simple', label: 'Simple', description: 'Match unique pour la finale' },
  { id: 'double', label: 'Double', description: 'Le perdant du Winners doit gagner 2 matchs' },
  { id: 'none', label: 'Aucune', description: 'Pas de grande finale' },
];

/**
 * PhaseCreator - Wizard de création de phase en 3 étapes
 */
export default function PhaseCreator({ tournamentId, phaseOrder, onPhaseCreated, onCancel }) {
  const [step, setStep] = useState(1);
  const [matchType, setMatchType] = useState(null);
  const [phaseType, setPhaseType] = useState(null);
  const [config, setConfig] = useState({
    name: '',
    size: 8,
    grandFinal: 'simple',
    skipFirstRound: false,
  });
  const [activeConfigTab, setActiveConfigTab] = useState('general');
  const [creating, setCreating] = useState(false);

  // Breadcrumb navigation
  const breadcrumbs = [
    { step: 1, label: 'Structure' },
    { step: 2, label: 'Choisir un type de match', active: step === 1 },
    { step: 3, label: 'Choisir un type de phase', active: step === 2 },
    { step: 4, label: `Configurez la phase`, active: step === 3 },
  ].filter(b => b.step <= step + 1);

  const handleMatchTypeSelect = (type) => {
    setMatchType(type);
    setStep(2);
  };

  const handlePhaseTypeSelect = (type) => {
    setPhaseType(type);
    // Nom par défaut basé sur le type
    const defaultNames = {
      elimination: 'Playoffs',
      double_elimination: 'Playoffs',
      round_robin: 'Phase de groupes',
      swiss: 'Qualifications',
      gauntlet: 'Gauntlet',
      groups: 'Phase de groupes',
      custom: 'Phase personnalisée',
      league: 'Saison régulière',
    };
    setConfig(prev => ({ ...prev, name: defaultNames[type.id] || 'Phase' }));
    setStep(3);
  };

  const handleCreate = async () => {
    if (!config.name.trim()) {
      toast.error('Veuillez donner un nom à la phase');
      return;
    }

    setCreating(true);
    try {
      const phaseData = {
        tournament_id: tournamentId,
        name: config.name.trim(),
        phase_order: phaseOrder,
        format: phaseType.id,
        match_type: matchType.id,
        status: 'draft',
        config: {
          size: config.size,
          grand_final: config.grandFinal,
          skip_first_round: config.skipFirstRound,
        },
      };

      const { data, error } = await supabase
        .from('tournament_phases')
        .insert([phaseData])
        .select()
        .single();

      if (error) throw error;

      // Générer automatiquement les matchs pour cette phase
      try {
        const matchesGenerated = await generateBracketMatches(data, tournamentId);
        console.log(`${matchesGenerated.length} matchs générés pour la phase`);
      } catch (matchError) {
        console.error('Erreur génération matchs:', matchError);
        // On continue même si la génération échoue (la phase est créée)
        toast.warning('Phase créée mais erreur lors de la génération des matchs');
      }

      onPhaseCreated(data);
    } catch (error) {
      console.error('Erreur création phase:', error);
      toast.error('Erreur lors de la création: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const goBack = () => {
    if (step === 1) {
      onCancel();
    } else {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-[500px]">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          {breadcrumbs.map((b, i) => (
            <span key={b.step} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              <span className={b.active ? 'text-white' : ''}>
                {b.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Step 1: Type de match */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-display font-bold text-white mb-8">
            Choisir un type de match
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MATCH_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handleMatchTypeSelect(type)}
                className={clsx(
                  'p-6 rounded-xl border-2 text-left transition-all',
                  'bg-[#2a2d3e] hover:bg-[#33374a]',
                  'border-white/10 hover:border-violet/50'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="text-gray-400">
                    {type.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-white text-lg mb-2">
                      {type.label}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {type.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Type de phase */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-display font-bold text-white mb-8">
            Choisir un type de phase
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PHASE_TYPES_DUEL.map((type) => (
              <button
                key={type.id}
                onClick={() => handlePhaseTypeSelect(type)}
                className={clsx(
                  'p-5 rounded-xl border-2 text-left transition-all',
                  'bg-[#2a2d3e] hover:bg-[#33374a]',
                  'border-white/10 hover:border-violet/50'
                )}
              >
                <div className="flex justify-center mb-4">
                  {type.icon}
                </div>
                <h3 className="font-display font-semibold text-white text-base mb-2">
                  {type.label}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {type.description}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={goBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Retour
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configuration */}
      {step === 3 && phaseType && (
        <div>
          <h2 className="text-2xl font-display font-bold text-white mb-6">
            Configurez la phase: {phaseType.label}
          </h2>

          {/* Tabs de configuration */}
          <div className="border-b border-white/10 mb-6">
            <div className="flex gap-1">
              {['general', 'advanced', 'placement', 'match'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveConfigTab(tab)}
                  className={clsx(
                    'px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                    activeConfigTab === tab
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  )}
                >
                  {tab === 'general' && 'Général'}
                  {tab === 'advanced' && 'Avancé'}
                  {tab === 'placement' && 'Placement'}
                  {tab === 'match' && 'Paramètres de match'}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content: Général */}
          {activeConfigTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Numéro <span className="text-gray-500">ℹ️</span>
                </label>
                <Input
                  type="number"
                  value={phaseOrder}
                  disabled
                  className="bg-[#1e2235] border-white/10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Taille
                </label>
                <Input
                  type="number"
                  value={config.size}
                  onChange={(e) => setConfig(prev => ({ ...prev, size: parseInt(e.target.value) || 4 }))}
                  min={2}
                  max={256}
                  className="bg-[#1e2235] border-white/10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom <span className="text-gray-500">(30 caractères maximum)</span>
                </label>
                <Input
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value.slice(0, 30) }))}
                  placeholder="Ex: Playoffs, Qualifications..."
                  className="bg-[#1e2235] border-white/10"
                />
              </div>

              {(phaseType.id === 'double_elimination') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Activer la Grande Finale ? <span className="text-gray-500">ℹ️</span>
                  </label>
                  <select
                    value={config.grandFinal}
                    onChange={(e) => setConfig(prev => ({ ...prev, grandFinal: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#1e2235] border border-white/10 rounded-lg text-white focus:border-violet focus:outline-none"
                  >
                    {GRAND_FINAL_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {(phaseType.id === 'elimination' || phaseType.id === 'double_elimination') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Passer le premier tour ? <span className="text-gray-500">ℹ️</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={config.skipFirstRound}
                        onChange={() => setConfig(prev => ({ ...prev, skipFirstRound: true }))}
                        className="w-4 h-4 accent-cyan-400"
                      />
                      <span className="text-gray-300">Oui</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!config.skipFirstRound}
                        onChange={() => setConfig(prev => ({ ...prev, skipFirstRound: false }))}
                        className="w-4 h-4 accent-cyan-400"
                      />
                      <span className="text-gray-300">Non</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Avancé */}
          {activeConfigTab === 'advanced' && (
            <div className="text-gray-400 text-center py-12">
              <p>Options avancées à venir...</p>
            </div>
          )}

          {/* Tab Content: Placement */}
          {activeConfigTab === 'placement' && (
            <div className="text-gray-400 text-center py-12">
              <p>Configuration du placement automatique à venir...</p>
            </div>
          )}

          {/* Tab Content: Match */}
          {activeConfigTab === 'match' && (
            <div className="text-gray-400 text-center py-12">
              <p>Paramètres de match (Best-of, maps, etc.) à venir...</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={goBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Retour
            </button>
            
            <Button
              onClick={handleCreate}
              disabled={creating || !config.name.trim()}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500"
            >
              {creating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Création...
                </>
              ) : (
                <>
                  + Créer
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
