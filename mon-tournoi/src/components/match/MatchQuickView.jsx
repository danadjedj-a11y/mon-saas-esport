import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

/**
 * MatchQuickView - Modal d'aperçu rapide d'un match
 * Similaire à la popup de Toornament
 */
export default function MatchQuickView({ 
  match, 
  phase, 
  tournamentId, 
  onClose,
  onRefresh 
}) {
  const navigate = useNavigate();

  if (!match) return null;

  const getMatchId = () => {
    const bracketType = match.bracket_type === 'losers' ? '2' : match.bracket_type === 'grand_final' ? '3' : '1';
    return `#1.${bracketType}.${match.round_number || 1}.${match.match_number || 1}`;
  };

  const getBracketName = () => {
    switch (match.bracket_type) {
      case 'losers': return 'Losers Bracket';
      case 'grand_final': return 'Grand Final';
      default: return 'Winners Bracket';
    }
  };

  const getRoundName = () => {
    if (match.bracket_type === 'grand_final') return 'GF Round 1';
    const prefix = match.bracket_type === 'losers' ? 'LB' : 'WB';
    return `${prefix} Round ${match.round_number || 1}`;
  };

  const getStatusLabel = () => {
    switch (match.status) {
      case 'completed': return { text: 'Terminé', color: 'text-green-400' };
      case 'in_progress': return { text: 'En cours', color: 'text-yellow-400' };
      case 'scheduled': return { text: 'Planifié', color: 'text-blue-400' };
      default: return { text: 'En attente', color: 'text-gray-400' };
    }
  };

  const status = getStatusLabel();

  // Handler pour naviguer vers la page de résultat
  const handleOpenResult = () => {
    navigate(`/organizer/tournament/${tournamentId}/matches/${match.id}`);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#2a2d3e] rounded-xl border border-white/10 w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            Match {getMatchId()}
          </h2>
          <div className="flex items-center gap-2">
            {/* Action icons */}
            <button 
              onClick={handleOpenResult}
              className="p-2 text-gray-400 hover:text-cyan rounded-lg hover:bg-white/10 transition-colors"
              title="Éditer"
            >
              ✏️
            </button>
            <button 
              className="p-2 text-gray-400 hover:text-cyan rounded-lg hover:bg-white/10 transition-colors"
              title="Chat"
            >
              💬
            </button>
            <button 
              className="p-2 text-gray-400 hover:text-cyan rounded-lg hover:bg-white/10 transition-colors"
              title="Copier"
            >
              📋
            </button>
            <button 
              className="p-2 text-gray-400 hover:text-cyan rounded-lg hover:bg-white/10 transition-colors"
              title="Planifier"
            >
              ⏱️
            </button>
            <button 
              className="p-2 text-gray-400 hover:text-cyan rounded-lg hover:bg-white/10 transition-colors"
              title="Stream"
            >
              🎥
            </button>
            <button 
              className="p-2 text-gray-400 hover:text-cyan rounded-lg hover:bg-white/10 transition-colors"
              title="Paramètres"
            >
              ⚙️
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Info labels */}
        <div className="grid grid-cols-4 gap-4 p-4 text-sm border-b border-white/10">
          <div>
            <p className="text-gray-500 text-xs mb-1">PHASE</p>
            <p className="text-white font-medium">{phase?.name || 'Playoffs'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">GROUPE</p>
            <p className="text-white font-medium">{getBracketName()}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">TOUR</p>
            <p className="text-white font-medium">{getRoundName()}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">STATUT</p>
            <p className={`font-medium ${status.color}`}>{status.text}</p>
          </div>
        </div>

        {/* Participants */}
        <div className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2 px-2">
            <span>NOM</span>
            <span>RÉSULTAT</span>
          </div>

          {/* Participant 1 */}
          <div className="flex items-center justify-between py-3 px-2 border-t border-white/10">
            <span className="text-gray-300">
              {match.participant1?.name || 'À déterminer'}
            </span>
            <span className={clsx(
              'font-medium',
              match.status === 'completed' && match.winner_id === match.player1_id 
                ? 'text-green-400' 
                : match.status === 'completed' && match.winner_id === match.player2_id
                  ? 'text-red-400'
                  : 'text-gray-500'
            )}>
              {match.status === 'completed' 
                ? (match.winner_id === match.player1_id ? 'Victoire' : 'Défaite')
                : '-'}
            </span>
          </div>

          {/* Participant 2 */}
          <div className="flex items-center justify-between py-3 px-2 border-t border-white/10">
            <span className="text-gray-300">
              {match.participant2?.name || 'À déterminer'}
            </span>
            <span className={clsx(
              'font-medium',
              match.status === 'completed' && match.winner_id === match.player2_id 
                ? 'text-green-400' 
                : match.status === 'completed' && match.winner_id === match.player1_id
                  ? 'text-red-400'
                  : 'text-gray-500'
            )}>
              {match.status === 'completed' 
                ? (match.winner_id === match.player2_id ? 'Victoire' : 'Défaite')
                : '-'}
            </span>
          </div>
        </div>

        {/* Action Button - Résultat */}
        <div className="p-4 border-t border-white/10 relative">
          {/* Tooltip arrow */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="bg-gray-700 text-white text-xs px-3 py-1 rounded-md shadow-lg">
              Résultat
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700" />
            </div>
          </div>
          
          <button
            onClick={handleOpenResult}
            className="w-full py-3 bg-cyan text-white font-medium rounded-lg hover:bg-cyan/80 transition-colors"
          >
            Ouvrir la page du match
          </button>
        </div>
      </div>
    </div>
  );
}
