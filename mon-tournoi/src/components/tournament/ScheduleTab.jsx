export default function ScheduleTab({ matches }) {
  const scheduledMatches = matches
    .filter(m => m.scheduled_at && m.status !== 'completed')
    .sort((a, b) => {
      if (!a.scheduled_at || !b.scheduled_at) return 0;
      return new Date(a.scheduled_at) - new Date(b.scheduled_at);
    });

  return (
    <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/30">
      <h2 className="mt-0 text-fluky-accent font-handwriting text-3xl mb-6">
        📅 Planning des Matchs
      </h2>
      
      {scheduledMatches.length > 0 ? (
        <div className="flex flex-col gap-4">
          {scheduledMatches.map(m => {
            const scheduledDate = new Date(m.scheduled_at);
            const isToday = scheduledDate.toDateString() === new Date().toDateString();
            const isPast = scheduledDate < new Date();
            
            return (
              <div 
                key={m.id}
                className={`p-5 rounded-xl border-2 flex justify-between items-center flex-wrap gap-4 ${
                  isPast 
                    ? 'bg-fluky-orange/20 border-fluky-orange' 
                    : isToday 
                      ? 'bg-fluky-primary/30 border-fluky-accent' 
                      : 'bg-fluky-bg/80 border-fluky-primary'
                }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm text-fluky-accent mb-2 font-display">
                    Round {m.round_number} - Match #{m.match_number}
                    {m.bracket_type && (
                      <span className={`ml-2.5 ${m.bracket_type === 'winners' ? 'text-fluky-accent' : 'text-fluky-primary'}`}>
                        {m.bracket_type === 'winners' ? '🏆 Winners' : '💀 Losers'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 flex-1">
                      <img 
                        src={m.p1_avatar} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-fluky-accent"
                        alt="" 
                        loading="lazy"
                      />
                      <span className="text-fluky-text font-display">
                        {m.p1_name.split(' [')[0]}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-fluky-accent font-handwriting">
                      VS
                    </div>
                    <div className="flex items-center gap-2.5 flex-1 justify-end">
                      <span className="text-fluky-text font-display">
                        {m.p2_name.split(' [')[0]}
                      </span>
                      <img 
                        src={m.p2_avatar} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-fluky-accent"
                        alt=""
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right min-w-[150px]">
                  <div className={`text-lg font-bold mb-1 font-handwriting ${
                    isPast ? 'text-fluky-orange' : isToday ? 'text-fluky-accent' : 'text-fluky-primary'
                  }`}>
                    {isPast ? '⏰ Passé' : isToday ? '🟢 Aujourd\'hui' : '📅 À venir'}
                  </div>
                  <div className="text-sm text-fluky-text font-display">
                    {scheduledDate.toLocaleDateString('fr-FR', { 
                      weekday: 'long',
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-lg font-bold text-fluky-accent mt-1 font-handwriting">
                    {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-fluky-text mt-12 font-display">
          Aucun match planifié pour le moment.
        </p>
      )}
    </div>
  );
}
