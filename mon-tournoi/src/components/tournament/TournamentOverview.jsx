import { useNavigate } from 'react-router-dom';
import { TournamentRegistration } from '../registration';
import { getFormatLabel } from './TournamentHeader';
import { GlassCard, NeonBadge, GradientButton } from '../../shared/components/ui';
import { Gamepad2, Trophy, Users, Calendar, Clock, Lock, Sparkles, TrendingUp, Award } from 'lucide-react';

export default function TournamentOverview({
  tournoi,
  participants,
  matches,
  session,
  tournamentId,
  onRefetch
}) {
  return (
    <div className="space-y-8">
      {/* Stats Cards - Premium Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InfoCard
          icon={Gamepad2}
          label="Jeu"
          value={tournoi.game}
          color="text-cyan-400"
          gradient="from-cyan-500/20 to-cyan-500/5"
        />

        <InfoCard
          icon={Trophy}
          label="Format"
          value={getFormatLabel(tournoi.format)}
          extra={tournoi.best_of > 1 ? `Best-of-${tournoi.best_of}` : null}
          color="text-yellow-400"
          gradient="from-yellow-500/20 to-yellow-500/5"
        />

        <InfoCard
          icon={Users}
          label="Participants"
          value={`${participants.length}${tournoi.max_participants ? ` / ${tournoi.max_participants}` : ''}`}
          color="text-pink-400"
          gradient="from-pink-500/20 to-pink-500/5"
        />

        <InfoCard
          icon={Calendar}
          label="Date de début"
          value={new Date(tournoi.start_date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
          })}
          extra={new Date(tournoi.start_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          color="text-violet-400"
          gradient="from-violet-500/20 to-violet-500/5"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Rules Section */}
          <GlassCard className="p-8 border-2 border-white/5 hover:border-white/10 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30">
                <Award className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Règlement</h3>
            </div>
            <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
              {tournoi.rules || "Aucun règlement spécifique n'a été défini pour ce tournoi."}
            </div>
          </GlassCard>

          {/* Progress Section */}
          {matches.length > 0 && (
            <GlassCard className="p-8 border-2 border-white/5 hover:border-white/10 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30">
                    <TrendingUp className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white">Progression</h3>
                </div>
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                  {Math.round((matches.filter(m => m.status === 'completed').length / matches.length) * 100)}%
                </div>
              </div>

              <div className="relative w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 via-cyan-500 to-violet-600 transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${(matches.filter(m => m.status === 'completed').length / matches.length) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {matches.filter(m => m.status === 'completed').length} / {matches.length} matchs
                </span>
                <span className="text-cyan-400 font-bold">
                  {matches.filter(m => m.status === 'pending').length} en attente
                </span>
              </div>
            </GlassCard>
          )}
        </div>

        <div className="space-y-8">
          {/* Registration Card */}
          {tournoi.status === 'draft' && (
            <div className="relative overflow-hidden rounded-2xl group">
              {/* Animated border */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 opacity-75 blur-xl group-hover:opacity-100 transition-opacity" />

              <GlassCard className="relative p-8 border-2 border-cyan-500/30 group-hover:border-cyan-400/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/10" />

                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                      Inscriptions
                    </h3>
                    <Sparkles className="w-6 h-6 text-violet-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                  </div>

                  <TournamentRegistration
                    tournamentId={tournamentId}
                    tournament={tournoi}
                    session={session}
                    onSuccess={onRefetch}
                  />

                  {tournoi.registration_deadline && (
                    <div className="flex items-center justify-center gap-2 text-sm text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold">
                        Fin: {new Date(tournoi.registration_deadline).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          )}

          {/* Status Card */}
          <GlassCard className="p-6 border-2 border-white/5">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">
              Statut du Tournoi
            </h3>
            <div className="space-y-3">
              <StatusItem label="Check-in" active={tournoi.check_in_enabled} />
              <StatusItem label="Inscriptions" active={tournoi.status === 'draft'} />
              <StatusItem label="Bracket généré" active={tournoi.status !== 'draft'} />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, extra, color, gradient }) {
  return (
    <GlassCard className="group p-6 hover:scale-105 transition-all duration-300 cursor-pointer border-2 border-white/5 hover:border-white/20">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl`} />

      <div className="relative z-10 flex items-center gap-4">
        <div className={`p-4 rounded-xl bg-gradient-to-br from-[#161b22] to-[#0D0D14] border border-white/10 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 ${color}`}>
          <Icon className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</div>
          <div className="text-xl font-black text-white">{value}</div>
          {extra && <div className={`text-sm ${color} font-bold mt-1`}>{extra}</div>}
        </div>
      </div>
    </GlassCard>
  );
}

function StatusItem({ label, active }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300">
      <span className="text-white font-bold">{label}</span>
      {active ? (
        <NeonBadge variant="live" size="sm">Actif</NeonBadge>
      ) : (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Lock className="w-4 h-4" />
          <span className="font-medium">Inactif</span>
        </div>
      )}
    </div>
  );
}
