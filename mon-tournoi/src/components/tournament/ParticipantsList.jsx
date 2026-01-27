import ParticipantCard from './ParticipantCard';
import { GlassCard } from '../../shared/components/ui';

export default function ParticipantsList({ participants, tournamentId }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Participants</h2>
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400">
          {participants.length} Équipes
        </span>
      </div>

      {participants.length === 0 ? (
        <GlassCard className="text-center py-20">
          <div className="text-6xl mb-4 opacity-50">👻</div>
          <p className="text-gray-400 font-medium">Aucun participant inscrit pour le moment</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {participants.map(p => (
            <ParticipantCard
              key={p.id}
              participant={p}
              tournamentId={tournamentId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
