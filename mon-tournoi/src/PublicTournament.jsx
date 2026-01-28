import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { toast } from './utils/toast';
import {
  Trophy, Users, Calendar, Clock, Gamepad2, Share2, Bell,
  ChevronRight, Shield, Play, Swords, FileText, Gift, Crown,
  Medal, CheckCircle2, MapPin, Circle, Star
} from 'lucide-react';
import { GlassCard, GradientButton, NeonBadge } from './shared/components/ui';
import { TournamentRegistration } from './components/registration';
import FollowButton from './components/FollowButton';
import RatingDisplay from './components/RatingDisplay';

const tabs = [
  { id: 'overview', label: 'Aperçu', icon: Trophy },
  { id: 'participants', label: 'Participants', icon: Users },
  { id: 'bracket', label: 'Bracket', icon: Swords },
  { id: 'schedule', label: 'Planning', icon: Calendar },
  { id: 'rules', label: 'Règlement', icon: FileText },
  { id: 'prizes', label: 'Prizes', icon: Gift },
];

const getFormatLabel = (format) => {
  switch (format) {
    case 'elimination': return 'Élimination Directe';
    case 'double_elimination': return 'Double Elimination';
    case 'round_robin': return 'Championnat';
    case 'swiss': return 'Système Suisse';
    default: return format;
  }
};

export default function PublicTournament({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [winnerName, setWinnerName] = useState(null);
  const [organizer, setOrganizer] = useState(null);

  useEffect(() => {
    loadTournamentData();
  }, [id]);

  const loadTournamentData = async () => {
    try {
      setLoading(true);

      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);
      setOrganizer(tournamentData.profiles);

      const { data: participantsData } = await supabase
        .from('participants')
        .select('*, teams(*)')
        .eq('tournament_id', id)
        .order('seed', { ascending: true });

      setParticipants(participantsData || []);

      const { data: matchesData } = await supabase
        .from('matches')
        .select('*, player1:teams!matches_player1_id_fkey(*), player2:teams!matches_player2_id_fkey(*)')
        .eq('tournament_id', id)
        .order('round', { ascending: true });

      setMatches(matchesData || []);

      if (tournamentData.winner_id) {
        const winner = participantsData?.find(p => p.team_id === tournamentData.winner_id);
        if (winner?.teams) {
          setWinnerName(winner.teams.name);
        }
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
      toast.error('Erreur lors du chargement du tournoi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05050A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="text-gray-400">Chargement du tournoi...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#05050A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Tournoi introuvable</h1>
          <GradientButton onClick={() => navigate('/')}>Retour à l'accueil</GradientButton>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (tournament.status) {
      case 'draft': return <NeonBadge variant="draft">INSCRIPTIONS OUVERTES</NeonBadge>;
      case 'completed': return <NeonBadge variant="pink">TERMINÉ</NeonBadge>;
      default: return <NeonBadge variant="live">EN COURS</NeonBadge>;
    }
  };

  const completedMatches = matches.filter(m => m.status === 'completed');
  const checkedInCount = participants.filter(p => p.checked_in).length;

  return (
    <div className="min-h-screen bg-[#05050A] text-[#F8FAFC]">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#05050A]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/Logo.png" alt="Fluky Boys" className="h-10 w-auto" />
          </button>
          <div className="flex items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-[#94A3B8] transition-colors hover:border-[#00F5FF]/50 hover:text-[#00F5FF]">
              <Share2 className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-[#94A3B8] transition-colors hover:border-[#00F5FF]/50 hover:text-[#00F5FF]">
              <Bell className="h-5 w-5" />
            </button>
            {tournament.status === 'draft' && (
              <GradientButton variant="primary" size="sm">
                S'inscrire
              </GradientButton>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <div className="relative h-72 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-pink-900/50" />
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-purple-500/20 blur-[100px]" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-[100px]" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                {getStatusBadge()}
                <span className="flex items-center gap-1 text-sm text-[#94A3B8]">
                  <Gamepad2 className="h-4 w-4" />
                  {tournament.game}
                </span>
              </div>
              <h1 className="mb-2 text-4xl font-bold md:text-5xl">
                <span className="bg-gradient-to-r from-[#F8FAFC] via-[#00F5FF] to-[#A855F7] bg-clip-text text-transparent">
                  {tournament.name}
                </span>
              </h1>
              {tournament.description && (
                <p className="max-w-xl text-[#94A3B8]">{tournament.description}</p>
              )}
            </div>

            {tournament.prize_pool && (
              <div className="hidden md:block">
                <GlassCard className="px-6 py-4 text-center">
                  <p className="mb-1 text-xs uppercase tracking-wider text-[#94A3B8]">Prize Pool</p>
                  <p className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-3xl font-bold text-transparent">
                    {tournament.prize_pool} EUR
                  </p>
                </GlassCard>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="border-b border-white/10 bg-[#0D0D14]">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Calendar className="h-4 w-4 text-[#00F5FF]" />
              <span>{new Date(tournament.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <MapPin className="h-4 w-4 text-[#00F5FF]" />
              <span>En ligne - EU West</span>
            </div>
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Users className="h-4 w-4 text-[#00F5FF]" />
              <span>{participants.length}{tournament.max_participants ? ` / ${tournament.max_participants}` : ''} équipes</span>
            </div>
            {tournament.check_in_enabled && (
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <Clock className="h-4 w-4 text-[#00F5FF]" />
                <span>Check-in: {tournament.check_in_time || '14h45'}</span>
              </div>
            )}
            {tournament.prize_pool && (
              <div className="ml-auto md:hidden">
                <GlassCard className="px-4 py-2">
                  <p className="text-xs text-[#94A3B8]">Prize Pool</p>
                  <p className="font-bold text-yellow-400">{tournament.prize_pool} EUR</p>
                </GlassCard>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-16 z-40 border-b border-white/10 bg-[#05050A]/95 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex gap-1 overflow-x-auto py-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-[#00F5FF]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00F5FF] to-[#A855F7]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            tournament={tournament}
            participants={participants}
            matches={matches}
            session={session}
            onRefetch={loadTournamentData}
            winnerName={winnerName}
            organizer={organizer}
          />
        )}

        {activeTab === 'participants' && (
          <ParticipantsTab participants={participants} checkedInCount={checkedInCount} />
        )}

        {activeTab === 'bracket' && (
          <BracketTab matches={matches} participants={participants} />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab matches={matches} participants={participants} />
        )}

        {activeTab === 'rules' && (
          <RulesTab tournament={tournament} />
        )}

        {activeTab === 'prizes' && (
          <PrizesTab tournament={tournament} />
        )}
      </div>

      {/* Footer CTA */}
      {tournament.status === 'draft' && (
        <div className="border-t border-white/10 bg-[#0D0D14]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
            <div>
              <p className="font-bold">Prêt à participer ?</p>
              <p className="text-sm text-[#94A3B8]">
                {tournament.registration_deadline
                  ? `Inscriptions ouvertes jusqu'au ${new Date(tournament.registration_deadline).toLocaleDateString('fr-FR')}`
                  : 'Inscriptions ouvertes'}
              </p>
            </div>
            <GradientButton variant="primary">
              S'inscrire au tournoi
            </GradientButton>
          </div>
        </div>
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ tournament, participants, matches, session, onRefetch, winnerName, organizer }) {
  const completedMatches = matches.filter(m => m.status === 'completed');
  const upcomingMatch = matches.find(m => m.status === 'pending');

  const prizes = [
    { place: 1, reward: tournament.prize_pool ? `${(tournament.prize_pool * 0.5).toFixed(0)} EUR` : '5,000 EUR', icon: Crown, color: 'text-yellow-400' },
    { place: 2, reward: tournament.prize_pool ? `${(tournament.prize_pool * 0.3).toFixed(0)} EUR` : '2,500 EUR', icon: Medal, color: 'text-gray-300' },
    { place: 3, reward: tournament.prize_pool ? `${(tournament.prize_pool * 0.2).toFixed(0)} EUR` : '1,000 EUR', icon: Medal, color: 'text-amber-600' },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main Column */}
      <div className="space-y-8 lg:col-span-2">
        {/* Winner Banner */}
        {winnerName && (
          <div className="relative overflow-hidden rounded-2xl group">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 animate-gradient-xy" />
            <div className="relative m-[2px] bg-[#05050A] rounded-2xl p-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-pink-500/10" />
              <div className="relative z-10 text-center space-y-4">
                <div className="inline-flex items-center gap-3 text-yellow-400 font-black tracking-wider uppercase text-sm">
                  <Crown className="w-6 h-6" />
                  <span>Champion du Tournoi</span>
                  <Crown className="w-6 h-6" />
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-orange-200 to-pink-200">
                  {winnerName}
                </h2>
              </div>
            </div>
          </div>
        )}

        {/* Next Match */}
        {upcomingMatch && (
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Play className="h-5 w-5 text-[#FF3E9D]" />
                Prochain Match
              </h3>
              <NeonBadge variant="upcoming">FINALE</NeonBadge>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#05050A] p-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                  <Shield className="h-8 w-8 text-indigo-400" />
                </div>
                <span className="font-bold">{upcomingMatch.player1?.name || 'Team Vitality'}</span>
                <span className="text-xs text-[#94A3B8]">Seed #1</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-[#94A3B8]">
                  {upcomingMatch.scheduled_time
                    ? new Date(upcomingMatch.scheduled_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                    : 'Dimanche 22 Fev'}
                </span>
                <span className="text-2xl font-bold text-[#94A3B8]">VS</span>
                <span className="text-sm text-[#00F5FF]">
                  {upcomingMatch.scheduled_time
                    ? new Date(upcomingMatch.scheduled_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : '18:00 CET'}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-red-500/20">
                  <Shield className="h-8 w-8 text-pink-400" />
                </div>
                <span className="font-bold">{upcomingMatch.player2?.name || 'G2 Esports'}</span>
                <span className="text-xs text-[#94A3B8]">Seed #2</span>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <GradientButton variant="primary" size="sm" className="flex-1">
                <Play className="mr-2 h-4 w-4" />
                Regarder le Stream
              </GradientButton>
              <button className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:border-[#00F5FF]/50 hover:text-[#00F5FF]">
                <Bell className="h-4 w-4" />
                Rappel
              </button>
            </div>
          </GlassCard>
        )}

        {/* Recent Results */}
        {completedMatches.length > 0 && (
          <GlassCard>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Swords className="h-5 w-5 text-[#A855F7]" />
              Résultats Récents
            </h3>
            <div className="space-y-3">
              {completedMatches.slice(0, 5).map((match) => (
                <div key={match.id} className="flex items-center justify-between rounded-lg bg-[#05050A] p-4">
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${match.score_p1 > match.score_p2 ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'}`}>
                      {match.player1?.name || 'Team Vitality'}
                    </span>
                    {match.score_p1 > match.score_p2 && (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-[#1a1a24] px-3 py-1">
                    <span className={match.score_p1 > match.score_p2 ? 'font-bold text-[#00F5FF]' : 'text-[#94A3B8]'}>
                      {match.score_p1}
                    </span>
                    <span className="text-[#94A3B8]">-</span>
                    <span className={match.score_p2 > match.score_p1 ? 'font-bold text-[#00F5FF]' : 'text-[#94A3B8]'}>
                      {match.score_p2}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {match.score_p2 > match.score_p1 && (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    )}
                    <span className={`font-medium ${match.score_p2 > match.score_p1 ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'}`}>
                      {match.player2?.name || 'Cloud9'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-[#94A3B8] transition-colors hover:text-[#00F5FF]">
              Voir tous les matchs
              <ChevronRight className="h-4 w-4" />
            </button>
          </GlassCard>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Prizes Summary */}
        <GlassCard>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Gift className="h-5 w-5 text-yellow-400" />
            Récompenses
          </h3>
          <div className="space-y-3">
            {prizes.map((prize) => (
              <div key={prize.place} className="flex items-center gap-3 rounded-lg bg-[#05050A] p-3">
                <prize.icon className={`h-5 w-5 ${prize.color}`} />
                <span className="text-[#94A3B8]">#{prize.place}</span>
                <span className="ml-auto font-bold">{prize.reward}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Top Participants */}
        <GlassCard>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Users className="h-5 w-5 text-[#00F5FF]" />
            Top Participants
          </h3>
          <div className="space-y-2">
            {participants.slice(0, 5).map((team, index) => (
              <div key={team.id} className="flex items-center gap-3 rounded-lg bg-[#05050A] p-3">
                <span className="w-6 text-center text-sm font-bold text-[#94A3B8]">{index + 1}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                  {team.teams?.logo_url ? (
                    <img src={team.teams.logo_url} alt="" className="h-6 w-6 rounded" />
                  ) : (
                    <Shield className="h-4 w-4 text-indigo-400" />
                  )}
                </div>
                <span className="flex-1 font-medium">{team.teams?.name || 'Équipe'}</span>
                <span className="text-xs text-[#94A3B8]">FR</span>
              </div>
            ))}
          </div>
          {participants.length > 5 && (
            <button className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-[#94A3B8] hover:text-[#00F5FF]">
              Voir tous les participants
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </GlassCard>

        {/* Organizer */}
        {organizer && (
          <GlassCard>
            <h3 className="mb-4 text-lg font-bold">Organisateur</h3>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
                {organizer.avatar_url ? (
                  <img src={organizer.avatar_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <img src="/Logo.png" alt="Fluky Boys" className="h-12 w-12 object-contain" />
                )}
              </div>
              <div>
                <p className="font-bold">{organizer.username || 'Fluky Boys'}</p>
                <p className="text-sm text-[#94A3B8]">Organisateur vérifié</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:border-[#00F5FF]/50 hover:text-[#00F5FF]">
                Discord
              </button>
              <button className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:border-[#00F5FF]/50 hover:text-[#00F5FF]">
                Twitter
              </button>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

// Participants Tab
function ParticipantsTab({ participants, checkedInCount }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Participants ({participants.length})</h2>
        <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            Check-in: {checkedInCount}/{participants.length}
          </span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {participants.map((team) => (
          <GlassCard key={team.id} className="group cursor-pointer transition-transform hover:scale-[1.02]">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                  {team.teams?.logo_url ? (
                    <img src={team.teams.logo_url} alt="" className="h-12 w-12 rounded-lg" />
                  ) : (
                    <Shield className="h-7 w-7 text-indigo-400" />
                  )}
                </div>
                {team.checked_in && (
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold">{team.teams?.name || 'Équipe'}</p>
                <p className="text-sm text-[#94A3B8]">Seed #{team.seed || '-'}</p>
              </div>
              <span className="text-lg">🇫🇷</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// Bracket Tab
function BracketTab({ matches }) {
  const groupedMatches = matches.reduce((acc, match) => {
    const round = match.round || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  const rounds = Object.keys(groupedMatches).sort((a, b) => a - b);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Bracket</h2>
      {rounds.length > 0 ? (
        <div className="flex gap-12 overflow-x-auto pb-4">
          {rounds.map((round) => (
            <div key={round} className="min-w-[320px]">
              <h3 className="mb-4 text-center text-sm font-medium text-[#94A3B8]">
                Round {round}
              </h3>
              <div className="flex flex-col justify-center gap-4">
                {groupedMatches[round].map((match) => (
                  <GlassCard key={match.id}>
                    <div className="space-y-2">
                      <div className={`flex items-center justify-between rounded-lg p-3 ${match.score_p1 > match.score_p2 ? 'bg-green-500/10' : 'bg-[#05050A]'
                        }`}>
                        <span className={match.score_p1 > match.score_p2 ? 'font-bold' : 'text-[#94A3B8]'}>
                          {match.player1?.name || 'Team Vitality'}
                        </span>
                        <span className={match.score_p1 > match.score_p2 ? 'font-bold text-[#00F5FF]' : 'text-[#94A3B8]'}>
                          {match.score_p1 || 0}
                        </span>
                      </div>
                      <div className={`flex items-center justify-between rounded-lg p-3 ${match.score_p2 > match.score_p1 ? 'bg-green-500/10' : 'bg-[#05050A]'
                        }`}>
                        <span className={match.score_p2 > match.score_p1 ? 'font-bold' : 'text-[#94A3B8]'}>
                          {match.player2?.name || 'Cloud9'}
                        </span>
                        <span className={match.score_p2 > match.score_p1 ? 'font-bold text-[#00F5FF]' : 'text-[#94A3B8]'}>
                          {match.score_p2 || 0}
                        </span>
                      </div>
                    </div>
                    {match.status === 'pending' && (
                      <div className="mt-3 text-center">
                        <NeonBadge variant="upcoming">À VENIR</NeonBadge>
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-[#94A3B8] py-12">
          <Swords className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Le bracket sera affiché ici une fois les matchs générés</p>
        </div>
      )}
    </div>
  );
}

// Schedule Tab
function ScheduleTab({ matches }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Planning</h2>
      {matches.length > 0 ? (
        <div className="space-y-4">
          {matches.map((match) => (
            <GlassCard key={match.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Clock className="h-5 w-5 text-[#00F5FF]" />
                  <div>
                    <p className="font-bold">Match #{match.round}</p>
                    <p className="text-sm text-[#94A3B8]">
                      {match.scheduled_time
                        ? new Date(match.scheduled_time).toLocaleString('fr-FR')
                        : 'À planifier'}
                    </p>
                  </div>
                </div>
                <NeonBadge variant={match.status === 'completed' ? 'pink' : match.status === 'in_progress' ? 'live' : 'upcoming'}>
                  {match.status === 'completed' ? 'Terminé' : match.status === 'in_progress' ? 'En cours' : 'À venir'}
                </NeonBadge>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="text-center text-[#94A3B8] py-12">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Aucun match planifié pour le moment</p>
        </div>
      )}
    </div>
  );
}

// Rules Tab
function RulesTab({ tournament }) {
  const defaultRules = [
    { title: 'Format', content: `${getFormatLabel(tournament.format)}, Best of ${tournament.best_of || 3}` },
    { title: 'Check-in', content: '15 minutes avant le début du match' },
    { title: 'Retard', content: '10 minutes de tolérance, puis forfait' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Règlement du Tournoi</h2>
      <GlassCard>
        <div className="divide-y divide-white/10">
          {defaultRules.map((rule) => (
            <div key={rule.title} className="py-4 first:pt-0 last:pb-0">
              <h3 className="mb-2 font-bold text-[#00F5FF]">{rule.title}</h3>
              <p className="text-[#94A3B8]">{rule.content}</p>
            </div>
          ))}
        </div>
      </GlassCard>
      {tournament.rules && (
        <GlassCard>
          <h3 className="mb-4 font-bold">Règles Générales</h3>
          <div className="prose prose-invert max-w-none">
            <p className="text-[#94A3B8] whitespace-pre-wrap">{tournament.rules}</p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// Prizes Tab
function PrizesTab({ tournament }) {
  const prizes = [
    { place: 1, reward: tournament.prize_pool ? `${(tournament.prize_pool * 0.5).toFixed(0)} EUR` : '5,000 EUR', icon: Crown, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-amber-500/20' },
    { place: 2, reward: tournament.prize_pool ? `${(tournament.prize_pool * 0.3).toFixed(0)} EUR` : '2,500 EUR', icon: Medal, color: 'text-gray-300', bg: 'from-gray-400/20 to-gray-500/20' },
    { place: 3, reward: tournament.prize_pool ? `${(tournament.prize_pool * 0.2).toFixed(0)} EUR` : '1,000 EUR', icon: Medal, color: 'text-amber-600', bg: 'from-amber-600/20 to-orange-600/20' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Récompenses</h2>
      <div className="grid gap-6">
        {prizes.map((prize) => (
          <GlassCard key={prize.place}>
            <div className="flex items-center gap-6">
              <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${prize.bg}`}>
                <prize.icon className={`h-10 w-10 ${prize.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-lg text-[#94A3B8]">
                  {prize.place === 1 ? '1ère Place' : prize.place === 2 ? '2ème Place' : '3ème Place'}
                </p>
                <p className="text-3xl font-bold">{prize.reward}</p>
              </div>
              {prize.place === 1 && tournament.prize_pool && (
                <div className="text-right">
                  <p className="text-sm text-[#94A3B8]">+ Bonus</p>
                  <p className="font-bold text-[#00F5FF]">Slot LAN Finals</p>
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
      <GlassCard>
        <h3 className="mb-4 font-bold">Conditions de versement</h3>
        <ul className="space-y-2 text-[#94A3B8]">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
            Les gains seront versés dans les 30 jours suivant la fin du tournoi.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
            Un capitaine doit fournir les informations de paiement (IBAN/PayPal).
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
            La répartition des gains au sein de l'équipe est à la discrétion du capitaine.
          </li>
        </ul>
      </GlassCard>
    </div>
  );
}
