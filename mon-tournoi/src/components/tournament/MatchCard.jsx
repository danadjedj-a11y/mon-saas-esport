import { calculateMatchWinner } from '../../bofUtils';
import { GlassCard } from '../../shared/components/ui';

export default function MatchCard({ match, tournoi, matchGames }) {
  const isCompleted = match.status === 'completed';
  const isScheduled = match.scheduled_at && !isCompleted;
  const isBestOf = tournoi?.best_of > 1;
  const isDraft = !match.player1_id || !match.player2_id;

  // Calculer les scores en temps réel pour Best-of-X
  const getMatchBestOfScore = () => {
    if (!isBestOf) {
      return { team1Wins: match.score_p1 || 0, team2Wins: match.score_p2 || 0, completedGames: 0, totalGames: 1 };
    }

    const matchGamesData = matchGames?.filter(g => g.match_id === match.id) || [];
    if (matchGamesData.length === 0) {
      return { team1Wins: 0, team2Wins: 0, completedGames: 0, totalGames: tournoi.best_of };
    }

    const result = calculateMatchWinner(matchGamesData, tournoi.best_of, match.player1_id, match.player2_id);
    const completedGames = matchGamesData.filter(g => g.status === 'completed').length;
    return { team1Wins: result.team1Wins, team2Wins: result.team2Wins, completedGames, totalGames: tournoi.best_of };
  };

  const bestOfScore = isBestOf ? getMatchBestOfScore() : null;
  const displayScore1 = isBestOf && bestOfScore ? bestOfScore.team1Wins : (match.score_p1 || 0);
  const displayScore2 = isBestOf && bestOfScore ? bestOfScore.team2Wins : (match.score_p2 || 0);
  const isTeam1Winning = displayScore1 > displayScore2;
  const isTeam2Winning = displayScore2 > displayScore1;

  return (
    <div className={`
      relative group min-w-[260px] max-w-[320px]
    `}>
      <GlassCard
        className={`
          flex flex-col overflow-hidden transition-all duration-300
          ${isCompleted ? 'border-violet-500/50 hover:border-violet-400' : 'border-white/10 hover:border-cyan-400/50'}
          ${!isDraft && 'hover:shadow-[0_8px_30px_rgba(139,92,246,0.3)] hover:-translate-y-1'}
        `}
        hoverEffect={false}
      >
        {/* Status Indicators */}
        <div className="flex justify-between items-start absolute -top-1 -left-1 -right-1 z-20 pointer-events-none px-3 pt-3">
          {isBestOf && (
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg text-white">
              Bo{tournoi.best_of}
            </span>
          )}
          {isScheduled && (
            <span className="bg-cyan-500 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg text-[#05050A] ml-auto">
              {new Date(match.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* TEAM 1 */}
        <div className={`p-4 pt-6 flex justify-between items-center transition-colors ${isTeam1Winning ? 'bg-gradient-to-r from-violet-600/20 to-transparent' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              {match.player1_id ? (
                <img
                  loading="lazy"
                  src={match.p1_avatar}
                  className={`w-8 h-8 rounded-lg object-cover ring-2 ${isTeam1Winning ? 'ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'ring-white/10'}`}
                  alt=""
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/5 ring-1 ring-white/10 animate-pulse" />
              )}
            </div>

            <span className={`text-sm font-medium truncate max-w-[120px] ${match.player1_id ? 'text-white' : 'text-gray-500 italic'}`}>
              {match.p1_name?.split(' [')[0] || 'En attente'}
            </span>
          </div>

          <div className="text-right">
            <span className={`text-xl font-bold font-mono ${isTeam1Winning ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-gray-600'}`}>
              {displayScore1 ?? '-'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full" />

        {/* TEAM 2 */}
        <div className={`p-4 pb-6 flex justify-between items-center transition-colors ${isTeam2Winning ? 'bg-gradient-to-r from-violet-600/20 to-transparent' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              {match.player2_id ? (
                <img
                  loading="lazy"
                  src={match.p2_avatar}
                  className={`w-8 h-8 rounded-lg object-cover ring-2 ${isTeam2Winning ? 'ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'ring-white/10'}`}
                  alt=""
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/5 ring-1 ring-white/10 animate-pulse" />
              )}
            </div>

            <span className={`text-sm font-medium truncate max-w-[120px] ${match.player2_id ? 'text-white' : 'text-gray-500 italic'}`}>
              {match.p2_name?.split(' [')[0] || 'En attente'}
            </span>
          </div>

          <div className="text-right">
            <span className={`text-xl font-bold font-mono ${isTeam2Winning ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-gray-600'}`}>
              {displayScore2 ?? '-'}
            </span>
          </div>
        </div>

        {/* Footer info (BoX progress) */}
        {isBestOf && bestOfScore && (
          <div className="px-4 py-2 bg-[#05050A]/50 text-center border-t border-white/5">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Round {bestOfScore.completedGames} / {bestOfScore.totalGames}
            </span>
          </div>
        )}

      </GlassCard>
    </div>
  );
}
