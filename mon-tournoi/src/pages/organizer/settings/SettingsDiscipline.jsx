import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { GradientButton, Select, GlassCard, PageHeader } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

// Configuration par jeu
const GAME_CONFIG = {
  'league-of-legends': {
    name: 'League of Legends',
    hasIntegration: true,
    regions: [
      { value: 'EUW', label: 'Europe West' },
      { value: 'EUNE', label: 'Europe Nordic & East' },
      { value: 'NA', label: 'North America' },
      { value: 'KR', label: 'Korea' },
      { value: 'BR', label: 'Brésil' },
      { value: 'JP', label: 'Japon' },
      { value: 'OCE', label: 'Oceania' },
    ],
    maps: [
      { value: 'summoners-rift', label: "Faille de l'Invocateur" },
      { value: 'howling-abyss', label: 'Abîme Hurlant (ARAM)' },
      { value: 'arena', label: 'Arène 2v2v2v2' },
    ],
    pickTypes: [
      { value: 'blind-pick', label: 'Blind Pick' },
      { value: 'draft-pick', label: 'Draft Pick' },
      { value: 'tournament-draft', label: 'Tournament Draft' },
    ],
    spectatorModes: [
      { value: 'none', label: 'Aucun' },
      { value: 'all', label: 'Tous' },
      { value: 'friends', label: 'Amis seulement' },
    ],
  },
  'valorant': {
    name: 'Valorant',
    hasIntegration: true,
    regions: [
      { value: 'EU', label: 'Europe' },
      { value: 'NA', label: 'North America' },
      { value: 'BR', label: 'Brazil' },
      { value: 'AP', label: 'Asia Pacific' },
      { value: 'KR', label: 'Korea' },
    ],
    maps: [
      { value: 'ascent', label: 'Ascent' },
      { value: 'bind', label: 'Bind' },
      { value: 'haven', label: 'Haven' },
      { value: 'split', label: 'Split' },
      { value: 'icebox', label: 'Icebox' },
      { value: 'breeze', label: 'Breeze' },
      { value: 'fracture', label: 'Fracture' },
      { value: 'pearl', label: 'Pearl' },
      { value: 'lotus', label: 'Lotus' },
      { value: 'sunset', label: 'Sunset' },
      { value: 'abyss', label: 'Abyss' },
    ],
    pickTypes: [
      { value: 'standard', label: 'Standard' },
      { value: 'competitive', label: 'Compétitif' },
      { value: 'pick-ban', label: 'Pick & Ban' },
    ],
    spectatorModes: [
      { value: 'none', label: 'Aucun' },
      { value: 'delay-2min', label: 'Délai 2 minutes' },
      { value: 'delay-5min', label: 'Délai 5 minutes' },
    ],
  },
  'counter-strike-2': {
    name: 'Counter-Strike 2',
    hasIntegration: false,
    maps: [
      { value: 'mirage', label: 'Mirage' },
      { value: 'inferno', label: 'Inferno' },
      { value: 'nuke', label: 'Nuke' },
      { value: 'overpass', label: 'Overpass' },
      { value: 'ancient', label: 'Ancient' },
      { value: 'anubis', label: 'Anubis' },
      { value: 'vertigo', label: 'Vertigo' },
    ],
  },
};

export default function SettingsDiscipline() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();

  const [game, setGame] = useState('');
  const [gameConfig, setGameConfig] = useState(null);
  const [formData, setFormData] = useState({
    integration_enabled: false,
    region: '',
    map: '',
    pick_type: '',
    spectator_mode: 'none',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (context?.tournament) {
      setGame(context.tournament.game || '');
      const config = GAME_CONFIG[context.tournament.game];
      setGameConfig(config || null);

      // Charger les paramètres existants si disponibles
      if (context.tournament.discipline_settings) {
        setFormData(prev => ({
          ...prev,
          ...context.tournament.discipline_settings,
        }));
      }
      setLoading(false);
    } else {
      fetchTournament();
    }
  }, [context?.tournament, tournamentId]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('game, discipline_settings')
        .eq('id', tournamentId)
        .single();

      if (error) throw error;
      setGame(data.game || '');
      const config = GAME_CONFIG[data.game];
      setGameConfig(config || null);

      if (data.discipline_settings) {
        setFormData(prev => ({
          ...prev,
          ...data.discipline_settings,
        }));
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Pour l'instant, stocker dans maps_pool comme JSONB (colonne existante)
      const { error } = await supabase
        .from('tournaments')
        .update({
          maps_pool: formData.map ? [formData.map] : [],
        })
        .eq('id', tournamentId);

      if (error) throw error;

      if (context?.refreshTournament) {
        context.refreshTournament();
      }

      toast.success('Paramètres de discipline sauvegardés');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  if (!gameConfig) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-display font-bold text-white">
            Paramètres de discipline
          </h1>
        </div>

        <GlassCard className="p-8 text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Aucune discipline sélectionnée
          </h2>
          <p className="text-gray-400">
            Veuillez d'abord sélectionner un jeu dans les paramètres généraux.
          </p>
        </GlassCard>
      </div >
    );
  }

  return (
    <div className="max-w-2xl mx-auto">      {/* Premium Header with Gradient */}
      <PageHeader
        title="Discipline"
        subtitle="Configurez les paramètres spécifiques à la discipline"
        gradient={true}
      />

      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-8 border-b border-white/10">
        <button className="px-6 py-3 font-medium text-cyan relative">
          Intégration
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <GlassCard className="p-6 space-y-6">

          {/* Intégration avec le jeu */}
          {gameConfig.hasIntegration && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Activer l'intégration avec le jeu
                <span className="text-orange-400 text-xs ml-2">
                  (Une fois activée, cette fonctionnalité ne peut plus être désactivée.)
                </span>
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="integration"
                    checked={formData.integration_enabled === true}
                    onChange={() => handleChange('integration_enabled', true)}
                    className="w-4 h-4 accent-cyan"
                  />
                  <span className="text-white">Oui</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="integration"
                    checked={formData.integration_enabled === false}
                    onChange={() => handleChange('integration_enabled', false)}
                    className="w-4 h-4 accent-cyan"
                  />
                  <span className="text-white">Non</span>
                </label>
              </div>
            </div>
          )}

          {/* Région */}
          {gameConfig.regions && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Région
              </label>
              <Select
                value={formData.region}
                onChange={(value) => handleChange('region', value)}
                options={gameConfig.regions}
                placeholder="Sélectionner une région"
                className="bg-[#1a1d2e]"
              />
            </div>
          )}

          {/* Carte */}
          {gameConfig.maps && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Carte
              </label>
              <Select
                value={formData.map}
                onChange={(value) => handleChange('map', value)}
                options={gameConfig.maps}
                placeholder="Sélectionner une carte"
                className="bg-[#1a1d2e]"
              />
            </div>
          )}

          {/* Type de pick */}
          {gameConfig.pickTypes && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type de pick
              </label>
              <Select
                value={formData.pick_type}
                onChange={(value) => handleChange('pick_type', value)}
                options={gameConfig.pickTypes}
                placeholder="Sélectionner un type"
                className="bg-[#1a1d2e]"
              />
            </div>
          )}

          {/* Mode spectateur */}
          {gameConfig.spectatorModes && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Spectateur
              </label>
              <Select
                value={formData.spectator_mode}
                onChange={(value) => handleChange('spectator_mode', value)}
                options={gameConfig.spectatorModes}
                placeholder="Sélectionner un mode"
                className="bg-[#1a1d2e]"
              />
            </div>
          )}
        </GlassCard>

        {/* Submit Button */}
        <div className="flex justify-end mt-6">
          <GradientButton
            type="submit"
            disabled={saving}
            variant="primary"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Sauvegarde...
              </>
            ) : (
              <>
                <span className="mr-2">✏️</span>
                Mettre à jour
              </>
            )}
          </GradientButton>
        </div>
      </form>
    </div>
  );
}
