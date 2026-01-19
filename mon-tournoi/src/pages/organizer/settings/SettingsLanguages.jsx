import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button, Select, Modal } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

const AVAILABLE_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export default function SettingsLanguages() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();
  
  const [primaryLanguage, setPrimaryLanguage] = useState('fr');
  const [additionalLanguages, setAdditionalLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');

  useEffect(() => {
    if (context?.tournament) {
      setPrimaryLanguage(context.tournament.primary_language || 'fr');
      setAdditionalLanguages(context.tournament.additional_languages || []);
      setLoading(false);
    }
  }, [context?.tournament]);

  const handleAddLanguage = () => {
    if (!selectedLanguage) {
      toast.error('Sélectionnez une langue');
      return;
    }

    if (additionalLanguages.includes(selectedLanguage)) {
      toast.error('Cette langue est déjà ajoutée');
      return;
    }

    setAdditionalLanguages([...additionalLanguages, selectedLanguage]);
    setSelectedLanguage('');
    setShowAddModal(false);
    toast.success('Langue ajoutée');
  };

  const handleRemoveLanguage = (langCode) => {
    setAdditionalLanguages(prev => prev.filter(l => l !== langCode));
    toast.success('Langue supprimée');
  };

  const handleSetPrimary = (langCode) => {
    const oldPrimary = primaryLanguage;
    setPrimaryLanguage(langCode);
    setAdditionalLanguages(prev => {
      const updated = prev.filter(l => l !== langCode);
      if (oldPrimary !== langCode) {
        updated.push(oldPrimary);
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          primary_language: primaryLanguage,
          additional_languages: additionalLanguages,
        })
        .eq('id', tournamentId);

      if (error) throw error;

      toast.success('Langues mises à jour');
      
      if (context?.refreshTournament) {
        context.refreshTournament();
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const availableToAdd = AVAILABLE_LANGUAGES.filter(
    lang => lang.code !== primaryLanguage && !additionalLanguages.includes(lang.code)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  const primaryLangInfo = AVAILABLE_LANGUAGES.find(l => l.code === primaryLanguage);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-display font-bold text-white">
          Paramètres multilingues
        </h1>
      </div>

      {/* Main Section */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 mb-6">
        {/* Primary Language */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Langue principale
          </h2>
          <div className="bg-[#1a1d2e] rounded-lg p-4 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{primaryLangInfo?.flag}</span>
                <span className="font-medium text-white">{primaryLangInfo?.name}</span>
                <span className="px-2 py-0.5 bg-cyan/20 text-cyan text-xs rounded">
                  Principal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Languages */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Langues supplémentaires
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-cyan hover:text-cyan/80 text-sm font-medium"
            >
              Ajouter une langue
            </button>
          </div>

          {additionalLanguages.length > 0 ? (
            <div className="space-y-2">
              {additionalLanguages.map((langCode) => {
                const lang = AVAILABLE_LANGUAGES.find(l => l.code === langCode);
                return (
                  <div
                    key={langCode}
                    className="bg-[#1a1d2e] rounded-lg p-4 border border-white/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{lang?.flag}</span>
                        <span className="font-medium text-white">{lang?.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSetPrimary(langCode)}
                          className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                          Définir principal
                        </button>
                        <button
                          onClick={() => handleRemoveLanguage(langCode)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Aucune langue supplémentaire configurée.
            </p>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[#1a1d2e] rounded-xl border border-white/5 p-4 mb-6">
        <div className="flex gap-3">
          <span className="text-cyan">ℹ️</span>
          <div className="text-sm text-gray-400">
            <p>Les langues configurées permettent aux participants de voir le tournoi dans leur langue préférée.</p>
            <p className="mt-1">La langue principale sera utilisée par défaut si la langue du visiteur n'est pas disponible.</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-cyan hover:bg-cyan/90 text-white"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder les changements'}
        </Button>
      </div>

      {/* Add Language Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedLanguage('');
        }}
        title="Ajouter une langue"
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sélectionner une langue
            </label>
            <Select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-[#1a1d2e] border-white/10"
            >
              <option value="">-- Sélectionner --</option>
              {availableToAdd.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </Select>
          </div>

          {availableToAdd.length === 0 && (
            <p className="text-gray-500 text-sm text-center">
              Toutes les langues disponibles sont déjà ajoutées.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                setSelectedLanguage('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddLanguage}
              disabled={!selectedLanguage}
              className="bg-cyan hover:bg-cyan/90 text-white"
            >
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
