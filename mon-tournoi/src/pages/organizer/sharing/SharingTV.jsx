import { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import clsx from 'clsx';

/**
 * SharingTV - Mode TV/Spectateur plein écran
 * Affichage optimisé pour diffusion sur écran/stream
 */
export default function SharingTV() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [mode, setMode] = useState('bracket'); // bracket, matches, standings
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [_phases, setPhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotateInterval, setRotateInterval] = useState(10); // seconds

  useEffect(() => {
    fetchData();
    
    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    if (!autoRotate) return;
    
    const modes = ['bracket', 'matches', 'standings'];
    const interval = setInterval(() => {
      setMode(current => {
        const idx = modes.indexOf(current);
        return modes[(idx + 1) % modes.length];
      });
    }, rotateInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRotate, rotateInterval]);

  const fetchData = async () => {
    try {
      const [matchesRes, phasesRes, participantsRes] = await Promise.all([
        supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('round_number', { ascending: true }),
        supabase
          .from('tournament_phases')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('phase_order', { ascending: true }),
        supabase
          .from('participants')
          .select('*, team:team_id(id, name, logo_url)')
          .eq('tournament_id', tournamentId)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: true }),
      ]);

      // Enrichir les matchs avec les noms des équipes
      const teamIds = [...new Set(
        (matchesRes.data || []).flatMap(m => [m.player1_id, m.player2_id]).filter(Boolean)
      )];
      
      let teamsMap = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, logo_url')
          .in('id', teamIds);
        teamsMap = Object.fromEntries((teamsData || []).map(t => [t.id, t]));
      }

      const enrichedMatches = (matchesRes.data || []).map(match => ({
        ...match,
        team1: teamsMap[match.player1_id] || null,
        team2: teamsMap[match.player2_id] || null,
      }));

      setMatches(enrichedMatches);
      setPhases(phasesRes.data || []);
      if (phasesRes.data?.length > 0 && !selectedPhase) {
        setSelectedPhase(phasesRes.data[0].id);
      }

      // Calculer standings basiques
      const standingsData = (participantsRes.data || []).map((p, i) => ({
        rank: i + 1,
        name: p.team?.name || p.name || 'TBD',
        logo: p.team?.logo_url,
        wins: 0,
        losses: 0,
      }));
      setStandings(standingsData);

    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const openTVWindow = () => {
    const url = `/embed/tournament/${tournamentId}/bracket?header=false`;
    window.open(url, 'MonTournoiTV', 'width=1920,height=1080,menubar=no,toolbar=no');
  };

  const liveMatches = matches.filter(m => m.status === 'in_progress');
  const upcomingMatches = matches.filter(m => m.status === 'pending' || m.status === 'scheduled').slice(0, 6);
  const completedMatches = matches.filter(m => m.status === 'completed').slice(-6);

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
          <h1 className="text-2xl font-display font-bold text-white">Mon-Tournoi TV</h1>
          <p className="text-text-secondary mt-1">
            Mode spectateur pour diffusion
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openTVWindow}
            className="px-4 py-2 bg-gradient-to-r from-violet to-cyan rounded-lg font-medium text-white hover:shadow-glow transition-all"
          >
            📺 Ouvrir en fenêtre TV
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            {isFullscreen ? '⬜ Quitter' : '⬛ Plein écran'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1e2235] rounded-xl p-4 border border-white/10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {['bracket', 'matches', 'standings'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  mode === m
                    ? 'bg-violet text-white'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10'
                )}
              >
                {m === 'bracket' && '🏆 Bracket'}
                {m === 'matches' && '⚔️ Matchs'}
                {m === 'standings' && '📊 Classement'}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-white/10" />

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet focus:ring-violet"
            />
            Rotation auto
          </label>

          {autoRotate && (
            <select
              value={rotateInterval}
              onChange={(e) => setRotateInterval(Number(e.target.value))}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded text-sm text-white"
            >
              <option value="5">5 sec</option>
              <option value="10">10 sec</option>
              <option value="15">15 sec</option>
              <option value="30">30 sec</option>
            </select>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live - Rafraîchi toutes les 30s
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="bg-black rounded-2xl aspect-video overflow-hidden border border-white/10 relative">
        {/* Live indicator */}
        {liveMatches.length > 0 && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full text-white text-sm font-medium z-10">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {liveMatches.length} match{liveMatches.length > 1 ? 's' : ''} en cours
          </div>
        )}

        {/* Tournament branding */}
        <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
          {tournament?.logo_url && (
            <img src={tournament.logo_url} alt="" className="w-10 h-10 rounded-lg" />
          )}
          <span className="text-white font-display font-bold text-lg drop-shadow-lg">
            {tournament?.name}
          </span>
        </div>

        {/* Content based on mode */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          {mode === 'bracket' && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-white text-2xl font-display">Bracket View</p>
                <p className="text-text-secondary mt-2">
                  Utilisez le composant BracketEditor en mode TV pour un affichage complet
                </p>
              </div>
            </div>
          )}

          {mode === 'matches' && (
            <div className="w-full h-full grid grid-cols-3 gap-6 p-4">
              {/* Live Matches */}
              <div className="space-y-4">
                <h3 className="text-lg font-display font-bold text-red-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  En cours
                </h3>
                {liveMatches.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucun match en cours</p>
                ) : (
                  liveMatches.slice(0, 4).map(match => (
                    <MatchCard key={match.id} match={match} live />
                  ))
                )}
              </div>

              {/* Upcoming */}
              <div className="space-y-4">
                <h3 className="text-lg font-display font-bold text-cyan-400">
                  ⏳ À venir
                </h3>
                {upcomingMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>

              {/* Completed */}
              <div className="space-y-4">
                <h3 className="text-lg font-display font-bold text-green-400">
                  ✅ Terminés
                </h3>
                {completedMatches.map(match => (
                  <MatchCard key={match.id} match={match} completed />
                ))}
              </div>
            </div>
          )}

          {mode === 'standings' && (
            <div className="w-full max-w-2xl">
              <h3 className="text-2xl font-display font-bold text-white text-center mb-6">
                📊 Classement
              </h3>
              <div className="bg-white/5 rounded-xl overflow-hidden">
                {standings.slice(0, 8).map((team, i) => (
                  <div 
                    key={i}
                    className={clsx(
                      'flex items-center gap-4 px-6 py-4 border-b border-white/5',
                      i === 0 && 'bg-yellow-500/10',
                      i === 1 && 'bg-gray-400/10',
                      i === 2 && 'bg-amber-600/10'
                    )}
                  >
                    <span className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg',
                      i === 0 && 'bg-yellow-500 text-black',
                      i === 1 && 'bg-gray-400 text-black',
                      i === 2 && 'bg-amber-600 text-black',
                      i > 2 && 'bg-white/10 text-white'
                    )}>
                      {team.rank}
                    </span>
                    {team.logo ? (
                      <img src={team.logo} alt="" className="w-10 h-10 rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-violet/20 flex items-center justify-center">
                        👥
                      </div>
                    )}
                    <span className="flex-1 text-white font-medium text-lg">{team.name}</span>
                    <span className="text-text-secondary">
                      {team.wins}W - {team.losses}L
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embed Code */}
      <div className="bg-[#1e2235] rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-display font-semibold text-white mb-4">
          Intégrer sur OBS/Stream
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-sm text-text-secondary mb-2">URL Browser Source (OBS)</p>
            <code className="block px-3 py-2 bg-black/30 rounded text-cyan-400 text-sm break-all">
              {window.location.origin}/stream/overlay?tournament={tournamentId}
            </code>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-sm text-text-secondary mb-2">Dimensions recommandées</p>
            <p className="text-white">1920 x 1080 (Full HD)</p>
            <p className="text-text-muted text-sm">ou 1280 x 720 pour overlay</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for match cards
function MatchCard({ match, live, completed }) {
  return (
    <div className={clsx(
      'p-3 rounded-lg',
      live && 'bg-red-500/20 border border-red-500/30',
      completed && 'bg-green-500/10 border border-green-500/20',
      !live && !completed && 'bg-white/5 border border-white/10'
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted">
          Round {match.round_number || 1}
        </span>
        {live && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm truncate flex-1">
            {match.team1?.name || 'TBD'}
          </span>
          <span className={clsx(
            'font-mono font-bold',
            completed && match.score_p1 > match.score_p2 ? 'text-green-400' : 'text-text-secondary'
          )}>
            {match.score_p1 ?? '-'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white text-sm truncate flex-1">
            {match.team2?.name || 'TBD'}
          </span>
          <span className={clsx(
            'font-mono font-bold',
            completed && match.score_p2 > match.score_p1 ? 'text-green-400' : 'text-text-secondary'
          )}>
            {match.score_p2 ?? '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
