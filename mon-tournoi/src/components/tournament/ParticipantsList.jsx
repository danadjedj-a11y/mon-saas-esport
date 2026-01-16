import ParticipantCard from './ParticipantCard';

export default function ParticipantsList({ participants, tournamentId }) {
  return (
    <div className="bg-gray-900/95 p-8 rounded-xl border-2 border-cyan-400 shadow-lg shadow-violet-500/30">
      <h2 className="mt-0 text-cyan-400 mb-5 font-handwriting text-3xl">
        Participants ({participants.length})
      </h2>
      
      {participants.length === 0 ? (
        <div className="text-center py-10 text-gray-400 font-display">
          Aucun participant inscrit pour le moment
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
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
