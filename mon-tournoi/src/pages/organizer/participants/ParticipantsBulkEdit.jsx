import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button, Input } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

/**
 * ParticipantsBulkEdit - Édition en masse des participants
 * Permet de modifier le statut, seed, ou check-in de plusieurs participants
 */
export default function ParticipantsBulkEdit() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const _tournament = context?.tournament;

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');

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
          team:team_id (id, name, logo_url)
        `)
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(participants.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleApplyBulkAction = async () => {
    if (selectedIds.length === 0) {
      toast.error('Sélectionnez au moins un participant');
      return;
    }
    if (!bulkAction) {
      toast.error('Choisissez une action');
      return;
    }

    setSaving(true);
    try {
      let updateData = {};

      switch (bulkAction) {
        case 'status':
          updateData = { status: bulkValue };
          break;
        case 'checkin':
          updateData = { checked_in: bulkValue === 'true' };
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from('participants')
        .update(updateData)
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} participant(s) modifié(s)`);
      fetchParticipants();
      setSelectedIds([]);
      setBulkAction('');
      setBulkValue('');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Supprimer définitivement ${selectedIds.length} participant(s) ?`)) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} participant(s) supprimé(s)`);
      setSelectedIds([]);
      fetchParticipants();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      confirmed: 'bg-green-500/20 text-green-400',
      rejected: 'bg-red-500/20 text-red-400',
      waitlist: 'bg-blue-500/20 text-blue-400',
    };
    const labels = {
      pending: 'En attente',
      confirmed: 'Confirmé',
      rejected: 'Refusé',
      waitlist: 'Liste d\'attente',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Éditer tous les participants</h1>
          <p className="text-text-secondary mt-1">
            {participants.length} participant(s) • {selectedIds.length} sélectionné(s)
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/participants`)}
        >
          ← Retour à la liste
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      <div className="bg-[#1e2235] rounded-xl p-4 border border-white/10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.length === participants.length && participants.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet focus:ring-violet"
            />
            <span className="text-sm text-text-secondary">Tout sélectionner</span>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <select
            value={bulkAction}
            onChange={(e) => {
              setBulkAction(e.target.value);
              setBulkValue('');
            }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet focus:ring-1 focus:ring-violet"
          >
            <option value="">-- Action --</option>
            <option value="status">Changer le statut</option>
            <option value="checkin">Modifier check-in</option>
          </select>

          {bulkAction === 'status' && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet focus:ring-1 focus:ring-violet"
            >
              <option value="">-- Statut --</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="rejected">Refusé</option>
              <option value="waitlist">Liste d'attente</option>
            </select>
          )}

          {bulkAction === 'checkin' && (
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet focus:ring-1 focus:ring-violet"
            >
              <option value="">-- Check-in --</option>
              <option value="true">✅ Checked-in</option>
              <option value="false">❌ Non checked-in</option>
            </select>
          )}

          <Button
            onClick={handleApplyBulkAction}
            disabled={saving || !bulkAction || selectedIds.length === 0}
            size="sm"
          >
            {saving ? 'Application...' : 'Appliquer'}
          </Button>

          <div className="flex-1" />

          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={saving || selectedIds.length === 0}
          >
            🗑️ Supprimer ({selectedIds.length})
          </Button>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-[#1e2235] rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-black/20">
              <th className="w-12 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Participant</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Check-in</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Inscription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {participants.map((participant) => (
              <tr 
                key={participant.id}
                className={`hover:bg-white/5 transition-colors ${
                  selectedIds.includes(participant.id) ? 'bg-violet/10' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(participant.id)}
                    onChange={() => handleSelectOne(participant.id)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet focus:ring-violet"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-white font-mono">#{participants.indexOf(participant) + 1}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {participant.team?.logo_url ? (
                      <img 
                        src={participant.team.logo_url} 
                        alt="" 
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-violet/20 flex items-center justify-center text-sm">
                        👥
                      </div>
                    )}
                    <span className="text-white font-medium">
                      {participant.team?.name || participant.name || 'Sans nom'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(participant.status)}
                </td>
                <td className="px-4 py-3">
                  {participant.checked_in ? (
                    <span className="text-green-400">✅</span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {new Date(participant.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}

            {participants.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center text-text-secondary">
                  Aucun participant inscrit
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#1e2235] rounded-xl p-4 border border-white/10">
          <div className="text-2xl font-bold text-white">{participants.length}</div>
          <div className="text-sm text-text-secondary">Total</div>
        </div>
        <div className="bg-[#1e2235] rounded-xl p-4 border border-white/10">
          <div className="text-2xl font-bold text-green-400">
            {participants.filter(p => p.status === 'confirmed').length}
          </div>
          <div className="text-sm text-text-secondary">Confirmés</div>
        </div>
        <div className="bg-[#1e2235] rounded-xl p-4 border border-white/10">
          <div className="text-2xl font-bold text-yellow-400">
            {participants.filter(p => p.status === 'pending').length}
          </div>
          <div className="text-sm text-text-secondary">En attente</div>
        </div>
        <div className="bg-[#1e2235] rounded-xl p-4 border border-white/10">
          <div className="text-2xl font-bold text-cyan-400">
            {participants.filter(p => p.checked_in).length}
          </div>
          <div className="text-sm text-text-secondary">Checked-in</div>
        </div>
      </div>
    </div>
  );
}
