import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { toast } from '../../../utils/toast';
import clsx from 'clsx';

export default function MatchEdit() {
  const { id: tournamentId, matchId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [match, setMatch] = useState(null);
  const [phase, setPhase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('result'); // 'result' | 'infos'

  // Form state
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [result1, setResult1] = useState(null); // 'win' | 'draw' | 'loss' | null
  const [result2, setResult2] = useState(null);
  const [forfeit1, setForfeit1] = useState(false);
  const [forfeit2, setForfeit2] = useState(false);

  // Infos state
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [participantNotes, setParticipantNotes] = useState('');
  const [publicNotes, setPublicNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) throw error;
      
      // Fetch les équipes si nécessaire
      const teamIds = [data.player1_id, data.player2_id].filter(Boolean);
      let teamsMap = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, logo_url')
          .in('id', teamIds);
        teamsMap = Object.fromEntries((teamsData || []).map(t => [t.id, t]));
      }
      
      // Enrichir le match
      const enrichedMatch = {
        ...data,
        participant1: teamsMap[data.player1_id] || null,
        participant2: teamsMap[data.player2_id] || null,
      };

      setMatch(enrichedMatch);
      setScore1(data.score_p1 || 0);
      setScore2(data.score_p2 || 0);
      setForfeit1(data.forfeit1 || false);
      setForfeit2(data.forfeit2 || false);
      setParticipantNotes(data.participant_notes || '');
      setPublicNotes(data.public_notes || '');
      setAdminNotes(data.admin_notes || '');

      // Parse scheduled date
      if (data.scheduled_at) {
        const date = new Date(data.scheduled_at);
        setScheduledDate(date.toISOString().split('T')[0]);
        setScheduledTime(date.toTimeString().slice(0, 5));
      }

      // Determine results from scores
      if (data.status === 'completed') {
        if (data.winner_id === data.player1_id) {
          setResult1('win');
          setResult2('loss');
        } else if (data.winner_id === data.player2_id) {
          setResult1('loss');
          setResult2('win');
        } else if (data.score_p1 === data.score_p2) {
          setResult1('draw');
          setResult2('draw');
        }
      }

      // Fetch phase info
      if (data.phase_id) {
        const { data: phaseData } = await supabase
          .from('tournament_phases')
          .select('*')
          .eq('id', data.phase_id)
          .single();
        setPhase(phaseData);
      } else {
        setPhase({
          name: 'Playoffs',
          type: tournament?.bracket_type || 'double_elimination'
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement du match');
    } finally {
      setLoading(false);
    }
  };

  const handleResultChange = (player, result) => {
    if (player === 1) {
      setResult1(result);
      // Auto-set opposite result
      if (result === 'win') setResult2('loss');
      else if (result === 'loss') setResult2('win');
      else if (result === 'draw') setResult2('draw');
    } else {
      setResult2(result);
      if (result === 'win') setResult1('loss');
      else if (result === 'loss') setResult1('win');
      else if (result === 'draw') setResult1('draw');
    }
  };

  const handleSave = async (returnAfter = false) => {
    setSaving(true);
    try {
      // Determine winner
      let winnerId = null;
      let status = match.status;

      if (result1 === 'win') {
        winnerId = match.player1_id;
        status = 'completed';
      } else if (result2 === 'win') {
        winnerId = match.player2_id;
        status = 'completed';
      } else if (result1 === 'draw' && result2 === 'draw') {
        status = 'completed';
      }

      // Build scheduled_at
      let scheduledAt = null;
      if (scheduledDate) {
        scheduledAt = scheduledTime 
          ? `${scheduledDate}T${scheduledTime}:00` 
          : `${scheduledDate}T00:00:00`;
      }

      const { error } = await supabase
        .from('matches')
        .update({
          score_p1: score1,
          score_p2: score2,
          winner_id: winnerId,
          status,
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (error) throw error;

      toast.success('Match mis à jour !');

      if (returnAfter) {
        navigate(`/organizer/tournament/${tournamentId}/matches`);
      } else {
        // Refresh data
        fetchMatch();
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getMatchId = () => {
    if (!match) return '';
    const bracketType = match.bracket_type === 'losers' ? '2' : match.bracket_type === 'grand_final' ? '3' : '1';
    return `#1.${bracketType}.${match.round_number || 1}.${match.match_number || 1}`;
  };

  const getMatchContext = () => {
    if (!match) return '';
    const bracketName = match.bracket_type === 'losers' 
      ? 'Losers Bracket' 
      : match.bracket_type === 'grand_final' 
        ? 'Grand Final' 
        : 'Winners Bracket';
    const roundName = match.bracket_type === 'grand_final' 
      ? 'GF Round 1' 
      : `${match.bracket_type === 'losers' ? 'LB' : 'WB'} Round ${match.round_number || 1}`;
    return `${phase?.name || 'Playoffs'} - ${bracketName} - ${roundName}`;
  };

  const getStatusLabel = () => {
    switch (match?.status) {
      case 'completed': return 'Terminé';
      case 'in_progress': return 'En cours';
      case 'scheduled': return 'Planifié';
      default: return 'En attente';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-12 text-gray-400">
        Match non trouvé
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link 
          to={`/organizer/tournament/${tournamentId}/matches`}
          className="hover:text-cyan"
        >
          Matchs
        </Link>
        <span>/</span>
        <span>{phase?.name || 'Playoffs'}</span>
        <span>/</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-white">
          Match {getMatchId()}
        </h1>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-cyan rounded-lg hover:bg-white/5">
            💬
          </button>
          <span className="text-gray-600">Chat</span>
        </div>
      </div>

      {/* Match Header Card */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 mb-6">
        <p className="text-sm text-gray-400 text-center mb-4">{getMatchContext()}</p>
        
        <div className="flex items-center justify-center gap-8">
          {/* Participant 1 */}
          <div className="text-center flex-1">
            <p className="text-xl text-gray-400">
              {match.participant1?.name || 'À déterminer'}
            </p>
          </div>

          {/* VS */}
          <div className="text-gray-600 text-2xl font-bold">VS</div>

          {/* Participant 2 */}
          <div className="text-center flex-1">
            <p className="text-xl text-gray-400">
              {match.participant2?.name || 'À déterminer'}
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4 flex items-center justify-center gap-2">
          ⏳ Match {getStatusLabel().toLowerCase()}
          <span className="text-cyan">ⓘ</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-[#2a2d3e] rounded-xl border border-white/10 overflow-hidden">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('result')}
            className={clsx(
              'px-6 py-3 text-sm font-medium transition-colors',
              activeTab === 'result'
                ? 'text-cyan border-b-2 border-cyan bg-white/5'
                : 'text-gray-400 hover:text-white'
            )}
          >
            Résultat
          </button>
          <button
            onClick={() => setActiveTab('infos')}
            className={clsx(
              'px-6 py-3 text-sm font-medium transition-colors',
              activeTab === 'infos'
                ? 'text-cyan border-b-2 border-cyan bg-white/5'
                : 'text-gray-400 hover:text-white'
            )}
          >
            Infos
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'result' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-6">Match</h3>
              
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_100px_150px] gap-4 text-sm text-gray-400 mb-4 px-2">
                <span>NOM</span>
                <span className="text-center">FORFAIT</span>
                <span className="text-center">SCORE</span>
                <span className="text-center">RÉSULTAT ⓘ</span>
              </div>

              {/* Participant 1 Row */}
              <div className="grid grid-cols-[1fr_80px_100px_150px] gap-4 items-center py-4 border-t border-white/10">
                <span className="text-gray-300 px-2">
                  {match.participant1?.name || 'À déterminer'}
                </span>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={forfeit1}
                    onChange={(e) => {
                      setForfeit1(e.target.checked);
                      if (e.target.checked) {
                        handleResultChange(1, 'loss');
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-600 bg-[#1e2235] accent-cyan"
                  />
                </div>
                <div className="flex justify-center">
                  <input
                    type="number"
                    value={score1}
                    onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                    min={0}
                    disabled={forfeit1}
                    className="w-16 px-2 py-2 text-center bg-[#1e2235] border border-white/20 rounded-lg text-white disabled:opacity-50"
                  />
                </div>
                <div className="flex justify-center gap-1">
                  {['win', 'draw', 'loss'].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleResultChange(1, r)}
                      disabled={forfeit1 && r !== 'loss'}
                      className={clsx(
                        'px-3 py-2 text-sm font-medium rounded-lg border transition-all',
                        result1 === r
                          ? r === 'win' 
                            ? 'bg-green-500/20 border-green-500 text-green-400'
                            : r === 'loss'
                              ? 'bg-red-500/20 border-red-500 text-red-400'
                              : 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                          : 'bg-[#1e2235] border-white/20 text-gray-400 hover:border-white/40',
                        forfeit1 && r !== 'loss' && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {r === 'win' ? 'V' : r === 'draw' ? 'N' : 'D'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Participant 2 Row */}
              <div className="grid grid-cols-[1fr_80px_100px_150px] gap-4 items-center py-4 border-t border-white/10">
                <span className="text-gray-300 px-2">
                  {match.participant2?.name || 'À déterminer'}
                </span>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={forfeit2}
                    onChange={(e) => {
                      setForfeit2(e.target.checked);
                      if (e.target.checked) {
                        handleResultChange(2, 'loss');
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-600 bg-[#1e2235] accent-cyan"
                  />
                </div>
                <div className="flex justify-center">
                  <input
                    type="number"
                    value={score2}
                    onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                    min={0}
                    disabled={forfeit2}
                    className="w-16 px-2 py-2 text-center bg-[#1e2235] border border-white/20 rounded-lg text-white disabled:opacity-50"
                  />
                </div>
                <div className="flex justify-center gap-1">
                  {['win', 'draw', 'loss'].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleResultChange(2, r)}
                      disabled={forfeit2 && r !== 'loss'}
                      className={clsx(
                        'px-3 py-2 text-sm font-medium rounded-lg border transition-all',
                        result2 === r
                          ? r === 'win' 
                            ? 'bg-green-500/20 border-green-500 text-green-400'
                            : r === 'loss'
                              ? 'bg-red-500/20 border-red-500 text-red-400'
                              : 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                          : 'bg-[#1e2235] border-white/20 text-gray-400 hover:border-white/40',
                        forfeit2 && r !== 'loss' && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {r === 'win' ? 'V' : r === 'draw' ? 'N' : 'D'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'infos' && (
            <div className="space-y-6">
              {/* Date prévue */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Date prévue <span className="text-gray-500">(fuseau horaire : Europe/Paris)</span>
                </label>
                <div className="flex gap-4">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    placeholder="Ex: 20/01/2026"
                    className="flex-1 px-4 py-3 bg-[#1e2235] border border-white/10 rounded-lg text-white placeholder-gray-500"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    placeholder="Ex: 19:23"
                    className="w-32 px-4 py-3 bg-[#1e2235] border border-white/10 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Notes participants */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Notes participants ⓘ <span className="text-gray-500">(optionnel)</span>
                </label>
                <textarea
                  value={participantNotes}
                  onChange={(e) => setParticipantNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1e2235] border border-white/10 rounded-lg text-white resize-none"
                />
              </div>

              {/* Notes publiques */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Notes publiques ⓘ <span className="text-gray-500">(optionnel)</span>
                </label>
                <textarea
                  value={publicNotes}
                  onChange={(e) => setPublicNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1e2235] border border-white/10 rounded-lg text-white resize-none"
                />
              </div>

              {/* Notes admin */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Notes d'admin ⓘ <span className="text-gray-500">(optionnel)</span>
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1e2235] border border-white/10 rounded-lg text-white resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-center gap-4 p-6 border-t border-white/10">
          <button
            onClick={() => navigate(`/organizer/tournament/${tournamentId}/matches`)}
            className="px-6 py-2.5 bg-[#1e2235] text-gray-300 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            ← Retour
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-6 py-2.5 bg-cyan text-white rounded-lg hover:bg-cyan/80 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? '⏳' : '✏️'} Mettre à jour + Retour
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-6 py-2.5 bg-cyan text-white rounded-lg hover:bg-cyan/80 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? '⏳' : '✏️'} Mettre à jour
          </button>
        </div>
      </div>
    </div>
  );
}
