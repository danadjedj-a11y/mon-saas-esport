import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../shared/components/ui';

export default function ParticipantCard({ participant, tournamentId }) {
  const navigate = useNavigate();
  const p = participant;

  // Déterminer si c'est une équipe permanente ou temporaire
  const isTemporaryTeam = !!p.temporary_team_id && !p.team_id;
  const team = isTemporaryTeam ? p.temporary_teams : p.teams;

  const handleClick = () => {
    // Ne pas naviguer pour les équipes temporaires (pas de page dédiée pour l'instant)
    if (isTemporaryTeam) return;
    if (team?.id) navigate(`/team/${team.id}`);
  };

  return (
    <GlassCard
      className={`
        p-6 text-center group transition-all duration-300
        ${isTemporaryTeam
          ? 'opacity-80'
          : 'cursor-pointer hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(139,92,246,0.3)] hover:border-violet-500/50'
        }
      `}
      onClick={handleClick}
    >
      <div className="relative inline-block mb-4">
        {/* Glow behind avatar */}
        <div className={`absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isTemporaryTeam ? 'bg-cyan-500' : 'bg-violet-600'}`} />

        <img
          loading="lazy"
          src={team?.logo_url || `https://ui-avatars.com/api/?name=${team?.tag || team?.name || '?'}&background=${isTemporaryTeam ? '06B6D4' : '8B5CF6'}&color=FFFFFF&size=64`}
          alt={team?.name || 'Team'}
          className={`relative w-20 h-20 rounded-2xl object-cover ring-2 ring-offset-4 ring-offset-[#0d0d14] transition-all duration-300 ${isTemporaryTeam ? 'ring-cyan-500/50' : 'ring-violet-500/50 group-hover:ring-violet-400'}`}
        />

        {/* Badge seed */}
        {p.seed_order && (
          <div className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-amber-500 text-[#05050A] text-xs font-bold rounded-full shadow-lg">
            {p.seed_order}
          </div>
        )}
      </div>

      <div className="font-bold text-white text-lg tracking-tight mb-1 group-hover:text-violet-300 transition-colors">
        {team?.name || 'Inconnu'}
      </div>

      <div className={`text-xs font-mono px-2 py-1 rounded-md inline-block bg-white/5 border border-white/5 ${isTemporaryTeam ? 'text-cyan-400' : 'text-violet-400'}`}>
        {team?.tag || '?'}
      </div>

      {/* Status Badges */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {isTemporaryTeam && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            TEMP
          </span>
        )}
        {p.checked_in && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
            READY
          </span>
        )}
        {p.disqualified && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            DSQ
          </span>
        )}
      </div>
    </GlassCard>
  );
}
