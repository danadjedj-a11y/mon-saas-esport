import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

/**
 * EmbedCalendar - Widget embed pour le calendrier des matchs
 */
export default function EmbedCalendar() {
  const { id: tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tournamentRes, matchesRes, participantsRes] = await Promise.all([
          supabase.from('tournaments').select('name').eq('id', tournamentId).single(),
          supabase
            .from('matches')
            .select('*')
            .eq('tournament_id', tournamentId)
            .order('scheduled_time', { ascending: true }),
          supabase.from('participants').select('id, name, team_name').eq('tournament_id', tournamentId),
        ]);

        setTournament(tournamentRes.data);
        setMatches(matchesRes.data || []);
        setParticipants(participantsRes.data || []);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tournamentId]);

  const getParticipantName = (id) => {
    if (!id) return 'TBD';
    const p = participants.find(p => p.id === id);
    return p?.team_name || p?.name || 'TBD';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date à définir';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'border-l-blue-500';
      case 'ongoing': case 'in_progress': return 'border-l-green-500';
      default: return 'border-l-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Grouper par date
  const groupedMatches = matches.reduce((acc, match) => {
    const date = match.scheduled_time 
      ? new Date(match.scheduled_time).toLocaleDateString('fr-FR')
      : 'Non planifié';
    if (!acc[date]) acc[date] = [];
    acc[date].push(match);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0d1117] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
        <span className="text-2xl">📅</span>
        <div>
          <h1 className="text-lg font-bold text-white">Calendrier</h1>
          <p className="text-xs text-gray-500">{tournament?.name}</p>
        </div>
      </div>

      {/* Matches List */}
      {matches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun match programmé</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMatches).map(([date, dateMatches]) => (
            <div key={date}>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">{date}</h3>
              <div className="space-y-2">
                {dateMatches.map((match) => (
                  <div
                    key={match.id}
                    className={`bg-[#161b22] rounded-lg border-l-2 ${getStatusColor(match.status)} p-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-white">{getParticipantName(match.player1_id)}</span>
                          <span className="text-gray-600">vs</span>
                          <span className="text-white">{getParticipantName(match.player2_id)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(match.scheduled_time)}
                        </p>
                      </div>
                      {match.status === 'completed' && (
                        <div className="text-sm font-mono text-gray-400">
                          {match.score_p1} - {match.score_p2}
                        </div>
                      )}
                      {(match.status === 'ongoing' || match.status === 'in_progress') && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Powered by */}
      <p className="text-center text-xs text-gray-600 mt-6">
        Powered by Mon-Tournoi
      </p>
    </div>
  );
}
