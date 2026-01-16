import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveMatch } from '../shared/hooks';
import { Card } from '../shared/components/ui';

/**
 * Persistent widget showing the user's active match
 * Stays visible across all pages
 * Design System: Neon Glass
 */
export default function ActiveMatchWidget({ session }) {
  const navigate = useNavigate();
  const { activeMatch, loading } = useActiveMatch(session);
  const [isMinimized, setIsMinimized] = useState(false);

  // Don't show if no active match or loading
  if (loading || !activeMatch) return null;

  const { tournaments, team1, team2, isUserTeam1 } = activeMatch;
  const userTeam = isUserTeam1 ? team1 : team2;
  const opponentTeam = isUserTeam1 ? team2 : team1;
  const userScore = isUserTeam1 ? activeMatch.score_p1 : activeMatch.score_p2;
  const opponentScore = isUserTeam1 ? activeMatch.score_p2 : activeMatch.score_p1;

  const handleGoToMatch = () => {
    if (activeMatch?.id) {
      navigate(`/match/${activeMatch.id}`);
    }
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-6 py-3 rounded-full shadow-glow-violet flex items-center gap-3 hover:scale-105 transition-transform">
          <span className="animate-pulse">🎮</span>
          <span className="font-display text-sm">Match en cours</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="glass-card border-violet-500/50 shadow-glow-violet">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-cyan-500 p-3 flex justify-between items-center rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className="text-xl animate-pulse">🎮</span>
            <h3 className="font-display text-white text-sm">Match Actif</h3>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-white/80 hover:text-white transition-colors"
            title="Réduire"
          >
            ➖
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Tournament Info */}
          <div className="text-center border-b border-violet-500/20 pb-2">
            <p className="text-xs text-gray-400">{tournaments?.name || 'Tournoi'}</p>
            <p className="text-xs text-cyan-400">{tournaments?.game || ''}</p>
          </div>

          {/* Match Score */}
          <div className="space-y-2">
            {/* User Team */}
            <div className={`flex items-center justify-between p-2 rounded-lg ${
              userScore > opponentScore ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5'
            }`}>
              <div className="flex items-center gap-2">
                {userTeam?.logo_url && (
                  <img 
                    src={userTeam.logo_url} 
                    alt={userTeam.name}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${userTeam.tag || 'T'}&background=random&size=32`;
                    }}
                  />
                )}
                <div>
                  <p className="text-sm text-white">{userTeam?.name || 'Votre équipe'}</p>
                  <p className="text-xs text-gray-400">{userTeam?.tag || ''}</p>
                </div>
              </div>
              <span className="text-xl font-bold text-white">{userScore || 0}</span>
            </div>

            {/* VS Divider */}
            <div className="text-center">
              <span className="text-gray-500 text-xs">VS</span>
            </div>

            {/* Opponent Team */}
            <div className={`flex items-center justify-between p-2 rounded-lg ${
              opponentScore > userScore ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5'
            }`}>
              <div className="flex items-center gap-2">
                {opponentTeam?.logo_url && (
                  <img 
                    src={opponentTeam.logo_url} 
                    alt={opponentTeam.name}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${opponentTeam.tag || 'T'}&background=random&size=32`;
                    }}
                  />
                )}
                <div>
                  <p className="text-sm text-white">{opponentTeam?.name || 'Adversaire'}</p>
                  <p className="text-xs text-gray-400">{opponentTeam?.tag || ''}</p>
                </div>
              </div>
              <span className="text-xl font-bold text-white">{opponentScore || 0}</span>
            </div>
          </div>

          {/* Status */}
          <div className="text-center">
            <span className={`inline-block px-3 py-1 rounded-full text-xs ${
              activeMatch.status === 'ongoing' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {activeMatch.status === 'ongoing' ? '🔴 En cours' : '⏳ En attente'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleGoToMatch}
              className="flex-1 btn-primary py-2 px-4 rounded-lg text-sm hover:scale-105 transition-transform"
            >
              Aller au match →
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
