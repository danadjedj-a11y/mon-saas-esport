import React, { useState } from 'react';

/**
 * Formulaire de déclaration de score pour single game
 */
export default function SingleGameScoreForm({ onSubmit }) {
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  const handleSubmit = () => {
    onSubmit(myScore, opponentScore);
  };

  return (
    <div className="bg-[#2a2a2a] p-5 rounded-xl mt-5 border-2 border-yellow-500">
      <h3 className="mt-0 mb-4 text-yellow-500 font-display">📝 Déclarer mon score</h3>
      
      <div className="flex gap-4 items-center justify-center">
        <div className="text-center">
          <label className="block mb-1 text-sm text-fluky-text font-body">Mon score</label>
          <input 
            type="number" 
            value={myScore} 
            onChange={e => setMyScore(parseInt(e.target.value) || 0)} 
            min="0"
            className="text-2xl w-20 text-center bg-[#111] text-white border-2 border-yellow-500 rounded-lg p-2.5"
          />
        </div>
        <span className="text-3xl mt-6 text-fluky-text">:</span>
        <div className="text-center">
          <label className="block mb-1 text-sm text-fluky-text font-body">Score adverse</label>
          <input 
            type="number" 
            value={opponentScore} 
            onChange={e => setOpponentScore(parseInt(e.target.value) || 0)} 
            min="0"
            className="text-2xl w-20 text-center bg-[#111] text-white border-2 border-yellow-500 rounded-lg p-2.5"
          />
        </div>
      </div>
      
      <button 
        onClick={handleSubmit} 
        className="w-full mt-4 bg-yellow-500 text-black border-none p-4 text-lg rounded-lg cursor-pointer font-bold hover:bg-yellow-400 transition-colors"
      >
        ✉️ Envoyer ma déclaration
      </button>
      
      <p className="mt-2.5 text-xs text-gray-400 text-center font-body">
        L'adversaire devra également déclarer son score. Si les scores concordent, validation automatique.
      </p>
    </div>
  );
}
