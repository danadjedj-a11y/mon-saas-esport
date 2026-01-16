export default function ScheduleTab({ matches }) {
  const scheduledMatches = matches
    .filter(m => m.scheduled_at && m.status !== 'completed')
    .sort((a, b) => {
      if (!a.scheduled_at || !b.scheduled_at) return 0;
      return new Date(a.scheduled_at) - new Date(b.scheduled_at);
    });

  return (
    <div className="bg-gray-900/95 p-8 rounded-xl border-2 border-cyan-400 shadow-lg shadow-violet-500/30">
      <h2 className="mt-0 text-cyan-400 font-handwriting text-3xl mb-6">
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
                    ? 'bg-orange-400/20 border-orange-400' 
                    : isToday 
                      ? 'bg-violet-500/30 border-cyan-400' 
                      : 'bg-gray-900/80 border-violet-500'
                }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm text-cyan-400 mb-2 font-display">
                    Round {m.round_number} - Match #{m.match_number}
                    {m.bracket_type && (
                      <span className={`ml-2.5 ${m.bracket_type === 'winners' ? 'text-cyan-400' : 'text-violet-400'}`}>
                        {m.bracket_type === 'winners' ? '🏆 Winners' : '💀 Losers'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 flex-1">
                      <img 
                        src={m.p1_avatar} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400"
                        alt="" 
                        loading="lazy"
                      />
                      <span className="text-white font-display">
                        {m.p1_name.split(' [')[0]}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-cyan-400 font-handwriting">
                      VS
                    </div>
                    <div className="flex items-center gap-2.5 flex-1 justify-end">
                      <span className="text-white font-display">
                        {m.p2_name.split(' [')[0]}
                      </span>
                      <img 
                        src={m.p2_avatar} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400"
                        alt=""
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right min-w-[150px]">
                  <div className={`text-lg font-bold mb-1 font-handwriting ${
                    isPast ? 'text-orange-400' : isToday ? 'text-cyan-400' : 'text-violet-400'
                  }`}>
                    {isPast ? '⏰ Passé' : isToday ? '🟢 Aujourd\'hui' : '📅 À venir'}
                  </div>
                  <div className="text-sm text-white font-display">
                    {scheduledDate.toLocaleDateString('fr-FR', { 
                      weekday: 'long',
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-lg font-bold text-cyan-400 mt-1 font-handwriting">
                    {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-white mt-12 font-display">
          Aucun match planifié pour le moment.
        </p>
      )}
    </div>
  );
}
