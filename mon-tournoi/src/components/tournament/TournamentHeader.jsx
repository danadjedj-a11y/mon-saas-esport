import FollowButton from '../FollowButton';
import RatingDisplay from '../RatingDisplay';
import { getFormatLabel, getStatusStyle } from '../../utils/tournamentHelpers';

export default function TournamentHeader({ tournoi, session, tournamentId, winnerName }) {
  const statusStyle = getStatusStyle(tournoi.status);

  return (
    <>
      {/* HEADER */}
      <div className="text-center mb-10 pb-8 border-b-4 border-violet-500 glass-card border-violet-500/30 p-8 shadow-glow-violet">
        <h1 className="font-display text-5xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-5 drop-shadow-glow">
          {tournoi.name}
        </h1>
        <div className="flex justify-center gap-5 mt-5 flex-wrap items-center">
          <span className="glass-card border-violet-500/30 px-5 py-2.5 rounded-lg text-sm font-display text-white">
            🎮 {tournoi.game}
          </span>
          <span className="glass-card border-violet-500/30 px-5 py-2.5 rounded-lg text-sm font-display text-white">
            📊 {getFormatLabel(tournoi.format)}
          </span>
          <span className={`${statusStyle.bg} px-5 py-2.5 rounded-lg text-sm font-bold font-display text-white`}>
            {statusStyle.icon} {statusStyle.text}
          </span>
          {session && (
            <FollowButton session={session} tournamentId={tournamentId} type="tournament" />
          )}
          <RatingDisplay tournamentId={tournamentId} />
        </div>
      </div>

      {/* BANNIÈRE VAINQUEUR */}
      {winnerName && (
        <div className="bg-gradient-to-br from-violet-600 to-cyan-500 text-white p-8 rounded-xl text-center mb-8 shadow-glow-violet border-4 border-violet-400">
          <h2 className="font-display text-3xl m-0 uppercase tracking-widest">
            👑 VAINQUEUR : {winnerName.split(' [')[0]} 👑
          </h2>
        </div>
      )}
    </>
  );
}
