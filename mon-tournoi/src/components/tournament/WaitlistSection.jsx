import React from 'react';

/**
 * Affichage de la liste d'attente avec promotion admin
 */
export default function WaitlistSection({
  waitlist,
  maxParticipants,
  currentCount,
  onPromote
}) {
  if (!waitlist || waitlist.length === 0) return null;

  const canPromote = !maxParticipants || currentCount < maxParticipants;

  return (
    <>
      <div className="border-t border-white/5 p-4 border-b border-white/5 bg-white/5">
        <h3 className="m-0 text-sm text-yellow-400 font-body">
          ⏳ Liste d'Attente ({waitlist.length})
        </h3>
      </div>
      
      <ul className="list-none p-0 m-0 max-h-[200px] overflow-y-auto">
        {waitlist.map((w) => (
          <li
            key={w.id}
            className="p-3 border-b border-white/5 flex justify-between items-center bg-black/30 opacity-90"
          >
            <div className="flex gap-3 items-center flex-1">
              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
                {w.position}
              </div>
              <div className="w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {w.teams?.tag || '?'}
              </div>
              <span className="text-sm text-gray-300 font-body">
                {w.teams?.name || 'Inconnu'}
              </span>
            </div>
            
            <div className="flex gap-3 items-center">
              <span className="text-xs text-gray-500 font-body">
                Position #{w.position}
              </span>
              {canPromote && onPromote && (
                <button
                  onClick={() => {
                    if (confirm(`Promouvoir "${w.teams?.name || 'cette équipe'}" depuis la liste d'attente ?`)) {
                      onPromote(w.id, w.team_id);
                    }
                  }}
                  className="px-3 py-1 bg-green-500 text-white border-none rounded-lg cursor-pointer text-xs font-bold transition-all duration-300 hover:scale-105 hover:bg-green-600"
                >
                  ✅ Promouvoir
                </button>
              )}
              {!canPromote && (
                <span className="text-xs text-gray-500 italic font-body">
                  Complet
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
