import { useNavigate } from 'react-router-dom';

export default function ParticipantCard({ participant, tournamentId }) {
  const navigate = useNavigate();
  const p = participant;

  return (
    <div 
      className="bg-fluky-bg/80 p-4 rounded-xl text-center border-2 border-fluky-primary transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-fluky-accent hover:shadow-lg hover:shadow-fluky-primary/40"
      onClick={() => navigate(`/team/${p.teams?.id}`)}
    >
      <img 
        loading="lazy"
        src={p.teams?.logo_url || `https://ui-avatars.com/api/?name=${p.teams?.tag || '?'}&background=C10468&color=F8F6F2&size=64`} 
        alt={p.teams?.name || 'Team'}
        className="w-14 h-14 rounded-full mx-auto mb-3 object-cover border-2 border-fluky-accent"
      />
      <div className="font-bold text-fluky-text text-base font-handwriting">
        {p.teams?.name || 'Inconnu'}
      </div>
      <div className="text-fluky-accent text-xs mt-1 font-display">
        [{p.teams?.tag || '?'}]
      </div>
      {p.seed_order && (
        <div className="mt-2 text-xs text-fluky-orange font-display">
          Seed #{p.seed_order}
        </div>
      )}
      {p.checked_in && (
        <div className="mt-2 text-xs text-green-400 font-display">
          ✅ Check-in
        </div>
      )}
      {p.disqualified && (
        <div className="mt-2 text-xs text-red-400 font-display">
          ❌ Disqualifié
        </div>
      )}
    </div>
  );
}
