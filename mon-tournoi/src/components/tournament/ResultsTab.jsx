import MatchCard from './MatchCard';

export default function ResultsTab({ matches }) {
  const completedMatches = matches
    .filter(m => m.status === 'completed')
    .sort((a, b) => {
      if (a.round_number !== b.round_number) return a.round_number - b.round_number;
      return a.match_number - b.match_number;
    });

  return (
    <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/30">
      <h2 className="mt-0 text-fluky-accent font-handwriting text-3xl mb-6">
        📊 Résultats des matchs
      </h2>
      
      {completedMatches.length > 0 ? (
        <div className="flex flex-col gap-4">
          {completedMatches.map(m => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      ) : (
        <p className="text-center text-fluky-text mt-12 font-display">
          Aucun résultat pour le moment.
        </p>
      )}
    </div>
  );
}
