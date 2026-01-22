import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button, Input } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

export default function ParticipantsList() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          *,
          team:team_id (
            id,
            name,
            logo_url,
            captain_id,
            team_members (
              id,
              user_id,
              role,
              profiles:user_id (username, email, avatar_url)
            )
          )
        `)
        .eq('tournament_id', tournamentId)
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des participants');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedParticipants(participants.map(p => p.id));
    } else {
      setSelectedParticipants([]);
    }
  };

  const handleSelectParticipant = (id) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedParticipants.length === 0) return;
    if (!confirm(`Supprimer ${selectedParticipants.length} participant(s) ?`)) return;

    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .in('id', selectedParticipants);

      if (error) throw error;

      toast.success(`${selectedParticipants.length} participant(s) supprimé(s)`);
      setSelectedParticipants([]);
      fetchParticipants();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredParticipants = participants.filter(p => {
    if (!searchTerm) return true;
    const name = p.team?.name || p.name || '';
    const email = p.email || p.team?.team_members?.[0]?.profiles?.email || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const tournamentSize = tournament?.max_participants || tournament?.size || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-white">
          Participants
        </h1>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate(`/organizer/tournament/${tournamentId}/participants/create`)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            + Ajouter
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info('Fonctionnalité à venir')}
            className="border-white/20 text-white"
          >
            ≡ Tout remplir
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 text-center">
          <p className="text-4xl font-bold text-white mb-2">{participants.length}</p>
          <p className="text-gray-400">Participant{participants.length > 1 ? 's' : ''}</p>
        </div>
        <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 text-center">
          <p className="text-4xl font-bold text-white mb-2">{tournamentSize}</p>
          <p className="text-gray-400">Taille du tournoi</p>
        </div>
      </div>

      {/* Participants List */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Liste des participants
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchParticipants}
              className="text-cyan hover:text-cyan/80 text-sm font-medium flex items-center gap-1"
            >
              🔄 Rafraîchir
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-cyan hover:text-cyan/80 text-sm font-medium flex items-center gap-1"
            >
              ⚙️ {showFilters ? 'Masquer' : 'Afficher'} Filtres
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-[#1a1d2e] rounded-lg p-4 mb-4 border border-white/5">
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#2a2d3e] border-white/10"
            />
          </div>
        )}

        {/* Count + Actions */}
        <div className="flex items-center justify-between py-3 border-b border-white/10">
          <p className="text-gray-400 text-sm">
            <span className="text-white font-medium">{filteredParticipants.length}</span> participant{filteredParticipants.length > 1 ? 's' : ''} sur {tournamentSize}
          </p>
          <Button
            variant="ghost"
            onClick={handleDeleteSelected}
            disabled={selectedParticipants.length === 0}
            className="text-gray-400 hover:text-red-400 disabled:opacity-50"
          >
            🗑️ Supprimer
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-2 text-left w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedParticipants.length === participants.length && participants.length > 0}
                    className="accent-cyan"
                  />
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  className="py-3 px-2 text-left text-cyan text-sm font-medium cursor-pointer hover:text-cyan/80"
                >
                  Nom {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('email')}
                  className="py-3 px-2 text-left text-cyan text-sm font-medium cursor-pointer hover:text-cyan/80"
                >
                  Email {sortField === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('created_at')}
                  className="py-3 px-2 text-right text-cyan text-sm font-medium cursor-pointer hover:text-cyan/80"
                >
                  Créé le {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.length > 0 ? (
                filteredParticipants.map((participant) => (
                  <tr 
                    key={participant.id}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => navigate(`/organizer/tournament/${tournamentId}/participants/${participant.id}`)}
                  >
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={() => handleSelectParticipant(participant.id)}
                        className="accent-cyan"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {participant.team?.logo_url ? (
                          <img 
                            src={participant.team.logo_url} 
                            alt="" 
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet to-cyan flex items-center justify-center text-white text-xs font-bold">
                            {(participant.team?.name || participant.name || '?')[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-white font-medium">
                          {participant.team?.name || participant.name || 'Sans nom'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-400">
                      {participant.email || participant.team?.team_members?.[0]?.profiles?.email || '-'}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-500 text-sm">
                      {new Date(participant.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    Aucun participant trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            <span className="text-white font-medium">{filteredParticipants.length}</span> participant{filteredParticipants.length > 1 ? 's' : ''} sur {tournamentSize}
          </p>
          <Button
            variant="ghost"
            onClick={handleDeleteSelected}
            disabled={selectedParticipants.length === 0}
            className="text-gray-400 hover:text-red-400 disabled:opacity-50"
          >
            🗑️ Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
