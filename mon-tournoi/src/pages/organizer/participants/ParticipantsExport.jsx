import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

/**
 * ParticipantsExport - Export des participants en CSV/JSON
 */
export default function ParticipantsExport() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_exportFormat, _setExportFormat] = useState('csv');
  const [includeFields, setIncludeFields] = useState({
    position: true,
    name: true,
    status: true,
    checked_in: true,
    created_at: true,
    email: false,
    members: false,
  });

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
              profiles:user_id (username, email)
            )
          )
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

  const toggleField = (field) => {
    setIncludeFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const generateExportData = () => {
    return participants.map((p, index) => {
      const row = {};
      
      if (includeFields.position) row.position = index + 1;
      if (includeFields.name) row.name = p.team?.name || p.name || '';
      if (includeFields.status) row.status = p.status || '';
      if (includeFields.checked_in) row.checked_in = p.checked_in ? 'Oui' : 'Non';
      if (includeFields.created_at) row.inscription = new Date(p.created_at).toLocaleDateString('fr-FR');
      
      if (includeFields.email && p.team?.team_members) {
        const captain = p.team.team_members.find(m => m.user_id === p.team.captain_id);
        row.email = captain?.profiles?.email || '';
      }
      
      if (includeFields.members && p.team?.team_members) {
        row.members = p.team.team_members
          .map(m => m.profiles?.username || 'Inconnu')
          .join(', ');
      }
      
      return row;
    });
  };

  const handleExportCSV = () => {
    const data = generateExportData();
    if (data.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(';'),
      ...data.map(row => 
        headers.map(h => {
          const val = row[h] || '';
          // Escape des guillemets et virgules
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(';')
      )
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM pour Excel
    downloadFile(csvContent, `participants_${tournament?.name || 'tournoi'}.csv`, 'text/csv;charset=utf-8');
    toast.success('Export CSV téléchargé !');
  };

  const handleExportJSON = () => {
    const data = generateExportData();
    if (data.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `participants_${tournament?.name || 'tournoi'}.json`, 'application/json');
    toast.success('Export JSON téléchargé !');
  };

  const handleExportToornament = () => {
    // Format compatible Toornament pour import
    const data = participants.map(p => ({
      name: p.team?.name || p.name || '',
      email: '',
      custom_fields: {}
    }));

    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `participants_toornament_${tournament?.name || 'tournoi'}.json`, 'application/json');
    toast.success('Export format Toornament téléchargé !');
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/[^a-z0-9_\-.]/gi, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <h1 className="text-2xl font-display font-bold text-white">Exporter les participants</h1>
          <p className="text-text-secondary mt-1">
            {participants.length} participant(s) à exporter
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate(`/organizer/tournament/${tournamentId}/participants`)}
        >
          ← Retour à la liste
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Champs à inclure */}
        <div className="bg-[#1e2235] rounded-xl p-6 border border-white/10">
          <h2 className="text-lg font-display font-semibold text-white mb-4">
            Champs à inclure
          </h2>
          
          <div className="space-y-3">
            {[
              { key: 'position', label: 'Position', desc: 'Numéro d\'ordre' },
              { key: 'name', label: 'Nom', desc: 'Nom de l\'équipe/joueur' },
              { key: 'status', label: 'Statut', desc: 'Confirmé, en attente...' },
              { key: 'checked_in', label: 'Check-in', desc: 'Présence confirmée' },
              { key: 'created_at', label: 'Date d\'inscription', desc: 'Date d\'inscription' },
              { key: 'email', label: 'Email capitaine', desc: 'Email du capitaine (privé)' },
              { key: 'members', label: 'Membres', desc: 'Liste des membres de l\'équipe' },
            ].map(field => (
              <label 
                key={field.key}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={includeFields[field.key]}
                  onChange={() => toggleField(field.key)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet focus:ring-violet"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">{field.label}</div>
                  <div className="text-xs text-text-secondary">{field.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Format et export */}
        <div className="space-y-6">
          {/* Aperçu */}
          <div className="bg-[#1e2235] rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-display font-semibold text-white mb-4">
              Aperçu des données
            </h2>
            
            <div className="bg-black/30 rounded-lg p-4 max-h-64 overflow-auto font-mono text-xs">
              {participants.slice(0, 5).map((p, _i) => (
                <div key={p.id} className="text-text-secondary mb-1">
                  {includeFields.seed && <span className="text-violet">#{p.seed || '?'}</span>}
                  {includeFields.name && <span className="text-white ml-2">{p.team?.name || p.name || 'Sans nom'}</span>}
                  {includeFields.status && <span className="text-cyan-400 ml-2">[{p.status}]</span>}
                  {includeFields.checked_in && <span className="ml-2">{p.checked_in ? '✅' : '❌'}</span>}
                </div>
              ))}
              {participants.length > 5 && (
                <div className="text-text-muted mt-2">... et {participants.length - 5} autres</div>
              )}
            </div>
          </div>

          {/* Actions d'export */}
          <div className="bg-[#1e2235] rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-display font-semibold text-white mb-4">
              Télécharger
            </h2>
            
            <div className="space-y-3">
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📊
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Export CSV</div>
                  <div className="text-sm text-text-secondary">Compatible Excel, Google Sheets</div>
                </div>
              </button>

              <button
                onClick={handleExportJSON}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📦
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Export JSON</div>
                  <div className="text-sm text-text-secondary">Format technique structuré</div>
                </div>
              </button>

              <button
                onClick={handleExportToornament}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-violet/10 hover:bg-violet/20 border border-violet/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-violet/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🔄
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Format Toornament</div>
                  <div className="text-sm text-text-secondary">Compatible import Toornament</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
