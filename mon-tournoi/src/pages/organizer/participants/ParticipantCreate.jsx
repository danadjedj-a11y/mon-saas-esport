import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button, Input } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

export default function ParticipantCreate() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [activeTab, setActiveTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Team/Participant info
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    custom_identifier: '',
    team_identifier: '',
  });

  // Players (for team tournaments)
  const isTeamTournament = tournament?.participant_type === 'team';
  const teamSize = tournament?.team_size_max || 5;
  
  const [players, setPlayers] = useState(
    Array.from({ length: teamSize }, (_, i) => ({
      name: '',
      email: '',
      game_id: '',
      custom_identifier: '',
    }))
  );

  const tabs = [
    { id: 'info', label: 'Informations de base' },
    ...(isTeamTournament
      ? Array.from({ length: teamSize }, (_, i) => ({
          id: `player-${i + 1}`,
          label: `Joueur ${i + 1}`,
        }))
      : []),
  ];

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
    if (!logoFile) return null;

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${tournamentId}/participants/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('tournament-assets')
      .upload(fileName, logoFile);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('tournament-assets')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    setSaving(true);
    try {
      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadLogo();
      }

      if (isTeamTournament) {
        // Create team first
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: formData.name,
            logo_url: logoUrl,
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Create participant
        const { data: participant, error: participantError } = await supabase
          .from('participants')
          .insert({
            tournament_id: tournamentId,
            team_id: team.id,
            name: formData.name,
            email: formData.email,
            status: 'registered',
            custom_data: {
              custom_identifier: formData.custom_identifier,
              team_identifier: formData.team_identifier,
            },
          })
          .select()
          .single();

        if (participantError) throw participantError;

        // Add players as team members (optional, only if they have data)
        const validPlayers = players.filter(p => p.name || p.email);
        if (validPlayers.length > 0) {
          // Note: In a real app, you'd need to create user accounts or link existing ones
          // For now, we store player data in custom_data
          await supabase
            .from('participants')
            .update({
              custom_data: {
                ...participant.custom_data,
                players: validPlayers,
              },
            })
            .eq('id', participant.id);
        }
      } else {
        // Solo player
        const { error } = await supabase
          .from('participants')
          .insert({
            tournament_id: tournamentId,
            name: formData.name,
            email: formData.email,
            status: 'registered',
            custom_data: {
              custom_identifier: formData.custom_identifier,
            },
          });

        if (error) throw error;
      }

      toast.success('Participant ajouté avec succès');
      navigate(`/organizer/tournament/${tournamentId}/participants`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'ajout du participant");
    } finally {
      setSaving(false);
    }
  };

  const updatePlayer = (index, field, value) => {
    setPlayers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link 
          to={`/organizer/tournament/${tournamentId}/participants`}
          className="hover:text-cyan"
        >
          Participants
        </Link>
        <span>/</span>
      </div>

      {/* Header */}
      <h1 className="text-2xl font-display font-bold text-white mb-6">
        Nouveau participant
      </h1>

      {/* Tabs */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 overflow-hidden">
        <div className="flex border-b border-white/10 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-cyan border-b-2 border-cyan bg-white/5'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Tab: Info de base */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nom de l'équipe
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isTeamTournament ? "Nom de l'équipe" : "Nom du joueur"}
                    className="bg-[#1a1d2e] border-white/10"
                    required
                  />
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Logo <span className="text-gray-500 text-xs">ℹ️</span>
                  </label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <img 
                        src={logoPreview} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <label className="cursor-pointer">
                      <span className="px-4 py-2 bg-transparent border border-cyan text-cyan rounded-lg hover:bg-cyan/10 transition-colors inline-block">
                        Choisir une image
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email de contact principal
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className="bg-[#1a1d2e] border-white/10 pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ⚙️
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom user identifier <span className="text-gray-500 text-xs">ℹ️</span>
                  </label>
                  <Input
                    value={formData.custom_identifier}
                    onChange={(e) => setFormData({ ...formData, custom_identifier: e.target.value })}
                    placeholder="Identifiant personnalisé"
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Identifiant de l'équipe
                  </label>
                  <Input
                    value={formData.team_identifier}
                    onChange={(e) => setFormData({ ...formData, team_identifier: e.target.value })}
                    placeholder="ID équipe"
                    className="bg-[#1a1d2e] border-white/10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Players */}
          {activeTab.startsWith('player-') && isTeamTournament && (
            <div className="space-y-4">
              {(() => {
                const playerIndex = parseInt(activeTab.split('-')[1]) - 1;
                const player = players[playerIndex];
                return (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nom du joueur
                      </label>
                      <Input
                        value={player.name}
                        onChange={(e) => updatePlayer(playerIndex, 'name', e.target.value)}
                        placeholder={`Joueur ${playerIndex + 1}`}
                        className="bg-[#1a1d2e] border-white/10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={player.email}
                        onChange={(e) => updatePlayer(playerIndex, 'email', e.target.value)}
                        placeholder="email@example.com"
                        className="bg-[#1a1d2e] border-white/10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        ID en jeu
                      </label>
                      <Input
                        value={player.game_id}
                        onChange={(e) => updatePlayer(playerIndex, 'game_id', e.target.value)}
                        placeholder="Pseudo/ID dans le jeu"
                        className="bg-[#1a1d2e] border-white/10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Identifiant personnalisé
                      </label>
                      <Input
                        value={player.custom_identifier}
                        onChange={(e) => updatePlayer(playerIndex, 'custom_identifier', e.target.value)}
                        placeholder="ID personnalisé"
                        className="bg-[#1a1d2e] border-white/10"
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end mt-6 pt-6 border-t border-white/10">
            <Button
              type="submit"
              disabled={saving}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {saving ? 'Ajout...' : '+ Ajouter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
