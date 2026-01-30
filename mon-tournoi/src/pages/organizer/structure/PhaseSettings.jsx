import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { GradientButton, Input, Modal, GlassCard } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';
import { regeneratePhaseMatches, calculateMatchCount } from '../../../utils/matchGenerator';
import clsx from 'clsx';

/**
 * Options de format de match
 */
const MATCH_FORMAT_OPTIONS = [
  { value: 'none', label: 'Aucune manche', description: 'Pas de format spécifique' },
  { value: 'single', label: 'Manche unique', description: 'Un seul match pour déterminer le vainqueur' },
  { value: 'home_away', label: 'Aller-Retour', description: 'Match aller et retour avec score cumulé' },
  { value: 'best_of', label: 'Best-of', description: 'Le premier à gagner X manches' },
  { value: 'fixed', label: 'Manches fixes', description: 'Nombre fixe de manches à jouer' },
];

const BEST_OF_OPTIONS = [
  { value: 1, label: 'BO1' },
  { value: 3, label: 'BO3' },
  { value: 5, label: 'BO5' },
  { value: 7, label: 'BO7' },
  { value: 9, label: 'BO9' },
];

const GRAND_FINAL_OPTIONS = [
  { value: 'none', label: 'Aucun' },
  { value: 'simple', label: 'Simple' },
  { value: 'double', label: 'Double' },
];

/**
 * PhaseSettings - Page de configuration d'une phase
 * Inspiré de Toornament avec onglets: Général, Avancé, Placement, Paramètres de match
 */
export default function PhaseSettings() {
  const { id: tournamentId, phaseId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();

  const [phase, setPhase] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeRound, setActiveRound] = useState(null);

  // Configuration de la phase
  const [config, setConfig] = useState({
    name: '',
    size: 8,
    grandFinal: 'none',
    skipFirstRound: false,
    threshold: 0,
    autoPlacement: false,
    // Match settings par défaut
    matchFormat: 'best_of',
    bestOf: 3,
    fixedGames: 2,
    // Groupes (Winners/Losers)
    groups: {},
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Charger les données de la phase via Convex
  const phaseData = useQuery(
    api.tournamentPhases.getById,
    phaseId ? { phaseId } : "skip"
  );
  const updatePhase = useMutation(api.tournamentPhases.update);

  // Initialiser quand les données arrivent
  useEffect(() => {
    if (phaseData) {
      setPhase(phaseData);
      const loadedConfig = {
        name: phaseData.name || '',
        size: phaseData.settings?.maxTeams || 8,
        grandFinal: phaseData.settings?.grandFinal || 'none',
        skipFirstRound: phaseData.settings?.skipFirstRound || false,
        threshold: phaseData.settings?.threshold || 0,
        autoPlacement: phaseData.settings?.autoPlacement || false,
        matchFormat: phaseData.settings?.matchFormat || 'best_of',
        bestOf: phaseData.settings?.bestOf ?? 3,
        fixedGames: phaseData.settings?.fixedGames || 2,
        groups: phaseData.settings?.groups || generateDefaultGroups(phaseData.format, phaseData.settings?.maxTeams || 8),
      };
      setConfig(loadedConfig);
      setHasChanges(false);

      // Définir le premier groupe comme actif
      if (phaseData.format === 'double_elimination') {
        setActiveGroup('winners');
      }
    }
  }, [phaseData]);

  const loading = phaseData === undefined;

  // Tracker les changements
  const updateConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // Générer les groupes par défaut selon le format
  const generateDefaultGroups = (format, size = 8) => {
    if (format === 'double_elimination') {
      const numRounds = Math.ceil(Math.log2(size));
      return {
        winners: {
          name: 'Winners Bracket',
          matchFormat: 'inherited',
          bestOf: null,
          rounds: Array.from({ length: numRounds }, (_, i) => ({
            number: i + 1,
            name: i === numRounds - 1 ? 'WB Final' : `WB Manche ${i + 1}`,
            matchFormat: 'inherited',
            bestOf: null,
          })),
        },
        losers: {
          name: 'Losers Bracket',
          matchFormat: 'inherited',
          bestOf: null,
          rounds: Array.from({ length: (numRounds - 1) * 2 }, (_, i) => ({
            number: i + 1,
            name: i === (numRounds - 1) * 2 - 1 ? 'LB Final' : `LB Manche ${i + 1}`,
            matchFormat: 'inherited',
            bestOf: null,
          })),
        },
      };
    } else if (format === 'elimination') {
      const numRounds = Math.ceil(Math.log2(size));
      return {
        main: {
          name: 'Bracket Principal',
          matchFormat: 'inherited',
          bestOf: null,
          rounds: Array.from({ length: numRounds }, (_, i) => ({
            number: i + 1,
            name: i === numRounds - 1 ? 'Finale' : `Round ${i + 1}`,
            matchFormat: 'inherited',
            bestOf: null,
          })),
        },
      };
    }
    return {};
  };

  const handleSave = async () => {
    if (!config.name.trim()) {
      toast.error('Le nom de la phase est requis');
      return;
    }

    setSaving(true);
    try {
      const settingsToSave = {
        maxTeams: config.size,
        grandFinal: config.grandFinal,
        skipFirstRound: config.skipFirstRound,
        threshold: config.threshold,
        autoPlacement: config.autoPlacement,
        matchFormat: config.matchFormat,
        bestOf: config.matchFormat === 'best_of' ? config.bestOf : undefined,
        fixedGames: config.matchFormat === 'fixed' ? config.fixedGames : undefined,
        groups: config.groups,
      };

      await updatePhase({
        phaseId: phaseId,
        name: config.name.trim(),
        settings: settingsToSave,
      });

      toast.success('✓ Configuration sauvegardée avec succès');
      setHasChanges(false);

      // Mettre à jour la phase locale
      setPhase(prev => ({
        ...prev,
        name: config.name.trim(),
        settings: settingsToSave,
      }));

      if (context?.refreshTournament) {
        context.refreshTournament();
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndReturn = async () => {
    await handleSave();
    navigate(`/organizer/tournament/${tournamentId}/structure`);
  };

  // Régénérer les matchs de la phase
  const handleRegenerateMatches = async () => {
    if (!confirm('⚠️ Cette action va supprimer tous les matchs existants de cette phase et en créer de nouveaux. Les résultats seront perdus. Continuer ?')) {
      return;
    }

    setSaving(true);
    try {
      // Sauvegarder d'abord la config
      await handleSave();

      // Régénérer les matchs avec la nouvelle config
      const updatedPhase = {
        ...phase,
        config: {
          size: config.size,
          grand_final: config.grandFinal,
        }
      };

      const matches = await regeneratePhaseMatches(updatedPhase, tournamentId);
      toast.success(`✓ ${matches.length} matchs générés avec succès`);
    } catch (error) {
      console.error('Erreur régénération matchs:', error);
      toast.error('Erreur lors de la régénération des matchs');
    } finally {
      setSaving(false);
    }
  };

  const updateGroupConfig = (groupKey, field, value) => {
    setConfig(prev => ({
      ...prev,
      groups: {
        ...prev.groups,
        [groupKey]: {
          ...prev.groups[groupKey],
          [field]: value,
        },
      },
    }));
  };

  const updateRoundConfig = (groupKey, roundIndex, field, value) => {
    setConfig(prev => ({
      ...prev,
      groups: {
        ...prev.groups,
        [groupKey]: {
          ...prev.groups[groupKey],
          rounds: prev.groups[groupKey].rounds.map((round, idx) =>
            idx === roundIndex ? { ...round, [field]: value } : round
          ),
        },
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Phase non trouvée</p>
        <GradientButton
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/structure`)}
          className="mt-4"
          variant="secondary"
        >
          Retour à la structure
        </GradientButton>
      </div>
    );
  }

  const PHASE_FORMAT_LABELS = {
    elimination: 'Élimination directe',
    double_elimination: 'Double élimination',
    round_robin: 'Round Robin',
    swiss: 'Système Suisse',
    gauntlet: 'Gauntlet',
    groups: 'Groupes d\'arbres',
    league: 'Système de ligue',
    custom: 'Arbre personnalisé',
  };

  const tabs = [
    { id: 'general', label: 'Général' },
    { id: 'advanced', label: 'Avancé' },
    { id: 'placement', label: 'Placement' },
    { id: 'match', label: 'Paramètres de match' },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm flex items-center gap-2">
        <button
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/structure`)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Structure
        </button>
        <span className="text-gray-600">/</span>
        <span className="text-white">{phase.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            Configurer la phase "{phase.name}"
          </h1>
          <p className="text-gray-400 mt-1">
            {PHASE_FORMAT_LABELS[phase.format] || phase.format}
          </p>
        </div>

        {/* Dropdown pour double élim: Configurer : Arbre */}
        {phase.format === 'double_elimination' && (
          <div className="relative">
            <select
              value={activeGroup || ''}
              onChange={(e) => {
                setActiveGroup(e.target.value);
                setActiveRound(null);
              }}
              className="appearance-none bg-[#2a2d3e] border border-white/10 rounded-lg px-4 py-2 pr-10 text-white focus:border-violet focus:outline-none cursor-pointer"
            >
              <option value="">Configurer : Arbre</option>
              <option value="winners">Winners Bracket</option>
              <option value="losers">Losers Bracket</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▾</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Configuration du groupe spécifique (Winners/Losers) */}
      {activeGroup && config.groups[activeGroup] && (
        <div className="mb-6 p-4 bg-violet/10 border border-violet/30 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white">
              Configuration du {config.groups[activeGroup].name}
            </h3>

            {/* Dropdown pour les rounds */}
            {config.groups[activeGroup].rounds && (
              <div className="relative">
                <select
                  value={activeRound ?? ''}
                  onChange={(e) => setActiveRound(e.target.value ? parseInt(e.target.value) : null)}
                  className="appearance-none bg-[#1e2235] border border-white/10 rounded-lg px-4 py-2 pr-10 text-white text-sm focus:border-violet focus:outline-none cursor-pointer"
                >
                  <option value="">Configurer : Tour</option>
                  {config.groups[activeGroup].rounds.map((round, idx) => (
                    <option key={idx} value={idx}>{round.name}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▾</span>
              </div>
            )}
          </div>

          {/* Configuration du groupe */}
          {activeRound === null && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom du groupe
                </label>
                <Input
                  value={config.groups[activeGroup].name}
                  onChange={(e) => updateGroupConfig(activeGroup, 'name', e.target.value)}
                  className="bg-[#1e2235] border-white/10"
                />
              </div>
            </div>
          )}

          {/* Configuration du round spécifique */}
          {activeRound !== null && config.groups[activeGroup].rounds[activeRound] && (
            <RoundSettings
              round={config.groups[activeGroup].rounds[activeRound]}
              onChange={(field, value) => updateRoundConfig(activeGroup, activeRound, field, value)}
              parentFormat={config.matchFormat}
            />
          )}
        </div>
      )}

      {/* Tab Content */}
      <GlassCard className="p-6">
        {/* Général */}
        {activeTab === 'general' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Numéro <InfoTooltip text="L'ordre de la phase dans le tournoi" />
                </label>
                <Input
                  type="number"
                  value={phase.phase_order}
                  disabled
                  className="bg-[#1e2235] border-white/10 opacity-70"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Taille <InfoTooltip text="Nombre d'équipes dans cette phase" />
                </label>
                <Input
                  type="number"
                  value={config.size}
                  onChange={(e) => updateConfig({ size: parseInt(e.target.value) || 4 })}
                  min={2}
                  max={256}
                  className="bg-[#1e2235] border-white/10"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 {calculateMatchCount(phase?.format, config.size, { grand_final: config.grandFinal })} matchs seront générés
                </p>
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

              {phase.format === 'double_elimination' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Activer la Grande Finale ? <InfoTooltip text="Configuration de la grande finale pour le double élimination" />
                  </label>
                  <select
                    value={config.grandFinal}
                    onChange={(e) => setConfig(prev => ({ ...prev, grandFinal: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#1e2235] border border-white/10 rounded-lg text-white focus:border-violet focus:outline-none"
                  >
                    {GRAND_FINAL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {(phase.format === 'elimination' || phase.format === 'double_elimination') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Passer le premier tour ? <InfoTooltip text="Permet aux seeds les plus élevés de passer automatiquement le premier tour" />
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

            {/* Section Régénération des matchs */}
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                ⚡ Génération des matchs
              </h4>
              <p className="text-sm text-gray-400 mb-4">
                Si vous avez modifié la taille ou la configuration, vous devez régénérer les matchs.
                <br />
                <span className="text-amber-400">Attention : cette action supprimera tous les résultats existants.</span>
              </p>
              <GradientButton
                onClick={handleRegenerateMatches}
                disabled={saving}
                variant="warning"
              >
                {saving ? '⏳ Génération...' : '🔄 Régénérer les matchs'}
              </GradientButton>
            </div>
          </>
        )}

        {/* Avancé */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Seuil <InfoTooltip text="Nombre minimum de victoires pour passer à la phase suivante" />
                </label>
                <Input
                  type="number"
                  value={config.threshold}
                  onChange={(e) => setConfig(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                  min={0}
                  className="bg-[#1e2235] border-white/10"
                />
              </div>
            </div>

            {phase.format === 'swiss' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de rondes
                </label>
                <Input
                  type="number"
                  value={config.rounds || Math.ceil(Math.log2(config.size))}
                  onChange={(e) => setConfig(prev => ({ ...prev, rounds: parseInt(e.target.value) || 3 }))}
                  min={1}
                  max={15}
                  className="bg-[#1e2235] border-white/10"
                />
              </div>
            )}
          </div>
        )}

        {/* Placement */}
        {activeTab === 'placement' && (
          <div className="space-y-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Placer automatiquement les participants ? <InfoTooltip text="Les participants seront placés automatiquement selon leur seed" />
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={config.autoPlacement}
                    onChange={() => setConfig(prev => ({ ...prev, autoPlacement: true }))}
                    className="w-4 h-4 accent-cyan-400"
                  />
                  <span className="text-gray-300">Oui</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!config.autoPlacement}
                    onChange={() => setConfig(prev => ({ ...prev, autoPlacement: false }))}
                    className="w-4 h-4 accent-cyan-400"
                  />
                  <span className="text-gray-300">Non</span>
                </label>
              </div>
            </div>

            <div className="p-4 bg-violet/10 border border-violet/30 rounded-lg">
              <p className="text-sm text-gray-400">
                💡 Si activé, les équipes seront automatiquement placées dans le bracket
                selon leur ordre de seeding une fois la phase lancée.
              </p>
            </div>
          </div>
        )}

        {/* Paramètres de match */}
        {activeTab === 'match' && (
          <MatchFormatSettings
            format={config.matchFormat}
            bestOf={config.bestOf}
            fixedGames={config.fixedGames}
            onChange={(field, value) => {
              updateConfig({ [field]: value });
            }}
          />
        )}
      </GlassCard>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <GradientButton
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/structure`)}
          variant="secondary"
        >
          ← Retour
        </GradientButton>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-amber-400 text-sm mr-2">● Modifications non sauvegardées</span>
          )}
          <GradientButton
            onClick={handleSaveAndReturn}
            disabled={saving}
            variant="primary"
          >
            {saving ? '⏳' : '✓'} Mettre à jour + Retour
          </GradientButton>
          <GradientButton
            onClick={handleSave}
            disabled={saving}
            variant="primary"
            className={clsx(
              "transition-all",
              hasChanges && "ring-2 ring-cyan-400/50"
            )}
          >
            {saving ? '⏳ Sauvegarde...' : '✓ Mettre à jour'}
          </GradientButton>
        </div>
      </div>
    </div>
  );
}

/**
 * InfoTooltip - Petit tooltip d'information
 */
function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-block ml-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-gray-500">ℹ️</span>
      {show && (
        <span className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap max-w-xs">
          {text}
        </span>
      )}
    </span>
  );
}

/**
 * MatchFormatSettings - Composant pour les paramètres de format de match
 */
function MatchFormatSettings({ format, bestOf, fixedGames, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Format <InfoTooltip text="Le format définit comment les matchs sont joués" />
        </label>

        {/* Cartes de sélection du format */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MATCH_FORMAT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange('matchFormat', opt.value);
                // Si on passe en best_of et pas de bestOf, mettre 3 par défaut
                if (opt.value === 'best_of' && !bestOf) {
                  onChange('bestOf', 3);
                }
              }}
              className={clsx(
                'p-4 rounded-xl border-2 text-left transition-all',
                format === opt.value
                  ? 'bg-cyan-500/20 border-cyan-500 ring-1 ring-cyan-500/50'
                  : 'bg-[#1e2235] border-white/10 hover:border-white/30'
              )}
            >
              <p className={clsx(
                'font-medium',
                format === opt.value ? 'text-cyan-400' : 'text-white'
              )}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Best-of */}
      {format === 'best_of' && (
        <div className="p-4 bg-[#1e2235] rounded-xl border border-white/10">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Nombre de manches (Best of)
          </label>
          <div className="flex flex-wrap gap-3">
            {BEST_OF_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange('bestOf', opt.value)}
                className={clsx(
                  'px-6 py-3 rounded-xl border-2 font-bold transition-all min-w-[80px]',
                  bestOf === opt.value
                    ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-[#2a2d3e] border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            💡 Actuellement sélectionné: <span className="text-cyan-400 font-bold">Best of {bestOf || 3}</span>
            - Le premier à gagner {Math.ceil((bestOf || 3) / 2)} manche(s) remporte le match.
          </p>
        </div>
      )}

      {/* Configuration Manches fixes */}
      {format === 'fixed' && (
        <div className="p-4 bg-[#1e2235] rounded-xl border border-white/10">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Nombre de manches fixes
          </label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={fixedGames}
              onChange={(e) => onChange('fixedGames', parseInt(e.target.value) || 1)}
              min={1}
              max={20}
              className="bg-[#2a2d3e] border-white/10 w-24 text-center text-lg font-bold"
            />
            <span className="text-gray-400">manche(s) seront jouées</span>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            💡 Toutes les manches seront jouées peu importe le score.
          </p>
        </div>
      )}

      {/* Résumé */}
      <div className="p-4 bg-violet/10 border border-violet/30 rounded-xl">
        <h4 className="text-sm font-medium text-violet-300 mb-2">Configuration actuelle</h4>
        <p className="text-white">
          {format === 'none' && '❌ Aucun format de manche défini'}
          {format === 'single' && '1️⃣ Manche unique - Un seul match décide du vainqueur'}
          {format === 'home_away' && '🔄 Aller-Retour - Score cumulé sur deux matchs'}
          {format === 'best_of' && `🏆 Best of ${bestOf || 3} - Premier à ${Math.ceil((bestOf || 3) / 2)} victoire(s)`}
          {format === 'fixed' && `📊 ${fixedGames} manche(s) fixe(s) - Toutes jouées`}
        </p>
      </div>
    </div>
  );
}

/**
 * RoundSettings - Configuration d'un tour spécifique
 */
function RoundSettings({ round, onChange, parentFormat }) {
  const [localFormat, setLocalFormat] = useState(round.matchFormat || 'inherited');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nom du tour
          </label>
          <Input
            value={round.name}
            onChange={(e) => onChange('name', e.target.value)}
            className="bg-[#1e2235] border-white/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Format <InfoTooltip text="Le format de match pour ce tour spécifique" />
          </label>
          <select
            value={localFormat}
            onChange={(e) => {
              setLocalFormat(e.target.value);
              onChange('matchFormat', e.target.value);
            }}
            className="w-full appearance-none px-4 py-2.5 bg-[#1e2235] border border-white/10 rounded-lg text-white focus:border-violet focus:outline-none"
          >
            <option value="inherited">Format hérité</option>
            {MATCH_FORMAT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {localFormat === 'best_of' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Best of
          </label>
          <div className="flex flex-wrap gap-2">
            {BEST_OF_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => onChange('bestOf', opt.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg border text-sm transition-all',
                  round.bestOf === opt.value
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

      <p className="text-xs text-gray-500">
        💡 "Format hérité" utilisera le format défini au niveau de la phase ou du groupe parent.
      </p>
    </div>
  );
}
