import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { GradientButton, Select, GlassCard, PageHeader } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

const FORMAT_OPTIONS = [
  { value: '', label: 'Aucune manche' },
  { value: 'bo1', label: 'BO1 (Best of 1)' },
  { value: 'bo3', label: 'BO3 (Best of 3)' },
  { value: 'bo5', label: 'BO5 (Best of 5)' },
  { value: 'bo7', label: 'BO7 (Best of 7)' },
];

export default function SettingsMatch() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();

  const [formData, setFormData] = useState({
    participant_reporting: false,
    match_format: '',
    match_duration_minutes: 30,
    match_break_minutes: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (context?.tournament) {
      setFormData({
        participant_reporting: context.tournament.participantReporting !== false,
        match_format: context.tournament.bestOf ? `bo${context.tournament.bestOf}` : '',
        match_duration_minutes: context.tournament.matchDurationMinutes || 30,
        match_break_minutes: context.tournament.matchBreakMinutes || 10,
      });
      setLoading(false);
    }
  }, [context?.tournament]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateTournament = useMutation(api.tournamentsMutations.update);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Extraire le nombre du format (bo1 -> 1, bo3 -> 3, etc.)
      const bestOf = formData.match_format
        ? parseInt(formData.match_format.replace('bo', ''))
        : 1;

      await updateTournament({
        tournamentId: context?.tournament?._id,
        bestOf: bestOf,
        matchDurationMinutes: formData.match_duration_minutes,
        matchBreakMinutes: formData.match_break_minutes,
      });

      if (context?.refreshTournament) {
        context.refreshTournament();
      }

      toast.success('Paramètres de match sauvegardés');
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

  return (
    <div className="max-w-2xl mx-auto">      {/* Premium Header with Gradient */}
      <PageHeader
        title="Paramètres de match"
        subtitle="Configurez les règles et formats des matchs"
        gradient={true}
      />

      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-8 border-b border-white/10">
        <button className="px-6 py-3 font-medium text-cyan relative">
          Général
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <GlassCard className="p-6 space-y-6">

          {/* Rapport participant */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Rapport participant
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Activer le rapport de match par les participants
                <span className="ml-2 text-gray-500 cursor-help" title="Permet aux joueurs de rapporter eux-mêmes les scores">
                  ⓘ
                </span>
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="participant_reporting"
                    checked={formData.participant_reporting === true}
                    onChange={() => handleChange('participant_reporting', true)}
                    className="w-4 h-4 accent-cyan"
                  />
                  <span className="text-white">Oui</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="participant_reporting"
                    checked={formData.participant_reporting === false}
                    onChange={() => handleChange('participant_reporting', false)}
                    className="w-4 h-4 accent-cyan"
                  />
                  <span className="text-white">Non</span>
                </label>
              </div>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Format */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Format
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Format
                <span className="ml-2 text-gray-500 cursor-help" title="Nombre de manches pour gagner un match">
                  ⓘ
                </span>
              </label>
              <Select
                value={formData.match_format}
                onChange={(value) => handleChange('match_format', value)}
                options={FORMAT_OPTIONS}
                className="bg-[#1a1d2e] max-w-xs"
              />
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Timing */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Durée estimée
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Durée d'un match (minutes)
                </label>
                <input
                  type="number"
                  value={formData.match_duration_minutes}
                  onChange={(e) => handleChange('match_duration_minutes', parseInt(e.target.value))}
                  min={5}
                  max={180}
                  className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pause entre matchs (minutes)
                </label>
                <input
                  type="number"
                  value={formData.match_break_minutes}
                  onChange={(e) => handleChange('match_break_minutes', parseInt(e.target.value))}
                  min={0}
                  max={60}
                  className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
          </div>
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
