import React from 'react';

/**
 * Zone admin pour résoudre un conflit de score
 */
export default function AdminConflictResolver({ 
  defaultScoreP1, 
  defaultScoreP2, 
  onResolve 
}) {
  const handleResolve = () => {
    const scoreP1 = parseInt(document.getElementById('admin-score-p1').value) || 0;
    const scoreP2 = parseInt(document.getElementById('admin-score-p2').value) || 0;
    onResolve(scoreP1, scoreP2);
  };

  return (
    <div className="bg-red-800 p-5 rounded-xl mt-5 border-2 border-red-500">
      <h3 className="mt-0 mb-4 text-white font-display">⚖️ Résoudre le conflit (Admin)</h3>
      
      <div className="flex gap-4 items-center justify-center">
        <input 
          type="number" 
          defaultValue={defaultScoreP1 || 0} 
          id="admin-score-p1" 
          aria-label="Score équipe 1" 
          min="0" 
          className="text-2xl w-20 text-center bg-white text-black rounded-lg p-2.5"
        />
        <span className="text-3xl text-white">:</span>
        <input 
          type="number" 
          defaultValue={defaultScoreP2 || 0} 
          id="admin-score-p2" 
          aria-label="Score équipe 2" 
          min="0" 
          className="text-2xl w-20 text-center bg-white text-black rounded-lg p-2.5"
        />
      </div>
      
      <button 
        onClick={handleResolve} 
        className="w-full mt-4 bg-white text-red-800 border-none p-4 text-lg rounded-lg cursor-pointer font-bold hover:bg-gray-100 transition-colors"
      >
        ✅ Valider ce score
      </button>
    </div>
  );
}
