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
        <span className={`text-5xl font-bold font-handwriting ${scoreP1 > scoreP2 ? 'text-fluky-primary' : 'text-fluky-secondary'}`}>
          {scoreP1}
        </span>
        <span className="text-3xl font-bold text-fluky-text">:</span>
        <span className={`text-5xl font-bold font-handwriting ${scoreP2 > scoreP1 ? 'text-fluky-primary' : 'text-fluky-secondary'}`}>
          {scoreP2}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-center">
      <span className="text-4xl font-bold text-fluky-text font-handwriting">
        {scoreP1Reported ?? '-'}
      </span>
      <span className="text-3xl text-fluky-text">:</span>
      <span className="text-4xl font-bold text-fluky-text font-handwriting">
        {scoreP2Reported ?? '-'}
      </span>
    </div>
  );
}
