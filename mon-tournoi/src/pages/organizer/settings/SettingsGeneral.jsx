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
  { value: 'tekken', label: 'Tekken 8' },
  { value: 'other', label: 'Autre' },
];

const PLATFORM_OPTIONS = [
  { value: 'pc', label: 'PC' },
  { value: 'playstation', label: 'PlayStation' },
  { value: 'xbox', label: 'Xbox' },
  { value: 'nintendo', label: 'Nintendo Switch' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'crossplay', label: 'Crossplay' },
];

const COUNTRY_OPTIONS = [
  { value: '', label: 'Choisir le pays' },
  { value: 'FR', label: 'France' },
  { value: 'BE', label: 'Belgique' },
  { value: 'CH', label: 'Suisse' },
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'États-Unis' },
  { value: 'DE', label: 'Allemagne' },
  { value: 'ES', label: 'Espagne' },
  { value: 'IT', label: 'Italie' },
  { value: 'UK', label: 'Royaume-Uni' },
  { value: 'other', label: 'Autre' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Europe/Paris', label: '(UTC+01:00) - Paris - France' },
  { value: 'Europe/London', label: '(UTC+00:00) - London - UK' },
  { value: 'America/New_York', label: '(UTC-05:00) - New York - USA' },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) - Los Angeles - USA' },
  { value: 'America/Montreal', label: '(UTC-05:00) - Montréal - Canada' },
  { value: 'Europe/Berlin', label: '(UTC+01:00) - Berlin - Germany' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) - Tokyo - Japan' },
];

export default function SettingsGeneral() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();
  const [activeTab, setActiveTab] = useState('general');
  
  const [formData, setFormData] = useState({
    // Onglet Général
    name: '',
    full_name: '',
    game: '',
    platforms: ['pc'],
    organizer_name: '',
    website: '',
    size: 8,
    is_online: true,
    location: '',
    country: '',
    start_date: '',
    end_date: '',
    timezone: 'Europe/Paris',
    // Onglet Détails
    description: '',
    rules: '',
    prizes: '',
    // Onglet Contact
    contact_email: '',
    contact_discord: '',
    contact_twitter: '',
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
      full_name: tournament.full_name || '',
      game: tournament.game || '',
      platforms: tournament.platforms || ['pc'],
      organizer_name: tournament.organizer_name || '',
      website: tournament.website || '',
      size: tournament.max_participants || 8,
      is_online: tournament.is_online !== false,
      location: tournament.location || '',
      country: tournament.country || '',
      start_date: tournament.start_date ? tournament.start_date.split('T')[0] : '',
      end_date: tournament.end_date || tournament.start_date ? (tournament.end_date || tournament.start_date).split('T')[0] : '',
      timezone: tournament.timezone || 'Europe/Paris',
      description: tournament.description || '',
      rules: tournament.rules || '',
      prizes: tournament.prizes || (tournament.cashprize_total ? `${tournament.cashprize_total}€` : ''),
      contact_email: tournament.contact_email || '',
      contact_discord: tournament.contact_discord || '',
      contact_twitter: tournament.contact_twitter || '',
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

  const togglePlatform = (platform) => {
    setFormData(prev => {
      const platforms = prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform];
      return { ...prev, platforms };
    });
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
        max_participants: formData.size ? parseInt(formData.size) : 8,
        is_public: formData.is_online,
        start_date: formData.start_date || null,
        description: formData.description || null,
        rules: formData.rules || null,
      };

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournamentId);

      if (error) throw error;
      
      if (context?.refreshTournament) {
        context.refreshTournament();
      }
      
      toast.success('Paramètres sauvegardés');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Général' },
    { id: 'details', label: 'Détails' },
    { id: 'contact', label: 'Contact' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-display font-bold text-white">
          Paramètres Généraux
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-8 border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
            )}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Card Container */}
        <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6">
          
          {/* Tab: Général */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Colonne gauche */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nom <span className="text-orange-400">(obligatoire)</span>
                    <span className="text-gray-500 text-xs ml-2">(30 caractères max)</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    maxLength={30}
                    placeholder="Freljord Arena 2026"
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nom complet
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="Nom complet du tournoi (optionnel)"
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Discipline
                  </label>
                  <Select
                    value={formData.game}
                    onChange={(value) => handleChange('game', value)}
                    options={GAME_OPTIONS}
                    placeholder="Sélectionner un jeu"
                    className="bg-[#1a1d2e]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Plateforme(s) <span className="text-orange-400">(obligatoire)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_OPTIONS.map(platform => (
                      <button
                        key={platform.value}
                        type="button"
                        onClick={() => togglePlatform(platform.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          formData.platforms.includes(platform.value)
                            ? 'bg-cyan text-white'
                            : 'bg-[#1a1d2e] text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        {formData.platforms.includes(platform.value) && (
                          <span className="mr-1">✕</span>
                        )}
                        {platform.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Organisateur
                  </label>
                  <Input
                    value={formData.organizer_name}
                    onChange={(e) => handleChange('organizer_name', e.target.value)}
                    placeholder="Nom de l'organisateur"
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Site Internet
                  </label>
                  <Input
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="http://www.monsite.fr"
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Taille <span className="text-orange-400">(obligatoire)</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.size}
                    onChange={(e) => handleChange('size', e.target.value)}
                    min={2}
                    max={256}
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>
              </div>

              {/* Colonne droite */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Joué sur Internet ?
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_online"
                        checked={formData.is_online === true}
                        onChange={() => handleChange('is_online', true)}
                        className="w-4 h-4 accent-cyan"
                      />
                      <span className="text-white">Oui</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_online"
                        checked={formData.is_online === false}
                        onChange={() => handleChange('is_online', false)}
                        className="w-4 h-4 accent-cyan"
                      />
                      <span className="text-white">Non</span>
                    </label>
                  </div>
                </div>

                {!formData.is_online && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Lieu
                    </label>
                    <Input
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="Adresse du lieu"
                      className="bg-[#1a1d2e] border-white/10"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pays
                  </label>
                  <Select
                    value={formData.country}
                    onChange={(value) => handleChange('country', value)}
                    options={COUNTRY_OPTIONS}
                    className="bg-[#1a1d2e]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date de début
                  </label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className="bg-[#1a1d2e] border-white/10"
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
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fuseau horaire <span className="text-orange-400">(obligatoire)</span>
                  </label>
                  <Select
                    value={formData.timezone}
                    onChange={(value) => handleChange('timezone', value)}
                    options={TIMEZONE_OPTIONS}
                    className="bg-[#1a1d2e]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Détails */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={8}
                  placeholder="Décrivez votre tournoi..."
                  className="bg-[#1a1d2e] border-white/10 resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Règles
                </label>
                <Textarea
                  value={formData.rules}
                  onChange={(e) => handleChange('rules', e.target.value)}
                  rows={8}
                  placeholder="Listez les règles du tournoi..."
                  className="bg-[#1a1d2e] border-white/10 resize-y"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Prix
                </label>
                <Textarea
                  value={formData.prizes}
                  onChange={(e) => handleChange('prizes', e.target.value)}
                  rows={4}
                  placeholder="Détaillez les prix à gagner..."
                  className="bg-[#1a1d2e] border-white/10 resize-y"
                />
              </div>
            </div>
          )}

          {/* Tab: Contact */}
          {activeTab === 'contact' && (
            <div className="space-y-6 max-w-md">
              <p className="text-gray-400 text-sm mb-6">
                Informations de contact pour les participants et les spectateurs.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email de contact
                </label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="contact@montournoi.com"
                  className="bg-[#1a1d2e] border-white/10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Serveur Discord
                </label>
                <Input
                  value={formData.contact_discord}
                  onChange={(e) => handleChange('contact_discord', e.target.value)}
                  placeholder="https://discord.gg/xxx"
                  className="bg-[#1a1d2e] border-white/10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Twitter / X
                </label>
                <Input
                  value={formData.contact_twitter}
                  onChange={(e) => handleChange('contact_twitter', e.target.value)}
                  placeholder="@montournoi"
                  className="bg-[#1a1d2e] border-white/10"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-6">
          <Button
            type="submit"
            disabled={saving}
            className="bg-cyan hover:bg-cyan/90 text-white px-6"
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
          </Button>
        </div>
      </form>
    </div>
  );
}
