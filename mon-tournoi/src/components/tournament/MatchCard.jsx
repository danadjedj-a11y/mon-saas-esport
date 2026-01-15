import { calculateMatchWinner } from '../../bofUtils';

export default function MatchCard({ match, tournoi, matchGames }) {
  const isCompleted = match.status === 'completed';
  const isScheduled = match.scheduled_at && !isCompleted;
  const isBestOf = tournoi?.best_of > 1;
  
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
      w-[${isBestOf ? '300px' : '260px'}] 
      bg-fluky-bg/95 
      border-2 ${isCompleted ? 'border-fluky-primary' : (isScheduled ? 'border-fluky-accent' : 'border-fluky-primary')}
      rounded-xl 
      relative 
      shadow-lg shadow-fluky-primary/40 
      overflow-hidden
    `}>
      {/* Badge Best-of-X */}
      {isBestOf && (
        <div className="absolute top-1.5 left-1.5 bg-gradient-to-br from-fluky-primary to-fluky-accent text-fluky-text px-2.5 py-1 rounded-md text-xs font-bold z-10 shadow-md font-display">
          🎮 Bo{tournoi.best_of}
        </div>
      )}
      
      {/* Badge Date planifiée */}
      {isScheduled && (
        <div className="absolute top-1.5 right-1.5 bg-fluky-accent text-fluky-text px-2 py-1 rounded-md text-xs font-bold z-10 font-display">
          📅 {new Date(match.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      
      {/* JOUEUR 1 */}
      <div className={`p-4 flex justify-between items-center ${isTeam1Winning ? 'bg-fluky-primary/20' : ''} rounded-t-xl ${isBestOf ? 'pt-7' : ''}`}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {match.player1_id && (
            <img 
              loading="lazy"
              src={match.p1_avatar} 
              className="w-7 h-7 rounded-full object-cover border-2 border-fluky-accent flex-shrink-0"
              alt="" 
            />
          )}
          <span className={`${match.player1_id ? 'text-fluky-text' : 'text-fluky-accent'} ${isTeam1Winning ? 'font-bold' : ''} text-sm overflow-hidden text-ellipsis whitespace-nowrap font-display`}>
            {match.p1_name?.split(' [')[0] || 'En attente'}
          </span>
        </div>
        <div className="flex flex-col items-end ml-2.5">
          <span className="font-bold text-xl text-fluky-accent font-handwriting">
            {displayScore1 || '-'}
          </span>
          {isBestOf && bestOfScore && (
            <span className="text-[0.65rem] text-fluky-text mt-0.5 font-display">
              {bestOfScore.completedGames}/{bestOfScore.totalGames}
            </span>
          )}
        </div>
      </div>
      
      <div className="h-0.5 bg-fluky-accent"></div>
      
      {/* JOUEUR 2 */}
      <div className={`p-4 flex justify-between items-center ${isTeam2Winning ? 'bg-fluky-primary/20' : ''} rounded-b-xl`}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {match.player2_id && (
            <img 
              loading="lazy"
              src={match.p2_avatar} 
              className="w-7 h-7 rounded-full object-cover border-2 border-fluky-accent flex-shrink-0"
              alt="" 
            />
          )}
          <span className={`${match.player2_id ? 'text-fluky-text' : 'text-fluky-accent'} ${isTeam2Winning ? 'font-bold' : ''} text-sm overflow-hidden text-ellipsis whitespace-nowrap font-display`}>
            {match.p2_name?.split(' [')[0] || 'En attente'}
          </span>
        </div>
        <div className="flex flex-col items-end ml-2.5">
          <span className="font-bold text-xl text-fluky-accent font-handwriting">
            {displayScore2 || '-'}
          </span>
          {isBestOf && bestOfScore && (
            <span className="text-[0.65rem] text-fluky-text mt-0.5 font-display">
              {bestOfScore.completedGames}/{bestOfScore.totalGames}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
