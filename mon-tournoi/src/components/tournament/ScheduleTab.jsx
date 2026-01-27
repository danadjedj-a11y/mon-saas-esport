import { GlassCard } from '../../shared/components/ui';
import { Calendar, Clock, Trophy, Skull } from 'lucide-react';

export default function ScheduleTab({ matches }) {
  const scheduledMatches = matches
    .filter(m => m.scheduled_at && m.status !== 'completed')
    .sort((a, b) => {
      if (!a.scheduled_at || !b.scheduled_at) return 0;
      return new Date(a.scheduled_at) - new Date(b.scheduled_at);
    });

  return (
    <GlassCard className="p-8">
      <h2 className="mt-0 text-white font-bold text-2xl mb-8 flex items-center gap-2">
        <Calendar className="w-7 h-7 text-cyan-400" />
        Planning des Matchs
      </h2>

      {scheduledMatches.length > 0 ? (
        <div className="flex flex-col gap-4">
          {scheduledMatches.map(m => {
            const scheduledDate = new Date(m.scheduled_at);
            const isToday = scheduledDate.toDateString() === new Date().toDateString();
            const isPast = scheduledDate < new Date();

            return (
              <GlassCard
                key={m.id}
                className={`p-5 flex justify-between items-center flex-wrap gap-4 transition-all duration-300 ${isPast
                    ? 'border-orange-500/50 bg-orange-500/5'
                    : isToday
                      ? 'border-cyan-400/50 bg-cyan-400/5 shadow-[0_0_20px_rgba(0,245,255,0.2)]'
                      : 'border-violet-500/30 hover:border-violet-400/50'
                  }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm text-gray-400 mb-3 font-medium flex items-center gap-2">
                    <span className="text-cyan-400">Round {m.round_number}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-400">Match #{m.match_number}</span>
                    {m.bracket_type && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className={`flex items-center gap-1 ${m.bracket_type === 'winners' ? 'text-cyan-400' : 'text-violet-400'}`}>
                          {m.bracket_type === 'winners' ? <Trophy className="w-3 h-3" /> : <Skull className="w-3 h-3" />}
                          {m.bracket_type === 'winners' ? 'Winners' : 'Losers'}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 flex-1">
                      <img
                        src={m.p1_avatar}
                        className="w-10 h-10 rounded-lg object-cover ring-2 ring-white/10"
                        alt=""
                        loading="lazy"
                      />
                      <span className="text-white font-medium">
                        {m.p1_name.split(' [')[0]}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-cyan-400 px-3">
                      VS
                    </div>
                    <div className="flex items-center gap-2.5 flex-1 justify-end">
                      <span className="text-white font-medium">
                        {m.p2_name.split(' [')[0]}
                      </span>
                      <img
                        src={m.p2_avatar}
                        className="w-10 h-10 rounded-lg object-cover ring-2 ring-white/10"
                        alt=""
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right min-w-[150px]">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-2 ${isPast
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : isToday
                        ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'
                        : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    }`}>
                    <Clock className="w-3 h-3" />
                    {isPast ? 'Passé' : isToday ? 'Aujourd\'hui' : 'À venir'}
                  </div>
                  <div className="text-sm text-gray-300 font-medium">
                    {scheduledDate.toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 opacity-30">📅</div>
          <p className="text-gray-400 text-lg">
            Aucun match planifié pour le moment.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
