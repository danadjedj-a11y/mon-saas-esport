import React from 'react';

/**
 * Liste des participants avec gestion admin
 */
export default function TeamsList({
  participants,
  isOwner,
  tournamentStatus,
  onRemove,
  onToggleCheckIn
}) {
  return (
    <>
      <div className="p-4 border-b border-white/5">
        <h3 className="font-display text-xl text-white m-0 mb-2">
          Équipes ({participants.length})
        </h3>
        {isOwner && tournamentStatus === 'draft' && (
          <div className="text-xs text-gray-300 flex gap-4 flex-wrap font-body">
            <span className="text-green-400">
              ✅ Check-in: {participants.filter(p => p.checked_in).length}
            </span>
            <span className="text-gray-400">
              ⏳ En attente: {participants.filter(p => !p.checked_in && !p.disqualified).length}
            </span>
            {participants.filter(p => p.disqualified).length > 0 && (
              <span className="text-red-400">
                ❌ DQ: {participants.filter(p => p.disqualified).length}
              </span>
            )}
          </div>
        )}
      </div>
      
      <ul className="list-none p-0 m-0 max-h-[300px] overflow-y-auto">
        {participants.map(p => (
          <li
            key={p.id}
            className={`p-3 border-b border-white/5 flex justify-between items-center ${
              p.checked_in ? 'bg-green-900/20' : (p.disqualified ? 'bg-red-900/20' : 'bg-transparent')
            }`}
          >
            <div className="flex gap-3 items-center flex-1">
              <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {p.teams?.tag || '?'}
              </div>
              <span className={`font-body ${
                p.disqualified ? 'text-red-400' : (p.checked_in ? 'text-green-400' : 'text-gray-300')
              }`}>
                {p.teams?.name || 'Inconnu'}
              </span>
              
              {/* Indicateur de statut */}
              {isOwner && tournamentStatus === 'draft' && (
                <span className={`text-xs px-2 py-1 rounded-full text-white font-bold font-body ${
                  p.checked_in ? 'bg-green-500' : (p.disqualified ? 'bg-red-500' : 'bg-gray-500')
                }`}>
                  {p.checked_in ? '✅ Check-in' : (p.disqualified ? '❌ DQ' : '⏳ En attente')}
                </span>
              )}
            </div>
            
            {isOwner && (
              <div className="flex gap-2 items-center">
                {tournamentStatus === 'draft' && onToggleCheckIn && (
                  <button
                    onClick={() => onToggleCheckIn(p.id, p.checked_in)}
                    className={`px-3 py-1 text-white border-none rounded-lg cursor-pointer text-xs font-bold transition-all duration-300 hover:scale-105 ${
                      p.checked_in ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    title={p.checked_in ? 'Retirer le check-in' : 'Valider le check-in'}
                  >
                    {p.checked_in ? '↩️ Retirer' : '✅ Check-in'}
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={() => onRemove(p.id)}
                    className="text-red-400 bg-none border-none cursor-pointer text-xl hover:text-red-500 transition-colors"
                    title="Exclure cette équipe"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
