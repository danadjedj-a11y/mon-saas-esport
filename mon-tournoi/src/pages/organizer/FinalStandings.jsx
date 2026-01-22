import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button, Input } from '../../shared/components/ui';
import { toast } from '../../utils/toast';

export default function FinalStandings() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();
  const _tournament = context?.tournament;

  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchStandings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const fetchStandings = async () => {
    try {
      // Try to get from participants with placement
      const { data, error } = await supabase
        .from('participants')
        .select(`
          *,
          team:team_id (id, name, logo_url)
        `)
        .eq('tournament_id', tournamentId)
        .not('final_rank', 'is', null)
        .order('final_rank', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;
      setStandings(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStanding = async (participantId, rank) => {
    try {
      const { error } = await supabase
        .from('participants')
        .update({ final_rank: rank })
        .eq('id', participantId);

      if (error) throw error;
      
      toast.success('Classement mis à jour');
      fetchStandings();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update all rankings
      for (const standing of standings) {
        await supabase
          .from('participants')
          .update({ final_rank: standing.final_rank })
          .eq('id', standing.id);
      }
      
      toast.success('Classement enregistré');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
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
          Classement final
        </h1>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          + Ajouter
        </Button>
      </div>

      {/* Standings Table */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6">
        {standings.length > 0 ? (
          <div className="space-y-2">
            {standings.map((standing, _index) => (
              <div
                key={standing.id}
                className="flex items-center justify-between bg-[#1a1d2e] rounded-lg p-4 border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl w-10 text-center">
                    {getRankIcon(standing.final_rank)}
                  </span>
                  <div className="flex items-center gap-3">
                    {standing.team?.logo_url ? (
                      <img 
                        src={standing.team.logo_url} 
                        alt="" 
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet to-cyan flex items-center justify-center text-white font-bold">
                        {(standing.team?.name || standing.name || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-white font-medium">
                      {standing.team?.name || standing.name}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={standing.final_rank}
                    onChange={(e) => {
                      const newRank = parseInt(e.target.value);
                      setStandings(prev => 
                        prev.map(s => 
                          s.id === standing.id ? { ...s, final_rank: newRank } : s
                        )
                      );
                    }}
                    className="w-16 bg-[#2a2d3e] border border-white/10 rounded px-2 py-1 text-white text-center"
                    min="1"
                  />
                  <button
                    onClick={() => {
                      setStandings(prev => prev.filter(s => s.id !== standing.id));
                      supabase
                        .from('participants')
                        .update({ final_rank: null })
                        .eq('id', standing.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-400"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">
              Il n'y actuellement pas de classement.
            </p>
          </div>
        )}

        {/* Save Button */}
        {standings.length > 0 && (
          <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-cyan hover:bg-cyan/90 text-white"
            >
              {saving ? 'Enregistrement...' : '✓ Enregistrer'}
            </Button>
          </div>
        )}
      </div>

      {/* Add Modal - Simple version */}
      {showAddModal && (
        <AddStandingModal
          tournamentId={tournamentId}
          existingIds={standings.map(s => s.id)}
          onAdd={(participant, rank) => {
            handleAddStanding(participant.id, rank);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

function AddStandingModal({ tournamentId, existingIds, onAdd, onClose }) {
  const [participants, setParticipants] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [rank, setRank] = useState(existingIds.length + 1);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('participants')
      .select(`*, team:team_id (id, name)`)
      .eq('tournament_id', tournamentId)
      .is('final_rank', null);
    
    setParticipants(data?.filter(p => !existingIds.includes(p.id)) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const participant = participants.find(p => p.id === selectedId);
    if (participant) {
      onAdd(participant, rank);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-white mb-4">
          Ajouter au classement
        </h2>

        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : participants.length === 0 ? (
          <p className="text-gray-400">Tous les participants sont déjà classés.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Participant
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="">Sélectionner...</option>
                {participants.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.team?.name || p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Position
              </label>
              <Input
                type="number"
                value={rank}
                onChange={(e) => setRank(parseInt(e.target.value))}
                min="1"
                className="bg-[#1a1d2e] border-white/10"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white">
                Ajouter
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
