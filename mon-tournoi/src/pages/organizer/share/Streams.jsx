import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Button, Input, Select } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

// Note: tournament_streams table not yet in Convex - using local state

const LANGUAGES = [
  { code: 'fr', name: 'français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
];

export default function Streams() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // TODO: Migrate to Convex when tournament_streams table is added
    // For now, initialize with empty stream
    setStreams([{ id: 'new-1', name: '', language: 'fr', url: '' }]);
    setLoading(false);
  }, [tournamentId]);

  const handleAddStream = () => {
    setStreams(prev => [
      ...prev,
      { id: `new-${Date.now()}`, name: '', language: 'fr', url: '' }
    ]);
  };

  const handleRemoveStream = (index) => {
    setStreams(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateStream = (index, field, value) => {
    setStreams(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    // Validate
    const validStreams = streams.filter(s => s.name && s.url);
    if (validStreams.length === 0) {
      toast.error('Ajoutez au moins un stream valide');
      return;
    }

    setSaving(true);
    try {
      // TODO: Migrate to Convex when tournament_streams table is added
      // For now, just show success
      toast.success('Streams mis à jour (sauvegarde locale)');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const extractPlatform = (url) => {
    if (!url) return null;
    if (url.includes('twitch.tv')) return { name: 'Twitch', color: 'text-purple-400' };
    if (url.includes('youtube.com') || url.includes('youtu.be')) return { name: 'YouTube', color: 'text-red-400' };
    if (url.includes('facebook.com')) return { name: 'Facebook', color: 'text-blue-400' };
    return { name: 'Stream', color: 'text-gray-400' };
  };

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
      <h1 className="text-2xl font-display font-bold text-white mb-6">
        Streams
      </h1>

      {/* Streams List */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">
          Liste des streams
        </h2>

        <div className="space-y-4">
          {streams.map((stream, index) => {
            const platform = extractPlatform(stream.url);
            return (
              <div 
                key={stream.id} 
                className="grid grid-cols-[1fr_150px_1fr_auto] gap-4 items-end"
              >
                {/* Name */}
                <div>
                  <label className="block text-sm text-orange-400 mb-1">
                    Nom <span className="text-gray-500">(obligatoire)</span>
                  </label>
                  <Input
                    value={stream.name}
                    onChange={(e) => handleUpdateStream(index, 'name', e.target.value)}
                    placeholder="Nom du stream"
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Langue
                  </label>
                  <Select
                    value={stream.language}
                    onChange={(e) => handleUpdateStream(index, 'language', e.target.value)}
                    className="bg-[#1a1d2e] border-white/10"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm text-orange-400 mb-1">
                    URL <span className="text-gray-500 text-xs">ℹ️</span> <span className="text-gray-500">(obligatoire)</span>
                  </label>
                  <Input
                    value={stream.url}
                    onChange={(e) => handleUpdateStream(index, 'url', e.target.value)}
                    placeholder="https://www.twitch.tv/..."
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>

                {/* Delete Button */}
                <Button
                  type="button"
                  onClick={() => handleRemoveStream(index)}
                  className="bg-orange-500 hover:bg-orange-600 text-white h-10 px-4"
                >
                  🗑️
                </Button>
              </div>
            );
          })}
        </div>

        {/* Add Button */}
        <div className="flex justify-end mt-4">
          <Button
            type="button"
            onClick={handleAddStream}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            + Ajouter
          </Button>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6 pt-6 border-t border-white/10">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-cyan hover:bg-cyan/90 text-white"
          >
            {saving ? 'Enregistrement...' : '✏️ Mettre à jour'}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 bg-[#1a1d2e] rounded-xl border border-white/5 p-4">
        <div className="flex gap-3">
          <span className="text-cyan">ℹ️</span>
          <div className="text-sm text-gray-400">
            <p>Ajoutez vos liens de stream Twitch, YouTube ou Facebook pour les afficher sur la page publique du tournoi.</p>
            <p className="mt-1">Les viewers pourront suivre le tournoi en direct depuis votre page.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
