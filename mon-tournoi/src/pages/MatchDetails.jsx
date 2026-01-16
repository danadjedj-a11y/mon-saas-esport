import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from '../utils/toast';
import DashboardLayout from '../layouts/DashboardLayout';
import { Card, Badge, Button } from '../shared/components/ui';

// Composant pour embed Twitch
const TwitchEmbed = ({ channel }) => {
  if (!channel) return null;
  
  // Extraire le nom de la chaîne de l'URL si c'est une URL complète
  const channelName = channel.includes('twitch.tv/') 
    ? channel.split('twitch.tv/')[1]?.split(/[?/]/)[0]
    : channel;

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden">
      <iframe
        src={`https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname}`}
        height="100%"
        width="100%"
        allowFullScreen
        className="rounded-lg"
      />
    </div>
  );
};

// Composant pour embed YouTube
const YouTubeEmbed = ({ url }) => {
  if (!url) return null;
  
  // Extraire l'ID de la vidéo YouTube
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1]?.split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('youtube.com/live/')) {
    videoId = url.split('live/')[1]?.split('?')[0];
  }

  if (!videoId) return null;

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        height="100%"
        width="100%"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        className="rounded-lg"
      />
    </div>
  );
};

// Composant pour afficher les tweets liés au match
const TwitterFeed = ({ hashtag, teamNames }) => {
  const searchQuery = hashtag || (teamNames ? teamNames.join(' OR ') : null);
  
  if (!searchQuery) return null;

  return (
    <div className="bg-black/30 rounded-lg p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">𝕏</span>
        <h4 className="font-display text-lg text-fluky-text">Réactions sur X</h4>
      </div>
      <p className="text-fluky-text/70 text-sm mb-4 font-body">
        Suivez les réactions en temps réel avec #{hashtag || 'le hashtag du match'}
      </p>
      <a
        href={`https://twitter.com/search?q=${encodeURIComponent(searchQuery)}&f=live`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 text-[#1DA1F2] rounded-lg transition-colors font-body"
      >
        <span>Voir sur X</span>
        <span>→</span>
      </a>
    </div>
  );
};

export default function MatchDetails({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null);

  useEffect(() => {
    if (id) {
      fetchMatchDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchMatchDetails = async () => {
    try {
      setLoading(true);

      // Fetch match data
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();

      if (matchError) throw matchError;

      // Fetch teams separately to avoid FK relationship issues
      let team1Data = null;
      let team2Data = null;
      
      if (matchData.player1_id || matchData.player2_id) {
        const teamIds = [matchData.player1_id, matchData.player2_id].filter(Boolean);
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, tag, logo_url, captain_id')
          .in('id', teamIds);
        
        if (teamsData) {
          team1Data = teamsData.find(t => t.id === matchData.player1_id) || null;
          team2Data = teamsData.find(t => t.id === matchData.player2_id) || null;
        }
      }

      setMatch({
        ...matchData,
        team1: team1Data,
        team2: team2Data
      });

      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', matchData.tournament_id)
        .single();

      if (tournamentError) throw tournamentError;

      setTournament(tournamentData);
    } catch (error) {
      console.error('Error fetching match details:', error);
      toast.error('Erreur lors du chargement du match');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: '⏳ En attente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      ongoing: { text: '🔴 En cours', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      completed: { text: '✅ Terminé', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={`${config.color} border px-3 py-1 font-body`}>
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout session={session}>
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 rounded-lg p-12 text-center">
            <div className="animate-spin text-6xl mb-4">⏳</div>
            <p className="text-fluky-text font-body">Chargement du match...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!match) {
    return (
      <DashboardLayout session={session}>
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 rounded-lg p-12 text-center">
            <p className="text-xl text-fluky-text mb-4 font-body">❌ Match introuvable</p>
            <Button onClick={() => navigate(-1)}>
              Retour
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { team1, team2 } = match;
  const winner = match.status === 'completed' 
    ? (match.score_p1 > match.score_p2 ? team1 : match.score_p2 > match.score_p1 ? team2 : null)
    : null;

  return (
    <DashboardLayout session={session}>
      <div className="max-w-6xl mx-auto p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-fluky-secondary hover:text-fluky-primary transition-colors flex items-center gap-2 font-body"
        >
          ← Retour
        </button>

        {/* Tournament Header */}
        {tournament && (
          <div className="mb-6 text-center">
            <h2 className="text-sm text-fluky-text/70 font-body mb-1">Tournoi</h2>
            <h1 
              className="font-display text-3xl text-fluky-text cursor-pointer hover:text-fluky-secondary transition-colors"
              onClick={() => navigate(`/tournament/${tournament.id}`)}
            >
              {tournament.name}
            </h1>
            <p className="text-fluky-text/70 text-sm font-body mt-1">{tournament.game}</p>
          </div>
        )}

        {/* Match Card */}
        <Card className="bg-[#030913]/60 backdrop-blur-md border border-white/5 mb-6">
          {/* Header with Status */}
          <div className="bg-gradient-to-r from-fluky-primary/20 to-fluky-secondary/20 p-6 border-b border-white/5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl text-fluky-text mb-2">
                  Match #{match.match_number}
                </h2>
                <p className="text-sm text-fluky-text/70 font-body">
                  Round {match.round_number}
                  {match.bracket_type && (
                    <span className="ml-2">
                      • {match.bracket_type === 'winners' ? '🏆 Winners' : '🎯 Losers'} Bracket
                    </span>
                  )}
                </p>
              </div>
              {getStatusBadge(match.status)}
            </div>
          </div>

          {/* Teams & Score */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Team 1 */}
              <div className={`text-center p-6 rounded-lg transition-all ${
                winner?.id === team1?.id 
                  ? 'bg-green-500/20 border-2 border-green-500/50 scale-105' 
                  : 'bg-white/5 border border-white/10'
              }`}>
                {team1 ? (
                  <>
                    <img
                      src={team1.logo_url || `https://ui-avatars.com/api/?name=${team1.tag || 'T'}&background=random&size=128`}
                      alt={team1.name}
                      className="w-24 h-24 mx-auto mb-4 rounded-full"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${team1.tag || 'T'}&background=random&size=128`;
                      }}
                    />
                    <h3 className="font-display text-xl text-fluky-text mb-1">{team1.name}</h3>
                    <p className="text-fluky-text/70 text-sm font-body">{team1.tag}</p>
                    {winner?.id === team1.id && (
                      <div className="mt-3">
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 font-body">
                          🏆 Vainqueur
                        </Badge>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-fluky-text/50 font-body">En attente</p>
                )}
              </div>

              {/* Score */}
              <div className="text-center">
                <div className="text-6xl font-display text-fluky-text mb-4">
                  <span className={winner?.id === team1?.id ? 'text-green-400' : ''}>
                    {match.score_p1 || 0}
                  </span>
                  <span className="text-fluky-text/30 mx-4">-</span>
                  <span className={winner?.id === team2?.id ? 'text-green-400' : ''}>
                    {match.score_p2 || 0}
                  </span>
                </div>
                {match.scheduled_at && (
                  <p className="text-sm text-fluky-text/70 font-body">
                    📅 {new Date(match.scheduled_at).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>

              {/* Team 2 */}
              <div className={`text-center p-6 rounded-lg transition-all ${
                winner?.id === team2?.id 
                  ? 'bg-green-500/20 border-2 border-green-500/50 scale-105' 
                  : 'bg-white/5 border border-white/10'
              }`}>
                {team2 ? (
                  <>
                    <img
                      src={team2.logo_url || `https://ui-avatars.com/api/?name=${team2.tag || 'T'}&background=random&size=128`}
                      alt={team2.name}
                      className="w-24 h-24 mx-auto mb-4 rounded-full"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${team2.tag || 'T'}&background=random&size=128`;
                      }}
                    />
                    <h3 className="font-display text-xl text-fluky-text mb-1">{team2.name}</h3>
                    <p className="text-fluky-text/70 text-sm font-body">{team2.tag}</p>
                    {winner?.id === team2.id && (
                      <div className="mt-3">
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 font-body">
                          🏆 Vainqueur
                        </Badge>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-fluky-text/50 font-body">En attente</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Match Information */}
          <Card className="bg-[#030913]/60 backdrop-blur-md border border-white/5 p-6">
            <h3 className="font-display text-xl text-fluky-text mb-4">📋 Informations</h3>
            <div className="space-y-3 font-body">
              <div className="flex justify-between">
                <span className="text-fluky-text/70">Statut:</span>
                <span className="text-fluky-text">{getStatusBadge(match.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fluky-text/70">Round:</span>
                <span className="text-fluky-text">#{match.round_number}</span>
              </div>
              {match.bracket_type && (
                <div className="flex justify-between">
                  <span className="text-fluky-text/70">Bracket:</span>
                  <span className="text-fluky-text">
                    {match.bracket_type === 'winners' ? '🏆 Winners' : '🎯 Losers'}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-fluky-text/70">Match ID:</span>
                <span className="text-fluky-text/50 text-xs">{match.id}</span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="bg-[#030913]/60 backdrop-blur-md border border-white/5 p-6">
            <h3 className="font-display text-xl text-fluky-text mb-4">⚡ Actions</h3>
            <div className="space-y-3">
              <Button
                onClick={() => navigate(`/tournament/${tournament?.id}`)}
                className="w-full"
                variant="secondary"
              >
                Voir le tournoi
              </Button>
              {(match.status === 'ongoing' || match.status === 'pending') && session && (
                <Button
                  onClick={() => navigate(`/match/${match.id}/lobby`)}
                  className="w-full"
                >
                  Accéder au lobby du match
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Stream Section */}
        {tournament?.stream_urls && (tournament.stream_urls.twitch || tournament.stream_urls.youtube) && (
          <Card className="bg-[#030913]/60 backdrop-blur-md border border-white/5 p-6 mb-6">
            <h3 className="font-display text-xl text-fluky-text mb-4">📺 Stream en Direct</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {tournament.stream_urls.twitch && (
                <div>
                  <p className="text-sm text-fluky-text/70 mb-2 font-body flex items-center gap-2">
                    <span className="text-purple-400">●</span> Twitch
                  </p>
                  <TwitchEmbed channel={tournament.stream_urls.twitch} />
                </div>
              )}
              {tournament.stream_urls.youtube && (
                <div>
                  <p className="text-sm text-fluky-text/70 mb-2 font-body flex items-center gap-2">
                    <span className="text-red-500">●</span> YouTube
                  </p>
                  <YouTubeEmbed url={tournament.stream_urls.youtube} />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Social Media / Tweets Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <TwitterFeed 
            hashtag={tournament?.name?.replace(/\s+/g, '') || null}
            teamNames={[team1?.name, team2?.name].filter(Boolean)}
          />
          
          {/* Temps forts / Clips */}
          <Card className="bg-[#030913]/60 backdrop-blur-md border border-white/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎬</span>
              <h4 className="font-display text-lg text-fluky-text">Temps Forts</h4>
            </div>
            <p className="text-fluky-text/70 text-sm font-body">
              Les clips et moments marquants du match apparaîtront ici.
            </p>
            {tournament?.name && (
              <a
                href={`https://clips.twitch.tv/search?query=${encodeURIComponent(tournament.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors font-body"
              >
                <span>Voir les clips Twitch</span>
                <span>→</span>
              </a>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
