/**
 * ScoreModal - Modale d'édition de score pour les admins
 */
import React from 'react';

export default function ScoreModal({ 
  isOpen, 
  match, 
  scoreA, 
  scoreB, 
  onScoreAChange, 
  onScoreBChange, 
  onSave, 
  onClose 
}) {
  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
      <div className="bg-[#2a2a2a] p-8 rounded-xl w-80 border border-white/10">
        <h3 className="text-center text-white font-display text-lg mb-6">Score Admin</h3>
        
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-2 truncate max-w-[100px]">
              {match.p1_name?.split(' [')[0] || 'Équipe 1'}
            </div>
            <input 
              type="number" 
              value={scoreA} 
              onChange={e => onScoreAChange(e.target.value)} 
              aria-label="Score équipe 1" 
              className="w-16 h-16 text-2xl text-center bg-dark-100 text-white border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none"
              min="0"
            />
          </div>
          
          <span className="text-2xl text-gray-500 font-bold">-</span>
          
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-2 truncate max-w-[100px]">
              {match.p2_name?.split(' [')[0] || 'Équipe 2'}
            </div>
            <input 
              type="number" 
              value={scoreB} 
              onChange={e => onScoreBChange(e.target.value)} 
              aria-label="Score équipe 2" 
              className="w-16 h-16 text-2xl text-center bg-dark-100 text-white border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none"
              min="0"
            />
          </div>
        </div>
        
        <button 
          onClick={onSave} 
          className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:from-green-400 hover:to-emerald-400 transition-all mb-3"
        >
          ✓ Valider & Avancer
        </button>
        
        <button 
          onClick={onClose} 
          className="w-full py-2 bg-transparent border border-white/10 text-gray-400 rounded-lg hover:bg-white/5 transition-all"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
