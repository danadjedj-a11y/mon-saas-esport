import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import clsx from 'clsx';

/**
 * EmbedParticipants - Widget embedable des participants
 * URL: /embed/tournament/:id/participants
 */
export default function EmbedParticipants() {
  const { id: tournamentId } = useParams();
  const [searchParams] = useSearchParams();
  
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = searchParams.get('theme') || 'dark';
  const showHeader = searchParams.get('header') !== 'false';
  const limit = parseInt(searchParams.get('limit')) || 50;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      const [tournamentRes, participantsRes] = await Promise.all([
        supabase
          .from('tournaments')
          .select('id, name, game, logo_url')
          .eq('id', tournamentId)
          .single(),
        supabase
          .from('participants')
          .select('*, team:team_id(id, name, logo_url)')
          .eq('tournament_id', tournamentId)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: true })
          .limit(limit),
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      setTournament(tournamentRes.data);
      setParticipants(participantsRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const bgColor = theme === 'light' ? 'bg-white' : 'bg-[#0d1117]';
  const textColor = theme === 'light' ? 'text-gray-900' : 'text-white';
  const borderColor = theme === 'light' ? 'border-gray-200' : 'border-white/10';
  const cardBg = theme === 'light' ? 'bg-gray-50' : 'bg-white/5';

  if (loading) {
    return (
      <div className={clsx('min-h-screen flex items-center justify-center', bgColor)}>
        <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={clsx('min-h-screen', bgColor, textColor)}>
      {/* Header */}
      {showHeader && (
        <div className={clsx('p-4 border-b', borderColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tournament?.logo_url && (
                <img src={tournament.logo_url} alt="" className="w-10 h-10 rounded-lg" />
              )}
              <div>
                <h1 className="font-bold">{tournament?.name}</h1>
                <p className="text-sm opacity-60">{tournament?.game}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{participants.length}</div>
              <div className="text-xs opacity-60">Participants</div>
            </div>
          </div>
        </div>
      )}

      {/* Participants Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {participants.map((participant, i) => (
            <div
              key={participant.id}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg border',
                borderColor,
                cardBg
              )}
            >
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                i < 3 ? 'bg-gradient-to-br from-violet to-cyan text-white' : 'bg-white/10'
              )}>
                {i + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {participant.team?.logo_url && (
                    <img 
                      src={participant.team.logo_url} 
                      alt="" 
                      className="w-5 h-5 rounded"
                    />
                  )}
                  <span className="font-medium truncate text-sm">
                    {participant.team?.name || participant.name || 'TBD'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {participants.length === 0 && (
          <div className="text-center py-12 opacity-60">
            Aucun participant inscrit
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={clsx('p-2 text-center text-xs opacity-40 border-t', borderColor)}>
        Powered by Mon-Tournoi
      </div>
    </div>
  );
}
