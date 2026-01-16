import React from 'react';

/**
 * Affiche le score du match (confirmé ou en attente)
 */
export default function ScoreDisplay({ 
  isConfirmed, 
  scoreP1, 
  scoreP2, 
  scoreP1Reported, 
  scoreP2Reported 
}) {
  if (isConfirmed) {
    return (
      <div className="flex gap-4 items-center">
        <span className={`text-5xl font-bold font-handwriting ${scoreP1 > scoreP2 ? 'text-violet-400' : 'text-cyan-400'}`}>
          {scoreP1}
        </span>
        <span className="text-3xl font-bold text-white">:</span>
        <span className={`text-5xl font-bold font-handwriting ${scoreP2 > scoreP1 ? 'text-violet-400' : 'text-cyan-400'}`}>
          {scoreP2}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-center">
      <span className="text-4xl font-bold text-white font-handwriting">
        {scoreP1Reported ?? '-'}
      </span>
      <span className="text-3xl text-white">:</span>
      <span className="text-4xl font-bold text-white font-handwriting">
        {scoreP2Reported ?? '-'}
      </span>
    </div>
  );
}
