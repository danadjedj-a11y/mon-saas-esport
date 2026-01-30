import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { GradientButton, Input, GlassCard, PageHeader } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

export default function SettingsParticipant() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();
  
  const [formData, setFormData] = useState({
    // Check-in
    check_in_mode: 'none', // 'participant', 'organizer', 'none'
    check_in_open_date: '',
    check_in_open_time: '',
    check_in_close_date: '',
    check_in_close_time: '',
    // Type de participant
    participant_type: 'team', // 'player', 'team'
    min_players_per_team: 5,
    max_players_per_team: 5,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (context?.tournament) {
      populateForm(context.tournament);
      setLoading(false);
    }
  }, [context?.tournament]);

  const populateForm = (tournament) => {
    const checkInEnd = tournament.checkInEnd
      ? new Date(tournament.checkInEnd)
      : null;
    
    setFormData(prev => ({
      ...prev,
      check_in_mode: tournament.checkInRequired ? 'participant' : 'none',
      check_in_close_date: checkInEnd ? checkInEnd.toISOString().split('T')[0] : '',
      check_in_close_time: checkInEnd ? checkInEnd.toTimeString().slice(0, 5) : '',
      min_players_per_team: tournament.teamSizeMin || 5,
      max_players_per_team: tournament.teamSizeMax || tournament.teamSize || 5,
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateTournament = useMutation(api.tournamentsMutations.update);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Construire la date de deadline check-in
      let checkInEnd = undefined;
      if (formData.check_in_mode !== 'none' && formData.check_in_close_date) {
        const dateStr = formData.check_in_close_date;
        const timeStr = formData.check_in_close_time || '23:59';
        checkInEnd = new Date(`${dateStr}T${timeStr}`).getTime();
      }

      await updateTournament({
        tournamentId: context?.tournament?._id,
        checkInEnd: checkInEnd,
        checkInRequired: formData.check_in_mode !== 'none',
      });

      if (context?.refreshTournament) {
        context.refreshTournament();
      }
      
      toast.success('Paramètres de participant sauvegardés');
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
    <div className="max-w-3xl mx-auto">      {/* Premium Header with Gradient */}
      <PageHeader 
        title="Paramètres des participants"
        subtitle="Configurez les options pour les participants du tournoi"
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
        <GlassCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Colonne gauche */}
            <div className="space-y-6">
              {/* Check-in */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Activer le Check-in dans le tournoi ?
                  <span className="ml-2 text-gray-500 cursor-help" title="Le check-in permet de vérifier la présence des participants">ⓘ</span>
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="check_in_mode"
                      checked={formData.check_in_mode === 'participant'}
                      onChange={() => handleChange('check_in_mode', 'participant')}
                      className="w-4 h-4 accent-cyan"
                    />
                    <span className="text-white">Participant</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="check_in_mode"
                      checked={formData.check_in_mode === 'organizer'}
                      onChange={() => handleChange('check_in_mode', 'organizer')}
                      className="w-4 h-4 accent-cyan"
                    />
                    <span className="text-white">Organisateur</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="check_in_mode"
                      checked={formData.check_in_mode === 'none'}
                      onChange={() => handleChange('check_in_mode', 'none')}
                      className="w-4 h-4 accent-cyan"
                    />
                    <span className="text-white">Non</span>
                  </label>
                </div>
              </div>

              {formData.check_in_mode !== 'none' && (
                <>
                  {/* Ouverture check-in */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Ouverture du Check-in des participants
                      <span className="text-gray-500 text-xs ml-2">(Fuseau horaire : Europe/Paris)</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={formData.check_in_open_date}
                        onChange={(e) => handleChange('check_in_open_date', e.target.value)}
                        placeholder="Ex: 19/01/2026"
                        className="bg-[#1a1d2e] border-white/10 flex-1"
                      />
                      <Input
                        type="time"
                        value={formData.check_in_open_time}
                        onChange={(e) => handleChange('check_in_open_time', e.target.value)}
                        placeholder="Ex: 22:23"
                        className="bg-[#1a1d2e] border-white/10 w-28"
                      />
                    </div>
                  </div>

                  {/* Clôture check-in */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Clôture du Check-in des participants
                      <span className="text-gray-500 text-xs ml-2">(Fuseau horaire : Europe/Paris)</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={formData.check_in_close_date}
                        onChange={(e) => handleChange('check_in_close_date', e.target.value)}
                        placeholder="Ex: 19/01/2026"
                        className="bg-[#1a1d2e] border-white/10 flex-1"
                      />
                      <Input
                        type="time"
                        value={formData.check_in_close_time}
                        onChange={(e) => handleChange('check_in_close_time', e.target.value)}
                        placeholder="Ex: 22:23"
                        className="bg-[#1a1d2e] border-white/10 w-28"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Colonne droite */}
            <div className="space-y-6">
              {/* Type de participant */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Type de participants
                  <span className="ml-2 text-gray-500 cursor-help" title="Choisissez si les participants sont des joueurs solo ou des équipes">ⓘ</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="participant_type"
                      checked={formData.participant_type === 'player'}
                      onChange={() => handleChange('participant_type', 'player')}
                      className="w-4 h-4 accent-cyan"
                    />
                    <span className="text-white">Joueur</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="participant_type"
                      checked={formData.participant_type === 'team'}
                      onChange={() => handleChange('participant_type', 'team')}
                      className="w-4 h-4 accent-cyan"
                    />
                    <span className="text-white">Équipe</span>
                  </label>
                </div>
              </div>

              {formData.participant_type === 'team' && (
                <>
                  {/* Taille équipe min */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre minimum de joueurs par équipe
                    </label>
                    <Input
                      type="number"
                      value={formData.min_players_per_team}
                      onChange={(e) => handleChange('min_players_per_team', parseInt(e.target.value))}
                      min={1}
                      max={20}
                      className="bg-[#1a1d2e] border-white/10 max-w-[100px]"
                    />
                  </div>

                  {/* Taille équipe max */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre maximum de joueurs par équipe
                    </label>
                    <Input
                      type="number"
                      value={formData.max_players_per_team}
                      onChange={(e) => handleChange('max_players_per_team', parseInt(e.target.value))}
                      min={1}
                      max={20}
                      className="bg-[#1a1d2e] border-white/10 max-w-[100px]"
                    />
                  </div>
                </>
              )}
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
