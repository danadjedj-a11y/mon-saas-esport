import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button, Input, Select, Modal, Textarea } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

const LOCATION_TYPES = [
  { value: 'physical', label: 'Lieu physique', icon: '📍' },
  { value: 'server', label: 'Serveur de jeu', icon: '🖥️' },
  { value: 'online', label: 'En ligne', icon: '🌐' },
];

export default function SettingsLocations() {
  const { id: tournamentId } = useParams();
  const _context = useOutletContext();
  
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'physical',
    address: '',
    city: '',
    country: '',
    server_ip: '',
    server_password: '',
    discord_link: '',
    notes: '',
  });

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('match_locations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;
      
      setLocations(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name || '',
        type: location.type || 'physical',
        address: location.address || '',
        city: location.city || '',
        country: location.country || '',
        server_ip: location.server_ip || '',
        server_password: location.server_password || '',
        discord_link: location.discord_link || '',
        notes: location.notes || '',
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        type: 'physical',
        address: '',
        city: '',
        country: '',
        server_ip: '',
        server_password: '',
        discord_link: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      if (editingLocation) {
        const { error } = await supabase
          .from('match_locations')
          .update(formData)
          .eq('id', editingLocation.id);

        if (error) throw error;
        toast.success('Emplacement mis à jour');
      } else {
        const { error } = await supabase
          .from('match_locations')
          .insert({
            ...formData,
            tournament_id: tournamentId,
          });

        if (error) throw error;
        toast.success('Emplacement ajouté');
      }

      setShowModal(false);
      fetchLocations();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (locationId) => {
    if (!confirm('Supprimer cet emplacement ?')) return;

    try {
      const { error } = await supabase
        .from('match_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
      toast.success('Emplacement supprimé');
      fetchLocations();
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
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-display font-bold text-white">
          Emplacements de match
        </h1>
      </div>

      {/* Add Button */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => handleOpenModal()}
          className="bg-cyan hover:bg-cyan/90 text-white"
        >
          Ajouter un emplacement
        </Button>
      </div>

      {/* Locations List */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6">
        {locations.length > 0 ? (
          <div className="space-y-3">
            {locations.map((location) => {
              const typeInfo = LOCATION_TYPES.find(t => t.value === location.type);
              return (
                <div
                  key={location.id}
                  className="bg-[#1a1d2e] rounded-lg p-4 border border-white/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{typeInfo?.icon || '📍'}</span>
                      <div>
                        <h3 className="font-medium text-white">{location.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {location.type === 'physical' && (
                            <>
                              {location.address && `${location.address}, `}
                              {location.city && `${location.city}, `}
                              {location.country}
                            </>
                          )}
                          {location.type === 'server' && (
                            <>
                              {location.server_ip && `IP: ${location.server_ip}`}
                            </>
                          )}
                          {location.type === 'online' && (
                            <>
                              {location.discord_link && `Discord: ${location.discord_link}`}
                            </>
                          )}
                        </p>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-white/10 text-gray-400 text-xs rounded">
                          {typeInfo?.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(location)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(location.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Supprimer"
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
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Aucun emplacement de match configuré.
            </p>
            <p className="text-sm text-gray-600">
              Les emplacements permettent de définir où se déroulent les matchs
              (lieu physique, serveur de jeu, ou lien en ligne).
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingLocation ? 'Modifier l\'emplacement' : 'Ajouter un emplacement'}
        size="lg"
      >
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom de l'emplacement
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Salle principale, Serveur EU1..."
              className="bg-[#1a1d2e] border-white/10"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type d'emplacement
            </label>
            <div className="grid grid-cols-3 gap-3">
              {LOCATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFormData({ ...formData, type: type.value })}
                  className={`p-3 rounded-lg border transition-all text-center ${
                    formData.type === type.value
                      ? 'border-cyan bg-cyan/10 text-white'
                      : 'border-white/10 bg-[#1a1d2e] text-gray-400 hover:border-white/20'
                  }`}
                >
                  <span className="text-xl block mb-1">{type.icon}</span>
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Physical Location Fields */}
          {formData.type === 'physical' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Adresse
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 rue de l'Esport"
                  className="bg-[#1a1d2e] border-white/10"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ville
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Paris"
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pays
                  </label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="France"
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>
              </div>
            </>
          )}

          {/* Server Fields */}
          {formData.type === 'server' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Adresse IP / Hostname
                </label>
                <Input
                  value={formData.server_ip}
                  onChange={(e) => setFormData({ ...formData, server_ip: e.target.value })}
                  placeholder="123.45.67.89:27015"
                  className="bg-[#1a1d2e] border-white/10"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mot de passe (optionnel)
                </label>
                <Input
                  type="password"
                  value={formData.server_password}
                  onChange={(e) => setFormData({ ...formData, server_password: e.target.value })}
                  placeholder="••••••••"
                  className="bg-[#1a1d2e] border-white/10"
                />
              </div>
            </>
          )}

          {/* Online Fields */}
          {formData.type === 'online' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lien Discord / Plateforme
              </label>
              <Input
                value={formData.discord_link}
                onChange={(e) => setFormData({ ...formData, discord_link: e.target.value })}
                placeholder="https://discord.gg/..."
                className="bg-[#1a1d2e] border-white/10"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (optionnel)
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Instructions supplémentaires..."
              rows={3}
              className="bg-[#1a1d2e] border-white/10"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              className="bg-cyan hover:bg-cyan/90 text-white"
            >
              {editingLocation ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
