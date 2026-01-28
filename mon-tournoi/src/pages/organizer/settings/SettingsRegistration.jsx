import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { GradientButton, Input, GlassCard, PageHeader } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

export default function SettingsRegistration() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();
  const [activeTab, setActiveTab] = useState('configuration');

  const [formData, setFormData] = useState({
    // Configuration
    registration_enabled: true,
    registration_open_date: '',
    registration_open_time: '',
    registration_close_date: '',
    registration_close_time: '',
    redirect_to_website: false,
    redirect_url: '',
    limit_registrations: false,
    max_registrations: '',
    auto_accept: false,
    // Équipe
    permanent_teams_only: false,
    // Joueur
    require_country: false,
    require_birthdate: false,
    require_game_id: false,
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
    const regDeadline = tournament.registration_deadline
      ? new Date(tournament.registration_deadline)
      : null;

    setFormData(prev => ({
      ...prev,
      registration_enabled: tournament.status !== 'closed',
      registration_close_date: regDeadline ? regDeadline.toISOString().split('T')[0] : '',
      registration_close_time: regDeadline ? regDeadline.toTimeString().slice(0, 5) : '',
      max_registrations: tournament.max_participants || '',
      limit_registrations: !!tournament.max_participants,
    }));
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
      // Construire la date de deadline
      let registrationDeadline = null;
      if (formData.registration_close_date) {
        const dateStr = formData.registration_close_date;
        const timeStr = formData.registration_close_time || '23:59';
        registrationDeadline = new Date(`${dateStr}T${timeStr}`).toISOString();
      }

      const { error } = await supabase
        .from('tournaments')
        .update({
          registration_deadline: registrationDeadline,
          max_participants: formData.limit_registrations
            ? parseInt(formData.max_registrations)
            : null,
        })
        .eq('id', tournamentId);

      if (error) throw error;

      if (context?.refreshTournament) {
        context.refreshTournament();
      }

      toast.success("Paramètres d'inscription sauvegardés");
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'configuration', label: 'Configuration' },
    { id: 'personnalisation', label: 'Personnalisation' },
    { id: 'paiement', label: 'Paiement', disabled: true },
    { id: 'notification', label: 'Notification' },
  ];

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
        title="Paramètres d'inscription"
        subtitle="Configurez les inscriptions et les conditions de participation"
        gradient={true}
      />

      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-8 border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`px-6 py-3 font-medium transition-colors relative ${tab.disabled
              ? 'text-gray-600 cursor-not-allowed'
              : activeTab === tab.id
                ? 'text-cyan'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            {tab.label}
            {tab.disabled && (
              <span className="ml-1 text-xs text-gray-600">🔒</span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
            )}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <GlassCard className="p-6">

          {/* Tab: Configuration */}
          {activeTab === 'configuration' && (
            <div className="space-y-8">
              {/* Général */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">Général</h3>

                <div className="space-y-4">
                  {/* Activer inscriptions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Activer l'inscription aux tournois ?
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.registration_enabled === true}
                          onChange={() => handleChange('registration_enabled', true)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Oui</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.registration_enabled === false}
                          onChange={() => handleChange('registration_enabled', false)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Non</span>
                      </label>
                    </div>
                  </div>

                  {/* Date d'ouverture */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date et heure d'ouverture
                      <span className="text-gray-500 text-xs ml-2">(optionnel) (Fuseau horaire : Europe/Paris)</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={formData.registration_open_date}
                        onChange={(e) => handleChange('registration_open_date', e.target.value)}
                        placeholder="Ex: 19/01/2026"
                        className="bg-[#1a1d2e] border-white/10 flex-1"
                      />
                      <Input
                        type="time"
                        value={formData.registration_open_time}
                        onChange={(e) => handleChange('registration_open_time', e.target.value)}
                        placeholder="Ex: 22:23"
                        className="bg-[#1a1d2e] border-white/10 w-32"
                      />
                    </div>
                  </div>

                  {/* Date de clôture */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date et heure de clôture
                      <span className="text-gray-500 text-xs ml-2">(optionnel) (Fuseau horaire : Europe/Paris)</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={formData.registration_close_date}
                        onChange={(e) => handleChange('registration_close_date', e.target.value)}
                        placeholder="Ex: 19/01/2026"
                        className="bg-[#1a1d2e] border-white/10 flex-1"
                      />
                      <Input
                        type="time"
                        value={formData.registration_close_time}
                        onChange={(e) => handleChange('registration_close_time', e.target.value)}
                        placeholder="Ex: 22:23"
                        className="bg-[#1a1d2e] border-white/10 w-32"
                      />
                    </div>
                  </div>

                  {/* Redirection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rediriger les joueurs vers votre site web pour l'inscription ?
                      <span className="ml-2 text-gray-500 cursor-help" title="Les joueurs seront redirigés vers un site externe">ⓘ</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.redirect_to_website === true}
                          onChange={() => handleChange('redirect_to_website', true)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Oui</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.redirect_to_website === false}
                          onChange={() => handleChange('redirect_to_website', false)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Non</span>
                      </label>
                    </div>
                  </div>

                  {/* Limiter inscriptions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Limiter le nombre d'inscriptions ?
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.limit_registrations === true}
                          onChange={() => handleChange('limit_registrations', true)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Oui</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.limit_registrations === false}
                          onChange={() => handleChange('limit_registrations', false)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Non</span>
                      </label>
                    </div>

                    {formData.limit_registrations && (
                      <Input
                        type="number"
                        value={formData.max_registrations}
                        onChange={(e) => handleChange('max_registrations', e.target.value)}
                        placeholder="Nombre max de participants"
                        className="bg-[#1a1d2e] border-white/10 mt-2 max-w-xs"
                        min={2}
                      />
                    )}
                  </div>

                  {/* Auto-accept */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Accepter automatiquement les inscriptions ?
                      <span className="ml-2 text-gray-500 cursor-help" title="Les inscriptions seront validées automatiquement">ⓘ</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.auto_accept === true}
                          onChange={() => handleChange('auto_accept', true)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Oui</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.auto_accept === false}
                          onChange={() => handleChange('auto_accept', false)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Non</span>
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <hr className="border-white/10" />

              {/* Équipe */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">Équipe</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Limiter l'inscription aux équipes permanentes ?
                    <span className="ml-2 text-gray-500 cursor-help" title="Seules les équipes existantes pourront s'inscrire">ⓘ</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.permanent_teams_only === true}
                        onChange={() => handleChange('permanent_teams_only', true)}
                        className="w-4 h-4 accent-cyan"
                      />
                      <span className="text-white">Oui</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.permanent_teams_only === false}
                        onChange={() => handleChange('permanent_teams_only', false)}
                        className="w-4 h-4 accent-cyan"
                      />
                      <span className="text-white">Non</span>
                    </label>
                  </div>
                </div>
              </section>

              <hr className="border-white/10" />

              {/* Joueur */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">Joueur</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Activer le champ « pays » ?
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.require_country === true}
                          onChange={() => handleChange('require_country', true)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Oui</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.require_country === false}
                          onChange={() => handleChange('require_country', false)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Non</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Activer le champ « date de naissance » ?
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.require_birthdate === true}
                          onChange={() => handleChange('require_birthdate', true)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Oui</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.require_birthdate === false}
                          onChange={() => handleChange('require_birthdate', false)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Non</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Activer le champ « identifiant de jeu » ?
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.require_game_id === true}
                          onChange={() => handleChange('require_game_id', true)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Oui</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.require_game_id === false}
                          onChange={() => handleChange('require_game_id', false)}
                          className="w-4 h-4 accent-cyan"
                        />
                        <span className="text-white">Non</span>
                      </label>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Tab: Personnalisation */}
          {activeTab === 'personnalisation' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Personnalisation du formulaire
              </h2>
              <p className="text-gray-400">
                Personnalisez les textes et messages du formulaire d'inscription.
                <br />
                <span className="text-cyan">Bientôt disponible</span>
              </p>
            </div>
          )}

          {/* Tab: Notification */}
          {activeTab === 'notification' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔔</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Notifications d'inscription
              </h2>
              <p className="text-gray-400">
                Configurez les emails envoyés aux participants lors de l'inscription.
                <br />
                <span className="text-cyan">Bientôt disponible</span>
              </p>
            </div>
          )}
        </GlassCard>

        {/* Submit Button */}
        {activeTab === 'configuration' && (
          <div className="flex justify-start mt-6">
            <GradientButton
              type="submit"
              disabled={saving}
              variant="primary"
            >
              {saving ? 'Sauvegarde...' : 'Mettre à jour'}
            </GradientButton>
          </div>
        )}
      </form>
    </div>
  );
}
