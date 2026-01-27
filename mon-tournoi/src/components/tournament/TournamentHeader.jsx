import FollowButton from '../FollowButton';
import RatingDisplay from '../RatingDisplay';
import { GlassCard, NeonBadge } from '../../shared/components/ui';
import clsx from 'clsx';
import { Gamepad2, Trophy, Users, Calendar, Crown, Sparkles } from 'lucide-react';

const getFormatLabel = (format) => {
  switch (format) {
    case 'elimination': return 'Élimination Directe';
    case 'double_elimination': return 'Double Elimination';
    case 'round_robin': return 'Championnat';
    case 'swiss': return 'Système Suisse';
    default: return format;
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'draft': return <NeonBadge variant="neutral">Inscriptions ouvertes</NeonBadge>;
    case 'completed': return <NeonBadge variant="pink">Terminé</NeonBadge>;
    default: return <NeonBadge variant="live">En cours</NeonBadge>;
  }
};

export default function TournamentHeader({ tournoi, session, tournamentId, winnerName }) {
  return (
    <div className="space-y-6">
      {/* MAIN HEADER - Premium Design */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Animated gradient border */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-cyan-500 to-pink-500 opacity-75 blur-xl animate-pulse" />

        <GlassCard className="relative p-12 border-2 border-white/10">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-600/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-500/20 to-transparent rounded-full blur-3xl" />

          <div className="relative z-10 space-y-8">
            {/* Status Badge */}
            <div className="flex justify-center">
              {getStatusBadge(tournoi.status)}
            </div>

            {/* Tournament Title */}
            <div className="text-center space-y-4">
              <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-violet-200 drop-shadow-[0_0_30px_rgba(139,92,246,0.5)] leading-tight">
                {tournoi.name}
              </h1>
            </div>

            {/* Meta Info Pills */}
            <div className="flex flex-wrap justify-center gap-4">
              <div className="group px-6 py-3 rounded-full bg-gradient-to-r from-[#161b22] to-[#0D0D14] border border-cyan-500/30 backdrop-blur-md flex items-center gap-3 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,245,255,0.3)] transition-all duration-300">
                <Gamepad2 className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-white font-bold">{tournoi.game}</span>
              </div>

              <div className="group px-6 py-3 rounded-full bg-gradient-to-r from-[#161b22] to-[#0D0D14] border border-yellow-500/30 backdrop-blur-md flex items-center gap-3 hover:border-yellow-400/50 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all duration-300">
                <Trophy className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
                <span className="text-white font-bold">{getFormatLabel(tournoi.format)}</span>
              </div>

              <div className="group px-6 py-3 rounded-full bg-gradient-to-r from-[#161b22] to-[#0D0D14] border border-pink-500/30 backdrop-blur-md flex items-center gap-3 hover:border-pink-400/50 hover:shadow-[0_0_20px_rgba(255,62,157,0.3)] transition-all duration-300">
                <Calendar className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                <span className="text-white font-bold">
                  {new Date(tournoi.start_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-6 pt-4">
              {session && (
                <FollowButton session={session} tournamentId={tournamentId} type="tournament" />
              )}
              <RatingDisplay tournamentId={tournamentId} />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* WINNER BANNER - Epic Design */}
      {winnerName && (
        <div className="relative overflow-hidden rounded-2xl group">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 animate-gradient-xy" />

          <div className="relative m-[2px] bg-[#05050A] rounded-2xl p-10 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-pink-500/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-yellow-500/20 to-transparent blur-3xl" />

            {/* Floating sparkles */}
            <div className="absolute top-4 left-4">
              <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
            </div>
            <div className="absolute top-4 right-4">
              <Sparkles className="w-6 h-6 text-pink-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="absolute bottom-4 left-1/4">
              <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            <div className="absolute bottom-4 right-1/4">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" style={{ animationDelay: '1.5s' }} />
            </div>

            <div className="relative z-10 text-center space-y-4">
              <div className="inline-flex items-center gap-3 text-yellow-400 font-black tracking-wider uppercase text-sm animate-bounce">
                <Crown className="w-6 h-6" />
                <span>Champion du Tournoi</span>
                <Crown className="w-6 h-6" />
              </div>

              <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-orange-200 to-pink-200 drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]">
                {winnerName.split(' [')[0]}
              </h2>

              <div className="flex justify-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <Trophy
                    key={i}
                    className="w-5 h-5 text-yellow-400 animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { getFormatLabel };
