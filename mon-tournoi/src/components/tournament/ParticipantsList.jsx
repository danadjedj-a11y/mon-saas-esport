import ParticipantCard from './ParticipantCard';

export default function ParticipantsList({ participants, tournamentId }) {
  return (
    <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/30">
      <h2 className="mt-0 text-fluky-accent mb-5 font-handwriting text-3xl">
        Participants ({participants.length})
      </h2>
      
      {participants.length === 0 ? (
        <div className="text-center py-10 text-fluky-text/60 font-display">
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
