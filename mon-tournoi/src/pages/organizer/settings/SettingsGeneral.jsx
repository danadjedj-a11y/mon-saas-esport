import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button, Input, Textarea, Select } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

const GAME_OPTIONS = [
  { value: 'league-of-legends', label: 'League of Legends' },
  { value: 'valorant', label: 'Valorant' },
  { value: 'counter-strike-2', label: 'Counter-Strike 2' },
  { value: 'rocket-league', label: 'Rocket League' },
  { value: 'fortnite', label: 'Fortnite' },
  { value: 'apex-legends', label: 'Apex Legends' },
  { value: 'call-of-duty', label: 'Call of Duty' },
  { value: 'overwatch-2', label: 'Overwatch 2' },
  { value: 'dota-2', label: 'Dota 2' },
  { value: 'fifa', label: 'EA Sports FC' },
  { value: 'super-smash-bros', label: 'Super Smash Bros.' },
  { value: 'street-fighter', label: 'Street Fighter' },
  { value: 'other', label: 'Autre' },
];

const FORMAT_OPTIONS = [
  { value: 'elimination', label: 'Élimination directe' },
  { value: 'double_elimination', label: 'Double élimination' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'swiss', label: 'Système Suisse' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'ongoing', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
];

export default function SettingsGeneral() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();
  
  const [formData, setFormData] = useState({
    name: '',
    game: '',
    format: '',
    description: '',
    rules: '',
    prize_pool: '',
    max_teams: '',
    team_size: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    status: 'draft',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (context?.tournament) {
      populateForm(context.tournament);
      setLoading(false);
    } else {
      fetchTournament();
    }
  }, [context?.tournament, tournamentId]);

  const populateForm = (tournament) => {
    setFormData({
      name: tournament.name || '',
      game: tournament.game || '',
      format: tournament.format || '',
      description: tournament.description || '',
      rules: tournament.rules || '',
      prize_pool: tournament.prize_pool || '',
      max_teams: tournament.max_teams || '',
      team_size: tournament.team_size || '',
      start_date: tournament.start_date ? tournament.start_date.split('T')[0] : '',
      end_date: tournament.end_date ? tournament.end_date.split('T')[0] : '',
      registration_deadline: tournament.registration_deadline ? tournament.registration_deadline.split('T')[0] : '',
      status: tournament.status || 'draft',
    });
  };

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (error) throw error;
      populateForm(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Le nom du tournoi est requis');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        game: formData.game,
        format: formData.format,
        description: formData.description,
        rules: formData.rules,
        prize_pool: formData.prize_pool,
        max_teams: formData.max_teams ? parseInt(formData.max_teams) : null,
        team_size: formData.team_size ? parseInt(formData.team_size) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        registration_deadline: formData.registration_deadline || null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournamentId);

      if (error) throw error;
      toast.success('Paramètres sauvegardés');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde: ' + error.message);
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
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white mb-2">
          Paramètres généraux
        </h1>
        <p className="text-gray-400">
          Configurez les informations de base de votre tournoi
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Informations de base */}
        <section className="bg-[#2a2d3e] rounded-xl p-6 border border-white/10">
          <h2 className="font-display font-semibold text-white mb-6">
            📋 Informations de base
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom du tournoi *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Mon Super Tournoi"
                className="bg-[#1e2235] border-white/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Jeu
              </label>
              <Select
                value={formData.game}
                onChange={(value) => handleChange('game', value)}
                options={GAME_OPTIONS}
                placeholder="Sélectionner un jeu"
                className="bg-[#1e2235]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Format
              </label>
              <Select
                value={formData.format}
                onChange={(value) => handleChange('format', value)}
                options={FORMAT_OPTIONS}
                placeholder="Sélectionner un format"
                className="bg-[#1e2235]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Statut
              </label>
              <Select
                value={formData.status}
                onChange={(value) => handleChange('status', value)}
                options={STATUS_OPTIONS}
                className="bg-[#1e2235]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prize Pool
              </label>
              <Input
                value={formData.prize_pool}
                onChange={(e) => handleChange('prize_pool', e.target.value)}
                placeholder="Ex: 1000€, Glory, etc."
                className="bg-[#1e2235] border-white/10"
              />
            </div>
          </div>
        </section>

        {/* Participants */}
        <section className="bg-[#2a2d3e] rounded-xl p-6 border border-white/10">
          <h2 className="font-display font-semibold text-white mb-6">
            👥 Participants
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre max d'équipes
              </label>
              <Input
                type="number"
                value={formData.max_teams}
                onChange={(e) => handleChange('max_teams', e.target.value)}
                placeholder="16"
                min={2}
                max={256}
                className="bg-[#1e2235] border-white/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Taille des équipes
              </label>
              <Input
                type="number"
                value={formData.team_size}
                onChange={(e) => handleChange('team_size', e.target.value)}
                placeholder="5"
                min={1}
                max={20}
                className="bg-[#1e2235] border-white/10"
              />
            </div>
          </div>
        </section>

        {/* Dates */}
        <section className="bg-[#2a2d3e] rounded-xl p-6 border border-white/10">
          <h2 className="font-display font-semibold text-white mb-6">
            📅 Dates
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date de début
              </label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className="bg-[#1e2235] border-white/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date de fin
              </label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className="bg-[#1e2235] border-white/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Deadline inscriptions
              </label>
              <Input
                type="date"
                value={formData.registration_deadline}
                onChange={(e) => handleChange('registration_deadline', e.target.value)}
                className="bg-[#1e2235] border-white/10"
              />
            </div>
          </div>
        </section>

        {/* Description & Rules */}
        <section className="bg-[#2a2d3e] rounded-xl p-6 border border-white/10">
          <h2 className="font-display font-semibold text-white mb-6">
            📝 Description & Règles
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Décrivez votre tournoi..."
                rows={4}
                className="bg-[#1e2235] border-white/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Règlement
              </label>
              <Textarea
                value={formData.rules}
                onChange={(e) => handleChange('rules', e.target.value)}
                placeholder="Règles du tournoi..."
                rows={6}
                className="bg-[#1e2235] border-white/10"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500"
          >
            {saving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Sauvegarde...
              </>
            ) : (
              <>
                💾 Sauvegarder les modifications
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
