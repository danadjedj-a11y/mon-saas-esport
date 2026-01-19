import { useNavigate } from 'react-router-dom';

export default function ParticipantCard({ participant, tournamentId }) {
  const navigate = useNavigate();
  const p = participant;
  
  // Déterminer si c'est une équipe permanente ou temporaire
  const isTemporaryTeam = !!p.temporary_team_id && !p.team_id;
  const team = isTemporaryTeam ? p.temporary_teams : p.teams;
  
  const handleClick = () => {
    // Ne pas naviguer pour les équipes temporaires (pas de page dédiée)
    if (isTemporaryTeam) return;
    if (team?.id) navigate(`/team/${team.id}`);
  };

  return (
    <div 
      className={`
        bg-gray-900/80 p-4 rounded-xl text-center border-2 transition-all duration-300
        ${isTemporaryTeam 
          ? 'border-cyan-500/50 cursor-default' 
          : 'border-violet-500 cursor-pointer hover:-translate-y-1 hover:border-cyan-400 hover:shadow-lg hover:shadow-violet-500/40'
        }
      `}
      onClick={handleClick}
    >
      {/* Badge équipe temporaire */}
      {isTemporaryTeam && (
        <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
          Temp
        </div>
      )}
      
      <img 
        loading="lazy"
        src={team?.logo_url || `https://ui-avatars.com/api/?name=${team?.tag || team?.name || '?'}&background=${isTemporaryTeam ? '06B6D4' : '8B5CF6'}&color=FFFFFF&size=64`} 
        alt={team?.name || 'Team'}
        className={`w-14 h-14 rounded-full mx-auto mb-3 object-cover border-2 ${isTemporaryTeam ? 'border-cyan-400' : 'border-violet-400'}`}
      />
      <div className="font-bold text-white text-base font-handwriting">
        {team?.name || 'Inconnu'}
      </div>
      <div className={`text-xs mt-1 font-display ${isTemporaryTeam ? 'text-cyan-400' : 'text-violet-400'}`}>
        [{team?.tag || '?'}]
      </div>
      {p.seed_order && (
        <div className="mt-2 text-xs text-orange-400 font-display">
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
