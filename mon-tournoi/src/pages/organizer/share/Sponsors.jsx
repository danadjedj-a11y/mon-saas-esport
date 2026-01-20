import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button, Input, Modal } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

export default function Sponsors() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();

  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    website_url: '',
    tier: 'bronze',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const MAX_SPONSORS = 6;

  useEffect(() => {
    fetchSponsors();
  }, [tournamentId]);

  const fetchSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_sponsors')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('tier', { ascending: true })
        .order('created_at', { ascending: true });

      if (error && error.code !== '42P01') throw error;
      setSponsors(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      setSponsors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le fichier doit faire moins de 2MB');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async () => {
    if (!logoFile) return formData.logo_url;

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${tournamentId}/sponsors/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('tournament-assets')
      .upload(fileName, logoFile);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('tournament-assets')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleOpenModal = (sponsor = null) => {
    if (sponsor) {
      setEditingSponsor(sponsor);
      setFormData({
        name: sponsor.name || '',
        logo_url: sponsor.logo_url || '',
        website_url: sponsor.website_url || '',
        tier: sponsor.tier || 'bronze',
      });
      setLogoPreview(sponsor.logo_url);
    } else {
      setEditingSponsor(null);
      setFormData({
        name: '',
        logo_url: '',
        website_url: '',
        tier: 'bronze',
      });
      setLogoPreview(null);
    }
    setLogoFile(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      const logoUrl = await uploadLogo();

      if (editingSponsor) {
        const { error } = await supabase
          .from('tournament_sponsors')
          .update({
            ...formData,
            logo_url: logoUrl,
          })
          .eq('id', editingSponsor.id);

        if (error) throw error;
        toast.success('Sponsor mis à jour');
      } else {
        const { error } = await supabase
          .from('tournament_sponsors')
          .insert({
            ...formData,
            logo_url: logoUrl,
            tournament_id: tournamentId,
          });

        if (error) throw error;
        toast.success('Sponsor ajouté');
      }

      setShowModal(false);
      fetchSponsors();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (sponsorId) => {
    if (!confirm('Supprimer ce sponsor ?')) return;

    try {
      const { error } = await supabase
        .from('tournament_sponsors')
        .delete()
        .eq('id', sponsorId);

      if (error) throw error;
      toast.success('Sponsor supprimé');
      fetchSponsors();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-white">
          Sponsors <span className="text-gray-500 text-lg font-normal">{sponsors.length}/{MAX_SPONSORS}</span>
        </h1>
        <Button
          onClick={() => handleOpenModal()}
          disabled={sponsors.length >= MAX_SPONSORS}
          className="bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
        >
          + Ajouter un sponsor
        </Button>
      </div>

      {/* Sponsors List */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-8">
        {sponsors.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="bg-[#1a1d2e] rounded-xl p-4 border border-white/5 group relative"
              >
                {/* Logo */}
                <div className="aspect-video bg-white/5 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                  {sponsor.logo_url ? (
                    <img 
                      src={sponsor.logo_url} 
                      alt={sponsor.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-4xl text-gray-500">🤝</span>
                  )}
                </div>

                {/* Name */}
                <p className="text-center text-white font-medium truncate">
                  {sponsor.name}
                </p>

                {/* Tier Badge */}
                <div className="flex justify-center mt-2">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    sponsor.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                    sponsor.tier === 'silver' ? 'bg-gray-400/20 text-gray-300' :
                    'bg-amber-700/20 text-amber-600'
                  }`}>
                    {sponsor.tier?.charAt(0).toUpperCase() + sponsor.tier?.slice(1)}
                  </span>
                </div>

                {/* Actions (hover) */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => handleOpenModal(sponsor)}
                    className="p-1.5 bg-[#2a2d3e] rounded text-gray-400 hover:text-white"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(sponsor.id)}
                    className="p-1.5 bg-[#2a2d3e] rounded text-gray-400 hover:text-red-400"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-[#1a1d2e] rounded-xl flex items-center justify-center">
              <span className="text-5xl opacity-30">🤝</span>
            </div>
            <p className="text-gray-400 mb-2">
              Vous n'avez pas encore de sponsor listé sur ce tournoi.
            </p>
            <Button
              onClick={() => handleOpenModal()}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white"
            >
              + Ajouter un sponsor
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSponsor ? 'Modifier le sponsor' : 'Ajouter un sponsor'}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom du sponsor <span className="text-red-400">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nom du sponsor"
              className="bg-[#1a1d2e] border-white/10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Logo
            </label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <img 
                  src={logoPreview} 
                  alt="Preview" 
                  className="w-16 h-16 rounded-lg object-contain bg-white/5"
                />
              )}
              <label className="cursor-pointer">
                <span className="px-4 py-2 bg-transparent border border-cyan text-cyan rounded-lg hover:bg-cyan/10 transition-colors inline-block">
                  Choisir une image
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Site web
            </label>
            <Input
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://..."
              className="bg-[#1a1d2e] border-white/10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tier
            </label>
            <select
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
              className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-4 py-2 text-white"
            >
              <option value="gold">🥇 Gold</option>
              <option value="silver">🥈 Silver</option>
              <option value="bronze">🥉 Bronze</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {editingSponsor ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
