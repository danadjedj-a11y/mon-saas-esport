import MatchCard from './MatchCard';
import { GlassCard } from '../../shared/components/ui';
import { Trophy } from 'lucide-react';

export default function ResultsTab({ matches }) {
  const completedMatches = matches
    .filter(m => m.status === 'completed')
    .sort((a, b) => {
      if (a.round_number !== b.round_number) return a.round_number - b.round_number;
      return a.match_number - b.match_number;
    });

  return (
    <GlassCard className="p-8">
      <h2 className="mt-0 text-white font-bold text-2xl mb-8 flex items-center gap-2">
        <Trophy className="w-7 h-7 text-[#FFD700]" />
        Résultats des matchs
      </h2>

      {completedMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedMatches.map(m => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 opacity-30">📊</div>
          <p className="text-gray-400 text-lg">
            Aucun résultat pour le moment.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
