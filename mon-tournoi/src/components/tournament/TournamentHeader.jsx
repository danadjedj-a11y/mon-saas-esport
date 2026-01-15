import FollowButton from '../FollowButton';
import RatingDisplay from '../RatingDisplay';

const getFormatLabel = (format) => {
  switch (format) {
    case 'elimination': return 'Élimination Directe';
    case 'double_elimination': return 'Double Elimination';
    case 'round_robin': return 'Championnat';
    case 'swiss': return 'Système Suisse';
    default: return format;
  }
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'draft': return { bg: '#E7632C', text: 'Inscriptions ouvertes', icon: '📝' };
    case 'completed': return { bg: '#FF36A3', text: 'Terminé', icon: '🏁' };
    default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
  }
};

export default function TournamentHeader({ tournoi, session, tournamentId, winnerName }) {
  const statusStyle = getStatusStyle(tournoi.status);

  return (
    <>
      {/* HEADER */}
      <div className="text-center mb-10 pb-8 border-b-4 border-fluky-secondary bg-gradient-to-br from-fluky-primary/10 to-fluky-secondary/5 p-8 rounded-xl border border-fluky-secondary shadow-lg shadow-fluky-primary/30">
        <h1 className="font-display text-5xl text-fluky-secondary mb-5" style={{ textShadow: '0 0 20px rgba(193, 4, 104, 0.5)' }}>
          {tournoi.name}
        </h1>
        <div className="flex justify-center gap-5 mt-5 flex-wrap items-center">
          <span className="bg-fluky-bg/90 px-5 py-2.5 rounded-lg text-sm border-2 border-fluky-accent font-display text-fluky-text">
            🎮 {tournoi.game}
          </span>
          <span className="bg-fluky-bg/90 px-5 py-2.5 rounded-lg text-sm border-2 border-fluky-accent font-display text-fluky-text">
            📊 {getFormatLabel(tournoi.format)}
          </span>
          <span 
            className="px-5 py-2.5 rounded-lg text-sm font-bold border-2 border-fluky-accent font-display text-fluky-text"
            style={{ background: statusStyle.bg }}
          >
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
        <div className="bg-gradient-to-br from-fluky-secondary to-fluky-primary text-fluky-text p-8 rounded-xl text-center mb-8 shadow-lg shadow-fluky-secondary/50 border-4 border-fluky-secondary">
          <h2 className="font-display text-3xl m-0 uppercase tracking-widest">
            👑 VAINQUEUR : {winnerName.split(' [')[0]} 👑
          </h2>
        </div>
      )}
    </>
  );
}

export { getFormatLabel, getStatusStyle };
